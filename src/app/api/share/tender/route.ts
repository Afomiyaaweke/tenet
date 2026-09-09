import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/share/tender
 * Create (or reuse) a public shareable link for a tender.
 * Requires auth. Two kinds:
 *  - { tenderId }            → share an app Tender (snapshot taken from DB)
 *  - { tender: {...} }       → share an external/live tender snapshot
 *    (expects at least: source, title)
 *
 * Returns { success: true, data: { id, slug } } where slug = `/t/<id>`.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    // ── Case 1: share an app Tender by id ──
    if (body.tenderId && typeof body.tenderId === 'string') {
      const tender = await db.tender.findUnique({ where: { id: body.tenderId } });
      if (!tender || tender.status === 'draft') {
        return NextResponse.json({ success: false, error: 'Tender not found' }, { status: 404 });
      }

      const snapshot = JSON.stringify({
        kind: 'tender',
        title: tender.title,
        scope: tender.scope,
        budgetMin: tender.budgetMin,
        budgetMax: tender.budgetMax,
        deadline: tender.deadline,
        location: tender.location,
        categoryTags: tender.categoryTags,
        status: tender.status,
        externalUrl: tender.externalUrl || null,
        externalSource: 'TenetBid',
        currency: 'ETB',
      });

      const share = await db.tenderShare.upsert({
        where: { kind_tenderId: { kind: 'tender', tenderId: tender.id } },
        create: { kind: 'tender', tenderId: tender.id, snapshot, createdBy: user!.id },
        update: { snapshot },
      });

      return NextResponse.json(
        { success: true, data: { id: share.id, slug: `/t/${share.id}` } },
        { status: 201 },
      );
    }

    // ── Case 2: share a live/external tender snapshot ──
    const t = body.tender;
    if (!t || typeof t !== 'object' || !t.title || !t.source) {
      return NextResponse.json(
        { success: false, error: 'tender (with title and source) is required' },
        { status: 400 },
      );
    }

    const externalId = `${t.source}:${t.externalId || t.id || t.title}`.slice(0, 500);

    const snapshot = JSON.stringify({
      kind: 'live',
      title: String(t.title).slice(0, 500),
      scope: t.scope || t.summary || t.description || '',
      budgetMin: Number(t.budgetMin) || 0,
      budgetMax: Number(t.budgetMax) || 0,
      deadline: t.deadline || null,
      location: t.location || '',
      categoryTags: t.categoryTags || '',
      status: t.status || 'open',
      externalUrl: t.externalUrl || t.documentUrl || null,
      externalSource: t.source,
      currency: t.currency || 'USD',
      borrower: t.borrower || null,
      supplier: t.supplier || null,
      contractType: t.contractType || null,
      region: t.region || null,
      documentUrl: t.documentUrl || null,
      documentFiles: Array.isArray(t.documentFiles) ? t.documentFiles.slice(0, 10) : [],
    });

    const share = await db.tenderShare.upsert({
      where: { kind_externalId: { kind: 'live', externalId } },
      create: { kind: 'live', externalId, snapshot, createdBy: user!.id },
      update: { snapshot },
    });

    return NextResponse.json(
      { success: true, data: { id: share.id, slug: `/t/${share.id}` } },
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/share/tender] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create share link' }, { status: 500 });
  }
}
