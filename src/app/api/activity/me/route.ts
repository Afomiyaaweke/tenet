import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/activity/me?days=365
 * Returns the current user's activity aggregated by day for a
 * GitHub-style contribution heatmap.
 *
 * Sources: bids submitted, tenders published, projects started, documents
 * uploaded, and Proforma marketplace listings posted. Company-scoped for
 * company accounts; personal accounts still get their own listing posts.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const url = new URL(request.url);
    const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '365', 10) || 365, 30), 730);
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    // Align to start of day
    startDate.setHours(0, 0, 0, 0);

    const companyId = user?.companyId || null;
    const range = { createdAt: { gte: startDate } };

    // Fetch all activity sources in parallel — only createdAt timestamps needed.
    // Listing posts are always tracked (own posts for personal accounts,
    // team-wide for company accounts); the other four need a company.
    const empty: { createdAt: Date }[] = [];
    const [bids, tenders, projects, documents, listings] = await Promise.all([
      companyId
        ? db.bid.findMany({ where: { ...range, user: { companyId } }, select: { createdAt: true } })
        : Promise.resolve(empty),
      companyId
        ? db.tender.findMany({ where: { ...range, companyId }, select: { createdAt: true } })
        : Promise.resolve(empty),
      companyId
        ? db.project.findMany({ where: { ...range, companyId }, select: { createdAt: true } })
        : Promise.resolve(empty),
      companyId
        ? db.document.findMany({ where: { ...range, company: { id: companyId } }, select: { createdAt: true } })
        : Promise.resolve(empty),
      db.proformaListing.findMany({
        where: { ...range, ...(companyId ? { user: { companyId } } : { userId: user!.id }) },
        select: { createdAt: true },
      }),
    ]);

    // Aggregate by YYYY-MM-DD with per-type breakdown
    const dayMap = new Map<string, { date: string; count: number; byType: Record<string, number> }>();

    const addToDay = (date: Date, type: string) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().split('T')[0];
      if (!dayMap.has(key)) {
        dayMap.set(key, { date: key, count: 0, byType: { bid: 0, tender: 0, project: 0, document: 0, listing: 0 } });
      }
      const entry = dayMap.get(key)!;
      entry.count += 1;
      entry.byType[type] = (entry.byType[type] || 0) + 1;
    };

    bids.forEach(b => addToDay(b.createdAt, 'bid'));
    tenders.forEach(t => addToDay(t.createdAt, 'tender'));
    projects.forEach(p => addToDay(p.createdAt, 'project'));
    documents.forEach(d => addToDay(d.createdAt, 'document'));
    listings.forEach(l => addToDay(l.createdAt, 'listing'));

    // Build a complete day series (fill gaps with 0) for the requested range
    const daysArray: { date: string; count: number; byType: Record<string, number> }[] = [];
    const cursor = new Date(startDate);
    while (cursor <= now) {
      const key = cursor.toISOString().split('T')[0];
      const entry = dayMap.get(key);
      daysArray.push(entry || { date: key, count: 0, byType: { bid: 0, tender: 0, project: 0, document: 0, listing: 0 } });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Calculate current streak (consecutive days with activity, ending today or yesterday)
    let streak = 0;
    for (let i = daysArray.length - 1; i >= 0; i--) {
      if (daysArray[i].count > 0) {
        streak++;
      } else if (streak > 0) {
        // Allow today to be empty if yesterday had activity
        if (i === daysArray.length - 2) continue;
        break;
      }
    }

    // Calculate longest streak in the range
    let longestStreak = 0;
    let currentRun = 0;
    for (const d of daysArray) {
      if (d.count > 0) {
        currentRun++;
        if (currentRun > longestStreak) longestStreak = currentRun;
      } else {
        currentRun = 0;
      }
    }

    // Totals by type
    const byType = {
      bid: bids.length,
      tender: tenders.length,
      project: projects.length,
      document: documents.length,
      listing: listings.length,
    };

    const total = bids.length + tenders.length + projects.length + documents.length + listings.length;

    return NextResponse.json({
      success: true,
      data: {
        days: daysArray,
        total,
        byType,
        streak,
        longestStreak,
        range: { start: startDate.toISOString(), end: now.toISOString() },
      },
    });
  } catch (err) {
    console.error('[GET /api/activity/me] error:', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
