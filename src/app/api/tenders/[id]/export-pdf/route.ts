import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import jsPDF from 'jspdf';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const tender = await db.tender.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, company: true } },
      },
    });

    if (!tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    const requirements: string[] = JSON.parse(tender.requirements || '[]');

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    // Header accent line
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(tender.title, contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 10 + 6;

    // Organization
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Published by: ${tender.organization}`, margin, y);
    y += 8;
    if (tender.user.company) {
      doc.text(`Company: ${tender.user.company}`, margin, y);
      y += 8;
    }
    y += 4;

    // Status & Category badges
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);

    const statusColor: [number, number, number] = tender.status === 'open' ? [34, 197, 94] : tender.status === 'closed' ? [239, 68, 68] : [245, 158, 11];
    doc.setFillColor(...statusColor);
    doc.roundedRect(margin, y - 4, 35, 8, 2, 2, 'F');
    doc.text(tender.status.toUpperCase(), margin + 3, y + 1);

    doc.setFillColor(99, 102, 241);
    doc.roundedRect(margin + 40, y - 4, doc.getTextWidth(tender.category) + 10, 8, 2, 2, 'F');
    doc.text(tender.category, margin + 45, y + 1);

    y += 16;

    // Separator
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Key Details Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Details', margin, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    const details: [string, string][] = [
      ['Budget', tender.budget],
      ['Deadline', new Date(tender.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
      ['Location', tender.location || 'Not specified'],
      ['Category', tender.category],
      ['Published', new Date(tender.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
    ];

    details.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(`${label}:`, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(value, margin + 40, y);
      y += 8;
    });

    y += 6;

    // Description Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Description', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const descLines = doc.splitTextToSize(tender.description, contentWidth);
    doc.text(descLines, margin, y);
    y += descLines.length * 5 + 10;

    // Requirements Section
    if (requirements.length > 0) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Requirements', margin, y);
      y += 8;

      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(1);
      doc.line(margin, y, margin + 30, y);
      y += 6;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);

      requirements.forEach((req) => {
        const reqLines = doc.splitTextToSize(`• ${req}`, contentWidth - 5);

        if (y + reqLines.length * 5 > 280) {
          doc.addPage();
          y = 20;
        }

        doc.text(reqLines, margin + 5, y);
        y += reqLines.length * 5 + 3;
      });
    }

    // Footer on each page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Tenets - Tender Ecosystem | Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
        margin,
        287
      );
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${tender.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
