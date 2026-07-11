import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/applicants
 * Fetch applicants (bidders) for tenders the user published,
 * but ONLY after the tender deadline has closed.
 * Supports filtering by tenderId, status, search.
 * Returns rich applicant data: bid info, user profile, company, tender details.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const tenderId = searchParams.get('tenderId') || '';
    const bidStatus = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const skip = (page - 1) * limit;

    // Build where clause: only tenders published by this user
    // AND only tenders whose deadline has passed
    const now = new Date();

    // Base tender filter: published by current user AND deadline passed
    const baseTenderFilter: Record<string, unknown> = {
      createdBy: user!.id,
      deadline: { lte: now },
    };

    const where: Record<string, unknown> = {
      tender: baseTenderFilter,
    };

    if (tenderId) {
      // Additional filter for specific tender
      where.tenderId = tenderId;
      // Still enforce: must be user's own tender AND closed
      where.tender = {
        ...baseTenderFilter,
        id: tenderId,
      };
    }

    if (bidStatus) {
      where.status = bidStatus;
    }

    if (search) {
      const searchFilter = {
        OR: [
          { user: { profile: { fullName: { contains: search } } } },
          { user: { email: { contains: search } } },
          { user: { company: { name: { contains: search } } } },
          { tender: { title: { contains: search } } },
          { technicalProposal: { contains: search } },
        ],
      };
      // Merge search into where using AND
      where.AND = [searchFilter];
    }

    const [bids, total] = await Promise.all([
      db.bid.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          tender: {
            select: {
              id: true,
              title: true,
              status: true,
              budgetMin: true,
              budgetMax: true,
              deadline: true,
              location: true,
              categoryTags: true,
              requiredDocs: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  fullName: true,
                  jobTitle: true,
                  phone: true,
                  location: true,
                  skillTags: true,
                  verified: true,
                  licenseNumber: true,
                  tinNumber: true,
                },
              },
              company: {
                select: {
                  id: true,
                  name: true,
                  industry: true,
                  verified: true,
                  registrationNo: true,
                  tinNumber: true,
                  city: true,
                  country: true,
                },
              },
            },
          },
          documents: {
            select: {
              id: true,
              fileName: true,
              docType: true,
              fileUrl: true,
              status: true,
              ocrStatus: true,
              ocrProcessedAt: true,
              aiReviewStatus: true,
              aiReviewProcessedAt: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      db.bid.count({ where }),
    ]);

    // Also get the user's tenders that are still open (deadline not yet passed)
    // so the UI can show "waiting for deadline" info
    const myOpenTenders = await db.tender.findMany({
      where: {
        createdBy: user!.id,
        deadline: { gt: now },
      },
      select: {
        id: true,
        title: true,
        deadline: true,
        status: true,
        _count: { select: { bids: true } },
      },
      orderBy: { deadline: 'asc' },
    });

    // Also get the user's closed tenders (for the tender filter dropdown)
    const myClosedTenders = await db.tender.findMany({
      where: {
        createdBy: user!.id,
        deadline: { lte: now },
      },
      select: {
        id: true,
        title: true,
        deadline: true,
        status: true,
        _count: { select: { bids: true } },
      },
      orderBy: { deadline: 'desc' },
    });

    // Flatten to spreadsheet-friendly rows
    const rows = bids.map((bid) => ({
      id: bid.id,
      // Bid info
      tenderId: bid.tenderId,
      tenderTitle: bid.tender.title,
      tenderStatus: bid.tender.status,
      tenderBudgetMin: bid.tender.budgetMin,
      tenderBudgetMax: bid.tender.budgetMax,
      tenderDeadline: bid.tender.deadline,
      tenderLocation: bid.tender.location,
      categoryTags: bid.tender.categoryTags,
      // Applicant personal info
      applicantId: bid.userId,
      applicantName: bid.user?.profile?.fullName || bid.user?.email || 'Unknown',
      applicantEmail: bid.user?.email || '',
      applicantPhone: bid.user?.profile?.phone || '',
      applicantJobTitle: bid.user?.profile?.jobTitle || '',
      applicantLocation: bid.user?.profile?.location || '',
      applicantSkills: bid.user?.profile?.skillTags || '',
      applicantVerified: bid.user?.profile?.verified || false,
      applicantLicense: bid.user?.profile?.licenseNumber || '',
      applicantTin: bid.user?.profile?.tinNumber || '',
      // Company info
      companyId: bid.user?.company?.id || '',
      companyName: bid.user?.company?.name || 'Individual',
      companyIndustry: bid.user?.company?.industry || '',
      companyVerified: bid.user?.company?.verified || false,
      companyRegistration: bid.user?.company?.registrationNo || '',
      companyTin: bid.user?.company?.tinNumber || '',
      companyCity: bid.user?.company?.city || '',
      companyCountry: bid.user?.company?.country || '',
      // Bid details
      financialProposal: bid.financialProposal,
      timeline: bid.timeline,
      technicalProposal: bid.technicalProposal,
      attachments: bid.attachments,
      bidStatus: bid.status,
      rejectionNote: bid.rejectionNote || '',
      submittedAt: bid.createdAt,
      // Documents (from other sites / bid attachments)
      documents: (bid.documents || []).map((d: { id: string; fileName: string; docType: string; fileUrl: string; status: string; ocrStatus: string; ocrProcessedAt: Date | null; aiReviewStatus: string; aiReviewProcessedAt: Date | null; createdAt: Date }) => ({
        id: d.id,
        fileName: d.fileName,
        docType: d.docType,
        fileUrl: d.fileUrl,
        status: d.status,
        ocrStatus: d.ocrStatus,
        ocrProcessedAt: d.ocrProcessedAt,
        aiReviewStatus: d.aiReviewStatus,
        aiReviewProcessedAt: d.aiReviewProcessedAt,
        createdAt: d.createdAt,
      })),
      // Tender required docs for context
      requiredDocs: bid.tender.requiredDocs || '',
    }));

    // Get summary stats (only for user's closed tenders)
    const statsWhere = {
      tender: { createdBy: user!.id, deadline: { lte: now } },
    };

    const statusCounts = await db.bid.groupBy({
      by: ['status'],
      where: statsWhere,
      _count: { status: true },
    });

    const totalBudgetSum = rows.reduce((sum, r) => sum + r.financialProposal, 0);
    const uniqueTenders = new Set(rows.map(r => r.tenderId)).size;
    const uniqueCompanies = new Set(rows.filter(r => r.companyId).map(r => r.companyId)).size;

    return NextResponse.json({
      success: true,
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        statusCounts: statusCounts.reduce((acc: Record<string, number>, s: { status: string; _count: { status: number } }) => {
          acc[s.status] = s._count.status;
          return acc;
        }, {}),
        totalBudgetSum,
        uniqueTenders,
        uniqueCompanies,
      },
      // Additional context: open tenders still accepting bids
      openTenders: myOpenTenders.map(t => ({
        id: t.id,
        title: t.title,
        deadline: t.deadline,
        status: t.status,
        bidCount: t._count.bids,
      })),
      // Closed tenders (eligible for viewing applicants)
      closedTenders: myClosedTenders.map(t => ({
        id: t.id,
        title: t.title,
        deadline: t.deadline,
        status: t.status,
        bidCount: t._count.bids,
      })),
    });
  } catch (err) {
    console.error('List applicants error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching applicants' },
      { status: 500 }
    );
  }
}
