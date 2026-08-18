import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Vercel Hobby tier: 10s max
export const maxDuration = 10;
export const dynamic = 'force-dynamic';

/**
 * Deny-list of hostnames that should never be fetched server-side
 * to prevent SSRF attacks (internal IPs, cloud metadata, etc.)
 */
const BLOCKED_HOSTNAMES = [
  'localhost', '127.0.0.1', '0.0.0.0', '::1',
  '169.254.169.254', // AWS/GCP metadata
  'metadata.google.internal',
  'metadata.azure.com',
];

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  // Check exact matches
  if (BLOCKED_HOSTNAMES.includes(lower)) return true;
  // Block private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(lower)) return true;
  // Block link-local
  if (/^169\.254\./.test(lower)) return true;
  return false;
}

/** Max response size: 1 MB */
const MAX_RESPONSE_SIZE = 1_000_000;

/**
 * GET /api/tenders/[id]/documents?url=<externalUrl>
 *
 * Fetches the external tender page content and returns it as
 * structured text so users can read the tender details inline
 * without leaving the app.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth(request);
  if (error) return error;

  // Await params (Next.js 16 dynamic route convention)
  await params;

  const url = new URL(request.url);
  const externalUrl = url.searchParams.get('url');

  if (!externalUrl) {
    return NextResponse.json(
      { success: false, error: 'External URL is required via ?url= parameter' },
      { status: 400 },
    );
  }

  // URL validation + SSRF protection
  try {
    const parsed = new URL(externalUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json(
        { success: false, error: 'Only HTTP(S) URLs are supported' },
        { status: 400 },
      );
    }
    if (isBlockedHostname(parsed.hostname)) {
      return NextResponse.json(
        { success: false, error: 'This URL is not allowed' },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid URL format' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(externalUrl, {
      headers: {
        'User-Agent': 'Tenet-Tender-Ecosystem/1.0 (+https://tenet.space-z.ai)',
        Accept: 'text/html,application/xhtml+xml,text/plain,*/*',
      },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store' as RequestCache,
    });

    // Check content length before reading
    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Document too large (max 1MB)' },
        { status: 413 },
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Upstream returned ${res.status} ${res.statusText}`,
          data: {
            title: '',
            content: '',
            url: externalUrl,
            fetchedAt: new Date().toISOString(),
            status: res.status,
          },
        },
        { status: 502 },
      );
    }

    const contentType = res.headers.get('content-type') || '';
    const html = await res.text();

    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i);
    const metaDescription = descMatch ? descMatch[1].trim() : '';

    // Strip HTML to extract clean text content
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
      .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&#\d+;/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim()
      .substring(0, 8000); // Limit to 8000 chars for inline display

    // Try to extract structured sections from the text
    const sections: { heading: string; content: string }[] = [];
    const headingRegex = /(?:^|\n)((?:SECTION|Section|PART|Part|CHAPTER|Chapter|[A-Z][A-Z\s]+:)\s*[^\n]+)/g;
    let match;
    const usedContent = new Set<number>();

    while ((match = headingRegex.exec(textContent)) !== null) {
      const start = match.index + match[0].length;
      const end = textContent.indexOf('\n\n', start) || textContent.length;
      const headingText = match[1].trim().substring(0, 120);
      const sectionContent = textContent.substring(start, Math.min(end, start + 500)).trim();

      if (headingText.length > 3 && sectionContent.length > 10 && !usedContent.has(start)) {
        sections.push({ heading: headingText, content: sectionContent });
        usedContent.add(start);
      }
      if (sections.length >= 8) break; // Max 8 sections
    }

    // Try to extract deadline dates from the text
    const deadlinePatterns = [
      /(?:deadline|closing date|submission date|due date)[:\s]+([^\n,]{10,40})/i,
      /(?:closing|submission|due)\s+(?:on|by|before|date)[:\s]+([^\n,]{10,40})/i,
      /\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i,
    ];
    const deadlines: string[] = [];
    for (const pattern of deadlinePatterns) {
      const dlMatch = textContent.match(pattern);
      if (dlMatch) deadlines.push(dlMatch[0].trim());
    }

    // Try to extract budget/amount references
    const budgetPatterns = [
      /(?:budget|contract value|estimated value|total value|amount)[:\s]+([^\n]{5,60})/i,
      /(?:USD|EUR|GBP|CHF)\s*[\d,]+(?:\.\d{2})?/g,
      /[\d,]+(?:\.\d{2})?\s*(?:USD|EUR|GBP|CHF)/g,
    ];
    const budgets: string[] = [];
    for (const pattern of budgetPatterns) {
      const bMatches = textContent.match(pattern);
      if (bMatches) budgets.push(...bMatches.slice(0, 3).map((b) => b.trim()));
    }

    return NextResponse.json({
      success: true,
      data: {
        title: title || 'Tender Document',
        metaDescription,
        content: textContent,
        sections: sections.length > 0 ? sections : undefined,
        deadlines: deadlines.length > 0 ? deadlines : undefined,
        budgets: budgets.length > 0 ? budgets : undefined,
        url: externalUrl,
        contentType,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[GET /api/tenders/[id]/documents] error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch the external document. The source server may be unreachable from this environment.',
        data: {
          title: '',
          content: '',
          url: externalUrl,
          fetchedAt: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}
