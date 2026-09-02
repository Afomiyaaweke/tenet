import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { callZAIWithDeadline } from '@/lib/zai';

// Vercel Hobby tier: 10s max. AI structured-JSON generation takes 20-30s,
// so we race against an 8s deadline and fall back to a structured analysis.
export const maxDuration = 10;
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are a tender requirement analyzer for Ethiopian procurement. Analyze the tender and return JSON with these keys:
- requirementSummary (brief summary)
- mandatoryRequirements (bullet list)
- preferredQualifications (preferred quals)
- requiredDocuments (documents needed)
- evaluationBreakdown (likely weights)
- riskFactors (potential risks)
- preparationTips (numbered tips)
- competitivenessAssessment (one word: "High", "Medium", or "Low")
- matchScore (number 0-100)
- recommendedActions (specific actions)

Currency: ETB. Return ONLY valid JSON, no markdown.`;

function buildFallback(ctx: {
  tenderTitle?: string;
  scope?: string;
  budget?: string;
  category?: string;
  requiredDocs?: string;
  deadline?: string;
  skills?: string;
  userSkills?: string;
  userName?: string;
  companyName?: string;
}): Record<string, unknown> {
  // Compute a simple matchScore based on skill overlap with category
  const skillList = (ctx.skills || ctx.userSkills || '').toLowerCase();
  const cat = (ctx.category || '').toLowerCase();
  let matchScore = 50;
  if (skillList && cat) {
    const catWords = cat.split(/[,/\s]+/).filter((w) => w.length > 2);
    const matches = catWords.filter((w) => skillList.includes(w)).length;
    matchScore = Math.min(95, 40 + matches * 15);
  }
  return {
    requirementSummary: `${ctx.tenderTitle || 'This tender'} requires ${ctx.scope ? ctx.scope.slice(0, 200) : 'the services described in the scope'} with a budget of ${ctx.budget || 'TBD'} and a deadline of ${ctx.deadline || 'TBD'}.`,
    mandatoryRequirements: `- Valid business license\n- Tax clearance certificate\n- Relevant technical certifications\n- Financial capacity proof\n${ctx.requiredDocs ? `\nRequired documents: ${ctx.requiredDocs}` : ''}`,
    preferredQualifications: `- Past experience in ${ctx.category || 'similar projects'}\n- Local presence in Ethiopia\n- ISO or equivalent quality certifications\n- Strong financial standing`,
    requiredDocuments: ctx.requiredDocs || 'business_license, tax_clearance, portfolio, financial_statement, technical_certification',
    evaluationBreakdown: 'Technical: 40%\nFinancial: 30%\nExperience: 20%\nCompliance: 10%',
    riskFactors: `- Tight deadline (${ctx.deadline || 'TBD'})\n- Budget constraints\n- Documentation requirements\n- Competition level`,
    preparationTips: `1. Gather all required documents early\n2. Tailor your technical proposal to the scope\n3. Provide evidence of similar past projects\n4. Ensure your financial bid is competitive\n5. Highlight relevant skills: ${ctx.skills || ctx.userSkills || 'your key strengths'}`,
    competitivenessAssessment: 'Medium',
    matchScore,
    recommendedActions: `1. Confirm all required documents are available\n2. Prepare a detailed technical proposal addressing: ${ctx.scope ? ctx.scope.slice(0, 150) : 'the scope'}\n3. Submit a competitive financial proposal within the ${ctx.budget || 'budget range'}\n4. Highlight your experience in ${ctx.category || 'this category'}`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const {
      tenderId, tenderTitle, scope, budget, category,
      requiredDocs, deadline, skills, userName, userSkills,
    } = body;

    let tenderContext = '';
    let tenderData: { title?: string; scope?: string; budgetMin?: number; budgetMax?: number; categoryTags?: string; requiredDocs?: string; deadline?: Date; location?: string } | null = null;
    if (tenderId) {
      try {
        const tender = await db.tender.findUnique({ where: { id: tenderId } });
        if (tender) {
          if (user!.role !== 'team_admin' && user!.companyId && tender.status !== 'open') {
            const tenderCreator = await db.user.findUnique({
              where: { id: tender.createdBy },
              select: { companyId: true },
            });
            if (!tenderCreator || tenderCreator.companyId !== user!.companyId) {
              return NextResponse.json(
                { success: false, error: 'Forbidden: You do not have access to this tender' },
                { status: 403 }
              );
            }
          }
          tenderData = tender;
          tenderContext = `Tender: ${tender.title}\nScope: ${tender.scope}\nBudget: ${Number(tender.budgetMin).toLocaleString()} - ${Number(tender.budgetMax).toLocaleString()} ETB\nCategory: ${tender.categoryTags}\nRequired Docs: ${tender.requiredDocs}\nDeadline: ${new Date(tender.deadline).toLocaleDateString()}\nLocation: ${tender.location}`;
        }
      } catch {
        // Tender lookup optional
      }
    }

    let fullUser = user;
    try {
      fullUser = await db.user.findUnique({
        where: { id: user!.id },
        include: { profile: true, company: true },
      }) || user;
    } catch {
      // Optional enrichment
    }

    const bidderContext = [
      userName || fullUser?.profile?.fullName ? `Bidder: ${userName || fullUser?.profile?.fullName}` : '',
      fullUser?.company?.name ? `Company: ${fullUser.company.name}` : '',
      fullUser?.company?.industry ? `Industry: ${fullUser.company.industry}` : '',
      skills ? `Selected Skills: ${skills}` : '',
      userSkills || fullUser?.profile?.skillTags ? `Profile Skills: ${userSkills || fullUser?.profile?.skillTags}` : '',
    ].filter(Boolean).join('\n');

    const manualContext = !tenderId ? `Tender: ${tenderTitle || 'Not specified'}\nScope: ${scope || 'Not specified'}\nBudget: ${budget || 'Not specified'}\nCategory: ${category || 'Not specified'}\nRequired Docs: ${requiredDocs || 'Not specified'}\nDeadline: ${deadline || 'Not specified'}` : '';

    const prompt = `Analyze this tender:
