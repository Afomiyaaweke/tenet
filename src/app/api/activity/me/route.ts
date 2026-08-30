import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/activity/me?days=365
 * Returns the current user's company activity aggregated by day for a
 * GitHub-style contribution heatmap.
 *
 * Sources: bids submitted, tenders published, projects started, documents uploaded.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    if (!user?.companyId) {
      return NextResponse.json({
        success: true,
        data: { days: [], total: 0, byType: {}, streak: 0, longestStreak: 0 },
      });
    }

    const url = new URL(request.url);
    const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '365', 10) || 365, 30), 730);
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    // Align to start of day
    startDate.setHours(0, 0, 0, 0);

    const companyId = user.companyId;

    // Fetch all activity sources in parallel — only createdAt timestamps needed
    const [bids, tenders, projects, documents] = await Promise.all([
      db.bid.findMany({
        where: {
          createdAt: { gte: startDate },
          user: { companyId },
        },
        select: { createdAt: true },
      }),
      db.tender.findMany({
        where: {
          createdAt: { gte: startDate },
          companyId,
        },
        select: { createdAt: true },
      }),
      db.project.findMany({
        where: {
          createdAt: { gte: startDate },
          companyId,
        },
        select: { createdAt: true },
      }),
      db.document.findMany({
        where: {
          createdAt: { gte: startDate },
          company: { id: companyId },
        },
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
        dayMap.set(key, { date: key, count: 0, byType: { bid: 0, tender: 0, project: 0, document: 0 } });
      }
      const entry = dayMap.get(key)!;
      entry.count += 1;
      entry.byType[type] = (entry.byType[type] || 0) + 1;
    };

    bids.forEach(b => addToDay(b.createdAt, 'bid'));
    tenders.forEach(t => addToDay(t.createdAt, 'tender'));
    projects.forEach(p => addToDay(p.createdAt, 'project'));
    documents.forEach(d => addToDay(d.createdAt, 'document'));

    // Build a complete day series (fill gaps with 0) for the requested range
    const daysArray: { date: string; count: number; byType: Record<string, number> }[] = [];
    const cursor = new Date(startDate);
    while (cursor <= now) {
      const key = cursor.toISOString().split('T')[0];
      const entry = dayMap.get(key);
      daysArray.push(entry || { date: key, count: 0, byType: { bid: 0, tender: 0, project: 0, document: 0 } });
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
    };

    const total = bids.length + tenders.length + projects.length + documents.length;

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
