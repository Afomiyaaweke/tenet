import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/projects
 * Admin: all projects
 * User: projects where their bid was awarded (check bid.userId)
 * Team admin: projects for tenders they created
 * Include tender title, bid info
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    // Company isolation: non-team_admin users only see projects from their own company
    if (user!.role !== 'team_admin' && user!.companyId) {
      where.companyId = user!.companyId;
    }

    const [projects, total] = await Promise.all([
      db.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          tender: { select: { id: true, title: true, categoryTags: true, deadline: true } },
          bid: {
            select: {
              id: true,
              userId: true,
              financialProposal: true,
              timeline: true,
              status: true,
              user: { select: { id: true, email: true, profile: { select: { fullName: true, jobTitle: true } }, company: { select: { id: true, name: true } } } },
            },
          },
          _count: { select: { tasks: true, payments: true, milestones: true } },
        },
      }),
      db.project.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: projects,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('List projects error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching projects' },
      { status: 500 }
    );
  }
}
