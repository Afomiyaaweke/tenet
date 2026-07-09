import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// Valid bid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_review: ['shortlisted', 'rejected'],
  shortlisted: ['awarded', 'rejected'],
  awarded: ['completed'],
};

/**
 * PATCH /api/bids/[id]/status
 * Admin only: Update bid status
 * When status becomes "awarded": creates Project, Chat, updates tender status, creates notification
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const bid = await db.bid.findUnique({
      where: { id },
      include: { tender: true },
    });

    if (!bid) {
      return NextResponse.json(
        { success: false, error: 'Bid not found' },
        { status: 404 }
      );
    }

    // Company isolation: non-team_admin can only update bids on their own company's tenders
    if (user!.role !== 'team_admin' && user!.companyId && bid.tender.companyId !== user!.companyId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only update bids on your own company\'s tenders' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, rejectionNote } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[bid.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid transition from "${bid.status}" to "${status}". Allowed: ${allowed.join(', ') || 'none'}` },
        { status: 400 }
      );
    }

    // If awarding, use a transaction to create project, chat, update tender, create notification
    if (status === 'awarded') {
      const result = await db.$transaction(async (tx) => {
        // Update bid status
        const updatedBid = await tx.bid.update({
          where: { id },
          data: { status, rejectionNote: rejectionNote || null },
        });

        // Create Project with companyId from the tender
        const project = await tx.project.create({
          data: {
            tenderId: bid.tenderId,
            bidId: bid.id,
            status: 'active',
            contractValue: bid.financialProposal,
            companyId: bid.tender.companyId || null,
          },
        });

        // Create Chat linked to the project
        await tx.chat.create({
          data: {
            projectId: project.id,
            tenderId: bid.tenderId,
            contextType: 'project',
          },
        });

        // Update tender status to "awarded"
        await tx.tender.update({
          where: { id: bid.tenderId },
          data: { status: 'awarded' },
        });

        // Create notification for the bidder
        await tx.notification.create({
          data: {
            userId: bid.userId,
            title: 'Bid Awarded!',
            message: `Your bid for "${bid.tender.title}" has been awarded. A project has been created.`,
            type: 'success',
            link: `/projects/${project.id}`,
          },
        });

        return { updatedBid, project };
      });

      return NextResponse.json({
        success: true,
        data: result.updatedBid,
        meta: { projectId: result.project.id },
      });
    }

    // For non-awarded status updates
    const updateData: Record<string, unknown> = { status };
    if (rejectionNote) updateData.rejectionNote = rejectionNote;
    if (status === 'rejected') {
      // Use transaction for rejected bids to create notification atomically
      const result = await db.$transaction(async (tx) => {
        const updatedBid = await tx.bid.update({
          where: { id },
          data: updateData,
        });

        await tx.notification.create({
          data: {
            userId: bid.userId,
            title: 'Bid Rejected',
            message: `Your bid for "${bid.tender.title}" has been rejected.${rejectionNote ? ` Reason: ${rejectionNote}` : ''}`,
            type: 'warning',
            link: `/tenders/${bid.tenderId}`,
          },
        });

        return updatedBid;
      });

      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    // For other non-awarded status updates (e.g. shortlisted, completed)
    const updatedBid = await db.bid.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedBid,
    });
  } catch (err) {
    console.error('Update bid status error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating bid status' },
      { status: 500 }
    );
  }
}
