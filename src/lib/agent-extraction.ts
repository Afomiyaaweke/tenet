/**
 * Multi-pass schema-driven extraction library with confidence scoring.
 *
 * Designed for extracting structured bidder, metadata, and key-term data
 * from tender / procurement documents using the ZAI LLM.
 *
 * Pass 1 – identifyStructure:  Identify which parts of the document contain
 *        bidder info, metadata, and key terms.
 * Pass 2 – extractAllBidders:  Extract ALL bidders with per-field confidence.
 * Pass 3 – verification:       Re-extract low-confidence bidders individually.
 * Pass 4 – normalization:      Normalize prices, scores, dates, etc.
 */

import { getZAI } from '@/lib/zai';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** A value paired with a confidence score (0-1). */
export interface ConfidenceField<T> {
  value: T;
  confidence: number; // 0-1
}

/** Normalized price with currency detection. */
export interface NormalizedPrice {
  amount: number;
  currency: string;
  raw: string;
  confidence: number;
}

/** Normalized score (e.g. "88/100"). */
export interface NormalizedScore {
  score: number;
  maxScore: number;
  raw: string;
  confidence: number;
}

/** A single bidder extracted from a tender result. */
export interface ExtractedBidder {
  name: ConfidenceField<string>;
  bidPrice?: NormalizedPrice;
  technicalScore?: NormalizedScore;
  commercialScore?: NormalizedScore;
  totalScore?: NormalizedScore;
  rank?: ConfidenceField<number>;
  compliance?: ConfidenceField<string>;
  duration?: ConfidenceField<string>;
  validity?: ConfidenceField<string>;
}

/** Tender-level metadata. */
export interface TenderMetadata {
  title?: ConfidenceField<string>;
  tenderNumber?: ConfidenceField<string>;
  issuingAuthority?: ConfidenceField<string>;
  publishedDate?: ConfidenceField<string>;
  closingDate?: ConfidenceField<string>;
  estimatedValue?: NormalizedPrice;
  category?: ConfidenceField<string>;
}

/** A key term or requirement extracted from the document. */
export interface KeyTerm {
  term: string;
  description: string;
  category: string; // technical | financial | legal | timeline | compliance | other
}

