import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';
import PDFDocument from 'pdfkit';

// Allow up to 60s on Vercel Pro (10s on Hobby)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * POST /api/tenders/fetch-doc/export-pdf
 * Fetches content from an external URL and generates a downloadable PDF.
 * Combines the page_reader SDK to extract content with PDFKit to produce
 * a professional document matching the existing tender export styling.
 *
 * Body:
 *  - url: string (required) - The URL of the external document to read
 *  - title?: string (optional) - Override title for the PDF
 */
export async function POST(request: NextRequest) {
  try {
    // ── Auth check ──────────────────────────────────────────────────────
    const { error } = await requireAuth(request);
    if (error) return error;

    // ── Parse & validate request body ───────────────────────────────────
    const body = await request.json();
    const { url, title: overrideTitle } = body;

    if (!url || typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      return NextResponse.json(
        { success: false, error: 'A valid HTTP(S) URL is required' },
        { status: 400 },
      );
    }

    // ── Fetch content via z-ai-web-dev-sdk page_reader ──────────────────
    const zai = await ZAI.create();
    const result = await zai.functions.invoke('page_reader', { url });

    if (!result || !result.data) {
      return NextResponse.json(
        { success: false, error: 'Failed to extract content from the URL' },
        { status: 500 },
      );
    }

    const { title: rawTitle, html, publishedTime } = result.data;
    const pageTitle = overrideTitle || rawTitle || 'External Tender Document';

    // ── Extract hostname for attribution ────────────────────────────────
    let hostname = url;
    try {
      hostname = new URL(url).hostname;
    } catch {
      // keep raw URL as fallback
    }

    // ── Convert HTML to clean plain text ────────────────────────────────
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

    // Limit content to avoid overly large PDFs
    const contentText = plainText.slice(0, 15000);

    // ── Extract sections by heading patterns ────────────────────────────
    const sections: { heading: string; content: string }[] = [];
    const sectionPattern =
      /(?:^|\n)([A-Z][A-Z\s&]+(?:REQUIREMENTS?|SPECIFICATIONS?|SCOPE|ELIGIBILITY|QUALIFICATIONS?|CRITERIA|TERMS?|CONDITIONS?|INSTRUCTIONS?|GUIDELINES?|OVERVIEW|SUMMARY|BACKGROUND|OBJECTIVES?|DELIVERABLES?|TIMELINE|BUDGET|SUBMISSION|PROPOSAL|CONTRACT|EVALUATION|DOCUMENTATION|COMPLIANCE|EXPERIENCE|TECHNICAL|FINANCIAL)[A-Z\s&:]*)\s*\n([\s\S]*?)(?=\n[A-Z][A-Z\s&]+(?:REQUIREMENTS?|SPECIFICATIONS?|SCOPE|ELIGIBILITY|QUALIFICATIONS?|CRITERIA|TERMS?|CONDITIONS?|INSTRUCTIONS?|GUIDELINES?|OVERVIEW|SUMMARY|BACKGROUND|OBJECTIVES?|DELIVERABLES?|TIMELINE|BUDGET|SUBMISSION|PROPOSAL|CONTRACT|EVALUATION|DOCUMENTATION|COMPLIANCE|EXPERIENCE|TECHNICAL|FINANCIAL)[A-Z\s&:]*\s*\n|$)/gi;

    const sectionMatches = [...contentText.matchAll(sectionPattern)];
    for (const match of sectionMatches) {
      const heading = match[1].trim();
      const content = match[2].trim();
      if (heading && content && content.length > 20) {
        sections.push({ heading, content });
      }
    }

    // ── Extract deadlines & budgets ─────────────────────────────────────
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
      const matches = [...contentText.matchAll(p)];
      for (const m of matches) {
        if (m[1] && !deadlines.includes(m[1].trim())) {
          deadlines.push(m[1].trim());
        }
      }
    }
    for (const p of budgetPatterns) {
      const matches = [...contentText.matchAll(p)];
      for (const m of matches) {
        const val = m[0] || m[1];
        if (val && !budgets.includes(val.trim())) {
          budgets.push(val.trim());
        }
      }
    }

    // ── Generate PDF ────────────────────────────────────────────────────
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true, // needed for footer pagination
      info: {
        Title: `Original Tender Requirements - ${pageTitle}`,
        Author: 'TenetBid',
        Subject: 'Downloaded Tender Requirements Document',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const generatedDate = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const generatedDateTime = new Date().toLocaleString('en-GB');

    // ── Header bar (dark background with title) ─────────────────────────
    doc.rect(0, 0, doc.page.width, 80).fill('#1e293b');
    doc
      .fillColor('#ffffff')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('ORIGINAL TENDER REQUIREMENTS', 50, 28, { width: pageWidth });
    doc
      .fillColor('#fb923c')
      .fontSize(10)
      .font('Helvetica')
      .text('TenetBid', 50, 58, { width: pageWidth });
    doc
      .fillColor('#ffffff')
      .fontSize(10)
      .text(generatedDate, 50, 58, { width: pageWidth, align: 'right' });

    doc.y = 100;

    // ── Subtitle: source attribution ────────────────────────────────────
    doc
      .fillColor('#64748b')
      .fontSize(9)
      .font('Helvetica')
      .text(`Downloaded from ${hostname}`, { width: pageWidth });
    doc
      .fillColor('#94a3b8')
      .fontSize(8)
      .font('Helvetica')
      .text(`Source: ${url}`, { width: pageWidth });
    if (publishedTime) {
      doc
        .fillColor('#94a3b8')
        .fontSize(8)
        .text(`Published: ${publishedTime}`, { width: pageWidth });
    }
    doc.moveDown(0.6);

    // ── Page title ──────────────────────────────────────────────────────
    doc
      .fillColor('#1e293b')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(pageTitle, { width: pageWidth });
    doc.moveDown(0.6);

    // ── Key metadata: deadlines & budgets ───────────────────────────────
    if (deadlines.length > 0 || budgets.length > 0) {
      doc
        .fillColor('#64748b')
        .fontSize(9)
        .font('Helvetica')
        .text('KEY METADATA', { width: pageWidth, underline: false });
      doc.moveDown(0.3);

      for (const dl of deadlines.slice(0, 5)) {
        const rowY = doc.y;
        doc
          .fillColor('#334155')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Deadline', 50, rowY, { width: 130, continued: false });
        doc
          .fillColor('#1e293b')
          .fontSize(9)
          .font('Helvetica')
          .text(dl, 180, rowY, { width: pageWidth - 130 });
        doc.y = rowY + 16;
      }

      for (const bg of budgets.slice(0, 5)) {
        const rowY = doc.y;
        doc
          .fillColor('#334155')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Budget', 50, rowY, { width: 130, continued: false });
        doc
          .fillColor('#1e293b')
          .fontSize(9)
          .font('Helvetica')
          .text(bg, 180, rowY, { width: pageWidth - 130 });
        doc.y = rowY + 16;
      }

      doc.moveDown(0.5);

      // Divider
      doc
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();
      doc.moveDown(0.8);
    }

    // ── Content sections (with proper pagination) ───────────────────────
    if (sections.length > 0) {
      for (const section of sections.slice(0, 20)) {
        // Check if we need a new page
        if (doc.y > 700) {
          doc.addPage();
        }

        doc
          .fillColor('#1e293b')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(section.heading.toUpperCase(), { width: pageWidth });
        doc.moveDown(0.3);

        doc
          .fillColor('#334155')
          .fontSize(9.5)
          .font('Helvetica')
          .text(section.content, { width: pageWidth, lineGap: 3 });
        doc.moveDown(1);

        // Divider between sections
        doc
          .moveTo(50, doc.y)
          .lineTo(doc.page.width - 50, doc.y)
          .strokeColor('#e2e8f0')
          .lineWidth(0.5)
          .stroke();
        doc.moveDown(0.6);
      }
    }

    // ── Full content text (with proper pagination) ──────────────────────
    if (contentText) {
      if (doc.y > 700) {
        doc.addPage();
      }

      doc
        .fillColor('#1e293b')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('FULL CONTENT', { width: pageWidth });
      doc.moveDown(0.5);

      // Split content into paragraphs and render with pagination
      const paragraphs = contentText.split('\n\n');
      for (const para of paragraphs) {
        if (doc.y > 700) {
          doc.addPage();
        }
        doc
          .fillColor('#334155')
          .fontSize(9.5)
          .font('Helvetica')
          .text(para, { width: pageWidth, lineGap: 3 });
        doc.moveDown(0.4);
      }
    }

    // ── Footer on every page ────────────────────────────────────────────
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.save();
      doc.fillColor('#94a3b8').fontSize(7).font('Helvetica');
      doc.text(
        `TenetBid - Downloaded from ${hostname} - Generated ${generatedDateTime} - Page ${i + 1} of ${pages.count}`,
        50,
        doc.page.height - 30,
        { width: pageWidth, align: 'center' },
      );
      doc.restore();
    }

    doc.end();

    // ── Collect PDF buffer and return ───────────────────────────────────
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // Build a safe filename from the title
    const safeName = pageTitle
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Tender_${safeName}_Requirements.pdf"`,
      },
    });
  } catch (err) {
    console.error('[POST /api/tenders/fetch-doc/export-pdf] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to generate PDF from external URL' },
      { status: 500 },
    );
  }
}
