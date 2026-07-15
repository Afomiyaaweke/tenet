import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * DELETE /api/conversations/[id]/members/[userId]
 * - If requester removes themselves: leave the conversation
 *   (owner cannot leave - must transfer ownership first; return 400).
 * - If requester (owner/admin) removes someone else: kick.
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; userId: string }>;
  }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id, userId: targetUserId } = await params;

    const requesterMembership = await db.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId: user!.id },
      },
    });
    if (!requesterMembership) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: You are not a member of this conversation',
        },
        { status: 403 }
      );
    }

    const isSelf = targetUserId === user!.id;

    if (isSelf) {
      // Leaving
      if (requesterMembership.role === 'owner') {
        return NextResponse.json(
          {
            success: false,
            error:
              'Owners cannot leave the conversation. Transfer ownership to another member first.',
          },
          { status: 400 }
        );
      }
      await db.conversationMember.delete({
        where: { id: requesterMembership.id },
      });
      return NextResponse.json({
        success: true,
        data: { left: true, conversationId: id },
      });
    }

    // Kicking someone else - must be owner or admin
    if (requesterMembership.role !== 'owner' && requesterMembership.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Only the owner or admin can remove members',
        },
        { status: 403 }
      );
    }

    const targetMembership = await db.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId: targetUserId },
      },
    });
    if (!targetMembership) {
      return NextResponse.json(
        { success: false, error: 'Member not found in this conversation' },
        { status: 404 }
      );
    }

    // Admin cannot kick an owner or another admin; only owner can kick admins
    if (targetMembership.role === 'owner') {
      return NextResponse.json(
        { success: false, error: 'Cannot remove the owner of the conversation' },
        { status: 400 }
      );
    }
    if (
      targetMembership.role === 'admin' &&
      requesterMembership.role !== 'owner'
    ) {
      return NextResponse.json(
        { success: false, error: 'Only the owner can remove admins' },
        { status: 403 }
      );
    }

    await db.conversationMember.delete({ where: { id: targetMembership.id } });

    return NextResponse.json({
      success: true,
      data: { removed: true, userId: targetUserId },
    });
  } catch (err) {
    console.error('Remove conversation member error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while removing the member' },
      { status: 500 }
    );
  }
}
