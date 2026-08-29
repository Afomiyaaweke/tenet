import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/vanity/[slug]
 * Public endpoint — no auth required.
 * Returns full "Capability Microsite" data for a company's vanity page.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug || slug.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 }
      );
    }

    const company = await db.company.findUnique({
      where: { vanitySlug: slug },
      include: {
        profiles: {
          select: {
            fullName: true,
            jobTitle: true,
            profilePhoto: true,
            bio: true,
            skillTags: true,
            verified: true,
          },
          take: 5,
        },
        documents: {
          where: { status: 'approved' },
          select: {
            id: true,
            fileName: true,
            docType: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        tenders: {
          where: { status: { in: ['published', 'awarded', 'closed'] } },
          select: {
            id: true,
            title: true,
            categoryTags: true,
            deadline: true,
            budgetMax: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        bids: {
          select: {
            id: true,
            status: true,
            financialProposal: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        users: {
          select: {
            id: true,
            endorsementsReceived: {
              select: { skill: true, fromUser: { select: { profile: { select: { fullName: true } } } } },
              take: 20,
            },
          },
          take: 20,
        },
        projects: {
          select: { id: true, status: true, contractValue: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            documents: true,
            tenders: true,
            projects: true,
            users: true,
            bids: true,
          },
        },
      },
    });

    if (!company || company.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 }
      );
    }

    // ── Compute Quality Score (0–100) ──
    const approvedDocs = company.documents;
    const profiles = company.profiles;
    const stats = company._count;

    let score = 0;

    // Verified company: +15
    if (company.verified) score += 15;

    // Profile completeness (up to +20)
    const mainProfile = profiles[0];
    if (mainProfile) {
      let profileFields = 0;
      const total = 7;
      if (mainProfile.fullName) profileFields++;
      if (mainProfile.jobTitle) profileFields++;
      if (mainProfile.bio) profileFields++;
      if (mainProfile.skillTags) profileFields++;
      if (mainProfile.profilePhoto) profileFields++;
      if (mainProfile.verified) profileFields++;
      if (company.city) profileFields++;
      score += Math.round((profileFields / total) * 20);
    }

    // Approved documents (up to +20)
    const docScore = Math.min(approvedDocs.length, 10) * 2;
    score += docScore;

    // Tenders published (up to +15)
    const tenderScore = Math.min(stats.tenders, 10) * 1.5;
    score += Math.round(tenderScore);

    // Bids submitted (up to +10)
    const bidScore = Math.min(stats.bids, 10) * 1;
    score += bidScore;

    // Projects completed (up to +10)
    const completedProjects = company.projects.filter(p => p.status === 'completed').length;
    const projectScore = Math.min(completedProjects, 5) * 2;
    score += projectScore;

    // Endorsements received (up to +10)
    const allEndorsements = company.users.flatMap(u => u.endorsementsReceived);
    const endorsementScore = Math.min(allEndorsements.length, 10);
    score += endorsementScore;

    score = Math.min(score, 100);

    // Badge level
    let badge: 'platinum' | 'gold' | 'silver' | 'bronze' | 'new' = 'new';
    if (score >= 90) badge = 'platinum';
    else if (score >= 70) badge = 'gold';
    else if (score >= 50) badge = 'silver';
    else if (score >= 30) badge = 'bronze';

    // Score breakdown for transparency ("Glass Box")
    const scoreBreakdown = {
      verified: company.verified ? 15 : 0,
      profileCompleteness: Math.round((mainProfile ? (() => {
        let f = 0; const t = 7;
        if (mainProfile.fullName) f++; if (mainProfile.jobTitle) f++; if (mainProfile.bio) f++;
        if (mainProfile.skillTags) f++; if (mainProfile.profilePhoto) f++; if (mainProfile.verified) f++;
        if (company.city) f++;
        return f / t;
      })() : 0) * 20),
      documents: docScore,
      tenders: Math.round(tenderScore),
      bids: bidScore,
      projects: projectScore,
      endorsements: endorsementScore,
    };

    // Aggregate endorsements by skill
    const endorsementMap = new Map<string, number>();
    for (const e of allEndorsements) {
      endorsementMap.set(e.skill, (endorsementMap.get(e.skill) || 0) + 1);
    }
    const topEndorsements = Array.from(endorsementMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count }));

    // Activity feed (recent actions)
    const activityFeed: Array<{ type: string; label: string; date: string }> = [];
    for (const t of company.tenders.slice(0, 5)) {
      activityFeed.push({
        type: 'tender',
        label: `Published tender: ${t.title.substring(0, 60)}${t.title.length > 60 ? '...' : ''}`,
        date: t.createdAt.toISOString(),
      });
    }
    for (const b of company.bids.slice(0, 5)) {
      activityFeed.push({
        type: 'bid',
        label: `Submitted bid (${b.status === 'awarded' ? 'Won' : b.status === 'rejected' ? 'Lost' : 'Under Review'})`,
        date: b.createdAt.toISOString(),
      });
    }
    for (const d of approvedDocs.slice(0, 3)) {
      activityFeed.push({
        type: 'document',
        label: `Document verified: ${d.fileName.substring(0, 50)}`,
        date: d.createdAt.toISOString(),
      });
    }
    for (const p of company.projects.slice(0, 3)) {
      activityFeed.push({
        type: 'project',
        label: `Project ${p.status === 'completed' ? 'completed' : 'started'}`,
        date: p.createdAt.toISOString(),
      });
    }
    activityFeed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Completed project value
    const totalContractValue = company.projects
      .filter(p => p.status === 'completed' && p.contractValue)
      .reduce((sum, p) => sum + p.contractValue, 0);

    const publicData = {
      name: company.name,
      industry: company.industry,
      city: company.city,
      country: company.country,
      logoUrl: company.logoUrl,
      website: company.website,
      verified: company.verified,
      vanitySlug: company.vanitySlug,
      createdAt: company.createdAt.toISOString(),

      // Team
      teamMembers: profiles,
      teamSize: stats.users,

      // Documents & Credentials
      documents: approvedDocs,
      docCategories: {
        business_license: approvedDocs.filter(d => d.docType === 'business_license').length,
        certificate: approvedDocs.filter(d => d.docType === 'certificate').length,
        portfolio: approvedDocs.filter(d => d.docType === 'portfolio').length,
        other: approvedDocs.filter(d => !['business_license', 'certificate', 'portfolio'].includes(d.docType)).length,
      },

      // Tenders
      tenders: company.tenders,
      tendersPublished: stats.tenders,

      // Bids
      bids: company.bids,
      bidsWon: company.bids.filter(b => b.status === 'awarded').length,
      bidsSubmitted: stats.bids,

      // Projects
      completedProjects,
      totalContractValue,

      // Endorsements
      topEndorsements,
      totalEndorsements: allEndorsements.length,

      // Quality Score (The Core)
      qualityScore: score,
      badge,
      scoreBreakdown,

      // Activity Feed
      activityFeed: activityFeed.slice(0, 15),

      // Stats
      stats,
    };

    return NextResponse.json({ success: true, data: publicData });
  } catch (error) {
    console.error('Vanity page error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    );
  }
}
