import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/tenders/saved/check?source=xxx&tenderId=xxx — Check if a tender is saved
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const tenderId = searchParams.get('tenderId');
    const source = searchParams.get('source') || 'local';

    if (!tenderId) {
      return NextResponse.json(
        { success: false, error: 'Missing tenderId' },
        { status: 400 },
      );
    }

    const saved = await db.savedTender.findUnique({
      where: {
        userId_tenderId_source: {
          userId: user!.id,
          tenderId,
          source,
        },
      },
    });

    return NextResponse.json({ success: true, saved: !!saved, data: saved });
  } catch (error) {
    console.error('Check saved tender error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check saved status' },
      { status: 500 },
    );
  }
}
