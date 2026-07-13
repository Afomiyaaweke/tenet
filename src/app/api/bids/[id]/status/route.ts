import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Valid bid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  drafted: ['pending_review', 'rejected', 'withdrawn'],
  pending_review: ['shortlisted', 'rejected', 'drafted', 'withdrawn'],
  shortlisted: ['awarded', 'rejected'],
  awarded: ['completed'],
  withdrawn: [],
};

// Transitions that regular users can perform on their own bids
const USER_ALLOWED_TRANSITIONS: string[] = ['drafted', 'pending_review', 'withdrawn'];

/**
 * PATCH /api/bids/[id]/status
 * - Admin (team_admin): Full status transition control
 * - Regular users: Can transition between drafted and pending_review on their own bids
 * When status becomes "awarded": creates Project, Chat, updates tender status, creates notification
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
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

    const isAdmin = user!.role === 'team_admin';
    const isOwnBid = bid.userId === user!.id;

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

    // Permission check: regular users can only transition between drafted/pending_review on their own bids
    if (!isAdmin) {
      if (!isOwnBid) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You can only update your own bids' },
          { status: 403 }
        );
      }
      if (!USER_ALLOWED_TRANSITIONS.includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You can only save drafts or submit bids for review' },
          { status: 403 }
        );
      }
    }

    // Admin company isolation: non-team_admin (but we already checked isAdmin above, so this is for team_admin)
    // For admins, check company isolation
    if (isAdmin && user!.companyId && bid.tender.companyId !== user!.companyId) {
      // Allow if the admin's company created the tender, otherwise block
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only update bids on your own company\'s tenders' },
        { status: 403 }
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

    // For withdrawn bids - delete the bid and its documents
    if (status === 'withdrawn') {
      const result = await db.$transaction(async (tx) => {
        // Delete associated documents first
        await tx.document.deleteMany({
          where: { bidId: id },
        });

        // Delete the bid
        const deletedBid = await tx.bid.delete({
          where: { id },
        });

        return deletedBid;
      });

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Bid withdrawn successfully',
      });
    }

    // For other non-awarded status updates (e.g. shortlisted, completed, drafted, pending_review)
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
