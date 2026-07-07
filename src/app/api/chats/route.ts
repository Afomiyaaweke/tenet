import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/chats
 * List chats for current user
 * Admin: all chats
 * User: chats where they're participant via project bid
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const where: Record<string, unknown> = {};

    if (user!.role === 'user') {
      // Standard users see chats for projects where their bid was awarded
      where.project = { bid: { userId: user!.id } };
    } else if (user!.role === 'team_admin' || user!.role === 'super_admin') {
      // Team admins/super admins see chats for tenders they created
      where.tender = { createdBy: user!.id };
    }
    // super_admin/team_admin sees all chats (no filter)

    const chats = await db.chat.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: {
            id: true,
            status: true,
            tender: { select: { id: true, title: true } },
            bid: { select: { user: { select: { id: true, email: true, profile: { select: { fullName: true, jobTitle: true } }, company: { select: { id: true, name: true } } } } } },
          },
        },
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true, userId: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: chats,
    });
  } catch (err) {
    console.error('List chats error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching chats' },
      { status: 500 }
    );
  }
}