/** A gap in expected data. */
export interface ExtractionGap {
  field: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

/** The full extraction result returned to the caller. */
export interface ExtractionResult {
  bidders: ExtractedBidder[];
  metadata: TenderMetadata;
  keyTerms: KeyTerm[];
  gaps: ExtractionGap[];
  overallConfidence: number;
  extractionDate: string;
  pageCount: number;
}

// ---------------------------------------------------------------------------
// Internal types for LLM passes
// ---------------------------------------------------------------------------

/** Output of Pass 1 – page/section identification. */
interface StructureIdentification {
  bidderSections: string;
  metadataSections: string;
  keyTermsSections: string;
  summary: string;
}

/** Raw bidder as returned by the LLM before normalization. */
interface RawBidder {
  name: string;
  nameConfidence: number;
  bidPrice?: string;
  bidPriceConfidence?: number;
  technicalScore?: string;
  technicalScoreConfidence?: number;
  commercialScore?: string;
  commercialScoreConfidence?: number;
  totalScore?: string;
  totalScoreConfidence?: number;
  rank?: number;
  rankConfidence?: number;
  compliance?: string;
  complianceConfidence?: number;
  duration?: string;
  durationConfidence?: number;
  validity?: string;
  validityConfidence?: number;
}

/** Raw metadata as returned by the LLM before normalization. */
interface RawMetadata {
  title?: string;
  titleConfidence?: number;
  tenderNumber?: string;
  tenderNumberConfidence?: number;
  issuingAuthority?: string;
  issuingAuthorityConfidence?: number;
  publishedDate?: string;
  publishedDateConfidence?: number;
  closingDate?: string;
  closingDateConfidence?: number;
  estimatedValue?: string;
  estimatedValueConfidence?: number;
  category?: string;
  categoryConfidence?: number;
}

// ---------------------------------------------------------------------------
// Helpers – JSON parsing
// ---------------------------------------------------------------------------

/**
 * Parse JSON from an LLM response, stripping markdown code fences if present.
 */
function parseLLMJson<T>(raw: string): T {
  let text = raw.trim();

  // Strip ```json ... ``` fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // Sometimes the LLM wraps in a "result" key
  try {
    const parsed = JSON.parse(text);
    return (parsed as Record<string, unknown>).result
      ? (parsed.result as T)
      : (parsed as T);
  } catch {
    // Attempt a more aggressive extraction: find the first { ... } block
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as T;
    }
    throw new Error(`Failed to parse LLM JSON response: ${text.slice(0, 200)}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers – LLM call wrapper
// ---------------------------------------------------------------------------

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const zai = await getZAI();

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    thinking: { type: 'disabled' },
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content || content.trim().length === 0) {
    throw new Error('LLM returned empty response');
  }
  return content;
}

// ---------------------------------------------------------------------------
// Pass 1 – Identify document structure
// ---------------------------------------------------------------------------

const PASS1_SYSTEM = `You are a tender document structure analyzer. Your job is to identify which sections of a tender document contain specific types of information.

Given the document text, identify:
1. **Bidder Sections**: Which parts contain bidder/proponent information, evaluation results, price schedules, or ranking tables?
2. **Metadata Sections**: Which parts contain the tender title, tender number, issuing authority, publication date, closing date, estimated value, or category?
3. **Key Terms Sections**: Which parts contain important requirements, terms, conditions, or evaluation criteria?

Return a JSON object with this exact structure:
{
  "bidderSections": "Description of where bidder info is found (e.g., 'Pages 3-5, evaluation table on page 4, price schedule on page 5')",
  "metadataSections": "Description of where metadata is found (e.g., 'Page 1 header, title at top of first page')",
  "keyTermsSections": "Description of where key terms are found (e.g., 'Section 2 eligibility criteria, Section 5 evaluation methodology')",
  "summary": "Brief summary of the document structure and what type of tender document this is"
}

Be specific about locations. If a section type is not found, state that clearly.`;

async function identifyStructure(
  docContext: string,
): Promise<StructureIdentification> {
  const raw = await callLLM(
    PASS1_SYSTEM,
    `Analyze this tender document and identify its structure:\n\n${docContext}`,
  );
  return parseLLMJson<StructureIdentification>(raw);
}

// ---------------------------------------------------------------------------
// Pass 2 – Extract all bidders + metadata + key terms
// ---------------------------------------------------------------------------

const PASS2_SYSTEM = `You are an expert tender evaluation data extractor. You extract structured data from tender result documents with high precision.

## Your Task
Extract ALL bidders/applicants from the document along with their evaluation data. Also extract tender metadata and key terms.

## Output Format
Return a JSON object with these exact keys:

{
  "bidders": [
    {
      "name": "Full bidder name",
      "nameConfidence": 0.0-1.0,
      "bidPrice": "Raw price string as it appears in the document (e.g., 'USD 2,150,000', 'ETB 50,000,000', '$2.15M')",
      "bidPriceConfidence": 0.0-1.0,
      "technicalScore": "Raw technical score as it appears (e.g., '88/100', '90.0', '88 out of 100')",
      "technicalScoreConfidence": 0.0-1.0,
      "commercialScore": "Raw commercial/financial score as it appears",
      "commercialScoreConfidence": 0.0-1.0,
      "totalScore": "Raw total/combined score as it appears",
      "totalScoreConfidence": 0.0-1.0,
      "rank": 1,
      "rankConfidence": 0.0-1.0,
      "compliance": "Compliance status (e.g., 'Compliant', 'Non-Compliant', 'Partially Compliant')",
      "complianceConfidence": 0.0-1.0,
      "duration": "Project duration as stated (e.g., '24 months', '180 days')",
      "durationConfidence": 0.0-1.0,
      "validity": "Bid validity period (e.g., '90 days', '120 calendar days')",
      "validityConfidence": 0.0-1.0
    }
  ],
  "metadata": {
    "title": "Tender title",
    "titleConfidence": 0.0-1.0,
    "tenderNumber": "Tender/RFP reference number",
    "tenderNumberConfidence": 0.0-1.0,
    "issuingAuthority": "Organization that issued the tender",
    "issuingAuthorityConfidence": 0.0-1.0,
    "publishedDate": "Publication date as raw text",
    "publishedDateConfidence": 0.0-1.0,
    "closingDate": "Closing/submission deadline as raw text",
    "closingDateConfidence": 0.0-1.0,
    "estimatedValue": "Estimated value as raw text (e.g., 'ETB 100,000,000')",
    "estimatedValueConfidence": 0.0-1.0,
    "category": "Tender category/sector",
    "categoryConfidence": 0.0-1.0
  },
  "keyTerms": [
    {
      "term": "Name of the term/requirement",
      "description": "Description or detail of the requirement",
      "category": "One of: technical, financial, legal, timeline, compliance, other"
    }
  ],
  "gaps": [
    {
      "field": "Name of the missing/unclear field",
      "description": "What information is missing or unclear",
      "severity": "low, medium, or high"
    }
  ]
}

## Confidence Scoring Guidelines
- 1.0: Information is explicitly and clearly stated in the document
- 0.8-0.9: Information is stated but may require minor inference
- 0.6-0.7: Information is implied or partially stated
- 0.4-0.5: Information is uncertain, may be inferred from context
- 0.2-0.3: Information is guessed based on patterns or typical values
- 0.0-0.1: Information is not found or purely speculative

## Rules
- Extract EVERY bidder mentioned, even if data is incomplete
- Only include fields that are actually present or can be reasonably inferred
- Omit fields entirely if there is no information at all (set to null/undefined)
- Preserve raw values exactly as they appear in the document
- Be very careful with names - use the exact spelling from the document
- For scores, include the raw format as it appears (e.g., "88/100" not just "88")
- For prices, include the raw format with currency symbol/code
- Identify gaps where expected tender data is missing`;

interface Pass2Result {
  bidders: RawBidder[];
  metadata: RawMetadata;
  keyTerms: KeyTerm[];
  gaps: ExtractionGap[];
}

async function extractAllBidders(
  docContext: string,
  structure: StructureIdentification,
): Promise<Pass2Result> {
  const raw = await callLLM(
    PASS2_SYSTEM,
    `Extract all structured data from this tender document.

## Document Structure (from initial analysis)
- Bidder sections: ${structure.bidderSections}
- Metadata sections: ${structure.metadataSections}
- Key terms sections: ${structure.keyTermsSections}

## Document Text
${docContext}`,
  );
  return parseLLMJson<Pass2Result>(raw);
}

// ---------------------------------------------------------------------------
// Pass 3 – Verification (re-extract low-confidence bidders)
// ---------------------------------------------------------------------------

const PASS3_SYSTEM = `You are a focused tender data extractor. You are given a document and a specific bidder name that was previously extracted with low confidence. Your job is to find ALL information about this specific bidder with maximum accuracy.

Return a JSON object with this structure:
{
  "name": "Exact bidder name from the document",
  "nameConfidence": 0.0-1.0,
  "bidPrice": "Raw price string",
  "bidPriceConfidence": 0.0-1.0,
  "technicalScore": "Raw technical score",
  "technicalScoreConfidence": 0.0-1.0,
  "commercialScore": "Raw commercial/financial score",
  "commercialScoreConfidence": 0.0-1.0,
  "totalScore": "Raw total/combined score",
  "totalScoreConfidence": 0.0-1.0,
  "rank": rank_number,
  "rankConfidence": 0.0-1.0,
  "compliance": "Compliance status",
  "complianceConfidence": 0.0-1.0,
  "duration": "Duration string",
  "durationConfidence": 0.0-1.0,
  "validity": "Validity string",
  "validityConfidence": 0.0-1.0
}

Rules:
- Search the ENTIRE document for this bidder
- Only report data you are confident about
- Set confidence to 0 for fields you cannot find
- Be extremely careful with the exact name spelling`;

function bidderOverallConfidence(b: RawBidder): number {
  const fields: number[] = [b.nameConfidence];
  if (b.bidPriceConfidence != null) fields.push(b.bidPriceConfidence);
  if (b.technicalScoreConfidence != null) fields.push(b.technicalScoreConfidence);
  if (b.commercialScoreConfidence != null) fields.push(b.commercialScoreConfidence);
  if (b.totalScoreConfidence != null) fields.push(b.totalScoreConfidence);
  if (b.rankConfidence != null) fields.push(b.rankConfidence);
  if (b.complianceConfidence != null) fields.push(b.complianceConfidence);
  if (b.durationConfidence != null) fields.push(b.durationConfidence);
  if (b.validityConfidence != null) fields.push(b.validityConfidence);
  return fields.reduce((a, c) => a + c, 0) / fields.length;
}

async function verifyLowConfidenceBidders(
  docContext: string,
  rawBidders: RawBidder[],
  threshold = 0.5,
): Promise<RawBidder[]> {
  const results: RawBidder[] = [];

  for (const bidder of rawBidders) {
    const conf = bidderOverallConfidence(bidder);
    if (conf >= threshold) {
      results.push(bidder);
      continue;
    }

    // Re-extract this bidder individually
    try {
      const raw = await callLLM(
        PASS3_SYSTEM,
        `Find all information about the bidder "${bidder.name}" in this document:\n\n${docContext}`,
      );
      const verified = parseLLMJson<RawBidder>(raw);
      // Only use the verified result if it improved confidence
      if (bidderOverallConfidence(verified) > conf) {
        results.push(verified);
      } else {
        results.push(bidder);
      }
    } catch (err) {
      console.warn(
        `[agent-extraction] Verification failed for bidder "${bidder.name}":`,
        err,
      );
      results.push(bidder); // Keep original on failure
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Pass 4 – Normalization
// ---------------------------------------------------------------------------

// Currency patterns (ordered by specificity)
const CURRENCY_MAP: Record<string, string> = {
  USD: 'USD',
  US$: 'USD',
  $: 'USD',
  EUR: 'EUR',
  '€': 'EUR',
  GBP: 'GBP',
  '£': 'GBP',
  ETB: 'ETB',
  Birr: 'ETB',
  birr: 'ETB',
  JPY: 'JPY',
  '¥': 'JPY',
  CNY: 'CNY',
  INR: 'INR',
  '₹': 'INR',
  AED: 'AED',
  SAR: 'SAR',
  '﷼': 'SAR',
};

const CURRENCY_SYMBOLS = Object.keys(CURRENCY_MAP).sort(
  (a, b) => b.length - a.length,
); // longest first for greedy match

/**
 * Normalize a raw price string into a structured NormalizedPrice.
 *
 * Handles formats like:
 *   "USD 2,150,000"  →  { amount: 2150000, currency: "USD" }
 *   "$2.15M"          →  { amount: 2150000, currency: "USD" }
 *   "€500K"           →  { amount: 500000, currency: "EUR" }
 *   "ETB 50,000,000"  →  { amount: 50000000, currency: "ETB" }
 *   "Birr 12,345.67"  →  { amount: 12345.67, currency: "ETB" }
 */
export function normalizePrice(raw: string): NormalizedPrice {
  const original = raw;
  let text = raw.trim();

  // Detect currency
  let currency = 'USD'; // default
  let currencyConfidence = 0.5; // low confidence for default

  for (const sym of CURRENCY_SYMBOLS) {
    if (text.includes(sym)) {
      currency = CURRENCY_MAP[sym];
      currencyConfidence = sym.length >= 3 ? 1.0 : 0.9; // code > symbol
      text = text.replace(sym, ' ').trim();
      break;
    }
  }

  // Strip "million", "billion" suffixes
  let multiplier = 1;
  const millionMatch = text.match(/\b(million|m|M)\b/);
  const billionMatch = text.match(/\b(billion|b|B)\b/);
  const thousandMatch = text.match(/\b(thousand|k|K)\b/);

  if (billionMatch) {
    multiplier = 1_000_000_000;
    text = text.replace(billionMatch[0], ' ').trim();
    currencyConfidence = Math.min(currencyConfidence + 0.05, 1.0);
  } else if (millionMatch) {
    multiplier = 1_000_000;
    text = text.replace(millionMatch[0], ' ').trim();
    currencyConfidence = Math.min(currencyConfidence + 0.05, 1.0);
  } else if (thousandMatch) {
    multiplier = 1_000;
    text = text.replace(thousandMatch[0], ' ').trim();
  }

  // Extract numeric value
  // Remove commas used as thousand separators
  const cleaned = text.replace(/,/g, '');
  const numMatch = cleaned.match(/(\d+\.?\d*)/);

  let amount = 0;
  let amountConfidence = 0.3;

  if (numMatch) {
    amount = parseFloat(numMatch[1]) * multiplier;
    amountConfidence = multiplier > 1 ? 0.85 : 0.95;
  }

  const overallConfidence = (currencyConfidence + amountConfidence) / 2;

  return {
    amount,
    currency,
    raw: original,
    confidence: overallConfidence,
  };
}

/**
 * Normalize a raw score string into a NormalizedScore.
 *
 * Handles formats like:
 *   "88/100"       →  { score: 88, maxScore: 100 }
 *   "90.0"         →  { score: 90, maxScore: 100 }  (assume /100)
 *   "88 out of 100" →  { score: 88, maxScore: 100 }
 *   "0.88"          →  { score: 88, maxScore: 100 }  (ratio)
 */
export function normalizeScore(raw: string): NormalizedScore {
  const original = raw;
  let text = raw.trim().toLowerCase();

  let score = 0;
  let maxScore = 100;
  let confidence = 0.3;

  // Pattern: "X/Y" or "X out of Y" or "X of Y"
  const fractionMatch = text.match(
    /(\d+\.?\d*)\s*(?:\/|out\s+of|of)\s*(\d+\.?\d*)/,
  );
  if (fractionMatch) {
    score = parseFloat(fractionMatch[1]);
    maxScore = parseFloat(fractionMatch[2]);
    confidence = 0.95;
  } else {
    // Standalone number
    const numMatch = text.match(/(\d+\.?\d*)/);
    if (numMatch) {
      const val = parseFloat(numMatch[1]);
      if (val <= 1 && val > 0) {
        // Likely a ratio (e.g., 0.88 → 88/100)
        score = val * 100;
        maxScore = 100;
        confidence = 0.7;
      } else if (val <= 10) {
        // Could be /10
        score = val;
        maxScore = 10;
        confidence = 0.6;
      } else if (val <= 100) {
        score = val;
        maxScore = 100;
        confidence = 0.8;
      } else {
        // Large number – treat as raw score out of unknown
        score = val;
        maxScore = 0; // unknown
        confidence = 0.5;
      }
    }
  }

  return {
    score,
    maxScore,
    raw: original,
    confidence,
  };
}

/**
 * Convert a RawBidder into a fully normalized ExtractedBidder.
 */
function normalizeBidder(raw: RawBidder): ExtractedBidder {
  const bidder: ExtractedBidder = {
    name: {
      value: raw.name,
      confidence: clamp(raw.nameConfidence, 0, 1),
    },
  };

  if (raw.bidPrice != null && raw.bidPrice.trim() !== '') {
    const np = normalizePrice(raw.bidPrice);
    np.confidence = Math.min(
      np.confidence,
      raw.bidPriceConfidence ?? 0.5,
    );
    bidder.bidPrice = np;
  }

  if (raw.technicalScore != null && raw.technicalScore.trim() !== '') {
    const ns = normalizeScore(raw.technicalScore);
    ns.confidence = Math.min(
      ns.confidence,
      raw.technicalScoreConfidence ?? 0.5,
    );
    bidder.technicalScore = ns;
  }

  if (raw.commercialScore != null && raw.commercialScore.trim() !== '') {
    const ns = normalizeScore(raw.commercialScore);
    ns.confidence = Math.min(
      ns.confidence,
      raw.commercialScoreConfidence ?? 0.5,
    );
    bidder.commercialScore = ns;
  }

  if (raw.totalScore != null && raw.totalScore.trim() !== '') {
    const ns = normalizeScore(raw.totalScore);
    ns.confidence = Math.min(
      ns.confidence,
      raw.totalScoreConfidence ?? 0.5,
    );
    bidder.totalScore = ns;
  }

  if (raw.rank != null) {
    bidder.rank = {
      value: raw.rank,
      confidence: clamp(raw.rankConfidence ?? 0.5, 0, 1),
    };
  }

  if (raw.compliance != null && raw.compliance.trim() !== '') {
    bidder.compliance = {
      value: raw.compliance,
      confidence: clamp(raw.complianceConfidence ?? 0.5, 0, 1),
    };
  }

  if (raw.duration != null && raw.duration.trim() !== '') {
    bidder.duration = {
      value: raw.duration,
      confidence: clamp(raw.durationConfidence ?? 0.5, 0, 1),
    };
  }

  if (raw.validity != null && raw.validity.trim() !== '') {
    bidder.validity = {
      value: raw.validity,
      confidence: clamp(raw.validityConfidence ?? 0.5, 0, 1),
    };
  }

  return bidder;
}

/**
 * Convert raw metadata into a fully normalized TenderMetadata.
 */
function normalizeMetadata(raw: RawMetadata): TenderMetadata {
  const meta: TenderMetadata = {};

  if (raw.title?.trim()) {
    meta.title = {
      value: raw.title,
      confidence: clamp(raw.titleConfidence ?? 0.5, 0, 1),
    };
  }

  if (raw.tenderNumber?.trim()) {
    meta.tenderNumber = {
      value: raw.tenderNumber,
      confidence: clamp(raw.tenderNumberConfidence ?? 0.5, 0, 1),
    };
  }

  if (raw.issuingAuthority?.trim()) {
    meta.issuingAuthority = {
      value: raw.issuingAuthority,
      confidence: clamp(raw.issuingAuthorityConfidence ?? 0.5, 0, 1),
    };
  }

  if (raw.publishedDate?.trim()) {
    meta.publishedDate = {
      value: raw.publishedDate,
      confidence: clamp(raw.publishedDateConfidence ?? 0.5, 0, 1),
    };
  }

  if (raw.closingDate?.trim()) {
    meta.closingDate = {
      value: raw.closingDate,
      confidence: clamp(raw.closingDateConfidence ?? 0.5, 0, 1),
    };
  }

  if (raw.estimatedValue?.trim()) {
    const np = normalizePrice(raw.estimatedValue);
    np.confidence = Math.min(np.confidence, raw.estimatedValueConfidence ?? 0.5);
    meta.estimatedValue = np;
  }

  if (raw.category?.trim()) {
    meta.category = {
      value: raw.category,
      confidence: clamp(raw.categoryConfidence ?? 0.5, 0, 1),
    };
  }

  return meta;
}

// ---------------------------------------------------------------------------
// Overall confidence calculation
// ---------------------------------------------------------------------------

/**
 * Compute an overall confidence score for the extraction result.
 *
 * Strategy:
 * - Bidder confidence: average of each bidder's per-field confidence average
 * - Metadata confidence: average of each present metadata field's confidence
 * - Weight: bidders 60%, metadata 40%
 * - If no bidders, metadata gets 100% weight
 * - If no metadata fields, bidders get 100% weight
 * - If neither, return 0
 */
export function calculateOverallConfidence(result: ExtractionResult): number {
  // --- Bidder confidence ---
  let bidderConf = 0;
  if (result.bidders.length > 0) {
    const bidderConfSum = result.bidders.map((b) => {
      const fields: number[] = [b.name.confidence];
      if (b.bidPrice) fields.push(b.bidPrice.confidence);
      if (b.technicalScore) fields.push(b.technicalScore.confidence);
      if (b.commercialScore) fields.push(b.commercialScore.confidence);
      if (b.totalScore) fields.push(b.totalScore.confidence);
      if (b.rank) fields.push(b.rank.confidence);
      if (b.compliance) fields.push(b.compliance.confidence);
      if (b.duration) fields.push(b.duration.confidence);
      if (b.validity) fields.push(b.validity.confidence);
      return fields.reduce((a, c) => a + c, 0) / fields.length;
    });
    bidderConf =
      bidderConfSum.reduce((a, c) => a + c, 0) / bidderConfSum.length;
  }

  // --- Metadata confidence ---
  const metaFields: number[] = [];
  const m = result.metadata;
  if (m.title) metaFields.push(m.title.confidence);
  if (m.tenderNumber) metaFields.push(m.tenderNumber.confidence);
  if (m.issuingAuthority) metaFields.push(m.issuingAuthority.confidence);
  if (m.publishedDate) metaFields.push(m.publishedDate.confidence);
  if (m.closingDate) metaFields.push(m.closingDate.confidence);
  if (m.estimatedValue) metaFields.push(m.estimatedValue.confidence);
  if (m.category) metaFields.push(m.category.confidence);

  const metaConf =
    metaFields.length > 0
      ? metaFields.reduce((a, c) => a + c, 0) / metaFields.length
      : 0;

  // --- Weighted combination ---
  const hasBidders = result.bidders.length > 0;
  const hasMeta = metaFields.length > 0;

  if (hasBidders && hasMeta) {
    return bidderConf * 0.6 + metaConf * 0.4;
  }
  if (hasBidders) return bidderConf;
  if (hasMeta) return metaConf;
  return 0;
}

// ---------------------------------------------------------------------------
// Gap detection
// ---------------------------------------------------------------------------

/**
 * Identify expected-but-missing fields and add them as gaps.
 */
function detectGaps(result: Pass2Result): ExtractionGap[] {
  const gaps: ExtractionGap[] = [...(result.gaps || [])];

  // Missing bidder-level data
  for (const bidder of result.bidders) {
    if (!bidder.bidPrice) {
      gaps.push({
        field: `bidPrice for ${bidder.name}`,
        description: 'No bid price found for this bidder',
        severity: 'high',
      });
    }
    if (!bidder.technicalScore && !bidder.totalScore) {
      gaps.push({
        field: `score for ${bidder.name}`,
        description: 'No evaluation score found for this bidder',
        severity: 'medium',
      });
    }
    if (!bidder.compliance) {
      gaps.push({
        field: `compliance for ${bidder.name}`,
        description: 'No compliance status found for this bidder',
        severity: 'low',
      });
    }
  }

  // Missing metadata
  const meta = result.metadata;
  if (!meta.title) {
    gaps.push({
      field: 'tender title',
      description: 'No tender title identified',
      severity: 'high',
    });
  }
  if (!meta.tenderNumber) {
    gaps.push({
      field: 'tender number',
      description: 'No tender reference number identified',
      severity: 'medium',
    });
  }
  if (!meta.closingDate) {
    gaps.push({
      field: 'closing date',
      description: 'No closing/submission deadline identified',
      severity: 'high',
    });
  }

  return gaps;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Run a full multi-pass extraction on a tender document.
 *
 * @param docContext  The full text of the document (typically from OCR).
 * @param pageCount  Number of pages in the source document.
 * @returns          A structured ExtractionResult with confidence scores.
 */
export async function runFullExtraction(
  docContext: string,
  pageCount: number,
): Promise<ExtractionResult> {
  // ---- Pass 1: Identify structure ----
  const structure = await identifyStructure(docContext);

  // ---- Pass 2: Extract all bidders + metadata ----
  const pass2 = await extractAllBidders(docContext, structure);

  // ---- Pass 3: Verify low-confidence bidders ----
  const verifiedBidders = await verifyLowConfidenceBidders(
    docContext,
    pass2.bidders,
  );

  // ---- Pass 4: Normalize ----
  const bidders = verifiedBidders.map(normalizeBidder);
  const metadata = normalizeMetadata(pass2.metadata);
  const keyTerms = pass2.keyTerms || [];
  const gaps = detectGaps(pass2);

  // ---- Assemble result ----
  const result: ExtractionResult = {
    bidders,
    metadata,
    keyTerms,
    gaps,
    overallConfidence: 0, // placeholder
    extractionDate: new Date().toISOString(),
    pageCount,
  };

  result.overallConfidence = calculateOverallConfidence(result);

  return result;
}
