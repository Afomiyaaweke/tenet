import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/team/tasks
 * List all team-level tasks (projectId is null) for the user's company.
 * Query params:
 *   - status: filter by status (todo, in_progress, in_review, done)
 *   - priority: filter by priority (low, medium, high, urgent)
 *   - assigneeId: filter by assignee
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
    const statusFilter = searchParams.get('status')?.trim() || '';
    const priorityFilter = searchParams.get('priority')?.trim() || '';
    const assigneeId = searchParams.get('assigneeId')?.trim() || '';

    const where: Record<string, unknown> = {
      companyId,
      projectId: null, // team-level tasks only
    };

    if (statusFilter) where.status = statusFilter;
    if (priorityFilter) where.priority = priorityFilter;
    if (assigneeId) where.assigneeId = assigneeId;

    const tasks = await db.task.findMany({
      where,
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
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ success: true, data: tasks });
  } catch (err) {
    console.error('List team tasks error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/team/tasks
 * Create a new team-level task.
 * Body: { title, description?, status?, priority?, assigneeId?, dueDate? }
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

    const body = await request.json();
    const { title, description, status, priority, assigneeId, dueDate } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    const task = await db.task.create({
      data: {
        companyId,
        projectId: null, // team-level task
        title,
        description: description || null,
        status: status || 'todo',
        priority: priority || 'medium',
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
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

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (err) {
    console.error('Create team task error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to create team task' },
      { status: 500 }
    );
  }
}
