import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/tenders/saved/batch-check - Check if multiple tenders are saved in one call
// Body: { items: [{ tenderId: string, source: string }] }
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const items: Array<{ tenderId: string; source?: string }> = body.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing items array' },
        { status: 400 },
      );
    }

    // Cap at 50 items to prevent abuse
    const batch = items.slice(0, 50);

    // Query all saved tenders for this user in one go
    const savedRecords = await db.savedTender.findMany({
      where: {
        userId: user!.id,
        tenderId: { in: batch.map((item) => item.tenderId) },
      },
      select: { tenderId: true, source: true },
    });

    // Build a Set for O(1) lookups
    const savedSet = new Set(
      savedRecords.map((r) => `${r.tenderId}::${r.source || 'local'}`)
    );

    // Build result map
    const results: Record<string, boolean> = {};
    for (const item of batch) {
      const key = `${item.tenderId}::${item.source || 'local'}`;
      results[item.tenderId] = savedSet.has(key);
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Batch check saved tenders error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to batch check saved status' },
      { status: 500 },
    );
  }
}
