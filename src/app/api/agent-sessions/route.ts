import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/agent-sessions — List sessions for the authenticated user
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const where: any = { userId: user!.id };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { summary: { contains: search } },
      ];
    }

    const sessions = await db.agentSession.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            documents: true,
            messages: true,
            analyses: true,
            artifacts: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: sessions });
  } catch (err: any) {
    console.error('List agent sessions error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to list sessions' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/agent-sessions — Create a new session
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    let title = 'New Tender Review';
    try {
      const body = await request.json();
      if (body.title && typeof body.title === 'string') {
        title = body.title.trim() || 'New Tender Review';
      }
    } catch {
      // No JSON body or invalid — use default title
    }

    const session = await db.agentSession.create({
      data: {
        userId: user!.id,
        title,
      },
    });

    return NextResponse.json({ success: true, data: session });
  } catch (err: any) {
    console.error('Create agent session error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to create session' },
      { status: 500 }
    );
  }
}
