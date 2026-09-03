import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';

/**
 * GET /api/tenders/[id]
 * Get single tender with bids count
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;
    const tender = await db.tender.findUnique({
      where: { id },
      include: {
        _count: { select: { bids: true } },
      },
    });

    if (!tender) {
      return NextResponse.json(
        { success: false, error: 'Tender not found' },
        { status: 404 }
      );
    }

    // Company access check: non-team_admin can only see their own company's tenders or open tenders
    if (user!.role !== 'team_admin' && user!.companyId && tender.companyId !== user!.companyId && tender.status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have access to this tender' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tender,
    });
  } catch (err) {
    console.error('Get tender error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching the tender' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tenders/[id]
 * Admin only: Update tender
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const tender = await db.tender.findUnique({ where: { id } });
    if (!tender) {
      return NextResponse.json(
        { success: false, error: 'Tender not found' },
        { status: 404 }
      );
    }

    // Company access check: non-team_admin can only update their own company's tenders
    if (user!.role !== 'team_admin' && user!.companyId && tender.companyId !== user!.companyId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only update tenders from your own company' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      scope,
      budgetMin,
      budgetMax,
      deadline,
      location,
      categoryTags,
      requiredDocs,
      status,
    } = body;

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (scope !== undefined) updateData.scope = scope;
    if (budgetMin !== undefined) updateData.budgetMin = parseFloat(String(budgetMin));
    if (budgetMax !== undefined) updateData.budgetMax = parseFloat(String(budgetMax));
    if (deadline !== undefined) updateData.deadline = new Date(deadline);
    if (location !== undefined) updateData.location = location;
    if (categoryTags !== undefined) updateData.categoryTags = categoryTags;
    if (requiredDocs !== undefined) updateData.requiredDocs = requiredDocs;
    if (status !== undefined) updateData.status = status;

    const updatedTender = await db.tender.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedTender,
    });
  } catch (err) {
    console.error('Update tender error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating the tender' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenders/[id]?reason=...
 * Owner removes their published tender. A reason is REQUIRED — it is stored
 * on the tender (rejectionNote) and sent to every applicant so they know why.
 *
 * The tender is soft-cancelled (status='cancelled' + rejectionNote) rather
 * than hard-deleted, so applicants keep their bid history and can read the
 * reason. Tenders with zero bids are hard-deleted (nothing to preserve).
 *
 * Body/query:
 *  - reason: string (required, min 3 chars)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;
    const tender = await db.tender.findUnique({
      where: { id },
      include: { _count: { select: { bids: true } } },
    });
    if (!tender) {
      return NextResponse.json(
        { success: false, error: 'Tender not found' },
        { status: 404 }
      );
    }

    // Authorization: the tender creator, a team_admin of the same company, or a platform admin
    const isCreator = tender.createdBy === user!.id;
    const isCompanyAdmin = user!.role === 'team_admin' && user!.companyId && tender.companyId === user!.companyId;
    const isPlatformAdmin = user!.role === 'admin';
    if (!isCreator && !isCompanyAdmin && !isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only delete tenders you created' },
        { status: 403 }
      );
    }

    // Reason is required — the whole point is that applicants learn WHY
    const { searchParams } = new URL(request.url);
    let reason = (searchParams.get('reason') || '').trim();
    if (!reason) {
      try {
        const body = await request.json();
        reason = (body?.reason || '').trim();
      } catch {
        // no JSON body — fall through to validation
      }
    }
    if (reason.length < 3) {
      return NextResponse.json(
        { success: false, error: 'A reason is required (min 3 characters) — applicants will see why the tender was removed' },
        { status: 400 }
      );
    }

    const bidCount = tender._count.bids;

    if (bidCount === 0) {
      // Nobody applied — safe to remove completely
      await db.tender.delete({ where: { id } });
      return NextResponse.json({
        success: true,
        data: { id, hardDeleted: true, notifiedApplicants: 0 },
        message: 'Tender deleted (no applicants to notify)',
      });
    }

    // Applicants exist — soft-cancel so their bid history (and the reason) survives
    const updatedTender = await db.tender.update({
      where: { id },
      data: { status: 'cancelled', rejectionNote: reason },
    });

    // Notify every distinct bidder with the reason
    const bidders = await db.bid.findMany({
      where: { tenderId: id },
      select: { userId: true },
      distinct: ['userId'],
    });

    await db.notification.createMany({
      data: bidders.map((b) => ({
        userId: b.userId,
        title: 'Tender Removed',
        message: `The tender "${tender.title}" you applied to was removed by the owner. Reason: ${reason}`,
        type: 'warning',
        link: `/bids`,
      })),
    });

    return NextResponse.json({
      success: true,
      data: {
        tender: updatedTender,
        hardDeleted: false,
        notifiedApplicants: bidders.length,
      },
      message: `Tender removed. ${bidders.length} applicant${bidders.length !== 1 ? 's were' : ' was'} notified with your reason.`,
    });
  } catch (err) {
    console.error('Delete tender error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while deleting the tender' },
      { status: 500 }
    );
  }
}
