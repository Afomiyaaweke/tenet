import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getZAI, resetZAI } from '@/lib/zai';

// Vercel Hobby tier: 10s max
export const maxDuration = 10;
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are the Tenet Tender Ecosystem AI Requirement Analyzer. You analyze tender requirements and provide comprehensive insights for bidders.

## Your Task
Analyze the given tender requirements and provide a comprehensive analysis.

## Output Format
Return your response as a JSON object with these exact keys:
- "requirementSummary": Brief summary of the tender requirements
- "mandatoryRequirements": List of mandatory requirements (as a formatted string with bullet points)
- "preferredQualifications": Preferred qualifications that would strengthen a bid
- "requiredDocuments": Documents needed and their descriptions
- "evaluationBreakdown": How the evaluation criteria are likely weighted (formatted string)
- "riskFactors": Potential risks and challenges for bidders
- "preparationTips": Numbered list of tips for preparing a strong bid
- "competitivenessAssessment": One of: "High", "Medium", or "Low" (just the word)
- "matchScore": A number from 0-100 representing how well the bidder's skills match the requirements
- "recommendedActions": Specific actions the bidder should take to improve their chances

## Guidelines
- Be thorough and analytical
- Consider the Ethiopian procurement context
- Budget is in Ethiopian Birr (ETB)
- Provide actionable, specific advice
- Calculate matchScore based on the overlap between bidder skills and tender requirements
- Be honest about risks and challenges
- Use bullet points and numbered lists for clarity`;

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const {
      tenderId, tenderTitle, scope, budget, category,
      requiredDocs, deadline, skills, userName, userSkills,
    } = body;

    // If tenderId provided, fetch tender details
    let tenderContext = '';
    if (tenderId) {
      const tender = await db.tender.findUnique({ where: { id: tenderId } });
      if (tender) {
        // Company isolation: non-team_admin can only access their own company's tenders or open tenders.
        // Tender has no companyId column — ownership is derived from its creator
        // (createdBy -> User.companyId), so we look that up separately.
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
        tenderContext = `
**Tender Details (from database):**
- Title: ${tender.title}
- Scope: ${tender.scope}
- Budget: ${tender.budgetMin.toLocaleString()} - ${tender.budgetMax.toLocaleString()} ETB
- Category: ${tender.categoryTags}
- Required Docs: ${tender.requiredDocs}
- Deadline: ${new Date(tender.deadline).toLocaleDateString()}
- Location: ${tender.location}`;
      }
    }

    // Get user's company and profile skills
    const fullUser = await db.user.findUnique({
      where: { id: user!.id },
      include: { profile: true, company: true },
    });

    const bidderContext = [
      userName || fullUser?.profile?.fullName ? `Bidder: ${userName || fullUser?.profile?.fullName}` : '',
      fullUser?.company?.name ? `Company: ${fullUser.company.name}` : '',
      fullUser?.company?.industry ? `Company Industry: ${fullUser.company.industry}` : '',
      fullUser?.profile?.jobTitle ? `Job Title: ${fullUser.profile.jobTitle}` : '',
      skills ? `Selected Skills: ${skills}` : '',
      userSkills || fullUser?.profile?.skillTags ? `Profile Skills: ${userSkills || fullUser?.profile?.skillTags}` : '',
    ].filter(Boolean).join('\n');

    const manualContext = !tenderId ? `
**Tender Details (manual entry):**
- Title: ${tenderTitle || 'Not specified'}
- Scope: ${scope || 'Not specified'}
- Budget: ${budget || 'Not specified'}
- Category: ${category || 'Not specified'}
- Required Docs: ${requiredDocs || 'Not specified'}
- Deadline: ${deadline || 'Not specified'}` : '';

    const prompt = `Analyze the following tender requirements and provide a comprehensive analysis:

${tenderContext}
${manualContext}

**Bidder Information:**
${bidderContext}

Generate the complete analysis. Return ONLY a valid JSON object with the keys specified in the system prompt. The matchScore should be a number (0-100). The competitivenessAssessment should be just one word: "High", "Medium", or "Low". Do not include any markdown formatting or code fences around the JSON.`;

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
        resetZAI();
      }
    }

    if (!response) {
      return NextResponse.json(
        { success: false, error: 'Failed to analyze requirements' },
        { status: 500 }
      );
    }

    let parsed: Record<string, unknown>;
    try {
      const cleaned = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        requirementSummary: response,
        mandatoryRequirements: '',
        preferredQualifications: '',
        requiredDocuments: '',
        evaluationBreakdown: '',
        riskFactors: '',
        preparationTips: '',
        competitivenessAssessment: 'Medium',
        matchScore: 50,
        recommendedActions: '',
      };
    }

    // Ensure matchScore is a number
    if (typeof parsed.matchScore === 'string') {
      parsed.matchScore = parseInt(parsed.matchScore, 10) || 50;
    }
    parsed.matchScore = Math.min(100, Math.max(0, (parsed.matchScore as number) || 50));

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Analyze requirements error:', errMsg);
    if (errMsg.includes('JWT_SECRET')) {
      return NextResponse.json(
        { success: false, error: 'Server auth not configured. Please set JWT_SECRET environment variable.' },
        { status: 500 },
      );
    }
    if (errMsg.includes('timeout') || errMsg.includes('TIMEOUT') || errMsg.includes('timed out')) {
      return NextResponse.json(
        { success: false, error: 'Requirements analysis timed out. Please try again.' },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to analyze requirements. Please try again.' },
      { status: 500 }
    );
  }
}