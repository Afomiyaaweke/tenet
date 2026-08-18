import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// Allow up to 60s on Vercel Pro (10s on Hobby)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are the Tenet Tender Ecosystem AI Applicant Analyzer. You analyze bids submitted on a tender and rank the applicants.

## Your Task
Analyze the bids on a given tender and provide a comprehensive ranking and analysis.

## Output Format
Return your response as a JSON object with these exact keys:
- "summary": An object with "totalBids" (number) and "averageScore" (number, 0-100)
- "applicants": An array of objects, each with:
  - "rank" (number): Rank position (1 = best)
  - "name" (string): Bidder's full name
  - "company" (string): Company name or "Individual"
  - "overallScore" (number): Overall score 0-100
  - "technicalScore" (number): Technical merit score 0-100
  - "financialScore" (number): Financial competitiveness score 0-100
  - "strengths" (string[]): Array of strength keywords (2-4 items)
  - "weaknesses" (string[]): Array of weakness keywords (1-3 items)
  - "recommendation" (string): Short recommendation text
  - "riskLevel" (string): One of "low", "medium", "high"
- "budgetAnalysis": Analysis of the financial proposals
- "riskSummary": Overall risk assessment across all bids
- "finalRecommendation": Final recommendation for awarding

## Guidelines
- Score based on: technical merit, financial competitiveness, experience relevance, timeline feasibility
- Rank applicants from best to worst
- Be fair and objective in scoring
- Consider the Ethiopian procurement evaluation standards
- Budget is in Ethiopian Birr (ETB)
- Financial score should consider value for money, not just lowest price
- Be specific in strengths, weaknesses, and recommendations
- Sort applicants array by rank (ascending)`;

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
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

    // Fetch tender with bids
    const tender = await db.tender.findUnique({
      where: { id: tenderId },
      include: {
        bids: {
          include: {
            user: {
              include: { profile: true, company: true },
            },
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

    // Company isolation: only the tender owner's company or team_admin can analyze applicants.
    // Tender has no companyId column — ownership is derived from its creator
    // (createdBy -> User.companyId), so we look that up separately.
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

    // Build bid data for AI
    const bidsData = tender.bids.map(bid => ({
      id: bid.id,
      bidderName: bid.user?.profile?.fullName || bid.user?.email || 'Unknown',
      company: bid.user?.company?.name || 'Individual',
      skills: bid.user?.profile?.skillTags || '',
      verified: bid.user?.profile?.verified || false,
      technicalProposal: bid.technicalProposal,
      financialProposal: bid.financialProposal,
      timeline: bid.timeline,
      status: bid.status,
      submittedAt: bid.createdAt,
    }));

    const prompt = `Analyze the bids submitted on the following tender and rank the applicants:

**Tender Details:**
- Title: ${tender.title}
- Scope: ${tender.scope}
- Budget Range: ${tender.budgetMin.toLocaleString()} - ${tender.budgetMax.toLocaleString()} ETB
- Category: ${tender.categoryTags}
- Required Documents: ${tender.requiredDocs}
- Location: ${tender.location}

**Submitted Bids (${bidsData.length} total):**
${bidsData.map((bid, i) => `
Bid ${i + 1}:
- Bidder: ${bid.bidderName} (${bid.company})
- Skills: ${bid.skills || 'Not specified'}
- Verified: ${bid.verified ? 'Yes' : 'No'}
- Financial Proposal: ${bid.financialProposal.toLocaleString()} ETB
- Timeline: ${bid.timeline}
- Technical Proposal: ${bid.technicalProposal}
- Status: ${bid.status}
`).join('\n')}

Generate the complete analysis. Return ONLY a valid JSON object with the keys specified in the system prompt. Ensure applicants are sorted by rank (best first). Do not include any markdown formatting or code fences around the JSON.`;

    let response = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const zai = await getZAI();
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          thinking: { type: 'disabled' },
        });
        response = completion.choices[0]?.message?.content || '';
        if (response) break;
      } catch (err) {
        if (attempt === 2) throw err;
        zaiInstance = null;
      }
    }

    if (!response) {
      return NextResponse.json(
        { success: false, error: 'Failed to analyze applicants' },
        { status: 500 }
      );
    }

    let parsed: Record<string, unknown>;
    try {
      const cleaned = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: return raw analysis
      parsed = {
        summary: { totalBids: bidsData.length, averageScore: 50 },
        applicants: bidsData.slice(0, 10).map((bid, i) => ({
          rank: i + 1,
          name: bid.bidderName,
          company: bid.company,
          overallScore: 60,
          technicalScore: 60,
          financialScore: 60,
          strengths: ['Submitted proposal'],
          weaknesses: ['Needs review'],
          recommendation: 'Review proposal details',
          riskLevel: 'medium',
        })),
        budgetAnalysis: response,
        riskSummary: '',
        finalRecommendation: '',
      };
    }

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (err) {
    console.error('Analyze applicants error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze applicants. Please try again.' },
      { status: 500 }
    );
  }
}