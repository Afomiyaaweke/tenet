import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

const OVERVIEW_SYSTEM_PROMPT = `You are the Tenets Tender Ecosystem AI Overview Assistant. You help bidders/applicants understand tender requirements and prepare competitive bids.

## Your Task
Analyze the given tender and generate a comprehensive AI overview that helps potential bidders understand the tender and prepare strong applications.

## Output Format
Return your response as a JSON object with these exact keys:
- "summary" (string): A brief 2-3 sentence summary of what the tender is about
- "keyRequirements" (string[]): An array of 4-8 key requirements extracted from the tender scope
- "requiredDocuments" (string[]): An array of documents needed to apply (from the requiredDocs field)
- "budgetAnalysis" (string): 2-3 sentence analysis of the budget range, whether it's competitive, and what it implies
- "timeline" (string): Key dates and deadline information with urgency assessment
- "applicationTips" (string[]): An array of 4-6 practical tips for submitting a competitive bid
- "eligibilityCheck" (string[]): An array of 3-5 qualifications, certifications, or criteria that might be needed to apply

## Guidelines
- Be specific and actionable in your advice
- Consider Ethiopian procurement standards and practices
- Budget is in Ethiopian Birr (ETB)
- Highlight what makes a bid competitive for this specific tender
- Be honest about potential challenges
- Consider the category and location when giving advice`;

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

/**
 * GET /api/tenders/[id]/overview-ai
 * Generate an AI overview of a tender for all authenticated users
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(_request);
    if (error) return error;

    const { id: tenderId } = await params;

    // Fetch tender details
    const tender = await db.tender.findUnique({
      where: { id: tenderId },
      include: {
        _count: { select: { bids: true } },
      },
    });

    if (!tender) {
      return NextResponse.json(
        { success: false, error: 'Tender not found' },
        { status: 404 }
      );
    }

    // Build prompt with tender data
    const prompt = `Generate an AI overview for the following tender to help bidders understand the requirements and prepare competitive applications:

**Tender Details:**
- Title: ${tender.title}
- Scope: ${tender.scope}
- Budget Range: ${tender.budgetMin.toLocaleString()} - ${tender.budgetMax.toLocaleString()} ETB
- Deadline: ${new Date(tender.deadline).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Location: ${tender.location}
- Category Tags: ${tender.categoryTags}
- Required Documents: ${tender.requiredDocs || 'Not specified'}
- Current Status: ${tender.status}
- Number of Bids So Far: ${tender._count.bids}

Generate the complete overview. Return ONLY a valid JSON object with the keys specified in the system prompt. Do not include any markdown formatting or code fences around the JSON.`;

    let response = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const zai = await getZAI();
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: OVERVIEW_SYSTEM_PROMPT },
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
        { success: false, error: 'Failed to generate tender overview' },
        { status: 500 }
      );
    }

    let parsed: Record<string, unknown>;
    try {
      const cleaned = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: construct a basic overview structure
      parsed = {
        summary: tender.scope.substring(0, 200),
        keyRequirements: ['Review the tender scope for specific requirements'],
        requiredDocuments: tender.requiredDocs ? tender.requiredDocs.split(',').map((d: string) => d.trim()).filter(Boolean) : [],
        budgetAnalysis: `The budget range is ETB ${tender.budgetMin.toLocaleString()} to ${tender.budgetMax.toLocaleString()}.`,
        timeline: `Deadline: ${new Date(tender.deadline).toLocaleDateString()}`,
        applicationTips: ['Ensure all required documents are prepared', 'Submit before the deadline'],
        eligibilityCheck: ['Verify you meet the qualification requirements'],
      };
    }

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (err) {
    console.error('Tender overview AI error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to generate tender overview. Please try again.' },
      { status: 500 }
    );
  }
}
