import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BidderRow {
  name: string;
  bidPrice?: string;
  technicalScore?: string;
  commercialScore?: string;
  totalScore?: string;
  rank?: number;
  compliance?: string;
  duration?: string;
  validity?: string;
}

export interface TenderInfo {
  title?: string;
  tenderNumber?: string;
  issuingAuthority?: string;
  publishedDate?: string;
  closingDate?: string;
  estimatedValue?: string;
  category?: string;
}

export interface KeyTermRow {
  term: string;
  description: string;
  category: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a numeric value from a potentially-formatted string like "$1,234.56" */
function parseNumeric(val: string | number | undefined): number | null {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  const cleaned = val.replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || isNaN(Number(cleaned))) return null;
  return Number(cleaned);
}

// ---------------------------------------------------------------------------
// Sheet Builders
// ---------------------------------------------------------------------------

function buildSubmissionsSheet(bidders: BidderRow[]): XLSX.WorkSheet {
  const header = [
    'Bidder Name',
    'Bid Price',
    'Technical Score',
    'Commercial Score',
    'Total Score',
    'Rank',
    'Compliance',
    'Duration',
    'Validity',
  ];

  const rows = bidders.map((b) => [
    b.name,
    b.bidPrice ?? '',
    b.technicalScore ?? '',
    b.commercialScore ?? '',
    b.totalScore ?? '',
    b.rank ?? '',
    b.compliance ?? '',
    b.duration ?? '',
    b.validity ?? '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

  // Column widths (approximate character counts)
  ws['!cols'] = [
    { wch: 30 }, // Bidder Name
    { wch: 16 }, // Bid Price
    { wch: 16 }, // Technical Score
    { wch: 16 }, // Commercial Score
    { wch: 14 }, // Total Score
    { wch: 8 },  // Rank
    { wch: 14 }, // Compliance
    { wch: 14 }, // Duration
    { wch: 14 }, // Validity
  ];

  // Auto-filter on header row
  ws['!autofilter'] = { ref: `A1:${String.fromCharCode(64 + header.length)}1` };

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  return ws;
}

function buildTenderInfoSheet(info: TenderInfo): XLSX.WorkSheet {
  const fields: [string, string][] = [
    ['Title', info.title ?? ''],
    ['Tender Number', info.tenderNumber ?? ''],
    ['Issuing Authority', info.issuingAuthority ?? ''],
    ['Published Date', info.publishedDate ?? ''],
    ['Closing Date', info.closingDate ?? ''],
    ['Estimated Value', info.estimatedValue ?? ''],
    ['Category', info.category ?? ''],
  ];

  const header = ['Field', 'Value'];
  const rows = fields.map(([field, value]) => [field, value]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

  ws['!cols'] = [{ wch: 22 }, { wch: 50 }];
  ws['!autofilter'] = { ref: 'A1:B1' };
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  return ws;
}

function buildKeyTermsSheet(keyTerms: KeyTermRow[]): XLSX.WorkSheet {
  const header = ['Term', 'Description', 'Category'];
  const rows = keyTerms.map((kt) => [kt.term, kt.description, kt.category]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

  ws['!cols'] = [{ wch: 30 }, { wch: 60 }, { wch: 20 }];
  ws['!autofilter'] = { ref: `A1:${String.fromCharCode(64 + header.length)}1` };
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  return ws;
}

function buildSummarySheet(bidders: BidderRow[], tenderInfo: TenderInfo): XLSX.WorkSheet {
  const totalBidders = bidders.length;

  // Average Price
  const prices = bidders.map((b) => parseNumeric(b.bidPrice)).filter((v): v is number => v !== null);
  const avgPrice = prices.length > 0 ? prices.reduce((s, v) => s + v, 0) / prices.length : null;

  // Top Score
  const scores = bidders.map((b) => parseNumeric(b.totalScore)).filter((v): v is number => v !== null);
  const topScore = scores.length > 0 ? Math.max(...scores) : null;

  // Lowest Price
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : null;

  // Highest Price
  const highestPrice = prices.length > 0 ? Math.max(...prices) : null;

  // Compliance summary
  const compliantCount = bidders.filter((b) => b.compliance?.toLowerCase() === 'compliant').length;
  const nonCompliantCount = bidders.filter((b) => b.compliance?.toLowerCase() === 'non-compliant').length;
  const partialCount = bidders.filter((b) => b.compliance?.toLowerCase() === 'partial').length;

  // Top-ranked bidder
  const topRanked = bidders.find((b) => b.rank === 1);

  const metrics: [string, string][] = [
    ['Tender Title', tenderInfo.title ?? 'N/A'],
    ['Tender Number', tenderInfo.tenderNumber ?? 'N/A'],
    ['Total Bidders', String(totalBidders)],
    ['Average Bid Price', avgPrice !== null ? avgPrice.toFixed(2) : 'N/A'],
    ['Lowest Bid Price', lowestPrice !== null ? lowestPrice.toFixed(2) : 'N/A'],
    ['Highest Bid Price', highestPrice !== null ? highestPrice.toFixed(2) : 'N/A'],
    ['Top Total Score', topScore !== null ? String(topScore) : 'N/A'],
    ['Top Ranked Bidder', topRanked ? topRanked.name : 'N/A'],
    ['Fully Compliant Bidders', String(compliantCount)],
    ['Partially Compliant Bidders', String(partialCount)],
    ['Non-Compliant Bidders', String(nonCompliantCount)],
    ['Issuing Authority', tenderInfo.issuingAuthority ?? 'N/A'],
    ['Estimated Value', tenderInfo.estimatedValue ?? 'N/A'],
    ['Closing Date', tenderInfo.closingDate ?? 'N/A'],
  ];

  const header = ['Metric', 'Value'];
  const rows = metrics.map(([metric, value]) => [metric, value]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

  ws['!cols'] = [{ wch: 28 }, { wch: 40 }];
  ws['!autofilter'] = { ref: 'A1:B1' };
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  return ws;
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

/**
 * Generate a multi-sheet Excel workbook from tender extraction results.
 *
 * Sheets:
 *  1. Submissions  – bidder comparison rows
 *  2. Tender Info  – key-value tender metadata
 *  3. Key Terms    – requirements / terms table
 *  4. Summary      – computed metrics & statistics
 *
 * All sheets have auto-filters, frozen header rows, and configured column widths.
 */
export function generateExcel(
  bidders: BidderRow[],
  tenderInfo: TenderInfo,
  keyTerms: KeyTermRow[],
): Buffer {
  const wb = XLSX.utils.book_new();

  const wsSubmissions = buildSubmissionsSheet(bidders);
  XLSX.utils.book_append_sheet(wb, wsSubmissions, 'Submissions');

  const wsTenderInfo = buildTenderInfoSheet(tenderInfo);
  XLSX.utils.book_append_sheet(wb, wsTenderInfo, 'Tender Info');

  const wsKeyTerms = buildKeyTermsSheet(keyTerms);
  XLSX.utils.book_append_sheet(wb, wsKeyTerms, 'Key Terms');

  const wsSummary = buildSummarySheet(bidders, tenderInfo);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Write to buffer (array format for Node.js)
  const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return buf;
}
