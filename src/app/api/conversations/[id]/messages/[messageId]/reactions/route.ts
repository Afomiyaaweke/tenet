import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/conversations/[id]/messages/[messageId]/reactions
 * Toggle a reaction. Body: { emoji: string }.
 * If the user already has that emoji reaction on this message, remove it;
 * otherwise add it. Returns the updated reactions list for the message.
 */
export async function POST(
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
      select: { id: true, conversationId: true, deletedAt: true },
    });

    if (!message || message.conversationId !== id) {
      return NextResponse.json(
        { success: false, error: 'Message not found in this conversation' },
        { status: 404 }
      );
    }

    if (message.deletedAt) {
      return NextResponse.json(
        { success: false, error: 'Cannot react to a deleted message' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { emoji } = body as { emoji?: string };

    if (!emoji || typeof emoji !== 'string' || !emoji.trim()) {
      return NextResponse.json(
        { success: false, error: 'Emoji is required' },
        { status: 400 }
      );
    }

    const trimmedEmoji = emoji.trim();

    // Check existing reaction from this user with this emoji
    const existing = await db.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: user!.id,
          emoji: trimmedEmoji,
        },
      },
    });

    if (existing) {
      await db.messageReaction.delete({ where: { id: existing.id } });
    } else {
      await db.messageReaction.create({
        data: {
          messageId,
          userId: user!.id,
          emoji: trimmedEmoji,
        },
      });
    }

    const reactions = await db.messageReaction.findMany({
      where: { messageId },
      include: {
        user: {
          select: {
            id: true,
            profile: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: reactions,
      meta: { toggled: !existing },
    });
  } catch (err) {
    console.error('Toggle message reaction error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while toggling the reaction' },
      { status: 500 }
    );
  }
}
