import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limiter';

/**
 * POST /api/bids
 * Any authenticated user can submit a bid
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    // ── Rate limit check ──
    const rateLimitResponse = await enforceRateLimit(request, user!.id, user!.plan || 'free');
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const { tenderId, technicalProposal, financialProposal, timeline, attachments, status: requestedStatus } = body;

    if (!tenderId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: tenderId' },
        { status: 400 }
      );
    }

    // Validate requested status - only 'drafted' or 'pending_review' (default) allowed on creation
    const bidStatus = (requestedStatus === 'drafted') ? 'drafted' : 'pending_review';

    // Check tender exists and is open
    const tender = await db.tender.findUnique({ where: { id: tenderId } });
    if (!tender) {
      return NextResponse.json(
        { success: false, error: 'Tender not found' },
        { status: 404 }
      );
    }

    if (tender.status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'This tender is not accepting bids' },
        { status: 400 }
      );
    }

    // Check deadline hasn't passed
    if (new Date(tender.deadline) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'The tender deadline has passed' },
        { status: 400 }
      );
    }

    // Check user hasn't already bid on this tender
    const existingBid = await db.bid.findFirst({
      where: { tenderId, userId: user!.id },
    });
    if (existingBid) {
      return NextResponse.json(
        { success: false, error: 'You have already submitted a bid for this tender' },
        { status: 409 }
      );
    }

    // Use provided values or placeholder defaults for document-upload-based bids
    const bidTechnicalProposal = (technicalProposal && technicalProposal.trim()) || 'Pending document upload';
    const bidFinancialProposal = financialProposal !== undefined && financialProposal !== null
      ? parseFloat(String(financialProposal))
      : 0;
    const bidTimeline = (timeline && timeline.trim()) || 'Pending document upload';

    const bid = await db.bid.create({
      data: {
        tenderId,
        userId: user!.id,
        technicalProposal: bidTechnicalProposal,
        financialProposal: bidFinancialProposal,
        timeline: bidTimeline,
        attachments: attachments || '',
        status: bidStatus,
      },
    });

    return NextResponse.json(
      { success: true, data: bid },
      { status: 201 }
    );
  } catch (err) {
    console.error('Create bid error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while submitting the bid' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bids
 * Show user's own bids + bids on tenders they created
 * Include tender title in response
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const tenderId = searchParams.get('tenderId') || '';
    const bidStatus = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Company-based bid visibility
    if (user!.role === 'team_admin' && user!.companyId) {
      // Team admin sees bids on their company's tenders
      where.tender = { companyId: user!.companyId };
    } else {
      // Standard users see their own bids
      where.userId = user!.id;
    }

    if (tenderId) {
      where.tenderId = tenderId;
    }

    if (bidStatus) {
      where.status = bidStatus;
    }

    const [bids, total] = await Promise.all([
      db.bid.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          tender: { select: { id: true, title: true, status: true } },
          user: { select: { id: true, email: true, profile: { select: { fullName: true, jobTitle: true } }, company: { select: { id: true, name: true } } } },
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

    return NextResponse.json({
      success: true,
      data: bids,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('List bids error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching bids' },
      { status: 500 }
    );
  }
}
