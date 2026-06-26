import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * Helper: validate that the current user is a member of the conversation.
 * Returns the membership row (with role) or null.
 */
async function getMembership(conversationId: string, userId: string) {
  return await db.conversationMember.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });
}

/**
 * GET /api/conversations/[id]
 * Full conversation details: members (with profiles), recent messages
 * (last 50, oldest first), pinned status for current user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    const membership = await getMembership(id, user!.id);
    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: You are not a member of this conversation',
        },
        { status: 403 }
      );
    }

    const conversation = await db.conversation.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    fullName: true,
                    companyName: true,
                    profilePhoto: true,
                  },
                },
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 50,
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
                  select: {
                    profile: { select: { fullName: true } },
                  },
                },
              },
            },
          },
        },
        _count: { select: { messages: true } },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Reverse messages so oldest is first
    const reversedMessages = [...conversation.messages].reverse();

    return NextResponse.json({
      success: true,
      data: {
        ...conversation,
        messages: reversedMessages,
        pinned: membership.pinned,
        muted: membership.muted,
        lastReadAt: membership.lastReadAt,
        myRole: membership.role,
      },
    });
  } catch (err) {
    console.error('Get conversation error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching the conversation' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/conversations/[id]
 * Update title / description / avatarUrl. Only owner/admin.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    const membership = await getMembership(id, user!.id);
    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: You are not a member of this conversation',
        },
        { status: 403 }
      );
    }

    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Only the owner or admin can update this conversation',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, avatarUrl } = body as {
      title?: string;
      description?: string;
      avatarUrl?: string;
    };

    const data: Record<string, unknown> = {};
    if (typeof title !== 'undefined') data.title = title || null;
    if (typeof description !== 'undefined') data.description = description || null;
    if (typeof avatarUrl !== 'undefined') data.avatarUrl = avatarUrl || null;

    const updated = await db.conversation.update({
      where: { id },
      data,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    fullName: true,
                    companyName: true,
                    profilePhoto: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('Update conversation error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating the conversation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations/[id]
 * Delete conversation. Only owner.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    const membership = await getMembership(id, user!.id);
    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: You are not a member of this conversation',
        },
        { status: 403 }
      );
    }

    if (membership.role !== 'owner') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Only the owner can delete this conversation',
        },
        { status: 403 }
      );
    }

    await db.conversation.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error('Delete conversation error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while deleting the conversation' },
      { status: 500 }
    );
  }
}
