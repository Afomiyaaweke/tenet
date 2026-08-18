/**
 * agent-loop.ts
 *
 * Core ReAct (Reasoning + Acting) agent loop with Claude-style visible thinking,
 * planning, tool execution, and streaming events.
 *
 * The agent:
 *   1. Classifies the user's intent (regex heuristics, no LLM).
 *   2. Generates a multi-step plan via LLM (streamed thinking).
 *   3. Executes tools from the plan.
 *   4. Synthesizes a final answer — either from extraction data directly
 *      (analyze/extract intents) or by asking the LLM (chat/compare intents).
 *
 * Yields `AgentEvent` objects as an async generator for real-time UI updates.
 */

import { getZAI } from '@/lib/zai';
import { runFullExtraction } from '@/lib/agent-extraction';
import type { ExtractionResult } from '@/lib/agent-extraction';
import { buildDocContext } from '@/lib/agent-document';
import type { ParsedDocument } from '@/lib/agent-document';
import { generateComplianceDocx } from '@/lib/agent-docgen';
import type { ApplicationDocInput } from '@/lib/agent-docgen';

// ---------------------------------------------------------------------------
// Exported Types
// ---------------------------------------------------------------------------

/** Event types emitted during agent execution */
export type AgentEventType =
  | 'intent'             // Intent classification result
  | 'thinking_start'     // Begin thinking block
  | 'thinking_delta'     // Thinking text chunk
  | 'thinking_end'       // End thinking block
  | 'plan'               // Multi-step plan display
  | 'tool_call_start'    // Tool execution begins
  | 'tool_call_progress' // Tool progress update
  | 'tool_call_result'   // Tool completed with result
  | 'tool_call_end'      // Tool execution ended
  | 'answer_start'       // Begin final answer
  | 'answer_delta'       // Answer text chunk
  | 'answer_end'         // End final answer
  | 'citations'          // Document/page citations
  | 'confidence'         // Confidence score
  | 'error'              // Error occurred
  | 'done';              // Agent loop finished

/** An event emitted by the agent loop */
export interface AgentEvent {
  type: AgentEventType;
  data: any;
}

/** Intent types supported by the agent */
export type IntentType = 'chat' | 'analyze' | 'extract' | 'generate' | 'compare';

/** A tool definition available to the agent */
export interface AgentTool {
  name: string;
  description: string;
  execute: (args: any, emit: (event: AgentEvent) => void) => Promise<any>;
}

/** A document in the agent's context */
export interface AgentDocument {
  id: string;
  filename: string;
  pageCount: number;
  pageTexts: string; // JSON-serialised array of page text strings
}

/** An analysis in the agent's context */
export interface AgentAnalysis {
  id: string;
  type: string;
  title: string;
  content: any; // JSON-parsed analysis data
}

/** An artifact in the agent's context */
export interface AgentArtifact {
  id: string;
  type: string;
  title: string;
  filename: string;
}

/** Agent context — documents, prior analyses, generated artifacts */
export interface AgentContext {
  documents: AgentDocument[];
  analyses: AgentAnalysis[];
  artifacts: AgentArtifact[];
}

/** A single step in the agent's plan */
export interface PlanStep {
  tool: string;
  description: string;
  args?: Record<string, any>;
}

/** A citation referencing a document page */
export interface Citation {
  docId: string;
  filename: string;
  page: number;
}

// ---------------------------------------------------------------------------
// Per-invocation event collector
// ---------------------------------------------------------------------------

/**
 * Create a side-channel event collector.
 * Returns an `emit` callback and a `drain` function.
 * `emit` pushes events into a local array; `drain` returns and clears them.
 * This avoids module-level mutable state and is safe for concurrent use.
 */
function createEventCollector() {
  const buffer: AgentEvent[] = [];

  function emit(event: AgentEvent): void {
    buffer.push(event);
  }

  function drain(): AgentEvent[] {
    const events = buffer.slice();
    buffer.length = 0;
    return events;
  }

  return { emit, drain };
}

// ---------------------------------------------------------------------------
// Intent Classification (regex heuristics — no LLM)
// ---------------------------------------------------------------------------

