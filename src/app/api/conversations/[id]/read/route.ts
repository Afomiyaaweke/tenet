import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/conversations/[id]/read
 * Mark conversation as read for the current user.
 * Updates ConversationMember.lastReadAt to now.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    const membership = await db.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId: user!.id },
      },
    });
    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: You are not a member of this conversation',
        },
        { status: 403 }
      );
    }

    await db.conversationMember.update({
      where: { id: membership.id },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: { conversationId: id, lastReadAt: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Mark conversation read error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while marking conversation as read' },
      { status: 500 }
    );
  }
}
