import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';

/**
 * GET /api/projects/[id]
 * Get project with tasks, milestones, payments, chat
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;
    const project = await db.project.findUnique({
      where: { id },
      include: {
        tender: { select: { id: true, title: true, scope: true, categoryTags: true, deadline: true, location: true, createdBy: true } },
        bid: {
          select: {
            id: true,
            userId: true,
            technicalProposal: true,
            financialProposal: true,
            timeline: true,
            status: true,
            user: { select: { id: true, email: true, profile: { select: { fullName: true, jobTitle: true } }, company: { select: { id: true, name: true } } } },
          },
        },
        tasks: { orderBy: { order: 'asc' } },
        milestones: { orderBy: { dueDate: 'asc' } },
        payments: { orderBy: { paymentDate: 'desc' } },
        chat: { include: { messages: { orderBy: { createdAt: 'desc' }, take: 50, include: { user: { select: { id: true, email: true, profile: { select: { fullName: true } } } } } } } },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Contractor can only see their own projects
    if (user!.role === 'contractor' && project.bid.userId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only view your own projects' },
        { status: 403 }
      );
    }

    // Tender owner can only see projects for tenders they created
    if (user!.role === 'tender_owner' && project.tender.createdBy !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only view projects for tenders you created' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (err) {
    console.error('Get project error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching the project' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]
 * Admin: update project status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status } = body;

    const validStatuses = ['active', 'completed', 'on_hold', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;

    const updatedProject = await db.project.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedProject,
    });
  } catch (err) {
    console.error('Update project error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating the project' },
      { status: 500 }
    );
  }
}
