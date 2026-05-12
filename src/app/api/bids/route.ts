import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/bids
 * Contractor only (must be verified): Submit a bid
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    // Only contractors can submit bids
    if (user!.role !== 'contractor') {
      return NextResponse.json(
        { success: false, error: 'Only contractors can submit bids' },
        { status: 403 }
      );
    }

    // Must be verified
    if (!user!.profile?.verified) {
      return NextResponse.json(
        { success: false, error: 'Your profile must be verified to submit bids' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tenderId, technicalProposal, financialProposal, timeline, attachments } = body;

    if (!tenderId || !technicalProposal || financialProposal === undefined || !timeline) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: tenderId, technicalProposal, financialProposal, timeline' },
        { status: 400 }
      );
    }

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

    // Check contractor hasn't already bid
    const existingBid = await db.bid.findFirst({
      where: { tenderId, userId: user!.id },
    });
    if (existingBid) {
      return NextResponse.json(
        { success: false, error: 'You have already submitted a bid for this tender' },
        { status: 409 }
      );
    }

    const bid = await db.bid.create({
      data: {
        tenderId,
        userId: user!.id,
        technicalProposal,
        financialProposal: parseFloat(String(financialProposal)),
        timeline,
        attachments: attachments || '',
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
 * Admin: all bids with filter by tenderId, status
 * Contractor: own bids only
 * Tender Owner: all bids for tenders they created
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

    if (user!.role === 'contractor') {
      // Contractors only see their own bids
      where.userId = user!.id;
    } else if (user!.role === 'tender_owner') {
      // Tender owners see all bids for tenders they created
      where.tender = { createdBy: user!.id };
    }
    // Admin sees all bids (no filter)

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
          user: { select: { id: true, email: true, profile: { select: { fullName: true, companyName: true } } } },
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
