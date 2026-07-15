import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const SUSPICIOUS_PHRASES = [
  'outside platform',
  'direct payment',
  'cash only',
  'no receipt',
  'off platform',
  'bypass',
  'under the table',
  'personal transfer',
  'private deal',
];

/**
 * GET /api/conversations/[id]/messages
 * Paginated messages (default 50, ordered by createdAt asc).
 * Excludes soft-deleted messages.
 */
export async function GET(
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50', 10),
      200
    );
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      db.chatMessage.findMany({
        where: {
          conversationId: id,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
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
              user: {
                select: { profile: { select: { fullName: true } } },
              },
            },
          },
        },
      }),
      db.chatMessage.count({
        where: { conversationId: id, deletedAt: null },
      }),
    ]);

    // Reverse so oldest is first (we fetched desc for pagination)
    const ordered = [...messages].reverse();

    return NextResponse.json({
      success: true,
      data: ordered,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Get conversation messages error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations/[id]/messages
 * Send a message.
 * Body: { content, replyToId?, attachmentUrl?, attachmentType?, attachmentName? }
 * Runs suspicious-phrase detection.
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

    const body = await request.json();
    const {
      content,
      replyToId,
      attachmentUrl,
      attachmentType,
      attachmentName,
    } = body as {
      content?: string;
      replyToId?: string;
      attachmentUrl?: string;
      attachmentType?: string;
      attachmentName?: string;
    };

    const trimmed = typeof content === 'string' ? content.trim() : '';
    if (!trimmed && !attachmentUrl) {
      return NextResponse.json(
        { success: false, error: 'Message content or attachment is required' },
        { status: 400 }
      );
    }

    // Validate reply target if provided
    if (replyToId) {
      const replyTarget = await db.chatMessage.findUnique({
        where: { id: replyToId },
        select: { id: true, conversationId: true },
      });
      if (!replyTarget || replyTarget.conversationId !== id) {
        return NextResponse.json(
          { success: false, error: 'Reply target message not found in this conversation' },
          { status: 400 }
        );
      }
    }

    // Suspicious phrase detection
    const flagged = SUSPICIOUS_PHRASES.some((phrase) =>
      trimmed.toLowerCase().includes(phrase)
    );

    const message = await db.chatMessage.create({
      data: {
        conversationId: id,
        userId: user!.id,
        content: trimmed,
        replyToId: replyToId || null,
        attachmentUrl: attachmentUrl || null,
        attachmentType: attachmentType || null,
        attachmentName: attachmentName || null,
        flagged,
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

    // Bump conversation updatedAt so it surfaces to the top of the list
    await db.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (err) {
    console.error('Send conversation message error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while sending the message' },
      { status: 500 }
    );
  }
}
