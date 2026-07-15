import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

/**
 * PATCH /api/projects/[id]/milestones/[milestoneId]
 * Admin only: Update milestone
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const { user, error } = await requireAdmin(request);
    if (error) return error;

    const { id: projectId, milestoneId } = await params;

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Company isolation: non-team_admin can only update milestones in their own company's projects
    if (user!.role !== 'team_admin' && user!.companyId && project.companyId !== user!.companyId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only update milestones in your own company\'s projects' },
        { status: 403 }
      );
    }

    const milestone = await db.milestone.findFirst({ where: { id: milestoneId, projectId } });
    if (!milestone) {
      return NextResponse.json(
        { success: false, error: 'Milestone not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { completed, title, dueDate } = body;

    const updateData: Record<string, unknown> = {};
    if (completed !== undefined) updateData.completed = completed;
    if (title !== undefined) updateData.title = title;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);

    const updatedMilestone = await db.milestone.update({
      where: { id: milestoneId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedMilestone,
    });
  } catch (err) {
    console.error('Update milestone error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating the milestone' },
      { status: 500 }
    );
  }
}
