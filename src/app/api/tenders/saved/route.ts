import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/tenders/saved - List user's saved tenders
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const where: Record<string, unknown> = { userId: user!.id };
    if (status) where.status = status;

    const saved = await db.savedTender.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Get saved tenders error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch saved tenders' },
      { status: 500 },
    );
  }
}

// POST /api/tenders/saved - Save/bookmark a tender
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { tenderId, source, title, scope, budgetMin, budgetMax, deadline, location, categoryTags, externalUrl, currency, notes } = body;

    if (!tenderId || !title) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: tenderId, title' },
        { status: 400 },
      );
    }

    const saved = await db.savedTender.upsert({
      where: {
        userId_tenderId_source: {
          userId: user!.id,
          tenderId,
          source: source || 'local',
        },
      },
      create: {
        userId: user!.id,
        tenderId,
        source: source || 'local',
        title,
        scope: scope || '',
        budgetMin: Number(budgetMin) || 0,
        budgetMax: Number(budgetMax) || 0,
        deadline: deadline ? new Date(deadline) : null,
        location: location || '',
        categoryTags: categoryTags || '',
        externalUrl: externalUrl || null,
        currency: currency || 'USD',
        notes: notes || null,
      },
      update: {
        title,
        scope: scope || '',
        budgetMin: Number(budgetMin) || 0,
        budgetMax: Number(budgetMax) || 0,
        deadline: deadline ? new Date(deadline) : null,
        location: location || '',
        categoryTags: categoryTags || '',
        externalUrl: externalUrl || null,
        currency: currency || 'USD',
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error) {
    console.error('Save tender error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save tender' },
      { status: 500 },
    );
  }
}
