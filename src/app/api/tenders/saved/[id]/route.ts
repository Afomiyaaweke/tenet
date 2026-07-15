import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

// DELETE /api/tenders/saved/[id] - Remove a saved tender
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    const saved = await db.savedTender.findUnique({ where: { id } });
    if (!saved || saved.userId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'Saved tender not found' },
        { status: 404 },
      );
    }

    await db.savedTender.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete saved tender error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete saved tender' },
      { status: 500 },
    );
  }
}

// PATCH /api/tenders/saved/[id] - Update saved tender (notes, status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const { notes, status } = body;

    const saved = await db.savedTender.findUnique({ where: { id } });
    if (!saved || saved.userId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'Saved tender not found' },
        { status: 404 },
      );
    }

    const updated = await db.savedTender.update({
      where: { id },
      data: {
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update saved tender error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update saved tender' },
      { status: 500 },
    );
  }
}
