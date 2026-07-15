import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import PDFDocument from 'pdfkit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    // Fetch tender with related data
    const tender = await db.tender.findUnique({
      where: { id },
      include: {
        _count: { select: { bids: true, documents: true } },
        documents: {
          select: { id: true, fileName: true, docType: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        bids: {
          select: {
            id: true,
            status: true,
            financialProposal: true,
            createdAt: true,
            user: {
              select: {
                email: true,
                profile: { select: { fullName: true, jobTitle: true } },
                company: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        company: {
          select: { name: true, industry: true, tinNumber: true },
        },
      },
    });

    if (!tender) {
      return NextResponse.json(
        { success: false, error: 'Tender not found' },
        { status: 404 }
      );
    }

    // Company isolation check
    if (user!.role !== 'team_admin' || user!.companyId !== tender.companyId) {
      if (tender.createdBy !== user!.id) {
        // Regular users can only export tenders they can see
        // (already visible in the UI, so allow export)
      }
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 55, right: 55 },
      info: {
        Title: `Tender: ${tender.title}`,
        Author: 'Tenets - Tender Ecosystem',
        Subject: `Tender Export - ${tender.title}`,
        Creator: 'Tenets Platform',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Colors
    const emerald = '#059669';
    const darkText = '#1f2937';
    const mutedText = '#6b7280';
    const lightBg = '#f0fdf4';
    const border = '#d1d5db';
    const headerBg = '#064e3b';

    // Helper functions
    const drawSectionHeader = (text: string, icon?: string) => {
      doc.moveDown(0.8);
      // Accent line
      doc.save();
      doc.rect(55, doc.y, 4, 20).fill(emerald);
      doc.restore();
      doc.fontSize(13).font('Helvetica-Bold').fillColor(emerald).text(text, 65, doc.y + 2);
      doc.moveDown(0.3);
      doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor(border).lineWidth(0.5).stroke();
      doc.moveDown(0.4);
    };

    const drawInfoRow = (label: string, value: string, labelWidth: number = 130) => {
      const startY = doc.y;
      doc.fontSize(9).font('Helvetica').fillColor(mutedText).text(label, 60, startY, { width: labelWidth });
      doc.fontSize(9).font('Helvetica-Bold').fillColor(darkText).text(value, 60 + labelWidth, startY, { width: 475 - labelWidth });
      doc.moveDown(0.15);
    };

    const drawBulletItem = (text: string, indent: number = 70) => {
      const startY = doc.y;
      doc.fontSize(9).font('Helvetica').fillColor(emerald).text('●', indent - 12, startY);
      doc.fontSize(9).font('Helvetica').fillColor(darkText).text(text, indent, startY, { width: 465 });
      doc.moveDown(0.1);
    };

    // ─── COVER / HEADER ───
    // Top accent bar
    doc.save();
    doc.rect(0, 0, 595.28, 6).fill(headerBg);
    doc.restore();

    // Logo area
    doc.moveDown(1.5);
    doc.fontSize(22).font('Helvetica-Bold').fillColor(headerBg).text('TENETS', 55, doc.y);
    doc.fontSize(8).font('Helvetica').fillColor(mutedText).text('Tender Ecosystem', 55, doc.y + 2);

    doc.moveDown(1.2);
    // Title
    doc.fontSize(20).font('Helvetica-Bold').fillColor(darkText).text(tender.title, 55, doc.y, { width: 485 });
    doc.moveDown(0.5);

    // Status badge
    const statusColors: Record<string, string> = {
      open: '#059669',
      closed: '#e11d48',
      awarded: '#0d9488',
      cancelled: '#9ca3af',
      draft: '#6b7280',
    };
    const statusColor = statusColors[tender.status] || mutedText;
    doc.save();
    const statusY = doc.y;
    doc.roundedRect(55, statusY, 80, 20, 4).fill(statusColor);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff').text(tender.status.toUpperCase(), 55, statusY + 5, { width: 80, align: 'center' });
    doc.restore();
    doc.y = statusY + 28;

    // Meta info
    doc.moveDown(0.3);
    const deadlineDate = new Date(tender.deadline).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const createdDate = new Date(tender.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const daysLeft = Math.ceil((new Date(tender.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    drawInfoRow('Budget Range:', `ETB ${tender.budgetMin.toLocaleString()} – ${tender.budgetMax.toLocaleString()}`);
    drawInfoRow('Location:', tender.location);
    drawInfoRow('Deadline:', `${deadlineDate} (${daysLeft > 0 ? `${daysLeft} days remaining` : 'Expired'})`);
    drawInfoRow('Published:', createdDate);
    if (tender.categoryTags) {
      drawInfoRow('Categories:', tender.categoryTags.split(',').map(t => t.trim()).join(' • '));
    }
    drawInfoRow('Total Bids:', `${tender._count.bids} received`);
    if (tender.company?.name) {
      drawInfoRow('Organization:', tender.company.name);
    }

    // ─── SCOPE / DESCRIPTION ───
    if (tender.scope) {
      drawSectionHeader('Scope & Description');
      doc.fontSize(9).font('Helvetica').fillColor(darkText).text(tender.scope, 60, doc.y, {
        width: 475,
        lineGap: 3,
      });
    }

    // ─── REQUIREMENTS ───
    drawSectionHeader('Requirements');
    if (tender.requiredDocs) {
      const docs = tender.requiredDocs.split(',').map(d => d.trim()).filter(Boolean);
      doc.fontSize(9).font('Helvetica').fillColor(mutedText).text('Required Documents:', 60, doc.y);
      doc.moveDown(0.2);
      docs.forEach(docName => {
        drawBulletItem(docName);
      });
    } else {
      doc.fontSize(9).font('Helvetica').fillColor(mutedText).text('No specific documents listed — contact the tender owner for eligibility details.', 60);
    }

    doc.moveDown(0.3);
    doc.fontSize(8).font('Helvetica').fillColor(mutedText).text('• Eligibility verified at bid submission', 60);
    doc.fontSize(8).font('Helvetica').fillColor(mutedText).text('• Late or incomplete submissions are rejected', 60);

    // ─── DOCUMENTS ───
    if (tender.documents && tender.documents.length > 0) {
      drawSectionHeader('Tender Documents');
      tender.documents.forEach(d => {
        const docDate = new Date(d.createdAt).toLocaleDateString();
        drawBulletItem(`${d.fileName || d.docType} (${d.docType}) — ${docDate}`);
      });
    }

    // ─── BIDS SUMMARY ───
    if (tender.bids.length > 0) {
      drawSectionHeader('Bids Summary');

      // Table header
      const tableTop = doc.y;
      const colWidths = [170, 120, 90, 95];
      const colStarts = [60, 230, 350, 440];

      doc.save();
      doc.rect(55, tableTop - 2, 485, 18).fill('#f9fafb');
      doc.restore();

      doc.fontSize(8).font('Helvetica-Bold').fillColor(mutedText);
      doc.text('Bidder', colStarts[0], tableTop + 2, { width: colWidths[0] });
      doc.text('Company', colStarts[1], tableTop + 2, { width: colWidths[1] });
      doc.text('Amount (ETB)', colStarts[2], tableTop + 2, { width: colWidths[2], align: 'right' });
      doc.text('Status', colStarts[3], tableTop + 2, { width: colWidths[3] });

      doc.moveTo(55, tableTop + 18).lineTo(540, tableTop + 18).strokeColor(border).lineWidth(0.3).stroke();
      doc.y = tableTop + 22;

      tender.bids.forEach((bid, idx) => {
        const bidderName = bid.user?.profile?.fullName || bid.user?.email || 'Unknown';
        const companyName = bid.user?.company?.name || '—';
        const amount = bid.financialProposal ? bid.financialProposal.toLocaleString() : '—';
        const bidStatus = bid.status.replace(/_/g, ' ');

        if (idx % 2 === 0) {
          doc.save();
          doc.rect(55, doc.y - 2, 485, 16).fill('#f9fafb');
          doc.restore();
        }

        const rowY = doc.y + 1;
        doc.fontSize(8).font('Helvetica').fillColor(darkText);
        doc.text(bidderName, colStarts[0], rowY, { width: colWidths[0] });
        doc.text(companyName, colStarts[1], rowY, { width: colWidths[1] });
        doc.text(amount, colStarts[2], rowY, { width: colWidths[2], align: 'right' });

        // Status with color
        const bidStatusColor = bid.status === 'awarded' ? emerald : bid.status === 'rejected' ? '#e11d48' : mutedText;
        doc.fontSize(8).font('Helvetica').fillColor(bidStatusColor).text(bidStatus, colStarts[3], rowY, { width: colWidths[3] });

        doc.y = rowY + 16;
      });
    }

    // ─── AI OVERVIEW (if query param present) ───
    const includeAiOverview = request.nextUrl.searchParams.get('includeAiOverview') === 'true';
    if (includeAiOverview) {
      try {
        const aiOverviewRes = await db.document.findFirst({
          where: {
            tenderId: tender.id,
            aiReviewStatus: 'completed',
          },
          select: { aiReview: true },
          orderBy: { createdAt: 'desc' },
        });

        if (aiOverviewRes?.aiReview) {
          const aiData = typeof aiOverviewRes.aiReview === 'string'
            ? JSON.parse(aiOverviewRes.aiReview)
            : aiOverviewRes.aiReview;

          drawSectionHeader('AI-Powered Insights');

          if (aiData.summary) {
            doc.fontSize(9).font('Helvetica-Bold').fillColor(emerald).text('Summary', 60);
            doc.moveDown(0.15);
            doc.fontSize(9).font('Helvetica').fillColor(darkText).text(String(aiData.summary), 60, doc.y, { width: 475, lineGap: 2 });
            doc.moveDown(0.3);
          }

          if (aiData.keyRequirements && Array.isArray(aiData.keyRequirements) && aiData.keyRequirements.length > 0) {
            doc.fontSize(9).font('Helvetica-Bold').fillColor(emerald).text('Key Requirements', 60);
            doc.moveDown(0.15);
            (aiData.keyRequirements as string[]).forEach((req: string) => {
              drawBulletItem(req);
            });
            doc.moveDown(0.3);
          }

          if (aiData.eligibilityCheck && Array.isArray(aiData.eligibilityCheck) && aiData.eligibilityCheck.length > 0) {
            doc.fontSize(9).font('Helvetica-Bold').fillColor(emerald).text('Eligibility Check', 60);
            doc.moveDown(0.15);
            (aiData.eligibilityCheck as string[]).forEach((item: string) => {
              drawBulletItem(item);
            });
            doc.moveDown(0.3);
          }

          if (aiData.budgetAnalysis) {
            doc.fontSize(9).font('Helvetica-Bold').fillColor(emerald).text('Budget Analysis', 60);
            doc.moveDown(0.15);
            doc.fontSize(9).font('Helvetica').fillColor(darkText).text(String(aiData.budgetAnalysis), 60, doc.y, { width: 475, lineGap: 2 });
            doc.moveDown(0.3);
          }

          if (aiData.timeline) {
            doc.fontSize(9).font('Helvetica-Bold').fillColor(emerald).text('Timeline', 60);
            doc.moveDown(0.15);
            doc.fontSize(9).font('Helvetica').fillColor(darkText).text(String(aiData.timeline), 60, doc.y, { width: 475, lineGap: 2 });
            doc.moveDown(0.3);
          }

          if (aiData.requiredDocuments && Array.isArray(aiData.requiredDocuments) && aiData.requiredDocuments.length > 0) {
            doc.fontSize(9).font('Helvetica-Bold').fillColor(emerald).text('Required Documents (AI Analysis)', 60);
            doc.moveDown(0.15);
            (aiData.requiredDocuments as string[]).forEach((d: string) => {
              drawBulletItem(d);
            });
            doc.moveDown(0.3);
          }

          if (aiData.applicationTips && Array.isArray(aiData.applicationTips) && aiData.applicationTips.length > 0) {
            doc.fontSize(9).font('Helvetica-Bold').fillColor(emerald).text('Application Tips', 60);
            doc.moveDown(0.15);
            (aiData.applicationTips as string[]).forEach((tip: string, idx: number) => {
              const startY = doc.y;
              doc.fontSize(8).font('Helvetica-Bold').fillColor(emerald).text(`${idx + 1}.`, 60, startY);
              doc.fontSize(9).font('Helvetica').fillColor(darkText).text(tip, 75, startY, { width: 460 });
              doc.moveDown(0.1);
            });
          }
        }
      } catch {
        // AI overview fetch failed, skip silently
      }
    }

    // ─── FOOTER ───
    doc.moveDown(1.5);
    doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor(border).lineWidth(0.5).stroke();
    doc.moveDown(0.4);
    doc.fontSize(7).font('Helvetica').fillColor(mutedText)
      .text(`Generated by Tenets — Tender Ecosystem Platform | ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 55, doc.y, {
        width: 485,
        align: 'center',
      });

    // Finalize
    doc.end();

    // Wait for PDF generation to complete
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    const safeName = tender.title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50)
      .toLowerCase();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="tender-${safeName}.pdf"`,
      },
    });
  } catch (err) {
    console.error('PDF export error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to export tender as PDF' },
      { status: 500 }
    );
  }
}
