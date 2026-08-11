import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * PATCH /api/team/members/[id]
 * Update a team member's role, permissions, or status.
 * Body: { role?, permissions?, status? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only admins can modify members
    const adminMember = await db.teamMember.findUnique({
      where: { companyId_userId: { companyId, userId: user!.id } },
    });
    // Also allow if user is team_admin on User model
    const isAdmin = user!.role === 'team_admin' || (adminMember && ['owner', 'admin'].includes(adminMember.role));
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only owners and admins can modify team members' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { role, permissions, status } = body;

    // Check member exists in this company
    const existing = await db.teamMember.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Team member not found' },
        { status: 404 }
      );
    }

    // Prevent removing the last owner
    if (existing.role === 'owner' && role && role !== 'owner') {
      const ownerCount = await db.teamMember.count({
        where: { companyId, role: 'owner', status: 'active' },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { success: false, error: 'Cannot remove the last owner. Assign another owner first.' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (role) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (status) updateData.status = status;

    const updated = await db.teamMember.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('Update team member error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update team member' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team/members/[id]
 * Remove a team member from the company.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const adminMember = await db.teamMember.findUnique({
      where: { companyId_userId: { companyId, userId: user!.id } },
    });
    const isAdmin = user!.role === 'team_admin' || (adminMember && ['owner', 'admin'].includes(adminMember.role));
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only owners and admins can remove team members' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await db.teamMember.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Team member not found' },
        { status: 404 }
      );
    }

    // Prevent deleting the last owner
    if (existing.role === 'owner') {
      const ownerCount = await db.teamMember.count({
        where: { companyId, role: 'owner', status: 'active' },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { success: false, error: 'Cannot remove the last owner. Transfer ownership first.' },
          { status: 400 }
        );
      }
    }

    // Soft delete: set status to removed
    await db.teamMember.update({
      where: { id },
      data: { status: 'removed' },
    });

    return NextResponse.json({ success: true, message: 'Team member removed' });
  } catch (err) {
    console.error('Delete team member error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
