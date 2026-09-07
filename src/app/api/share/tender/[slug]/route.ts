import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/share/tender/[slug]
 * Public endpoint (no auth) returning the shared tender snapshot.
 * Increments the view counter (best-effort, non-blocking).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Missing share id' }, { status: 400 });
    }

    const share = await db.tenderShare.findUnique({ where: { id: slug } });
    if (!share) {
      return NextResponse.json({ success: false, error: 'Share link not found' }, { status: 404 });
    }

    // Non-blocking view counter
    db.tenderShare.update({ where: { id: share.id }, data: { views: { increment: 1 } } }).catch(() => {});

    let snapshot: Record<string, unknown> = {};
    try {
      snapshot = JSON.parse(share.snapshot);
    } catch {
      return NextResponse.json({ success: false, error: 'Corrupted share data' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...snapshot,
        views: share.views + 1,
        sharedAt: share.createdAt,
      },
    });
  } catch (err) {
    console.error('[GET /api/share/tender/[slug]] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to load shared tender' }, { status: 500 });
  }
}
