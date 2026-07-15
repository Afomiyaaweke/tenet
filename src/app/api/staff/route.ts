import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireTeamAdmin } from '@/lib/auth';

/**
 * GET /api/staff
 * List all users in the same company as the authenticated user.
 * Requires team_admin role.
 * Query params:
 *   - search: filter by name or email
 *   - role: filter by role (team_admin, user)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireTeamAdmin(request);
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

    // Build where clause
    const where: Record<string, unknown> = {
      companyId,
    };

    // Role filter
    if (roleFilter && ['team_admin', 'user'].includes(roleFilter)) {
      where.role = roleFilter;
    }

    // Search filter (name or email)
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { profile: { fullName: { contains: search } } },
      ];
    }

    const users = await db.user.findMany({
      where,
      include: {
        profile: {
          select: {
            fullName: true,
            jobTitle: true,
            verified: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format response
    const staff = users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      status: u.status,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
      profile: u.profile
        ? {
            fullName: u.profile.fullName,
            jobTitle: u.profile.jobTitle,
            verified: u.profile.verified,
            profilePhoto: u.profile.profilePhoto,
          }
        : null,
    }));

    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    console.error('List staff error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching staff' },
      { status: 500 }
    );
  }
}
