import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/team/members
 * List all team members in the same company as the authenticated user.
 * Query params:
 *   - search: filter by name or email
 *   - role: filter by role (owner, admin, manager, member, viewer)
 *   - status: filter by status (active, invited, suspended, removed)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const companyId = user!.companyId;
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'You are not associated with a company' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const roleFilter = searchParams.get('role')?.trim() || '';
    const statusFilter = searchParams.get('status')?.trim() || '';

    const where: Record<string, unknown> = { companyId };

    if (roleFilter) where.role = roleFilter;
    if (statusFilter) where.status = statusFilter;

    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { profile: { fullName: { contains: search, mode: 'insensitive' } } },
        ],
      };
    }

    const members = await db.teamMember.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            profile: {
              select: {
                fullName: true,
                jobTitle: true,
                profilePhoto: true,
                verified: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: members });
  } catch (err) {
    console.error('List team members error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/team/members
 * Add a user as a team member to the company.
 * Body: { userId, role, permissions }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const companyId = user!.companyId;
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'You are not associated with a company' },
        { status: 400 }
      );
    }

    // Only admins/managers can add members
    const adminMember = await db.teamMember.findUnique({
      where: { companyId_userId: { companyId, userId: user!.id } },
    });
    if (adminMember && !['owner', 'admin', 'manager'].includes(adminMember.role)) {
      return NextResponse.json(
        { success: false, error: 'Only admins and managers can add team members' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, role, permissions } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already a member
    const existing = await db.teamMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'User is already a team member' },
        { status: 409 }
      );
    }

    const member = await db.teamMember.create({
      data: {
        companyId,
        userId,
        role: role || 'member',
        permissions: permissions || 'view_tenders,view_bids',
        status: 'active',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            profile: {
              select: {
                fullName: true,
                jobTitle: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (err) {
    console.error('Add team member error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to add team member' },
      { status: 500 }
    );
  }
}
