import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';

/**
 * POST /api/projects/[id]/tasks
 * Admin only: Create task
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAdmin(request);
    if (error) return error;

    const { id: projectId } = await params;

    // Check project exists
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Company isolation: non-super_admin can only create tasks in their own company's projects
    if (user!.role !== 'super_admin' && user!.companyId && project.companyId !== user!.companyId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only create tasks in your own company\'s projects' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, status, dueDate, order } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    const task = await db.task.create({
      data: {
        projectId,
        title,
        description: description || null,
        status: status || 'todo',
        dueDate: dueDate ? new Date(dueDate) : null,
        order: order || 0,
        companyId: project.companyId || null,
      },
    });

    return NextResponse.json(
      { success: true, data: task },
      { status: 201 }
    );
  } catch (err) {
    console.error('Create task error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while creating the task' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/tasks
 * List tasks for project (all authenticated users with access)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id: projectId } = await params;

    // Check project exists
    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Company isolation: non-super_admin can only view tasks in their own company's projects
    if (user!.role !== 'super_admin' && user!.companyId && project.companyId !== user!.companyId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have access to this project\'s tasks' },
        { status: 403 }
      );
    }

    const tasks = await db.task.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (err) {
    console.error('List tasks error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching tasks' },
      { status: 500 }
    );
  }
}
