import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/leaderboard
 * Public endpoint — no auth required.
 * Returns top suppliers ranked by computed Quality Score.
 */
export async function GET() {
  try {
    const companies = await db.company.findMany({
      where: {
        status: 'active',
        vanitySlug: { not: null },
      },
      include: {
        profiles: { select: { fullName: true, jobTitle: true, profilePhoto: true }, take: 1 },
        documents: { where: { status: 'approved' }, select: { id: true, docType: true } },
        users: {
          select: {
            id: true,
            bids: { select: { status: true, financialProposal: true } },
          },
        },
        _count: {
          select: { documents: true, tenders: true, projects: true },
        },
        projects: { select: { id: true, status: true, contractValue: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Compute quality score for each company
    const ranked = companies.map((c) => {
      let score = 0;
      if (c.verified) score += 15;

      const mainProfile = c.profiles[0];
      if (mainProfile) {
        let f = 0; const t = 7;
        if (mainProfile.fullName) f++; if (mainProfile.jobTitle) f++; if (mainProfile.profilePhoto) f++;
        if (c.city) f++;
        score += Math.round((f / t) * 20);
      }

      const approvedDocs = c.documents;
      const allBids = c.users.flatMap(u => u.bids);
      score += Math.min(approvedDocs.length, 10) * 2;
      score += Math.round(Math.min(c._count.tenders, 10) * 1.5);
      score += Math.min(allBids.length, 10);
      const completedProjects = c.projects.filter(p => p.status === 'completed').length;
      score += Math.min(completedProjects, 5) * 2;

      score = Math.min(score, 100);

      let badge: 'platinum' | 'gold' | 'silver' | 'bronze' | 'new' = 'new';
      if (score >= 90) badge = 'platinum';
      else if (score >= 70) badge = 'gold';
      else if (score >= 50) badge = 'silver';
      else if (score >= 30) badge = 'bronze';

      const totalContractValue = c.projects
        .filter(p => p.status === 'completed' && p.contractValue)
        .reduce((sum, p) => sum + p.contractValue, 0);

      return {
        name: c.name,
        industry: c.industry,
        city: c.city,
        country: c.country,
        logoUrl: c.logoUrl,
        vanitySlug: c.vanitySlug,
        verified: c.verified,
        qualityScore: score,
        badge,
        bidsWon: allBids.filter(b => b.status === 'awarded').length,
        completedProjects,
        totalContractValue,
        docCount: c._count.documents,
        tenderCount: c._count.tenders,
        teamSize: c.users.length,
      };
    });

    ranked.sort((a, b) => b.qualityScore - a.qualityScore);

    return NextResponse.json({ success: true, data: ranked });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    );
  }
}
