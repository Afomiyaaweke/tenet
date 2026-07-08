import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';

/**
 * POST /api/projects/[id]/milestones
 * Admin only: Create milestone
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAdmin(request);
    if (error) return error;

    const { id: projectId } = await params;

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Company isolation: non-super_admin can only create milestones in their own company's projects
    if (user!.role !== 'super_admin' && user!.companyId && project.companyId !== user!.companyId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only create milestones in your own company\'s projects' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, dueDate } = body;

    if (!title || !dueDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, dueDate' },
        { status: 400 }
      );
    }

    const milestone = await db.milestone.create({
      data: {
        projectId,
        title,
        dueDate: new Date(dueDate),
      },
    });

    return NextResponse.json(
      { success: true, data: milestone },
      { status: 201 }
    );
  } catch (err) {
    console.error('Create milestone error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while creating the milestone' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/milestones
 * List milestones for project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id: projectId } = await params;

    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Company isolation: non-super_admin can only view milestones in their own company's projects
    if (user!.role !== 'super_admin' && user!.companyId && project.companyId !== user!.companyId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have access to this project\'s milestones' },
        { status: 403 }
      );
    }

    const milestones = await db.milestone.findMany({
      where: { projectId },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: milestones,
    });
  } catch (err) {
    console.error('List milestones error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching milestones' },
      { status: 500 }
    );
  }
}
