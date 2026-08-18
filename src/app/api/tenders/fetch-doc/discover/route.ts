import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getZAI } from '@/lib/zai';

// Vercel Hobby tier: 10s max
export const maxDuration = 10;
export const dynamic = 'force-dynamic';

/**
 * POST /api/tenders/fetch-doc/discover
 * Deep-discover a live tender page: fetches full content (50 000 chars),
 * parses HTML for linked documents (PDF, DOC, XLS, etc.) and for
 * sub-pages that likely contain requirements / RFP / bidding details.
 *
 * Body:
 *  - url: string (required) – the tender page to scan
 */

const DOC_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.ppt', '.pptx', '.rtf', '.odt', '.ods', '.zip', '.rar',
];

const REQUIREMENT_KEYWORDS = [
  'requirements', 'tender', 'rfp', 'bidding', 'procurement',
  'solicitation', 'notice', 'rfq', 'rft', 'proposal', 'bid',
  'contract', 'award', 'qualification', 'specification', 'instruction',
  'amendment', 'addendum', 'corrigendum', 'supplement',
];

function resolveUrl(base: string, href: string): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function isDocLink(href: string): boolean {
  const lower = href.toLowerCase().split('?')[0].split('#')[0];
  return DOC_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function isRequirementLink(href: string): boolean {
  const lower = href.toLowerCase();
  return REQUIREMENT_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Extract all <a> hrefs from raw HTML, classifying them. */
function discoverLinks(html: string, baseUrl: string) {
  const documentLinks: { url: string; label: string; type: string }[] = [];
  const pageLinks: { url: string; label: string; relevance: string }[] = [];
  const seen = new Set<string>();

  const aTagRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = aTagRegex.exec(html)) !== null) {
    const rawHref = match[1];
    const rawLabel = match[2].replace(/<[^>]*>/g, '').trim().slice(0, 200) || 'Untitled';

    // Skip anchors, javascript, mailto, tel
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
      continue;
    }

    const resolved = resolveUrl(baseUrl, rawHref);
    if (!resolved || seen.has(resolved)) continue;
    seen.add(resolved);

    // Only keep same-origin or closely related links
    try {
      const baseHost = new URL(baseUrl).hostname;
      const linkHost = new URL(resolved).hostname;
      // Allow subdomains and same domain
      if (!linkHost.endsWith(baseHost) && !baseHost.endsWith(linkHost)) {
        // Still include if it's a document link from a different host
        if (!isDocLink(resolved)) continue;
      }
    } catch {
      continue;
    }

    if (isDocLink(resolved)) {
      const ext = resolved.toLowerCase().split('?')[0].split('.').pop() || 'unknown';
      documentLinks.push({ url: resolved, label: rawLabel, type: ext.toUpperCase() });
    } else if (isRequirementLink(resolved)) {
      const matchedKeyword = REQUIREMENT_KEYWORDS.find((kw) => resolved.toLowerCase().includes(kw));
      pageLinks.push({ url: resolved, label: rawLabel, relevance: matchedKeyword || 'tender' });
    }
  }

  return { documentLinks, pageLinks };
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return NextResponse.json(
        { success: false, error: 'A valid HTTP(S) URL is required' },
        { status: 400 },
      );
    }

    // Fetch page content via z-ai-web-dev-sdk page_reader
    const zai = await getZAI();
    const result = await zai.functions.invoke('page_reader', { url });

    if (!result || !result.data) {
      return NextResponse.json(
        { success: false, error: 'Failed to extract content from the URL' },
        { status: 500 },
      );
    }

    const { title, html, publishedTime } = result.data;
    const rawHtml = html || '';

    // ── Discover linked documents & pages ─────────────────────────────
    const { documentLinks, pageLinks } = discoverLinks(rawHtml, url);

    // ── Convert HTML to clean text ────────────────────────────────────
    const plainText = rawHtml
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

    // ── Extract structured sections ───────────────────────────────────
    const sections: { heading: string; content: string }[] = [];
    const sectionPattern = /(?:^|\n)([A-Z][A-Z\s&]+(?:REQUIREMENTS?|SPECIFICATIONS?|SCOPE|ELIGIBILITY|QUALIFICATIONS?|CRITERIA|TERMS?|CONDITIONS?|INSTRUCTIONS?|GUIDELINES?|OVERVIEW|SUMMARY|BACKGROUND|OBJECTIVES?|DELIVERABLES?|TIMELINE|BUDGET|SUBMISSION|PROPOSAL|CONTRACT|EVALUATION|DOCUMENTATION|COMPLIANCE|EXPERIENCE|TECHNICAL|FINANCIAL|GENERAL|PARTICULARS|INVITATION|NOTICE|INFORMATION|DETAILS?|SCOPE OF WORK|STATEMENT OF WORK)[A-Z\s&:]*)\s*\n([\s\S]*?)(?=\n[A-Z][A-Z\s&]+(?:REQUIREMENTS?|SPECIFICATIONS?|SCOPE|ELIGIBILITY|QUALIFICATIONS?|CRITERIA|TERMS?|CONDITIONS?|INSTRUCTIONS?|GUIDELINES?|OVERVIEW|SUMMARY|BACKGROUND|OBJECTIVES?|DELIVERABLES?|TIMELINE|BUDGET|SUBMISSION|PROPOSAL|CONTRACT|EVALUATION|DOCUMENTATION|COMPLIANCE|EXPERIENCE|TECHNICAL|FINANCIAL|GENERAL|PARTICULARS|INVITATION|NOTICE|INFORMATION|DETAILS?|SCOPE OF WORK|STATEMENT OF WORK)[A-Z\s&:]*\s*\n|$)/gi;

    const matches = [...plainText.matchAll(sectionPattern)];
    for (const m of matches) {
      const heading = m[1].trim();
      const content = m[2].trim();
      if (heading && content && content.length > 20) {
        sections.push({ heading, content });
      }
    }

    // ── Extract deadlines ─────────────────────────────────────────────
    const deadlines: string[] = [];
    const deadlinePatterns = [
      /(?:deadline|due date|closing date|submission date|end date|last date)[:\s]+([^\n]{5,60})/gi,
      /(?:by|before|on|until)\s+(\d{1,2}[\s\/-]\w{3,9}[\s\/-]\d{2,4})/gi,
      /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{2,4})/gi,
    ];
    for (const p of deadlinePatterns) {
      const dMatches = [...plainText.matchAll(p)];
      for (const dm of dMatches) {
        if (dm[1] && !deadlines.includes(dm[1].trim())) {
          deadlines.push(dm[1].trim());
        }
      }
    }

    // ── Extract budgets ───────────────────────────────────────────────
    const budgets: string[] = [];
    const budgetPatterns = [
      /(?:budget|value|amount|cost|price|contract value|estimated value|total value)[:\s]+([^\n]{5,80})/gi,
      /(?:USD|EUR|GBP|ETB|COP|MXN|CLP|ARS|UYU|INR|AUD|CAD|CHF|JPY|CNY|BRL|ZAR|KES|NGN|GHS)\s*[\d,]+(?:\.\d{2})?/gi,
      /[\$€£]\s*[\d,]+(?:\.\d{2})?/g,
    ];
    for (const p of budgetPatterns) {
      const bMatches = [...plainText.matchAll(p)];
      for (const bm of bMatches) {
        const val = bm[0] || bm[1];
        if (val && !budgets.includes(val.trim())) {
          budgets.push(val.trim());
        }
      }
    }

    // ── Extract meta description ──────────────────────────────────────
    let metaDescription = '';
    const descMatch = rawHtml.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    if (descMatch) metaDescription = descMatch[1];

    // ── Extract meta keywords ─────────────────────────────────────────
    let metaKeywords = '';
    const kwMatch = rawHtml.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i);
    if (kwMatch) metaKeywords = kwMatch[1];

    return NextResponse.json({
      success: true,
      data: {
        title: title || '',
        metaDescription,
        metaKeywords,
        content: plainText.slice(0, 50000),
        sections: sections.slice(0, 30),
        deadlines: deadlines.slice(0, 10),
        budgets: budgets.slice(0, 10),
        documentLinks,
        pageLinks,
        url,
        publishedTime: publishedTime || null,
        contentType: 'full_discovery',
        fetchedAt: new Date().toISOString(),
        stats: {
          totalChars: plainText.length,
          sectionsFound: sections.length,
          docLinksFound: documentLinks.length,
          pageLinksFound: pageLinks.length,
          deadlinesFound: deadlines.length,
          budgetsFound: budgets.length,
        },
      },
    });
  } catch (err) {
    console.error('[POST /api/tenders/fetch-doc/discover] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to discover document content' },
      { status: 500 },
    );
  }
}
