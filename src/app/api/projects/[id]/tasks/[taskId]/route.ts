import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * PUT /api/projects/[id]/tasks/[taskId]
 * Update task (admin or assigned user)
 */
export async function PUT(
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
      include: { bid: { select: { userId: true } } },
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

    // Check access: admin or the user who owns this project
    const isProjectOwner = user!.role === 'user' && project.bid.userId === user!.id;
    const isAdmin = user!.role === 'super_admin' || user!.role === 'team_admin';
    if (!isAdmin && !isProjectOwner) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You cannot update tasks for this project' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, status, dueDate, order } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (order !== undefined) updateData.order = order;

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedTask,
    });
  } catch (err) {
    console.error('Update task error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating the task' },
      { status: 500 }
    );
  }
}
