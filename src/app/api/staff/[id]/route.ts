import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireTeamAdmin } from '@/lib/auth';

/**
 * PATCH /api/staff/[id]
 * Update a staff member's role or status.
 * Requires team_admin role.
 *
 * Body options:
 *   - { role: 'team_admin' | 'user' }                        — change role
 *   - { status: 'active' | 'suspended' }                 — change status
 *   - Both can be sent together
 *
 * Permission rules:
 *   - Cannot change own role
 *   - team_admin can assign 'user' or 'team_admin' roles
 *   - Cannot modify users outside your company
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: currentUser, error } = await requireTeamAdmin(request);
    if (error) return error;

    const { id: targetId } = await params;

    // Cannot modify yourself
    if (currentUser!.id === targetId) {
      return NextResponse.json(
        { success: false, error: 'You cannot modify your own account' },
        { status: 400 }
      );
    }

    // Check target user exists and is in same company
    const targetUser = await db.user.findUnique({
      where: { id: targetId },
      include: {
        profile: { select: { fullName: true, jobTitle: true, profilePhoto: true, verified: true } },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (targetUser.companyId !== currentUser!.companyId) {
      return NextResponse.json(
        { success: false, error: 'You can only manage users in your own company' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role, status } = body;

    const updateData: Record<string, unknown> = {};

    // ── Role change ──
    if (role !== undefined) {
      const validRoles = ['team_admin', 'user'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { success: false, error: 'Invalid role. Must be one of: team_admin, user' },
          { status: 400 }
        );
      }

      updateData.role = role;
    }

    // ── Status change ──
    if (status !== undefined) {
      const validStatuses = ['active', 'suspended'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status. Must be one of: active, suspended' },
          { status: 400 }
        );
      }

      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update. Provide role and/or status.' },
        { status: 400 }
      );
    }

    // Apply update
    const updatedUser = await db.user.update({
      where: { id: targetId },
      data: updateData,
      include: {
        profile: { select: { fullName: true, jobTitle: true, profilePhoto: true, verified: true } },
        company: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Update staff error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating staff member' },
      { status: 500 }
    );
  }
}
