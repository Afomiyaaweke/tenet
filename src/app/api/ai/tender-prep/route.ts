import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { callZAIWithDeadline } from '@/lib/zai';

// Vercel Hobby tier: 10s max. ZAI structured-JSON generation routinely takes
// 20-30s, so we race the AI call against an 8s deadline and fall back to a
// structured template built from the user's input when the AI is too slow.
export const maxDuration = 10;
export const dynamic = 'force-dynamic';

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

// Concise prompt — shorter instructions → faster AI completion.
const SYSTEM_PROMPT = `You are a procurement document writer for Ethiopian tenders. Generate a professional tender document as JSON with these keys:
- scope (detailed scope of work, 2-3 paragraphs)
- requiredDocs (comma-separated: business_license,tax_clearance,portfolio,financial_statement,technical_certification)
- evaluationCriteria (criteria with percentage weights totaling 100%)
- deliverables (numbered list with descriptions)
- timeline (phases and milestones)
- termsAndConditions (payment, warranty, penalties, dispute resolution per Ethiopian law)
- categoryTags (comma-separated tags)

Currency: ETB. Return ONLY valid JSON, no markdown.`;

// Structured fallback built from user input — used when the AI can't finish
// within Vercel's 10s limit. Produces a usable, editable starting point.
function buildFallback(input: TenderPrepInput, userName?: string): TenderPrepOutput {
  const cat = input.category || 'General';
  const loc = input.location || 'Ethiopia';
  const budget = `ETB ${Number(input.budgetMin).toLocaleString()} - ${Number(input.budgetMax).toLocaleString()}`;
  return {
    scope: `${input.title}\n\n${input.description}\n\nThis tender covers work to be executed in ${loc} with a budget of ${budget}. The scope includes all labour, materials, equipment, and supervision necessary to deliver the objectives described above.${input.additionalNotes ? `\n\nAdditional notes: ${input.additionalNotes}` : ''}`,
    requiredDocs: 'business_license,tax_clearance,portfolio,financial_statement,technical_certification',
    evaluationCriteria: 'Technical merit: 40%\nFinancial competitiveness: 30%\nExperience and past performance: 20%\nCompliance: 10%',
    deliverables: `1. Project initiation report\n2. ${cat} deliverables per scope\n3. Progress reports (monthly)\n4. Final handover and acceptance`,
    timeline: `Phase 1 — Mobilisation (2 weeks)\nPhase 2 — Execution (per scope)\nPhase 3 — Review and handover (2 weeks)\nDeadline: ${input.deadline}`,
    termsAndConditions: 'Payment: 30% advance, 40% on milestone, 30% on acceptance. Warranty: 12 months. Penalties: 0.5% per week of delay (max 10%). Disputes: Ethiopian courts. Termination: 30 days written notice.',
    categoryTags: cat,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body: TenderPrepInput = await request.json();
    const {
      title, category, location, budgetMin, budgetMax, deadline, description, additionalNotes,
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

    const userMessage = `Generate a tender document:
Title: ${title}
Category: ${category}
Location: ${location}
Budget: ETB ${Number(budgetMin).toLocaleString()} - ${Number(budgetMax).toLocaleString()}
Deadline: ${deadline}
Description: ${description}
${additionalNotes ? `Notes: ${additionalNotes}` : ''}
Requester: ${user!.profile?.fullName || user!.email}
Return ONLY the JSON object.`;

    const responseText = await callZAIWithDeadline([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ]);

    if (!responseText) {
      // AI timed out — return structured fallback so the user gets something usable
      const fallback = buildFallback(body, user!.profile?.fullName);
      return NextResponse.json({ success: true, data: fallback, fallback: true });
    }

    // Parse the AI response as JSON
    let parsedData: TenderPrepOutput;
    try {
      const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsedData = JSON.parse(cleaned);
    } catch {
      // AI returned non-JSON — fall back to structured template
      const fallback = buildFallback(body, user!.profile?.fullName);
      return NextResponse.json({ success: true, data: fallback, fallback: true });
    }

    return NextResponse.json({ success: true, data: parsedData });
  } catch (err) {
    console.error('Tender prep error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to generate tender document. Please try again.' },
      { status: 500 }
    );
  }
}
