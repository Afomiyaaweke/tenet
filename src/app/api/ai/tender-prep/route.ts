import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

// ============================================================
// Types
// ============================================================

interface TenderPrepInput {
  title: string;
  category: string;
  location: string;
  budgetMin: number;
  budgetMax: number;
  deadline: string;
  description: string;
  additionalNotes?: string;
}

interface TenderPrepOutput {
  scope: string;
  requiredDocs: string;
  evaluationCriteria: string;
  deliverables: string;
  timeline: string;
  termsAndConditions: string;
  categoryTags: string;
}

// ============================================================
// ZAI Singleton with retry/reset
// ============================================================

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// ============================================================
// System Prompt
// ============================================================

const SYSTEM_PROMPT = `You are a professional procurement document writer specializing in Ethiopian government and organization tenders. Your role is to help users prepare comprehensive, professional tender documents that comply with Ethiopian procurement regulations and best practices.

## Context
- Currency: Ethiopian Birr (ETB)
- Follow Ethiopian Federal Procurement Directive standards
- Include relevant Ethiopian regulatory references where appropriate
- Consider local market conditions and practices in Addis Ababa and regional areas

## Your Task
Given basic tender information, generate a complete and professional tender document. You MUST respond ONLY with valid JSON matching this exact structure:

{
  "scope": "A detailed scope of work describing what the tender covers, objectives, expected outcomes, and specific deliverables. Should be comprehensive enough for bidders to understand the full requirements.",
  "requiredDocs": "Comma-separated list of required documents (e.g., business_license,tax_clearance,portfolio,financial_statement,technical_certification)",
  "evaluationCriteria": "Detailed evaluation criteria with weights. Include technical, financial, experience, and compliance criteria. Format as a clear list with percentage weights that total 100%.",
  "deliverables": "Numbered list of expected deliverables with descriptions, quantities, quality standards, and acceptance criteria.",
  "timeline": "Suggested project timeline with milestones, phases, and key dates. Include review periods and approval gates.",
  "termsAndConditions": "Standard terms and conditions including payment terms, warranty requirements, penalty clauses, force majeure, dispute resolution (referencing Ethiopian law), and termination conditions.",
  "categoryTags": "Comma-separated category tags for the tender (e.g., Construction,Building,Infrastructure)"
}

## Guidelines
1. Scope should be thorough and unambiguous — bidders should not need to guess requirements
2. Required documents should match the category (e.g., construction needs different docs than IT)
3. Evaluation criteria should be fair, transparent, and aligned with Ethiopian procurement rules
4. Deliverables should be measurable and verifiable
5. Timeline should be realistic for the Ethiopian context (consider local holidays, rainy season for construction, etc.)
6. Terms should protect both parties and reference applicable Ethiopian laws
7. Category tags should help with smart matching in the system

IMPORTANT: Return ONLY the JSON object. No markdown, no code blocks, no extra text.`;

// ============================================================
// POST Handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const { user, error } = await requireAuth(request);
    if (error) return error;

    // Parse and validate input
    const body: TenderPrepInput = await request.json();
    const {
      title,
      category,
      location,
      budgetMin,
      budgetMax,
      deadline,
      description,
      additionalNotes,
    } = body;

    if (!title || !category || !location || !deadline || !description) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, category, location, deadline, description' },
        { status: 400 }
      );
    }

    if (budgetMin == null || budgetMax == null || budgetMin < 0 || budgetMax < 0) {
      return NextResponse.json(
        { success: false, error: 'Valid budgetMin and budgetMax are required' },
        { status: 400 }
      );
    }

    // Build user message with all context
    const userMessage = `Generate a professional tender document with the following details:

**Title:** ${title}
**Category:** ${category}
**Location:** ${location}
**Budget Range:** ETB ${Number(budgetMin).toLocaleString()} - ${Number(budgetMax).toLocaleString()}
**Deadline:** ${deadline}
**Description:** ${description}
${additionalNotes ? `**Additional Notes:** ${additionalNotes}` : ''}

**Requester Context:** ${user!.profile?.fullName || user!.email}, ${user!.profile?.companyName ? `Company: ${user!.profile.companyName}` : 'Individual'}
${user!.profile?.skillTags ? `**Related Skills:** ${user!.profile.skillTags}` : ''}

Please generate the complete tender document in the required JSON format.`;

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { role: 'user' as const, content: userMessage },
    ];

    // Get AI response with retry logic (2 attempts with instance reset)
    let responseText = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const zai = await getZAI();
        const completion = await zai.chat.completions.create({
          messages,
          thinking: { type: 'disabled' },
        });
        responseText = completion.choices[0]?.message?.content || '';
        if (responseText) break;
      } catch (err) {
        if (attempt === 2) throw err;
        // Reset ZAI instance on failure for retry
        zaiInstance = null;
      }
    }

    if (!responseText) {
      return NextResponse.json(
        { success: false, error: 'AI failed to generate a response. Please try again.' },
        { status: 500 }
      );
    }

    // Parse the AI response as JSON
    let parsedData: TenderPrepOutput;
    try {
      // Strip markdown code blocks if present
      const cleaned = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      parsedData = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response as JSON:', responseText.substring(0, 200));
      return NextResponse.json(
        { success: false, error: 'AI returned an invalid response format. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (err) {
    console.error('Tender prep error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to generate tender document. Please try again.' },
      { status: 500 }
    );
  }
}
