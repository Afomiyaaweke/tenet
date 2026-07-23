import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Overview counts
    const [
      totalUsers,
      totalCompanies,
      totalTenders,
      totalBids,
      totalProjects,
      totalDocuments,
      recentLogs,
    ] = await Promise.all([
      db.user.count(),
      db.company.count(),
      db.tender.count(),
      db.bid.count(),
      db.project.count(),
      db.document.count(),
      db.auditLog.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    // Tender status breakdown
    const tendersByStatus = await db.tender.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    // Bid status breakdown
    const bidsByStatus = await db.bid.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    // Action breakdown
    const actionsByType = await db.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
      where: { createdAt: { gte: thirtyDaysAgo } },
      orderBy: { _count: { action: 'desc' } },
    });

    // Top companies by user count
    const topCompanies = await db.company.findMany({
      include: {
        _count: { select: { users: true, tenders: true } },
      },
      orderBy: { users: { _count: 'desc' } },
      take: 10,
    });

    // Users registered in last 30 days - group by date
    const recentUsers = await db.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    // Companies created in last 30 days - group by date
    const recentCompanies = await db.company.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    // Group activity by date
    const activityByDate: Record<string, number> = {};
    for (const log of recentLogs) {
      const date = log.createdAt.toISOString().split('T')[0];
      activityByDate[date] = (activityByDate[date] || 0) + 1;
    }

    // Group user growth by date
    const userGrowthByDate: Record<string, number> = {};
    for (const u of recentUsers) {
      const date = u.createdAt.toISOString().split('T')[0];
      userGrowthByDate[date] = (userGrowthByDate[date] || 0) + 1;
    }

    // Group company growth by date
    const companyGrowthByDate: Record<string, number> = {};
    for (const c of recentCompanies) {
      const date = c.createdAt.toISOString().split('T')[0];
      companyGrowthByDate[date] = (companyGrowthByDate[date] || 0) + 1;
    }

    // Convert to arrays and sort by date
    const activityTimeline = Object.entries(activityByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const userGrowth = Object.entries(userGrowthByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const companyGrowth = Object.entries(companyGrowthByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get user info for recent logs
    const userIds = [...new Set(recentLogs.map(l => l.userId).filter(Boolean))] as string[];
    const logUsers = await db.user.findMany({
      where: { id: { in: userIds } },
      include: { profile: true },
    });
    const userMap = new Map(logUsers.map(u => [u.id, u]));

    const recentActivity = recentLogs.map(log => ({
      id: log.id,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
      user: log.userId ? {
        email: userMap.get(log.userId)?.email || 'Unknown',
        name: userMap.get(log.userId)?.profile?.fullName || 'Unknown',
      } : null,
    }));

    // Active users in last 24h and 7d
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const activeUsers24h = await db.auditLog.findMany({
      where: { createdAt: { gte: oneDayAgo }, userId: { not: null } },
      select: { userId: true },
      distinct: ['userId'],
    });

    const activeUsers7d = await db.auditLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo }, userId: { not: null } },
      select: { userId: true },
      distinct: ['userId'],
    });

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalCompanies,
          totalTenders,
          totalBids,
          totalProjects,
          totalDocuments,
          activeUsers24h: activeUsers24h.length,
          activeUsers7d: activeUsers7d.length,
        },
        activityTimeline,
        userGrowth,
        companyGrowth,
        tendersByStatus: tendersByStatus.map(t => ({ status: t.status, count: t._count.status })),
        bidsByStatus: bidsByStatus.map(b => ({ status: b.status, count: b._count.status })),
        actionsByType: actionsByType.map(a => ({ action: a.action, count: a._count.action })),
        topCompanies: topCompanies.map(c => ({
          id: c.id,
          name: c.name,
          industry: c.industry,
          verified: c.verified,
          users: c._count.users,
          tenders: c._count.tenders,
          bids: 0,
          createdAt: c.createdAt.toISOString(),
        })),
        recentActivity,
      },
    });
  } catch (err) {
    console.error('[GET /api/audit/stats] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch audit stats' }, { status: 500 });
  }
}