${tenderContext}
${manualContext}

Bidder:
${bidderContext}
Return ONLY the JSON object. matchScore must be a number 0-100. competitivenessAssessment must be one word.`;

    const response = await callZAIWithDeadline([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);

    if (!response) {
      const fallback = buildFallback({
        tenderTitle: tenderData?.title || tenderTitle,
        scope: tenderData?.scope || scope,
        budget: tenderData ? `${Number(tenderData.budgetMin).toLocaleString()} - ${Number(tenderData.budgetMax).toLocaleString()} ETB` : budget,
        category: tenderData?.categoryTags || category,
        requiredDocs: tenderData?.requiredDocs || requiredDocs,
        deadline: tenderData?.deadline ? new Date(tenderData.deadline).toLocaleDateString() : deadline,
        skills, userSkills: userSkills || fullUser?.profile?.skillTags,
        userName: userName || fullUser?.profile?.fullName,
        companyName: fullUser?.company?.name,
      });
      return NextResponse.json({ success: true, data: fallback, fallback: true });
    }

    let parsed: Record<string, unknown>;
    try {
      const cleaned = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const fallback = buildFallback({
        tenderTitle: tenderData?.title || tenderTitle,
        scope: tenderData?.scope || scope,
        budget: tenderData ? `${Number(tenderData.budgetMin).toLocaleString()} - ${Number(tenderData.budgetMax).toLocaleString()} ETB` : budget,
        category: tenderData?.categoryTags || category,
        requiredDocs: tenderData?.requiredDocs || requiredDocs,
        deadline: tenderData?.deadline ? new Date(tenderData.deadline).toLocaleDateString() : deadline,
        skills, userSkills: userSkills || fullUser?.profile?.skillTags,
        userName: userName || fullUser?.profile?.fullName,
        companyName: fullUser?.company?.name,
      });
      return NextResponse.json({ success: true, data: fallback, fallback: true });
    }

    if (typeof parsed.matchScore === 'string') {
      parsed.matchScore = parseInt(parsed.matchScore, 10) || 50;
    }
    parsed.matchScore = Math.min(100, Math.max(0, (parsed.matchScore as number) || 50));

    return NextResponse.json({ success: true, data: parsed });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Analyze requirements error:', errMsg);
    if (errMsg.includes('JWT_SECRET')) {
      return NextResponse.json(
        { success: false, error: 'Server auth not configured. Please set JWT_SECRET environment variable.' },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to analyze requirements. Please try again.' },
      { status: 500 }
    );
  }
}
