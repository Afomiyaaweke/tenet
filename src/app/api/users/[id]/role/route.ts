import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

/**
 * PATCH /api/users/[id]/role
 * Update a user's role (team_admin only)
 * Body: { role: 'team_admin' | 'user' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;

    // Cannot change own role
    if (user!.id === id) {
      return NextResponse.json(
        { success: false, error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { role } = body;

    // Validate role
    const validRoles = ['team_admin', 'user'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be one of: team_admin, user' },
        { status: 400 }
      );
    }

    // Check target user exists
    const targetUser = await db.user.findUnique({
      where: { id },
      include: { profile: { select: { fullName: true, jobTitle: true } } },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user role
    const updatedUser = await db.user.update({
      where: { id },
      data: { role },
      include: {
        profile: { select: { fullName: true, jobTitle: true } },
        company: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update user role error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating the user role' },
      { status: 500 }
    );
  }
}