/** Pattern-to-intent mapping for fast classification */
const INTENT_PATTERNS: Array<{ patterns: RegExp[]; intent: IntentType }> = [
  {
    patterns: [/\b(analyze|review|assess|evaluate|examine|audit|inspect)\b/i],
    intent: 'analyze',
  },
  {
    patterns: [/\b(extract|bidders|submissions|excel|spreadsheet|export data|pull data)\b/i],
    intent: 'extract',
  },
  {
    patterns: [/\b(generate|prepare|create document|compliance|write report|draft|produce)\b/i],
    intent: 'generate',
  },
  {
    patterns: [/\b(compare|vs|versus|difference|contrast|benchmarked|side[\s-]by[\s-]side)\b/i],
    intent: 'compare',
  },
];

/**
 * Classify the user's message intent using regex heuristics.
 * Returns 'chat' as the default when no patterns match.
 */
function classifyIntent(message: string): IntentType {
  for (const { patterns, intent } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(message)) return intent;
    }
  }
  return 'chat';
}

// ---------------------------------------------------------------------------
// Context Summary Builder
// ---------------------------------------------------------------------------

/**
 * Build a concise summary of the agent context for LLM prompts.
 */
function buildContextSummary(context: AgentContext): string {
  const parts: string[] = [];

  if (context.documents.length > 0) {
    parts.push(`Documents (${context.documents.length}):`);
    for (const doc of context.documents) {
      parts.push(`  - [${doc.id}] ${doc.filename} (${doc.pageCount} pages)`);
    }
  }

  if (context.analyses.length > 0) {
    parts.push(`Analyses (${context.analyses.length}):`);
    for (const a of context.analyses) {
      parts.push(`  - [${a.id}] ${a.type}: ${a.title}`);
    }
  }

  if (context.artifacts.length > 0) {
    parts.push(`Artifacts (${context.artifacts.length}):`);
    for (const art of context.artifacts) {
      parts.push(`  - [${art.id}] ${art.type}: ${art.title} (${art.filename})`);
    }
  }

  return parts.length > 0 ? parts.join('\n') : 'No documents or analyses loaded.';
}

// ---------------------------------------------------------------------------
// Document Page Text Access
// ---------------------------------------------------------------------------

/**
 * Safely parse the `pageTexts` JSON string from a document and return
 * the array of page text strings.
 */
