import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * PATCH /api/conversations/[id]/messages/[messageId]
 * Edit message content. Only the message author. Sets editedAt.
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; messageId: string }>;
  }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id, messageId } = await params;

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

    const message = await db.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, userId: true, conversationId: true, deletedAt: true },
    });

    if (!message || message.conversationId !== id) {
      return NextResponse.json(
        { success: false, error: 'Message not found in this conversation' },
        { status: 404 }
      );
    }

    if (message.deletedAt) {
      return NextResponse.json(
        { success: false, error: 'Cannot edit a deleted message' },
        { status: 400 }
      );
    }

    if (message.userId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only the author can edit this message' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content } = body as { content?: string };

    const trimmed = typeof content === 'string' ? content.trim() : '';
    if (!trimmed) {
      return NextResponse.json(
        { success: false, error: 'Message content cannot be empty' },
        { status: 400 }
      );
    }

    const updated = await db.chatMessage.update({
      where: { id: messageId },
      data: {
        content: trimmed,
        editedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, profilePhoto: true } },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                profile: { select: { fullName: true } },
              },
            },
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            userId: true,
            user: { select: { profile: { select: { fullName: true } } } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('Edit conversation message error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while editing the message' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations/[id]/messages/[messageId]
 * Soft-delete message (set deletedAt).
 * Allowed by: message author, conversation owner, or admin.
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; messageId: string }>;
  }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id, messageId } = await params;

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

    const message = await db.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, userId: true, conversationId: true, deletedAt: true },
    });

    if (!message || message.conversationId !== id) {
      return NextResponse.json(
        { success: false, error: 'Message not found in this conversation' },
        { status: 404 }
      );
    }

    if (message.deletedAt) {
      return NextResponse.json(
        { success: false, error: 'Message is already deleted' },
        { status: 400 }
      );
    }

    const isAuthor = message.userId === user!.id;
    const isPrivileged =
      membership.role === 'owner' || membership.role === 'admin';

    if (!isAuthor && !isPrivileged) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Forbidden: Only the author or conversation owner/admin can delete this message',
        },
        { status: 403 }
      );
    }

    await db.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: { id: messageId, deleted: true },
    });
  } catch (err) {
    console.error('Delete conversation message error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while deleting the message' },
      { status: 500 }
    );
  }
}
