import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getZAI } from '@/lib/zai';

// Vercel Hobby tier: 10s max
export const maxDuration = 10;
export const dynamic = 'force-dynamic';

/**
 * POST /api/tenders/fetch-doc/export-csv
 * Fetches content from an external URL using the page_reader, extracts
 * structured data (sections, deadlines, budgets), and returns a downloadable
 * CSV file with all the extracted information.
 *
 * Body:
 *  - url: string (required) - The HTTP(S) URL of the external document
 *  - title?: string (optional) - Override title for the CSV metadata
 */

// ── CSV helper ────────────────────────────────────────────────────────────
// Properly quotes a field for CSV output: wraps in double-quotes if the
// value contains commas, double-quotes, or newlines, and escapes any
// internal double-quotes by doubling them.
function csvField(value: string): string {
  if (!value) return '""';
  const str = String(value);
  // If the field contains a comma, double-quote, or newline, it must be quoted
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// ── HTML → clean text ─────────────────────────────────────────────────────
// Strips scripts, styles, and tags; converts block elements to newlines;
// decodes common HTML entities.
function htmlToPlainText(html: string): string {
  return (html || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Section extraction ────────────────────────────────────────────────────
// Looks for uppercase heading patterns commonly found in tender documents.
function extractSections(plainText: string): { heading: string; content: string }[] {
  const sections: { heading: string; content: string }[] = [];
  const sectionPattern =
    /(?:^|\n)([A-Z][A-Z\s&]+(?:REQUIREMENTS?|SPECIFICATIONS?|SCOPE|ELIGIBILITY|QUALIFICATIONS?|CRITERIA|TERMS?|CONDITIONS?|INSTRUCTIONS?|GUIDELINES?|OVERVIEW|SUMMARY|BACKGROUND|OBJECTIVES?|DELIVERABLES?|TIMELINE|BUDGET|SUBMISSION|PROPOSAL|CONTRACT|EVALUATION|DOCUMENTATION|COMPLIANCE|EXPERIENCE|TECHNICAL|FINANCIAL)[A-Z\s&:]*)\s*\n([\s\S]*?)(?=\n[A-Z][A-Z\s&]+(?:REQUIREMENTS?|SPECIFICATIONS?|SCOPE|ELIGIBILITY|QUALIFICATIONS?|CRITERIA|TERMS?|CONDITIONS?|INSTRUCTIONS?|GUIDELINES?|OVERVIEW|SUMMARY|BACKGROUND|OBJECTIVES?|DELIVERABLES?|TIMELINE|BUDGET|SUBMISSION|PROPOSAL|CONTRACT|EVALUATION|DOCUMENTATION|COMPLIANCE|EXPERIENCE|TECHNICAL|FINANCIAL)[A-Z\s&:]*\s*\n|$)/gi;

  const matches = [...plainText.matchAll(sectionPattern)];
  for (const match of matches) {
    const heading = match[1].trim();
    const content = match[2].trim();
    if (heading && content && content.length > 20) {
      sections.push({ heading, content });
    }
  }
  return sections.slice(0, 20);
}

// ── Deadline extraction ───────────────────────────────────────────────────
function extractDeadlines(plainText: string): string[] {
  const deadlines: string[] = [];
  const deadlinePatterns = [
    /(?:deadline|due date|closing date|submission date|end date)[:\s]+([^\n]{5,50})/gi,
    /(?:by|before|on|until)\s+(\d{1,2}[\s\/-]\w{3,9}[\s\/-]\d{2,4})/gi,
    /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{2,4})/gi,
  ];

  for (const p of deadlinePatterns) {
    const matches = [...plainText.matchAll(p)];
    for (const m of matches) {
      if (m[1] && !deadlines.includes(m[1].trim())) {
        deadlines.push(m[1].trim());
      }
    }
  }
  return deadlines.slice(0, 5);
}

// ── Budget extraction ─────────────────────────────────────────────────────
function extractBudgets(plainText: string): string[] {
  const budgets: string[] = [];
  const budgetPatterns = [
    /(?:budget|value|amount|cost|price|contract value|estimated value)[:\s]+([^\n]{5,80})/gi,
    /(?:USD|EUR|GBP|ETB|COP|MXN|CLP|ARS|UYU)\s*[\d,]+(?:\.\d{2})?/gi,
    /[\$€£]\s*[\d,]+(?:\.\d{2})?/g,
  ];

  for (const p of budgetPatterns) {
    const matches = [...plainText.matchAll(p)];
    for (const m of matches) {
      const val = m[0] || m[1];
      if (val && !budgets.includes(val.trim())) {
        budgets.push(val.trim());
      }
    }
  }
  return budgets.slice(0, 5);
}

// ── Build CSV content ─────────────────────────────────────────────────────
function buildCSV(params: {
  url: string;
  title: string;
  publishedTime: string;
  fetchedAt: string;
  deadlines: string[];
  budgets: string[];
  sections: { heading: string; content: string }[];
  fullContent: string;
}): string {
  const {
    url,
    title,
    publishedTime,
    fetchedAt,
    deadlines,
    budgets,
    sections,
    fullContent,
  } = params;

  const rows: string[] = [];

  // ── Metadata header ──
  rows.push('Field,Value');
  rows.push(`Source URL,${csvField(url)}`);
  rows.push(`Page Title,${csvField(title)}`);
  rows.push(`Published Time,${csvField(publishedTime)}`);
  rows.push(`Fetched At,${csvField(fetchedAt)}`);

  // ── Empty separator row ──
  rows.push(',');

  // ── Deadlines section ──
  rows.push('DEADLINES FOUND,');
  for (const dl of deadlines) {
    rows.push(`${csvField(dl)},`);
  }

  // ── Empty separator row ──
  rows.push(',');

  // ── Budgets section ──
  rows.push('BUDGETS FOUND,');
  for (const bg of budgets) {
    rows.push(`${csvField(bg)},`);
  }

  // ── Empty separator row ──
  rows.push(',');

  // ── Sections ──
  rows.push('Heading,Content');
  for (const sec of sections) {
    rows.push(`${csvField(sec.heading)},${csvField(sec.content)}`);
  }

  // ── Empty separator row ──
  rows.push(',');

  // ── Full content ──
  rows.push('Content,');
  const contentLines = fullContent.split('\n');
  for (const line of contentLines) {
    rows.push(`${csvField(line)},`);
  }

  return rows.join('\n');
}

// ── Route handler ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const { error } = await requireAuth(request);
    if (error) return error;

    // 2. Parse and validate request body
    const body = await request.json();
    const { url, title: overrideTitle } = body as {
      url?: string;
      title?: string;
    };

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return NextResponse.json(
        { success: false, error: 'A valid HTTP(S) URL is required' },
        { status: 400 },
      );
    }

    // 3. Fetch content via page_reader
    const zai = await getZAI();
    const result = await zai.functions.invoke('page_reader', { url });

    if (!result || !result.data) {
      return NextResponse.json(
        { success: false, error: 'Failed to extract content from the URL' },
        { status: 500 },
      );
    }

    const { title: pageTitle, html, publishedTime } = result.data as {
      title?: string;
      html?: string;
      publishedTime?: string;
    };

    // 4. Convert HTML to clean text
    const plainText = htmlToPlainText(html || '');
    const limitedContent = plainText.slice(0, 15000);

    // 5. Extract structured data
    const sections = extractSections(plainText);
    const deadlines = extractDeadlines(plainText);
    const budgets = extractBudgets(plainText);

    // 6. Build CSV
    const csvContent = buildCSV({
      url,
      title: overrideTitle || pageTitle || '',
      publishedTime: publishedTime || '',
      fetchedAt: new Date().toISOString(),
      deadlines,
      budgets,
      sections,
      fullContent: limitedContent,
    });

    // 7. Generate a safe filename from the title or URL
    const safeName = (overrideTitle || pageTitle || 'tender-document')
      .replace(/[^a-zA-Z0-9\s-]/g, '')   // remove special chars
      .replace(/\s+/g, '-')               // spaces → hyphens
      .replace(/-+/g, '-')                // collapse hyphens
      .slice(0, 60)                       // reasonable length
      .toLowerCase();

    const filename = `${safeName}-${new Date().toISOString().slice(0, 10)}.csv`;

    // 8. Return downloadable CSV
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[POST /api/tenders/fetch-doc/export-csv] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch and export document content' },
      { status: 500 },
    );
  }
}