function getPageTexts(doc: AgentDocument): string[] {
  try {
    const parsed = JSON.parse(doc.pageTexts);
    if (Array.isArray(parsed)) return parsed as string[];
    return [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Citation Extraction
// ---------------------------------------------------------------------------

/**
 * Extract citations from text matching patterns like `[docId p.X]` or `[p.X]`.
 */
function extractCitations(text: string, documents: AgentDocument[]): Citation[] {
  const citations: Citation[] = [];
  const seen = new Set<string>();

  // Pattern: [docId p.X] — with document ID
  const fullPattern = /\[([^\s\]]+)\s+p\.(\d+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = fullPattern.exec(text)) !== null) {
    const docId = match[1];
    const page = parseInt(match[2], 10);
    const key = `${docId}:${page}`;
    if (!seen.has(key)) {
      seen.add(key);
      const doc = documents.find((d) => d.id === docId);
      citations.push({
        docId,
        filename: doc?.filename ?? docId,
        page,
      });
    }
  }

  // Pattern: [p.X] — page only, associate with first document
  const pageOnlyPattern = /\[p\.(\d+)\]/g;
  while ((match = pageOnlyPattern.exec(text)) !== null) {
    const page = parseInt(match[1], 10);
    const doc = documents[0];
    if (doc) {
      const key = `${doc.id}:${page}`;
      if (!seen.has(key)) {
        seen.add(key);
        citations.push({
          docId: doc.id,
          filename: doc.filename,
          page,
        });
      }
    }
  }

  return citations;
}

// ---------------------------------------------------------------------------
// Built-in Tools
// ---------------------------------------------------------------------------

/**
 * Search across document page texts for keywords.
 * Returns matching pages with text snippets.
 */
async function toolSearchDocuments(
  args: { query?: string; docId?: string },
  context: AgentContext,
  emit: (event: AgentEvent) => void,
): Promise<Array<{ docId: string; filename: string; page: number; snippet: string }>> {
  const query = args.query || args.docId || '';
  const { docId } = args;

  // If no query and no documents, return empty
  if (!query && context.documents.length === 0) {
    emit({ type: 'tool_call_progress', data: { message: 'No search query provided and no documents available.' } });
    return [];
  }

  const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results: Array<{ docId: string; filename: string; page: number; snippet: string }> = [];

  const docs = docId
    ? context.documents.filter((d) => d.id === docId)
    : context.documents;

  emit({ type: 'tool_call_progress', data: { message: query ? `Searching ${docs.length} document(s) for "${query}"…` : `Listing all content from ${docs.length} document(s)…` } });

  for (const doc of docs) {
    const pageTexts = getPageTexts(doc);
    for (let i = 0; i < pageTexts.length; i++) {
      const pageText = pageTexts[i].toLowerCase();
      // If no keywords, return all pages; otherwise match on keywords
      const matchCount = keywords.length === 0 ? 1 : keywords.filter((kw) => pageText.includes(kw)).length;
      if (matchCount > 0) {
        // Extract a snippet around the first keyword match (or from beginning if no keywords)
        let snippet: string;
        if (keywords.length > 0) {
          const firstKw = keywords.find((kw) => pageText.includes(kw))!;
          const idx = pageText.indexOf(firstKw);
          const start = Math.max(0, idx - 80);
          const end = Math.min(pageTexts[i].length, idx + firstKw.length + 120);
          snippet =
            (start > 0 ? '…' : '') +
            pageTexts[i].slice(start, end) +
            (end < pageTexts[i].length ? '…' : '');
        } else {
          snippet = pageTexts[i].slice(0, 200) + (pageTexts[i].length > 200 ? '…' : '');
        }

        results.push({
          docId: doc.id,
          filename: doc.filename,
          page: i + 1,
          snippet,
        });
      }
    }
  }

  // Sort by number of keyword matches (best first)
  results.sort((a, b) => {
    const aScore = keywords.filter((kw) => a.snippet.toLowerCase().includes(kw)).length;
    const bScore = keywords.filter((kw) => b.snippet.toLowerCase().includes(kw)).length;
    return bScore - aScore;
  });

  return results.slice(0, 20); // Cap at 20 results
}

/**
 * Read a specific page of a document by ID and page number.
 */
async function toolReadPage(
  args: { docId: string; page: number },
  context: AgentContext,
  _emit: (event: AgentEvent) => void,
): Promise<{ docId: string; filename: string; page: number; text: string } | null> {
  const { docId, page } = args;
  const doc = context.documents.find((d) => d.id === docId);
  if (!doc) return null;

  const pageTexts = getPageTexts(doc);
  const zeroIndexed = page - 1;
  if (zeroIndexed < 0 || zeroIndexed >= pageTexts.length) return null;

  return {
    docId: doc.id,
    filename: doc.filename,
    page,
    text: pageTexts[zeroIndexed],
  };
}

/**
 * Run full extraction via runFullExtraction from agent-extraction.
 * This is the main analysis tool.
 */
async function toolExtractTenderAnalysis(
  args: { docId?: string },
  context: AgentContext,
  emit: (event: AgentEvent) => void,
): Promise<ExtractionResult | null> {
  const docId = args.docId;
  const doc = docId
    ? context.documents.find((d) => d.id === docId)
    : context.documents[0];

  if (!doc) {
    emit({ type: 'tool_call_progress', data: { message: 'No document available for extraction.' } });
    return null;
  }

  emit({ type: 'tool_call_progress', data: { message: `Extracting tender data from "${doc.filename}"…` } });

  // Build the doc context string using buildDocContext
  const pageTexts = getPageTexts(doc);
  const parsedDoc: ParsedDocument = {
    filename: doc.filename,
    filetype: doc.filename.split('.').pop()?.toLowerCase() || 'unknown',
    pages: pageTexts.map((text, i) => ({ pageNum: i + 1, text })),
    totalPages: doc.pageCount,
  };

  const docContextStr = buildDocContext([parsedDoc]);

  // Run the full multi-pass extraction
  const result = await runFullExtraction(docContextStr, doc.pageCount);

  emit({
    type: 'tool_call_progress',
    data: { message: `Extraction complete — ${result.bidders.length} bidder(s) found.` },
  });

  return result;
}

/**
 * Generate a compliance DOCX document.
 * Delegates to the docgen library.
 */
async function toolGenerateComplianceDoc(
  args: { docId?: string; requirements?: any[] },
  context: AgentContext,
  emit: (event: AgentEvent) => void,
): Promise<{ filename: string; size: number } | null> {
  const docId = args.docId;
  const doc = docId
    ? context.documents.find((d) => d.id === docId)
    : context.documents[0];

  if (!doc) {
    emit({ type: 'tool_call_progress', data: { message: 'No document available for compliance doc generation.' } });
    return null;
  }

  emit({ type: 'tool_call_progress', data: { message: `Generating compliance document for "${doc.filename}"…` } });

  // Build a basic ApplicationDocInput from the document context
  const input: ApplicationDocInput = {
    applicantName: 'Applicant Organization',
    tenderTitle: doc.filename.replace(/\.[^.]+$/, ''),
    requirements:
      args.requirements?.map((r: any) => ({
        requirement: r.requirement || r.term || 'Requirement',
        category: r.category || 'General',
        ourResponse: r.ourResponse || r.response || 'To be completed',
        evidence: r.evidence || 'To be provided',
        status: r.status || 'partial',
      })) ??
      [
        {
          requirement: 'Compliance review pending',
          category: 'General',
          ourResponse: 'Under review',
          evidence: 'To be provided',
          status: 'partial' as const,
        },
      ],
  };

  const buffer = await generateComplianceDocx(input);

  emit({
    type: 'tool_call_progress',
    data: { message: `Compliance document generated (${buffer.length} bytes).` },
  });

  return {
    filename: `compliance-${doc.filename.replace(/\.[^.]+$/, '')}.docx`,
    size: buffer.length,
  };
}

/**
 * Compare analyses that exist in the agent context.
 */
async function toolCompareTenders(
  _args: { analysisIds?: string[] },
  context: AgentContext,
  emit: (event: AgentEvent) => void,
): Promise<any> {
  const analyses = context.analyses.filter(
    (a) => a.type === 'extraction' || a.type === 'tender_analysis',
  );

  if (analyses.length < 2) {
    emit({
      type: 'tool_call_progress',
      data: { message: 'Need at least 2 analyses to compare. Found ' + analyses.length + '.' },
    });
    return { error: 'Insufficient analyses for comparison', count: analyses.length };
  }

  emit({ type: 'tool_call_progress', data: { message: `Comparing ${analyses.length} tender analyses…` } });

  // Build a comparison summary from the analyses
  const comparison = analyses.map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type,
    summary: a.content,
  }));

  return comparison;
}

