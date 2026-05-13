import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPT = `You are the Afomiya Tender Ecosystem AI Bid Proposal Generator. You create professional, compelling bid proposals based on tender requirements and contractor capabilities.

## Your Task
Generate a complete bid proposal document with the following sections. Each section must be detailed, persuasive, and professional.

## Output Format
Return your response as a JSON object with these exact keys:
- "technicalProposal": Technical approach and methodology overview
- "methodology": Detailed methodology for project execution
- "teamStructure": Proposed team structure with roles
- "riskMitigation": Risk identification and mitigation strategies
- "valueAddition": Unique value propositions and additional benefits
- "budgetJustification": Budget breakdown and justification
- "complianceNotes": Compliance with tender requirements

## Guidelines
- Be persuasive but honest - this is a real bid proposal
- Use Ethiopian procurement standards where applicable
- Budget is in Ethiopian Birr (ETB)
- Address the specific tender requirements
- Highlight relevant experience and capabilities
- Include realistic timelines and resource allocations
- Use bullet points and numbered lists for clarity
- Show understanding of the local context (Ethiopian market)`;

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
      tenderId, tenderTitle, scope, budgetRange, category,
      skills, companyName, experience, proposedBudget,
      proposedTimeline, notes, userName, userSkills,
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
      companyName ? `Company: ${companyName}` : '',
      skills ? `Skills: ${skills}` : '',
      userSkills ? `Profile Skills: ${userSkills}` : '',
      experience ? `Experience: ${experience}` : '',
      proposedBudget ? `Proposed Budget: ${Number(proposedBudget).toLocaleString()} ETB` : '',
      proposedTimeline ? `Proposed Timeline: ${proposedTimeline}` : '',
    ].filter(Boolean).join('\n');

    const manualContext = !tenderId ? `
**Tender Details (manual entry):**
- Title: ${tenderTitle || 'Not specified'}
- Scope: ${scope || 'Not specified'}
- Budget Range: ${budgetRange || 'Not specified'}
- Category: ${category || 'Not specified'}` : '';

    const prompt = `Generate a professional bid proposal with the following details:

${tenderContext}
${manualContext}

**Bidder Information:**
${bidderContext}
${notes ? `**Additional Notes:** ${notes}` : ''}

Generate all sections of the bid proposal. Return ONLY a valid JSON object with the keys specified in the system prompt. Do not include any markdown formatting or code fences around the JSON.`;

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
        { success: false, error: 'Failed to generate proposal' },
        { status: 500 }
      );
    }

    let parsed: Record<string, string>;
    try {
      const cleaned = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { technicalProposal: response, methodology: '', teamStructure: '', riskMitigation: '', valueAddition: '', budgetJustification: '', complianceNotes: '' };
    }

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (err) {
    console.error('Bid prep error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to generate bid proposal. Please try again.' },
      { status: 500 }
    );
  }
}
