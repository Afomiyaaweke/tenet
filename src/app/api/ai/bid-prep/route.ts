import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { callZAIWithDeadline } from '@/lib/zai';

// Vercel Hobby tier: 10s max. AI structured-JSON generation takes 20-30s,
// so we race against an 8s deadline and fall back to a structured template.
export const maxDuration = 10;
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are a bid proposal generator for Ethiopian tenders. Generate a professional bid proposal as JSON with these keys:
- technicalProposal (approach overview, 1-2 paragraphs)
- methodology (execution methodology, bullet points)
- teamStructure (proposed team with roles)
- riskMitigation (key risks and mitigations)
- valueAddition (unique value propositions)
- budgetJustification (budget breakdown and justification)
- complianceNotes (compliance with tender requirements)

Currency: ETB. Return ONLY valid JSON, no markdown.`;

function buildFallback(ctx: {
  tenderTitle?: string;
  scope?: string;
  budgetRange?: string;
  category?: string;
  companyName?: string;
  experience?: string;
  proposedBudget?: string;
  proposedTimeline?: string;
  notes?: string;
  userName?: string;
  skills?: string;
  userSkills?: string;
}): Record<string, string> {
  const cn = ctx.companyName || ctx.userName || 'Our Company';
  const tt = ctx.tenderTitle || 'the tender';
  return {
    technicalProposal: `${cn} is pleased to submit this proposal for ${tt}. Our approach is grounded in proven methodologies and tailored to the specific requirements outlined in the tender scope.`,
    methodology: `- Project initiation and requirement confirmation\n- Detailed planning and resource allocation\n- Execution with weekly progress reviews\n- Quality assurance at each milestone\n- Final delivery and handover\n${ctx.scope ? `\nScope understanding: ${ctx.scope.slice(0, 300)}` : ''}`,
    teamStructure: `- Project Manager: ${ctx.userName || 'TBD'}\n- Technical Lead: TBD\n- Quality Assurance: TBD\n- Support Staff: TBD`,
    riskMitigation: `- Schedule risk: mitigated via buffer time and parallel workstreams\n- Quality risk: mitigated via QA checkpoints\n- Resource risk: mitigated via backup personnel`,
    valueAddition: `${ctx.experience ? `Relevant experience: ${ctx.experience}` : 'Proven track record in similar projects'}\n${ctx.skills || ctx.userSkills ? `Specialist skills: ${ctx.skills || ctx.userSkills}` : ''}\nCommitment to local context and Ethiopian procurement standards`,
    budgetJustification: `${ctx.proposedBudget ? `Proposed budget: ETB ${Number(ctx.proposedBudget).toLocaleString()}` : 'Budget to be finalised'}\nBreakdown: Direct costs (60%), Indirect costs (20%), Contingency (10%), Profit (10%)`,
    complianceNotes: `All required documents will be submitted. ${ctx.notes ? `Additional: ${ctx.notes}` : ''} ${ctx.proposedTimeline ? `Timeline: ${ctx.proposedTimeline}` : ''}`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const rateLimitResponse = await enforceRateLimit(request, user!.id, user!.plan || 'free');
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const {
      tenderId, tenderTitle, scope, budgetRange, category,
      skills, companyName, experience, proposedBudget,
      proposedTimeline, notes, userName, userSkills,
    } = body;

    let tenderContext = '';
    let tenderData: { title?: string; scope?: string; budgetMin?: number; budgetMax?: number; categoryTags?: string; requiredDocs?: string; deadline?: Date; location?: string } | null = null;
    if (tenderId) {
      try {
        const tender = await db.tender.findUnique({ where: { id: tenderId } });
        if (tender) {
          if (user!.role !== 'team_admin' && user!.companyId && tender.companyId !== user!.companyId && tender.status !== 'open') {
            return NextResponse.json(
              { success: false, error: 'Forbidden: You do not have access to this tender' },
              { status: 403 }
            );
          }
          tenderData = tender;
          tenderContext = `Tender: ${tender.title}\nScope: ${tender.scope}\nBudget: ${Number(tender.budgetMin).toLocaleString()} - ${Number(tender.budgetMax).toLocaleString()} ETB\nCategory: ${tender.categoryTags}\nRequired Docs: ${tender.requiredDocs}\nDeadline: ${new Date(tender.deadline).toLocaleDateString()}\nLocation: ${tender.location}`;
        }
      } catch {
        // Tender lookup optional
      }
    }

    const bidderContext = [
      userName ? `Bidder: ${userName}` : '',
      companyName ? `Company: ${companyName}` : '',
      skills ? `Skills: ${skills}` : '',
      userSkills ? `Profile Skills: ${userSkills}` : '',
      experience ? `Experience: ${experience}` : '',
      proposedBudget ? `Proposed Budget: ${Number(proposedBudget).toLocaleString()} ETB` : '',
      proposedTimeline ? `Proposed Timeline: ${proposedTimeline}` : '',
    ].filter(Boolean).join('\n');

    const manualContext = !tenderId ? `Tender: ${tenderTitle || 'Not specified'}\nScope: ${scope || 'Not specified'}\nBudget: ${budgetRange || 'Not specified'}\nCategory: ${category || 'Not specified'}` : '';

    const prompt = `Generate a bid proposal:
${tenderContext}
${manualContext}

Bidder:
${bidderContext}
${notes ? `Notes: ${notes}` : ''}
Return ONLY the JSON object.`;

    const response = await callZAIWithDeadline([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);

    if (!response) {
      const fallback = buildFallback({ tenderTitle: tenderData?.title || tenderTitle, scope: tenderData?.scope || scope, budgetRange, category: tenderData?.categoryTags || category, companyName, experience, proposedBudget, proposedTimeline, notes, userName: userName || user!.profile?.fullName, skills, userSkills });
      return NextResponse.json({ success: true, data: fallback, fallback: true });
    }

    let parsed: Record<string, string>;
    try {
      const cleaned = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = buildFallback({ tenderTitle: tenderData?.title || tenderTitle, scope: tenderData?.scope || scope, budgetRange, category: tenderData?.categoryTags || category, companyName, experience, proposedBudget, proposedTimeline, notes, userName: userName || user!.profile?.fullName, skills, userSkills });
      return NextResponse.json({ success: true, data: parsed, fallback: true });
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (err) {
    console.error('Bid prep error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to generate bid proposal. Please try again.' },
      { status: 500 }
    );
  }
}
