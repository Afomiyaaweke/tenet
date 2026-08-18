import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

// Allow up to 60s on Vercel Pro (10s on Hobby)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * POST /api/tenders/fetch-doc
 * Fetches and extracts content from an external tender document URL.
 * Uses the z-ai-web-dev-sdk page_reader to extract clean text from
 * requirement documents, RFP pages, and procurement portals.
 *
 * Body:
 *  - url: string (required) - The URL of the external document to read
 */
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

    // Use the z-ai-web-dev-sdk page_reader to fetch content
    const zai = await ZAI.create();
    const result = await zai.functions.invoke('page_reader', { url });

    if (!result || !result.data) {
      return NextResponse.json(
        { success: false, error: 'Failed to extract content from the URL' },
        { status: 500 },
      );
    }

    const { title, html, publishedTime } = result.data;

    // Convert HTML to clean text
    const plainText = (html || '')
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

    // Extract sections by looking for common heading patterns
    const sections: { heading: string; content: string }[] = [];
    const sectionPatterns = [
      /(?:^|\n)([A-Z][A-Z\s&]+(?:REQUIREMENTS?|SPECIFICATIONS?|SCOPE|ELIGIBILITY|QUALIFICATIONS?|CRITERIA|TERMS?|CONDITIONS?|INSTRUCTIONS?|GUIDELINES?|OVERVIEW|SUMMARY|BACKGROUND|OBJECTIVES?|DELIVERABLES?|TIMELINE|BUDGET|SUBMISSION|PROPOSAL|CONTRACT|EVALUATION|DOCUMENTATION|COMPLIANCE|EXPERIENCE|TECHNICAL|FINANCIAL)[A-Z\s&:]*)\s*\n([\s\S]*?)(?=\n[A-Z][A-Z\s&]+(?:REQUIREMENTS?|SPECIFICATIONS?|SCOPE|ELIGIBILITY|QUALIFICATIONS?|CRITERIA|TERMS?|CONDITIONS?|INSTRUCTIONS?|GUIDELINES?|OVERVIEW|SUMMARY|BACKGROUND|OBJECTIVES?|DELIVERABLES?|TIMELINE|BUDGET|SUBMISSION|PROPOSAL|CONTRACT|EVALUATION|DOCUMENTATION|COMPLIANCE|EXPERIENCE|TECHNICAL|FINANCIAL)[A-Z\s&:]*\s*\n|$)/gi,
    ];

    for (const pattern of sectionPatterns) {
      const matches = [...plainText.matchAll(pattern)];
      for (const match of matches) {
        const heading = match[1].trim();
        const content = match[2].trim();
        if (heading && content && content.length > 20) {
          sections.push({ heading, content });
        }
      }
    }

    // Extract potential deadlines and budget mentions
    const deadlines: string[] = [];
    const budgets: string[] = [];

    const deadlinePatterns = [
      /(?:deadline|due date|closing date|submission date|end date)[:\s]+([^\n]{5,50})/gi,
      /(?:by|before|on|until)\s+(\d{1,2}[\s\/-]\w{3,9}[\s\/-]\d{2,4})/gi,
      /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{2,4})/gi,
    ];
    const budgetPatterns = [
      /(?:budget|value|amount|cost|price|contract value|estimated value)[:\s]+([^\n]{5,80})/gi,
      /(?:USD|EUR|GBP|ETB|COP|MXN|CLP|ARS|UYU)\s*[\d,]+(?:\.\d{2})?/gi,
      /[\$€£]\s*[\d,]+(?:\.\d{2})?/g,
    ];

    for (const p of deadlinePatterns) {
      const matches = [...plainText.matchAll(p)];
      for (const m of matches) {
        if (m[1] && !deadlines.includes(m[1].trim())) {
          deadlines.push(m[1].trim());
        }
      }
    }
    for (const p of budgetPatterns) {
      const matches = [...plainText.matchAll(p)];
      for (const m of matches) {
        const val = m[0] || m[1];
        if (val && !budgets.includes(val.trim())) {
          budgets.push(val.trim());
        }
      }
    }

    // Extract meta description from HTML
    let metaDescription = '';
    const descMatch = (html || '').match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    if (descMatch) metaDescription = descMatch[1];

    return NextResponse.json({
      success: true,
      data: {
        title: title || '',
        metaDescription,
        content: plainText.slice(0, 15000), // Limit content size
        sections: sections.slice(0, 20),
        deadlines: deadlines.slice(0, 5),
        budgets: budgets.slice(0, 5),
        url,
        contentType: 'external_document',
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[POST /api/tenders/fetch-doc] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch document content' },
      { status: 500 },
    );
  }
}
