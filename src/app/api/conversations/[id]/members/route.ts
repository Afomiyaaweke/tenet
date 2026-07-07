import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/conversations/[id]/members
 * List members with profiles, role, joinedAt.
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

    const members = await db.conversationMember.findMany({
      where: { conversationId: id },
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
      orderBy: { joinedAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: members });
  } catch (err) {
    console.error('List conversation members error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching members' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations/[id]/members
 * Add members. Body: { userIds: string[] }. Only owner/admin.
 * Skips users that are already members.
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

    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Only the owner or admin can add members',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userIds = [] } = body as { userIds?: string[] };

    const uniqueUserIds = Array.from(new Set(userIds)).filter(
      (id): id is string => typeof id === 'string' && id.length > 0
    );

    if (uniqueUserIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No user IDs provided' },
        { status: 400 }
      );
    }

    // Validate users exist
    const existingUsers = await db.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: { id: true },
    });
    const existingIds = new Set(existingUsers.map((u) => u.id));
    const validUserIds = uniqueUserIds.filter((id) => existingIds.has(id));

    if (validUserIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'None of the specified users exist' },
        { status: 400 }
      );
    }

    // Check which are already members
    const existingMembers = await db.conversationMember.findMany({
      where: { conversationId: id, userId: { in: validUserIds } },
      select: { userId: true },
    });
    const alreadyMemberIds = new Set(existingMembers.map((m) => m.userId));
    const toAdd = validUserIds.filter((id) => !alreadyMemberIds.has(id));

    if (toAdd.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: { added: 0, message: 'All specified users are already members' },
        }
      );
    }

    await db.conversationMember.createMany({
      data: toAdd.map((userId) => ({
        conversationId: id,
        userId,
        role: 'member',
      })),
      skipDuplicates: true,
    });

    // Touch conversation updatedAt
    await db.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: { added: toAdd.length, skipped: alreadyMemberIds.size },
    });
  } catch (err) {
    console.error('Add conversation members error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while adding members' },
      { status: 500 }
    );
  }
}
