import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/applicants
 * Fetch all applicants (bidders) across the user's company tenders in a flat,
 * spreadsheet-friendly format. Supports filtering by tenderId, status, search.
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

    // Build where clause based on role
    const where: Record<string, unknown> = {};

    if (user!.role === 'team_admin' && user!.companyId) {
      // Team admin sees applicants for their company's tenders
      where.tender = { companyId: user!.companyId };
    } else {
      // Regular user sees applicants on tenders they submitted bids to
      // OR they can see their own bids
      where.OR = [
        { userId: user!.id },
        { tender: { createdBy: user!.id } },
      ];
    }

    if (tenderId) {
      delete where.OR;
      where.tenderId = tenderId;
      // Still enforce company isolation
      if (user!.role === 'team_admin' && user!.companyId) {
        where.tender = { companyId: user!.companyId };
      }
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
      if (where.OR) {
        where.AND = [searchFilter];
      } else {
        Object.assign(where, searchFilter);
      }
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
        },
      }),
      db.bid.count({ where }),
    ]);

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
    }));

    // Get summary stats
    const statsWhere = user!.role === 'team_admin' && user!.companyId
      ? { tender: { companyId: user!.companyId } }
      : tenderId
        ? { tenderId }
        : { userId: user!.id };

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
    });
  } catch (err) {
    console.error('List applicants error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching applicants' },
      { status: 500 }
    );
  }
}