// ---------------------------------------------------------------------------
// Plan Generation (LLM call)
// ---------------------------------------------------------------------------

/**
 * Ask the LLM to generate a plan of steps based on the classified intent
 * and the agent context. Streams thinking events into the collector.
 *
 * Returns the plan steps and any buffered events.
 */
async function generatePlan(
  message: string,
  intent: IntentType,
  context: AgentContext,
  emit: (event: AgentEvent) => void,
): Promise<PlanStep[]> {
  const contextSummary = buildContextSummary(context);

  const zai = await getZAI();

  const systemPrompt = `You are a planning agent for a tender/procurement analysis system.

Based on the user's message, their intent, and the available context, generate a plan of steps to execute.

Available tools:
- search_documents: Search across document page texts for keywords. Args: { query: string, docId?: string }
- read_page: Read a specific page of a document. Args: { docId: string, page: number }
- extract_tender_analysis: Run full extraction (bidders, metadata, key terms, confidence). Args: { docId?: string }
- generate_compliance_doc: Generate a compliance DOCX document. Args: { docId?: string, requirements?: array }
- compare_tenders: Compare analyses in context. Args: { analysisIds?: string[] }

Respond with a JSON array of steps. Each step has "tool" (tool name), "description" (what this step does), and optional "args" (tool arguments).
Example: [{"tool": "search_documents", "description": "Search for bidder names", "args": {"query": "bidder price"}}]

Output ONLY the JSON array, no other text.`;

  const userPrompt = `User message: "${message}"
Intent: ${intent}
Context:
${contextSummary}
${context.documents.length === 0 ? 'NOTE: No documents have been uploaded yet. Do NOT use search_documents or extract_tender_analysis tools. Skip directly to answering the user.\n' : ''}
Generate a plan to answer this query. Keep it to 1-3 steps maximum. If no documents are available and the intent is 'chat', return an empty array [].`;

  emit({ type: 'thinking_start', data: {} });
  emit({ type: 'thinking_delta', data: { text: 'Analyzing your request and planning the approach…\n' } });

  const response = await zai.chat.completions.create({
    model: 'default',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    thinking: { type: 'disabled' },
  });

  const raw = response.choices?.[0]?.message?.content?.trim() || '[]';

  emit({ type: 'thinking_delta', data: { text: `\nPlan reasoning: ${raw.slice(0, 200)}…\n` } });
  emit({ type: 'thinking_end', data: {} });

  // Parse the plan
  try {
    // Strip markdown code fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    const steps = JSON.parse(cleaned);
    if (Array.isArray(steps)) {
      return steps.map((s: any) => ({
        tool: s.tool || 'search_documents',
        description: s.description || '',
        args: s.args || {},
      }));
    }
  } catch {
    // Fallback: generate a default plan based on intent
  }

  return getDefaultPlan(intent, context);
}

