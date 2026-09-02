import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { callZAIWithDeadline } from '@/lib/zai';

// Vercel Hobby tier: 10s max. AI structured-JSON generation takes 20-30s,
// so we race against an 8s deadline and fall back to a rule-based ranking.
export const maxDuration = 10;
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are a bid applicant analyzer for Ethiopian procurement. Rank bids on a tender. Return JSON with:
- summary: { totalBids: number, averageScore: number }
- applicants: array of { rank, name, company, overallScore, technicalScore, financialScore, strengths[], weaknesses[], recommendation, riskLevel }
- budgetAnalysis: string
- riskSummary: string
- finalRecommendation: string

Score 0-100. Sort by rank ascending. Currency: ETB. Return ONLY valid JSON.`;

interface BidData {
  id: string;
  bidderName: string;
  company: string;
  skills: string;
  verified: boolean;
  technicalProposal: string;
  financialProposal: number;
  timeline: string;
  status: string;
}

// Rule-based fallback ranking — deterministic, no AI needed.
// Scores each bid on financial competitiveness (closer to budget midpoint =
// higher) and gives a baseline technical score. Used when the AI can't finish
// in time so the user still sees a meaningful ranking.
function buildFallbackRanking(tender: { title: string; scope: string; budgetMin: number; budgetMax: number; categoryTags: string; requiredDocs: string; location: string }, bids: BidData[]): Record<string, unknown> {
  const midpoint = (tender.budgetMin + tender.budgetMax) / 2;
  const range = Math.max(1, tender.budgetMax - tender.budgetMin);

  const scored = bids.map((bid) => {
    // Financial score: closer to midpoint = higher (100 at midpoint, 50 at edges)
    const deviation = Math.abs(bid.financialProposal - midpoint) / range;
    const financialScore = Math.max(40, Math.round(100 - deviation * 50));
    // Technical baseline: verified + has technical proposal + has skills
    let technicalScore = 50;
    if (bid.verified) technicalScore += 10;
    if (bid.technicalProposal && bid.technicalProposal.length > 100) technicalScore += 15;
    if (bid.skills && bid.skills.length > 0) technicalScore += 10;
    technicalScore = Math.min(95, technicalScore);
    const overallScore = Math.round(technicalScore * 0.6 + financialScore * 0.4);
    return { bid, financialScore, technicalScore, overallScore };
  }).sort((a, b) => b.overallScore - a.overallScore);

  const applicants = scored.map((s, i) => ({
    rank: i + 1,
    name: s.bid.bidderName,
    company: s.bid.company,
    overallScore: s.overallScore,
    technicalScore: s.technicalScore,
    financialScore: s.financialScore,
    strengths: [
      s.bid.verified ? 'Verified profile' : 'Submitted complete proposal',
      s.financialScore > 70 ? 'Competitive pricing' : 'Complete submission',
    ].slice(0, 2),
    weaknesses: [
      !s.bid.verified ? 'Profile not verified' : '',
      s.technicalScore < 70 ? 'Limited technical detail' : '',
    ].filter(Boolean).slice(0, 2),
    recommendation: s.overallScore >= 70 ? 'Strong candidate — recommend for award' : s.overallScore >= 55 ? 'Viable candidate — review technical details' : 'Below threshold — consider carefully',
    riskLevel: s.overallScore >= 70 ? 'low' : s.overallScore >= 55 ? 'medium' : 'high',
  }));

  const avgScore = applicants.length > 0
    ? Math.round(applicants.reduce((sum, a) => sum + a.overallScore, 0) / applicants.length)
    : 0;

  const budgetValues = bids.map((b) => b.financialProposal).filter((v) => v > 0);
  const minBid = budgetValues.length ? Math.min(...budgetValues) : 0;
  const maxBid = budgetValues.length ? Math.max(...budgetValues) : 0;
  const avgBid = budgetValues.length ? Math.round(budgetValues.reduce((s, v) => s + v, 0) / budgetValues.length) : 0;

  return {
    summary: { totalBids: bids.length, averageScore: avgScore },
    applicants,
    budgetAnalysis: `Budget range: ETB ${Number(tender.budgetMin).toLocaleString()} - ${Number(tender.budgetMax).toLocaleString()}. Bids received: ${budgetValues.length}. Lowest: ETB ${minBid.toLocaleString()}, Highest: ETB ${maxBid.toLocaleString()}, Average: ETB ${avgBid.toLocaleString()}.`,
    riskSummary: `${applicants.filter((a) => a.riskLevel === 'high').length} high-risk, ${applicants.filter((a) => a.riskLevel === 'medium').length} medium-risk, ${applicants.filter((a) => a.riskLevel === 'low').length} low-risk bids. Verify technical capabilities before awarding.`,
    finalRecommendation: applicants.length > 0
      ? `Top candidate: ${applicants[0].name} (${applicants[0].company}) with overall score ${applicants[0].overallScore}/100. ${applicants[0].recommendation}`
      : 'No bids to recommend.',
  };
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { tenderId } = body;

    if (!tenderId) {
      return NextResponse.json(
        { success: false, error: 'Tender ID is required' },
        { status: 400 }
      );
    }

    const tender = await db.tender.findUnique({
      where: { id: tenderId },
      include: {
        bids: {
          include: {
            user: { include: { profile: true, company: true } },
          },
        },
      },
    });

    if (!tender) {
      return NextResponse.json(
        { success: false, error: 'Tender not found' },
        { status: 404 }
      );
    }

    if (user!.role !== 'team_admin' && user!.companyId) {
      const tenderCreator = await db.user.findUnique({
        where: { id: tender.createdBy },
        select: { companyId: true },
      });
      if (!tenderCreator || tenderCreator.companyId !== user!.companyId) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You can only analyze applicants for your own company\'s tenders' },
          { status: 403 }
        );
      }
    }

    if (tender.bids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No bids submitted on this tender yet' },
        { status: 400 }
      );
    }

    const bidsData: BidData[] = tender.bids.map((bid) => ({
      id: bid.id,
      bidderName: bid.user?.profile?.fullName || bid.user?.email || 'Unknown',
      company: bid.user?.company?.name || 'Individual',
      skills: bid.user?.profile?.skillTags || '',
      verified: bid.user?.profile?.verified || false,
      technicalProposal: bid.technicalProposal,
      financialProposal: bid.financialProposal,
      timeline: bid.timeline,
      status: bid.status,
    }));

    const prompt = `Analyze bids on this tender and rank applicants:

Tender: ${tender.title}
Scope: ${tender.scope}
Budget: ETB ${Number(tender.budgetMin).toLocaleString()} - ${Number(tender.budgetMax).toLocaleString()}
Category: ${tender.categoryTags}

Bids (${bidsData.length}):
${bidsData.map((bid, i) => `Bid ${i + 1}: ${bid.bidderName} (${bid.company}) | Skills: ${bid.skills || 'N/A'} | Verified: ${bid.verified} | Financial: ETB ${Number(bid.financialProposal).toLocaleString()} | Timeline: ${bid.timeline} | Technical: ${bid.technicalProposal.slice(0, 200)}`).join('\n')}

Return ONLY the JSON object. Sort applicants by rank ascending.`;

    const response = await callZAIWithDeadline([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);

    if (!response) {
      const fallback = buildFallbackRanking(tender, bidsData);
      return NextResponse.json({ success: true, data: fallback, fallback: true });
    }

    let parsed: Record<string, unknown>;
    try {
      const cleaned = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const fallback = buildFallbackRanking(tender, bidsData);
      return NextResponse.json({ success: true, data: fallback, fallback: true });
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (err) {
    console.error('Analyze applicants error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze applicants. Please try again.' },
      { status: 500 }
    );
  }
}
