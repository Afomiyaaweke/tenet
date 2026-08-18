import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import PDFDocument from 'pdfkit';

// Vercel Hobby tier: 10s max
export const maxDuration = 10;
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    const tender = await db.tender.findUnique({
      where: { id },
      include: {
        bids: {
          include: {
            user: {
              select: {
                email: true,
                profile: { select: { fullName: true, jobTitle: true } },
                company: { select: { name: true } },
              },
            },
            documents: { select: { fileName: true, docType: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          select: { id: true, fileName: true, docType: true, status: true, createdAt: true },
        },
        company: { select: { name: true } },
      },
    });

    if (!tender) {
      return NextResponse.json({ success: false, error: 'Tender not found' }, { status: 404 });
    }

    // Generate PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true,
      info: {
        Title: `Tender Requirements - ${tender.title}`,
        Author: 'TenetBid',
        Subject: 'Tender Requirements Document',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Header bar
    doc.rect(0, 0, doc.page.width, 80).fill('#1e293b');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
      .text('TENDER REQUIREMENTS', 50, 28, { width: pageWidth });
    doc.fillColor('#fb923c').fontSize(10).font('Helvetica')
      .text('TenetBid', 50, 58, { width: pageWidth });
    doc.fillColor('#ffffff').fontSize(10)
      .text(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), 50, 58, { width: pageWidth, align: 'right' });

    doc.y = 100;

    // Title
    doc.fillColor('#1e293b').fontSize(18).font('Helvetica-Bold')
      .text(tender.title, { width: pageWidth });

    doc.moveDown(0.5);

    // Status badge
    const statusColors: Record<string, string> = {
      open: '#10b981', closed: '#ef4444', awarded: '#f59e0b', draft: '#94a3b8', cancelled: '#ef4444',
    };
    const statusColor = statusColors[tender.status] || '#94a3b8';
    const statusY = doc.y;
    doc.roundedRect(doc.x, statusY, 70, 20, 4).fill(statusColor);
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
      .text(tender.status.toUpperCase(), doc.x + 35, statusY + 5, { width: 70, align: 'center' });
    doc.y = statusY + 28;

    doc.moveDown(0.5);

    // Key Details Table
    doc.fillColor('#64748b').fontSize(9).font('Helvetica')
      .text('KEY DETAILS', { width: pageWidth, underline: false });
    doc.moveDown(0.3);

    const details = [
      ['Budget Range', `ETB ${(tender.budgetMin ?? 0).toLocaleString()} - ${(tender.budgetMax ?? 0).toLocaleString()}`],
      ['Deadline', new Date(tender.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
      ['Location', tender.location || 'Not specified'],
      ['Category', tender.categoryTags || 'N/A'],
      ['Published By', tender.company?.name || 'N/A'],
      ['Created', new Date(tender.createdAt).toLocaleDateString('en-GB')],
    ];

    for (const [label, value] of details) {
      const rowY = doc.y;
      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold')
        .text(label, 50, rowY, { width: 130, continued: false });
      doc.fillColor('#1e293b').fontSize(9).font('Helvetica')
        .text(value, 180, rowY, { width: pageWidth - 130 });
      doc.y = rowY + 16;
    }

    doc.moveDown(0.5);

    // Divider
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.moveDown(0.8);

    // Scope / Description
    doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold')
      .text('SCOPE & DESCRIPTION', { width: pageWidth });
    doc.moveDown(0.4);
    doc.fillColor('#334155').fontSize(9.5).font('Helvetica')
      .text(tender.scope || 'No description provided.', { width: pageWidth, lineGap: 3 });
    doc.moveDown(1);

    // Divider
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.moveDown(0.8);

    // Required Documents
    doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold')
      .text('REQUIRED DOCUMENTS', { width: pageWidth });
    doc.moveDown(0.4);

    const requiredDocs = (tender.requiredDocs || '').split(',').map(d => d.trim()).filter(Boolean);
    if (requiredDocs.length > 0) {
      for (const docName of requiredDocs) {
        doc.fillColor('#10b981').fontSize(10).text('●', 50, doc.y, { continued: true });
        doc.fillColor('#334155').fontSize(9.5).font('Helvetica')
          .text(`  ${docName}`, { width: pageWidth - 20, lineGap: 2 });
        doc.moveDown(0.15);
      }
    } else {
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
        .text('No specific documents listed.', { width: pageWidth });
    }
    doc.moveDown(1);

    // Attached Documents
    if (tender.documents.length > 0) {
      if (doc.y > 650) doc.addPage();

      doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold')
        .text('ATTACHED DOCUMENTS', { width: pageWidth });
      doc.moveDown(0.4);

      for (const attachment of tender.documents) {
        const statusIcon = attachment.status === 'approved' ? '✓' : attachment.status === 'rejected' ? '✗' : '○';
        doc.fillColor('#64748b').fontSize(9).font('Helvetica')
          .text(`${statusIcon}  ${attachment.fileName}  (${attachment.docType})`, 50, doc.y, { width: pageWidth });
        doc.moveDown(0.15);
      }
      doc.moveDown(1);
    }

    // Bids Summary
    if (tender.bids.length > 0) {
      if (doc.y > 600) doc.addPage();

      doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold')
        .text('BIDS SUMMARY', { width: pageWidth });
      doc.moveDown(0.4);

      // Table header
      const tableY = doc.y;
      doc.rect(50, tableY, pageWidth, 18).fill('#f1f5f9');
      doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold');
      doc.text('Bidder', 55, tableY + 4, { width: 140 });
      doc.text('Company', 195, tableY + 4, { width: 120 });
      doc.text('Amount (ETB)', 315, tableY + 4, { width: 90, align: 'right' });
      doc.text('Status', 410, tableY + 4, { width: 80 });
      doc.y = tableY + 22;

      for (const bid of tender.bids) {
        const bidder = bid.user?.profile?.fullName || bid.user?.email || 'Unknown';
        const company = bid.user?.company?.name || '-';
        const amount = bid.financialProposal.toLocaleString();
        const status = bid.status.replace(/_/g, ' ');

        if (doc.y > 750) {
          doc.addPage();
        }

        const rowY = doc.y;
        doc.fillColor('#334155').fontSize(8).font('Helvetica');
        doc.text(bidder.substring(0, 25), 55, rowY, { width: 140 });
        doc.text(company.substring(0, 20), 195, rowY, { width: 120 });
        doc.text(amount, 315, rowY, { width: 90, align: 'right' });
        doc.text(status, 410, rowY, { width: 80 });
        doc.y = rowY + 16;
      }
    }

    // Footer
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.save();
      doc.fillColor('#94a3b8').fontSize(7).font('Helvetica');
      doc.text(
        `TenetBid - Generated ${new Date().toLocaleString('en-GB')} - Page ${i + 1} of ${pages.count}`,
        50,
        doc.page.height - 30,
        { width: pageWidth, align: 'center' },
      );
      doc.restore();
    }

    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const safeName = tender.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Tender_${safeName}_Requirements.pdf"`,
      },
    });
  } catch (err) {
    console.error('[GET /api/tenders/[id]/export-pdf] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to export PDF' },
      { status: 500 },
    );
  }
}
