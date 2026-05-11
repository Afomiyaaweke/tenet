import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/bids/[id]
 * Admin: full detail
 * Contractor: own bid only
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;
    const bid = await db.bid.findUnique({
      where: { id },
      include: {
        tender: { select: { id: true, title: true, scope: true, status: true, deadline: true } },
        user: { select: { id: true, email: true, profile: { select: { fullName: true, companyName: true, verified: true } } } },
      },
    });

    if (!bid) {
      return NextResponse.json(
        { success: false, error: 'Bid not found' },
        { status: 404 }
      );
    }

    // Non-admin users can only see their own bids
    if (user!.role !== 'admin' && bid.userId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only view your own bids' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bid,
    });
  } catch (err) {
    console.error('Get bid error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching the bid' },
      { status: 500 }
    );
  }
}
