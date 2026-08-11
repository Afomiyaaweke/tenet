import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * PATCH /api/team/tasks/[id]
 * Update a team task (status, priority, assignee, etc.)
 * Body: { title?, description?, status?, priority?, assigneeId?, dueDate?, order? }
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

    const { id } = await params;

    // Verify task belongs to this company
    const existing = await db.task.findFirst({
      where: { id, companyId, projectId: null },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, description, status, priority, assigneeId, dueDate, order } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (order !== undefined) updateData.order = order;

    const updated = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('Update team task error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update team task' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team/tasks/[id]
 * Delete a team task.
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

    const { id } = await params;

    const existing = await db.task.findFirst({
      where: { id, companyId, projectId: null },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    await db.task.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    console.error('Delete team task error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to delete team task' },
      { status: 500 }
    );
  }
}