/**
 * Default plan when LLM plan generation fails.
 */
function getDefaultPlan(intent: IntentType, context: AgentContext): PlanStep[] {
  const hasDocuments = context.documents.length > 0;
  const docId = context.documents[0]?.id;

  switch (intent) {
    case 'analyze':
      return hasDocuments
        ? [{ tool: 'extract_tender_analysis', description: 'Extract and analyze tender data', args: { docId } }]
        : [{ tool: 'search_documents', description: 'Search documents for relevant information', args: { query: 'tender' } }];

    case 'extract':
      return hasDocuments
        ? [{ tool: 'extract_tender_analysis', description: 'Extract bidder data from documents', args: { docId } }]
        : [{ tool: 'search_documents', description: 'Search for bidder/submission data', args: { query: 'bidder submissions' } }];

    case 'generate':
      return hasDocuments
        ? [
            { tool: 'extract_tender_analysis', description: 'Extract data for compliance document', args: { docId } },
            { tool: 'generate_compliance_doc', description: 'Generate compliance DOCX', args: { docId } },
          ]
        : [{ tool: 'generate_compliance_doc', description: 'Generate compliance document', args: {} }];

    case 'compare':
      return [{ tool: 'compare_tenders', description: 'Compare available tender analyses', args: {} }];

    case 'chat':
    default:
      return hasDocuments
        ? [{ tool: 'search_documents', description: 'Search documents for relevant context', args: { query: 'tender' } }]
        : [];
  }
}

// ---------------------------------------------------------------------------
// Rich Markdown Builder (for analyze/extract intents — no LLM re-call)
// ---------------------------------------------------------------------------

/**
 * Build rich markdown directly from extraction data.
 * Used for `analyze` and `extract` intents to avoid re-asking the LLM.
 */
