import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPT = `You are the TenderFlow Tender Ecosystem AI Requirement Analyzer. You analyze tender requirements and provide comprehensive insights for bidders.

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
    const {
      tenderId, tenderTitle, scope, budget, category,
      requiredDocs, deadline, skills, userName, userSkills,
    } = body;

    // If tenderId provided, fetch tender details
    let tenderContext = '';
    if (tenderId) {
      const tender = await db.tender.findUnique({ where: { id: tenderId } });
      if (tender) {
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

    const bidderContext = [
      userName ? `Bidder: ${userName}` : '',
      skills ? `Selected Skills: ${skills}` : '',
      userSkills ? `Profile Skills: ${userSkills}` : '',
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
        zaiInstance = null;
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
    console.error('Analyze requirements error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze requirements. Please try again.' },
      { status: 500 }
    );
  }
}
