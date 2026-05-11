import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/chats
 * List chats for current user
 * Admin: all chats
 * Contractor: chats where they're participant via project bid
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const where: Record<string, unknown> = {};

    if (user!.role === 'contractor') {
      // Contractors see chats for projects where their bid was awarded
      where.project = { bid: { userId: user!.id } };
    }
    // Admin and tender_owner see all chats (no filter)

    const chats = await db.chat.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: {
            id: true,
            status: true,
            tender: { select: { id: true, title: true } },
            bid: { select: { user: { select: { id: true, email: true, profile: { select: { fullName: true, companyName: true } } } } } },
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
