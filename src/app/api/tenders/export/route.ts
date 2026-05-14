import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';
    const ownerOnly = searchParams.get('ownerOnly') === 'true';

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (category) {
      where.categoryTags = { contains: category };
    }

    // Tender owners can only export their own tenders
    if (ownerOnly || user!.role === 'tender_owner') {
      where.createdBy = user!.id;
    }

    const tenders = await db.tender.findMany({
      where,
      include: {
        _count: { select: { bids: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get bid details for each tender
    const tendersWithBids = await Promise.all(
      tenders.map(async (tender) => {
        const bids = await db.bid.findMany({
          where: { tenderId: tender.id },
          include: {
            user: {
              select: {
                email: true,
                profile: { select: { fullName: true, companyName: true } },
              },
            },
          },
        });

        return { ...tender, bids };
      })
    );

    // Create workbook
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Tenders Summary ──
    const tenderRows = tendersWithBids.map((t) => ({
      'Tender ID': t.id,
      'Title': t.title,
      'Status': t.status,
      'Budget Min (ETB)': t.budgetMin,
      'Budget Max (ETB)': t.budgetMax,
      'Location': t.location,
      'Category Tags': t.categoryTags,
      'Deadline': new Date(t.deadline).toLocaleDateString(),
      'Required Docs': t.requiredDocs || 'None',
      'Total Bids': t._count.bids,
      'Created At': new Date(t.createdAt).toLocaleDateString(),
    }));

    const ws1 = XLSX.utils.json_to_sheet(tenderRows);
    // Set column widths
    ws1['!cols'] = [
      { wch: 36 }, { wch: 40 }, { wch: 12 }, { wch: 16 }, { wch: 16 },
      { wch: 18 }, { wch: 25 }, { wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Tenders Summary');

    // ── Sheet 2: Bids Detail ──
    const bidRows: Record<string, unknown>[] = [];
    tendersWithBids.forEach((tender) => {
      if (tender.bids.length === 0) {
        bidRows.push({
          'Tender Title': tender.title,
          'Tender Status': tender.status,
          'Bidder Name': 'No bids',
          'Company': '-',
          'Financial Proposal (ETB)': '-',
          'Timeline': '-',
          'Bid Status': '-',
          'Submitted At': '-',
        });
      } else {
        tender.bids.forEach((bid) => {
          bidRows.push({
            'Tender Title': tender.title,
            'Tender Status': tender.status,
            'Bidder Name': bid.user?.profile?.fullName || bid.user?.email || 'Unknown',
            'Company': bid.user?.profile?.companyName || '-',
            'Financial Proposal (ETB)': bid.financialProposal,
            'Timeline': bid.timeline,
            'Bid Status': bid.status,
            'Submitted At': new Date(bid.createdAt).toLocaleDateString(),
          });
        });
      }
    });

    const ws2 = XLSX.utils.json_to_sheet(bidRows);
    ws2['!cols'] = [
      { wch: 40 }, { wch: 14 }, { wch: 25 }, { wch: 25 },
      { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Bids Detail');

    // ── Sheet 3: Analytics Summary ──
    const totalTenders = tendersWithBids.length;
    const openTenders = tendersWithBids.filter(t => t.status === 'open').length;
    const closedTenders = tendersWithBids.filter(t => t.status === 'closed').length;
    const awardedTenders = tendersWithBids.filter(t => t.status === 'awarded').length;
    const cancelledTenders = tendersWithBids.filter(t => t.status === 'cancelled').length;
    const totalBids = tendersWithBids.reduce((sum, t) => sum + t.bids.length, 0);
    const avgBidsPerTender = totalTenders > 0 ? (totalBids / totalTenders).toFixed(1) : '0';
    const totalBudgetMin = tendersWithBids.reduce((sum, t) => sum + t.budgetMin, 0);
    const totalBudgetMax = tendersWithBids.reduce((sum, t) => sum + t.budgetMax, 0);
    const awardedBids = tendersWithBids.flatMap(t => t.bids).filter(b => b.status === 'awarded');
    const totalAwardedValue = awardedBids.reduce((sum, b) => sum + b.financialProposal, 0);

    // Category breakdown
    const categoryMap: Record<string, number> = {};
    tendersWithBids.forEach(t => {
      t.categoryTags.split(',').map(s => s.trim()).filter(Boolean).forEach(cat => {
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
      });
    });

    const analyticsRows = [
      { 'Metric': 'Total Tenders', 'Value': totalTenders },
      { 'Metric': 'Open Tenders', 'Value': openTenders },
      { 'Metric': 'Closed Tenders', 'Value': closedTenders },
      { 'Metric': 'Awarded Tenders', 'Value': awardedTenders },
      { 'Metric': 'Cancelled Tenders', 'Value': cancelledTenders },
      { 'Metric': 'Total Bids Received', 'Value': totalBids },
      { 'Metric': 'Avg Bids per Tender', 'Value': avgBidsPerTender },
      { 'Metric': 'Total Budget Range (ETB)', 'Value': `${totalBudgetMin.toLocaleString()} - ${totalBudgetMax.toLocaleString()}` },
      { 'Metric': 'Total Awarded Value (ETB)', 'Value': totalAwardedValue.toLocaleString() },
      { 'Metric': '', 'Value': '' },
      { 'Metric': '── Category Breakdown ──', 'Value': '' },
      ...Object.entries(categoryMap).map(([cat, count]) => ({
        'Metric': cat,
        'Value': count,
      })),
    ];

    const ws3 = XLSX.utils.json_to_sheet(analyticsRows);
    ws3['!cols'] = [{ wch: 35 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Analytics');

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="tenet-tenders-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to export tenders' },
      { status: 500 }
    );
  }
}
