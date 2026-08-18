import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/agent-sessions/[id] — Get session with related data
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    const session = await db.agentSession.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        analyses: {
          orderBy: { createdAt: 'desc' },
        },
        artifacts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!session || session.userId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: session });
  } catch (err: any) {
    console.error('Get agent session error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to get session' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/agent-sessions/[id] — Update session title or summary
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    // Verify ownership
    const existing = await db.agentSession.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing || existing.userId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data: { title?: string; summary?: string } = {};

    if (body.title !== undefined && typeof body.title === 'string') {
      data.title = body.title.trim();
    }
    if (body.summary !== undefined && typeof body.summary === 'string') {
      data.summary = body.summary.trim();
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const session = await db.agentSession.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: session });
  } catch (err: any) {
    console.error('Update agent session error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update session' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/agent-sessions/[id] — Delete session and all related data
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    // Verify ownership
    const existing = await db.agentSession.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing || existing.userId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Cascade delete is handled by the schema (onDelete: Cascade)
    await db.agentSession.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (err: any) {
    console.error('Delete agent session error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete session' },
      { status: 500 }
    );
  }
}