function buildExtractionMarkdown(
  result: ExtractionResult,
  docFilename: string,
): string {
  const lines: string[] = [];

  lines.push(`## Tender Analysis: ${docFilename}`);
  lines.push('');

  // --- Metadata ---
  lines.push('### Metadata');
  lines.push('');
  const meta = result.metadata;
  if (meta.title?.value) lines.push(`- **Title**: ${meta.title.value} (${(meta.title.confidence * 100).toFixed(0)}% confidence)`);
  if (meta.tenderNumber?.value) lines.push(`- **Tender Number**: ${meta.tenderNumber.value} (${(meta.tenderNumber.confidence * 100).toFixed(0)}%)`);
  if (meta.issuingAuthority?.value) lines.push(`- **Issuing Authority**: ${meta.issuingAuthority.value} (${(meta.issuingAuthority.confidence * 100).toFixed(0)}%)`);
  if (meta.publishedDate?.value) lines.push(`- **Published Date**: ${meta.publishedDate.value}`);
  if (meta.closingDate?.value) lines.push(`- **Closing Date**: ${meta.closingDate.value}`);
  if (meta.estimatedValue) lines.push(`- **Estimated Value**: ${meta.estimatedValue.currency} ${meta.estimatedValue.amount.toLocaleString()} (${meta.estimatedValue.raw})`);
  if (meta.category?.value) lines.push(`- **Category**: ${meta.category.value}`);
  lines.push('');

  // --- Bidder Table ---
  if (result.bidders.length > 0) {
    lines.push('### Bidders / Submissions');
    lines.push('');
    lines.push('| # | Name | Bid Price | Tech Score | Comm Score | Total Score | Rank | Compliance |');
    lines.push('|---|------|-----------|-----------|-----------|-------------|------|------------|');

    for (let i = 0; i < result.bidders.length; i++) {
      const b = result.bidders[i];
      const price = b.bidPrice ? `${b.bidPrice.currency} ${b.bidPrice.amount.toLocaleString()}` : '—';
      const tech = b.technicalScore ? `${b.technicalScore.score}/${b.technicalScore.maxScore}` : '—';
      const comm = b.commercialScore ? `${b.commercialScore.score}/${b.commercialScore.maxScore}` : '—';
      const total = b.totalScore ? `${b.totalScore.score}/${b.totalScore.maxScore}` : '—';
      const rank = b.rank ? String(b.rank.value) : String(i + 1);
      const compliance = b.compliance?.value || '—';
      lines.push(`| ${i + 1} | ${b.name.value} | ${price} | ${tech} | ${comm} | ${total} | ${rank} | ${compliance} |`);
    }
    lines.push('');
  }

  // --- Key Terms ---
  if (result.keyTerms.length > 0) {
    lines.push('### Key Terms & Requirements');
    lines.push('');
    lines.push('| Term | Description | Category |');
    lines.push('|------|-------------|----------|');
    for (const kt of result.keyTerms) {
      lines.push(`| ${kt.term} | ${kt.description} | ${kt.category} |`);
    }
    lines.push('');
  }

  // --- Confidence ---
  lines.push('### Confidence');
  lines.push('');
  const pct = (result.overallConfidence * 100).toFixed(1);
  const filledBars = Math.round(result.overallConfidence * 20);
  const bar = '█'.repeat(filledBars) + '░'.repeat(20 - filledBars);
  lines.push(`**Overall**: ${pct}% ${bar}`);
  lines.push(`**Extraction Date**: ${result.extractionDate}`);
  lines.push(`**Pages Analyzed**: ${result.pageCount}`);
  lines.push('');

  // --- Gaps ---
  if (result.gaps.length > 0) {
    lines.push('### Data Gaps');
    lines.push('');
    for (const gap of result.gaps) {
      const icon = gap.severity === 'high' ? '🔴' : gap.severity === 'medium' ? '🟡' : '🟢';
      lines.push(`- ${icon} **${gap.field}** (${gap.severity}): ${gap.description}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Answer Synthesis
// ---------------------------------------------------------------------------

/**
 * Synthesize the final answer after tool execution.
 *
 * - For `analyze` and `extract` intents: build rich markdown directly
 *   from extraction data WITHOUT re-asking the LLM.
 * - For `chat` and `compare` intents: ask the LLM to synthesize an answer.
 * - For `generate` intents: describe what was generated with download info.
 */
async function* synthesizeAnswer(
  intent: IntentType,
  message: string,
  toolResults: Map<string, any>,
  context: AgentContext,
): AsyncGenerator<AgentEvent> {
  // --- analyze / extract: direct markdown from extraction data ---
  if (
    (intent === 'analyze' || intent === 'extract') &&
    toolResults.has('extract_tender_analysis')
  ) {
    const result: ExtractionResult = toolResults.get('extract_tender_analysis');
    const docFilename = context.documents[0]?.filename ?? 'document';
    const markdown = buildExtractionMarkdown(result, docFilename);

    yield { type: 'answer_start', data: {} };

    // Stream the markdown in chunks for UI effect
    const chunkSize = 120;
    for (let i = 0; i < markdown.length; i += chunkSize) {
      yield { type: 'answer_delta', data: { text: markdown.slice(i, i + chunkSize) } };
    }

    yield { type: 'answer_end', data: {} };

    // Emit citations
    const citations = extractCitations(markdown, context.documents);
    if (citations.length > 0) {
      yield { type: 'citations', data: { citations } };
    }

    // Emit confidence
    yield { type: 'confidence', data: { score: result.overallConfidence } };
    return;
  }

  // --- generate: describe what was generated ---
  if (intent === 'generate') {
    yield { type: 'answer_start', data: {} };

    const docResult = toolResults.get('generate_compliance_doc');
    const extractResult = toolResults.get('extract_tender_analysis');

    let answer = '## Document Generated\n\n';

    if (docResult) {
      answer += `A **compliance document** has been generated:\n\n`;
      answer += `- **Filename**: \`${docResult.filename}\`\n`;
      answer += `- **Size**: ${(docResult.size / 1024).toFixed(1)} KB\n\n`;
      answer += `The document includes a cover page, executive summary, compliance matrix, gap analysis, and declaration.\n\n`;
    }

    if (extractResult) {
      answer += `The compliance document was based on an extraction that found **${extractResult.bidders.length} bidder(s)** with an overall confidence of **${(extractResult.overallConfidence * 100).toFixed(1)}%**.\n`;
    }

    if (!docResult && !extractResult) {
      answer += 'The document generation is pending. Please ensure documents are loaded and try again.\n';
    }

    yield { type: 'answer_delta', data: { text: answer } };
    yield { type: 'answer_end', data: {} };
    return;
  }

  // --- chat / compare: LLM synthesis ---
  const zai = await getZAI();

  // Build a context string for the LLM
  let contextForLLM = '';

  if (toolResults.has('search_documents')) {
    const searchResults = toolResults.get('search_documents');
    if (Array.isArray(searchResults) && searchResults.length > 0) {
      contextForLLM += 'Search results:\n';
      for (const r of searchResults.slice(0, 10)) {
        contextForLLM += `[${r.filename} p.${r.page}]: ${r.snippet}\n`;
      }
      contextForLLM += '\n';
    } else if (searchResults?.error) {
      contextForLLM += `Search encountered an issue: ${searchResults.error}\n\n`;
    }
  }

  if (toolResults.has('read_page')) {
    const pageResult = toolResults.get('read_page');
    if (pageResult) {
      contextForLLM += `Page content [${pageResult.filename} p.${pageResult.page}]:\n${pageResult.text}\n\n`;
    }
  }

  if (toolResults.has('compare_tenders')) {
    const compareResult = toolResults.get('compare_tenders');
    if (compareResult && !compareResult.error) {
      contextForLLM += 'Comparison data:\n';
      contextForLLM += JSON.stringify(compareResult, null, 2) + '\n\n';
    }
  }

  if (toolResults.has('extract_tender_analysis')) {
    const extractResult = toolResults.get('extract_tender_analysis');
    if (extractResult) {
      contextForLLM += 'Extraction data:\n';
      contextForLLM += `Bidders: ${extractResult.bidders.length}, Confidence: ${(extractResult.overallConfidence * 100).toFixed(1)}%\n`;
      for (const b of extractResult.bidders) {
        contextForLLM += `- ${b.name.value}: ${b.bidPrice ? b.bidPrice.raw : 'N/A'}\n`;
      }
      contextForLLM += '\n';
    }
  }

  // Also include any document context
  if (context.documents.length > 0) {
    const docs = context.documents.map((doc) => {
      const pageTexts = getPageTexts(doc);
      return {
        filename: doc.filename,
        filetype: doc.filename.split('.').pop()?.toLowerCase() || 'unknown',
        pages: pageTexts.map((text, i) => ({ pageNum: i + 1, text })),
        totalPages: doc.pageCount,
      } as ParsedDocument;
    });
    const docCtx = buildDocContext(docs);
    if (docCtx.length > 0 && contextForLLM.length < 8000) {
      contextForLLM += 'Document context:\n' + docCtx.slice(0, 6000) + '\n\n';
    }
  }

  const systemPrompt =
    intent === 'compare'
      ? 'You are a procurement analyst comparing tender analyses. Provide a clear, structured comparison highlighting differences in pricing, scores, compliance, and key terms. Use markdown tables and bullet points.'
      : `You are a helpful AI assistant for TenetBid, a procurement and tender management platform. You can help users with:

- **Tender Analysis**: Upload tender documents and I can extract bidder data, prices, scores, and generate Excel reports
- **Compliance Documents**: Generate requirements compliance documents (DOCX) based on tender analysis
- **Document Search**: Search through uploaded documents for specific information
- **Tender Comparison**: Compare multiple tender analyses side by side

Answer the user's question helpfully. If they haven't uploaded documents yet, suggest they do so to unlock the full analysis capabilities. Use markdown for formatting. Cite sources using [filename p.X] format when referencing documents.`;

  const userPrompt = contextForLLM
    ? `Context:\n${contextForLLM}\n\nUser question: ${message}`
    : message;

  yield { type: 'answer_start', data: {} };

  try {
    const completion = await zai.chat.completions.create({
      model: 'default',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    const fullAnswer = completion.choices?.[0]?.message?.content || '';

    if (fullAnswer) {
      // Stream the answer in chunks for UI effect
      const chunkSize = 120;
      for (let i = 0; i < fullAnswer.length; i += chunkSize) {
        yield { type: 'answer_delta', data: { text: fullAnswer.slice(i, i + chunkSize) } };
      }
    } else {
      yield { type: 'answer_delta', data: { text: 'I apologize, but I was unable to generate a response. Please try again.' } };
    }

    yield { type: 'answer_end', data: {} };

    // Extract and emit citations from the answer
    const citations = extractCitations(fullAnswer, context.documents);
    if (citations.length > 0) {
      yield { type: 'citations', data: { citations } };
    }
  } catch (err: any) {
    yield {
      type: 'answer_delta',
      data: { text: `I encountered an issue generating the response: ${err?.message || 'Unknown error'}` },
    };
    yield { type: 'answer_end', data: {} };
  }
}

// ---------------------------------------------------------------------------
// Main Agent Loop
// ---------------------------------------------------------------------------

/**
 * Run the ReAct agent loop.
 *
 * This is an async generator that yields `AgentEvent` objects.
 * The caller consumes these for real-time UI updates.
 *
 * Flow:
 *   1. Classify intent (regex heuristics)
 *   2. Generate plan (LLM, streams thinking)
 *   3. Execute tools from the plan
 *   4. Synthesize final answer
 *   5. Yield 'done' event
 */
export async function* runAgentLoop(
  message: string,
  context: AgentContext,
  history: Array<{ role: string; content: string }>,
): AsyncGenerator<AgentEvent> {
  // ------------------------------------------------------------------
  // Step 1: Intent Classification
  // ------------------------------------------------------------------
  const intent = classifyIntent(message);
  yield { type: 'intent', data: { intent, message } };

  // ------------------------------------------------------------------
  // Step 2: Planning
  // ------------------------------------------------------------------
  let plan: PlanStep[];

  const planCollector = createEventCollector();

  try {
    plan = await generatePlan(message, intent, context, planCollector.emit);

    // Yield any buffered thinking events from plan generation
    for (const evt of planCollector.drain()) {
      yield evt;
    }
  } catch (err: any) {
    // Drain any partial events
    for (const evt of planCollector.drain()) {
      yield evt;
    }
    yield { type: 'error', data: { message: `Planning failed: ${err?.message || 'Unknown error'}` } };
    plan = getDefaultPlan(intent, context);
  }

  // Emit the plan
  yield { type: 'plan', data: { steps: plan, intent } };

  // ------------------------------------------------------------------
  // Step 3: Tool Execution
  // ------------------------------------------------------------------
  const toolResults = new Map<string, any>();

  for (let i = 0; i < plan.length; i++) {
    const step = plan[i];
    const toolName = step.tool;
    const toolArgs = step.args || {};

    yield {
      type: 'tool_call_start',
      data: { tool: toolName, description: step.description, stepIndex: i, totalSteps: plan.length },
    };

    const toolCollector = createEventCollector();

    try {
      let result: any;

      switch (toolName) {
        case 'search_documents': {
          result = await toolSearchDocuments(
            toolArgs as { query: string; docId?: string },
            context,
            toolCollector.emit,
          );
          break;
        }

        case 'read_page': {
          result = await toolReadPage(
            toolArgs as { docId: string; page: number },
            context,
            toolCollector.emit,
          );
          break;
        }

        case 'extract_tender_analysis': {
          result = await toolExtractTenderAnalysis(
            toolArgs as { docId?: string },
            context,
            toolCollector.emit,
          );
          break;
        }

        case 'generate_compliance_doc': {
          result = await toolGenerateComplianceDoc(
            toolArgs as { docId?: string; requirements?: any[] },
            context,
            toolCollector.emit,
          );
          break;
        }

        case 'compare_tenders': {
          result = await toolCompareTenders(
            toolArgs as { analysisIds?: string[] },
            context,
            toolCollector.emit,
          );
          break;
        }

        default:
          result = { error: `Unknown tool: ${toolName}` };
      }

      // Yield any progress events from the tool
      for (const evt of toolCollector.drain()) {
        yield evt;
      }

      // Store and emit the result
      toolResults.set(toolName, result);
      yield { type: 'tool_call_result', data: { tool: toolName, result } };
    } catch (err: any) {
      // Yield any progress events collected before the error
      for (const evt of toolCollector.drain()) {
        yield evt;
      }

      const errorResult = { error: err?.message || 'Tool execution failed' };
      toolResults.set(toolName, errorResult);
      yield { type: 'tool_call_result', data: { tool: toolName, result: errorResult } };
      yield { type: 'error', data: { message: `Tool "${toolName}" failed: ${err?.message || 'Unknown error'}` } };
    }

    yield { type: 'tool_call_end', data: { tool: toolName, stepIndex: i } };
  }

  // ------------------------------------------------------------------
  // Step 4: Answer Synthesis
  // ------------------------------------------------------------------
  yield* synthesizeAnswer(intent, message, toolResults, context);

  // ------------------------------------------------------------------
  // Step 5: Done
  // ------------------------------------------------------------------
  yield { type: 'done', data: { intent, toolResults: Object.fromEntries(toolResults) } };
}
