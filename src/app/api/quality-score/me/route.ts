import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/quality-score/me
 * Returns the current user's company Quality Score, badge, and breakdown.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    if (!user?.companyId) {
      return NextResponse.json({ success: true, data: { qualityScore: 0, badge: 'new' as const, scoreBreakdown: { verified: 0, profileCompleteness: 0, documents: 0, tenders: 0, bids: 0, projects: 0, endorsements: 0 }, hasCompany: false } });
    }

    const company = await db.company.findUnique({
      where: { id: user.companyId },
      include: {
        profiles: { select: { fullName: true, jobTitle: true, bio: true, skillTags: true, profilePhoto: true, verified: true }, take: 1 },
        documents: { where: { status: 'approved' }, select: { id: true, docType: true } },
        users: {
          select: {
            id: true,
            endorsementsReceived: { select: { id: true }, take: 20 },
            bids: { select: { status: true } },
          },
        },
        projects: { select: { id: true, status: true, contractValue: true } },
        _count: { select: { documents: true, tenders: true, projects: true } },
      },
    });

    if (!company) {
      return NextResponse.json({ success: true, data: { qualityScore: 0, badge: 'new' as const, scoreBreakdown: { verified: 0, profileCompleteness: 0, documents: 0, tenders: 0, bids: 0, projects: 0, endorsements: 0 }, hasCompany: false } });
    }

    let score = 0;
    if (company.verified) score += 15;

    const mainProfile = company.profiles[0];
    let profileCompletenessScore = 0;
    if (mainProfile) {
      let f = 0; const t = 7;
      if (mainProfile.fullName) f++;
      if (mainProfile.jobTitle) f++;
      if (mainProfile.bio) f++;
      if (mainProfile.skillTags) f++;
      if (mainProfile.profilePhoto) f++;
      if (mainProfile.verified) f++;
      if (company.city) f++;
      profileCompletenessScore = Math.round((f / t) * 20);
      score += profileCompletenessScore;
    }

    const docScore = Math.min(company.documents.length, 10) * 2;
    score += docScore;
    const tenderScore = Math.round(Math.min(company._count.tenders, 10) * 1.5);
    score += tenderScore;
    const allBids = company.users.flatMap(u => u.bids);
    score += Math.min(allBids.length, 10);
    const completedProjects = company.projects.filter(p => p.status === 'completed').length;
    score += Math.min(completedProjects, 5) * 2;
    const allEndorsements = company.users.flatMap(u => u.endorsementsReceived);
    score += Math.min(allEndorsements.length, 10);
    score = Math.min(score, 100);

    let badge: 'platinum' | 'gold' | 'silver' | 'bronze' | 'new' = 'new';
    if (score >= 90) badge = 'platinum';
    else if (score >= 70) badge = 'gold';
    else if (score >= 50) badge = 'silver';
    else if (score >= 30) badge = 'bronze';

    return NextResponse.json({
      success: true,
      data: {
        qualityScore: score,
        badge,
        scoreBreakdown: {
          verified: company.verified ? 15 : 0,
          profileCompleteness: profileCompletenessScore,
          documents: docScore,
          tenders: tenderScore,
          bids: Math.min(allBids.length, 10),
          projects: Math.min(completedProjects, 5) * 2,
          endorsements: Math.min(allEndorsements.length, 10),
        },
        nextMilestone: score < 30 ? 30 : score < 50 ? 50 : score < 70 ? 70 : score < 90 ? 90 : 100,
        nextBadge: score < 30 ? 'Bronze' : score < 50 ? 'Silver' : score < 70 ? 'Gold' : score < 90 ? 'Platinum' : 'Max',
        bidsWon: allBids.filter(b => b.status === 'awarded').length,
        completedProjects,
      },
    });
  } catch (err) {
    console.error('Quality score error:', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
