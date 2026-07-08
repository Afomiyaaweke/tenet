import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * PATCH /api/projects/[id]/tasks/[taskId]/status
 * Update task status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id: projectId, taskId } = await params;

    // Check project and task exist
    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const task = await db.task.findFirst({ where: { id: taskId, projectId } });
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Company isolation: check company access
    const isSuperAdmin = user!.role === 'super_admin';
    const isCompanyMember = user!.companyId && project.companyId === user!.companyId;
    if (!isSuperAdmin && !isCompanyMember) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have access to this task' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;

    const validStatuses = ['todo', 'in_progress', 'done'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      data: updatedTask,
    });
  } catch (err) {
    console.error('Update task status error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating task status' },
      { status: 500 }
    );
  }
}
