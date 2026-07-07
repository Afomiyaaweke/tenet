import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/conversations
 * List all conversations the current user is a member of.
 * Includes members, last message preview, message count, and pinned status.
 * Ordered: pinned first, then by updatedAt desc.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const memberships = await db.conversationMember.findMany({
      where: { userId: user!.id },
      select: { conversationId: true, pinned: true, lastReadAt: true },
    });

    const conversationIds = memberships.map((m) => m.conversationId);
    const pinnedSet = new Set(
      memberships.filter((m) => m.pinned).map((m) => m.conversationId)
    );
    const lastReadMap = new Map(
      memberships.map((m) => [m.conversationId, m.lastReadAt])
    );

    if (conversationIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const conversations = await db.conversation.findMany({
      where: { id: { in: conversationIds } },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: { fullName: true, jobTitle: true, profilePhoto: true },
                },
                company: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          where: { deletedAt: null },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: { select: { fullName: true } },
              },
            },
          },
        },
        _count: { select: { messages: true } },
      },
    });

    // Compute unread counts and decorate with pinned status
    const enriched = await Promise.all(
      conversations.map(async (c) => {
        const lastRead = lastReadMap.get(c.id);
        const unreadCount = await db.chatMessage.count({
          where: {
            conversationId: c.id,
            deletedAt: null,
            ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
          },
        });
        return {
          ...c,
          pinned: pinnedSet.has(c.id),
          unreadCount,
        };
      })
    );

    // Sort: pinned first, then updatedAt desc
    enriched.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (err) {
    console.error('List conversations error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching conversations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations
 * Create a conversation. Body:
 *   { type: "group"|"direct"|"channel", title?, description?, memberIds: string[], tenderId?, projectId? }
 * Creator becomes owner. For "direct", returns existing direct conversation
 * if one already exists between the two users.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const {
      type,
      title,
      description,
      avatarUrl,
      memberIds = [],
      tenderId,
      projectId,
    } = body as {
      type?: string;
      title?: string;
      description?: string;
      avatarUrl?: string;
      memberIds?: string[];
      tenderId?: string;
      projectId?: string;
    };

    const validTypes = ['direct', 'group', 'channel', 'project'];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid conversation type' },
        { status: 400 }
      );
    }

    const uniqueMemberIds = Array.from(new Set(memberIds as string[])).filter(
      (id): id is string => typeof id === 'string' && id.length > 0
    );

    // Validate member counts
    if (type === 'direct') {
      if (uniqueMemberIds.length !== 1) {
        return NextResponse.json(
          {
            success: false,
            error: 'Direct conversations must have exactly one other member',
          },
          { status: 400 }
        );
      }
    } else {
      if (uniqueMemberIds.length < 1) {
        return NextResponse.json(
          { success: false, error: 'At least one member is required' },
          { status: 400 }
        );
      }
    }

    // Validate the other member(s) exist
    const otherUsers = await db.user.findMany({
      where: { id: { in: uniqueMemberIds } },
      select: { id: true },
    });
    if (otherUsers.length !== uniqueMemberIds.length) {
      return NextResponse.json(
        { success: false, error: 'One or more members not found' },
        { status: 400 }
      );
    }

    // For direct: check if a direct conversation already exists between these two users
    if (type === 'direct') {
      const otherUserId = uniqueMemberIds[0];
      // Find direct conversations where the current user is a member
      const myDirectConvs = await db.conversation.findMany({
        where: {
          type: 'direct',
          members: { some: { userId: user!.id } },
        },
        select: { id: true },
      });
      const myDirectIds = myDirectConvs.map((c) => c.id);
      if (myDirectIds.length > 0) {
        const existing = await db.conversation.findFirst({
          where: {
            id: { in: myDirectIds },
            type: 'direct',
            members: { some: { userId: otherUserId } },
          },
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
                        jobTitle: true,
                        profilePhoto: true,
                      },
                    },
                    company: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
            _count: { select: { messages: true } },
          },
        });
        if (existing) {
          return NextResponse.json({ success: true, data: existing });
        }
      }
    }

    // Build member rows: creator = owner, others = member
    const memberRows = [
      { userId: user!.id, role: 'owner' },
      ...uniqueMemberIds
        .filter((id) => id !== user!.id)
        .map((id) => ({ userId: id, role: 'member' as const })),
    ];

    // For direct: title optional, but we can default to null
    // For group/channel/project: title recommended but not strictly required
    const conversation = await db.$transaction(async (tx) => {
      return await tx.conversation.create({
        data: {
          type,
          title: title || null,
          description: description || null,
          avatarUrl: avatarUrl || null,
          createdBy: user!.id,
          tenderId: tenderId || null,
          projectId: projectId || null,
          members: {
            create: memberRows,
          },
        },
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
                      jobTitle: true,
                      profilePhoto: true,
                    },
                  },
                  company: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
          _count: { select: { messages: true } },
        },
      });
    });

    return NextResponse.json(
      { success: true, data: conversation },
      { status: 201 }
    );
  } catch (err) {
    console.error('Create conversation error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while creating the conversation' },
      { status: 500 }
    );
  }
}
