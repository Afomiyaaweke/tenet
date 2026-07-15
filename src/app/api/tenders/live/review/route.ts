import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

// POST /api/tenders/live/review - Generate inline AI review for a live tender
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { title, scope, budgetMin, budgetMax, deadline, location, categoryTags, source, currency, borrower, contractType } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Missing tender title' },
        { status: 400 },
      );
    }

    const zai = await ZAI.create();

    const tenderInfo = [
      `Title: ${title}`,
      scope ? `Scope: ${scope}` : '',
      budgetMin || budgetMax ? `Budget: ${currency || 'USD'} ${budgetMin?.toLocaleString() || 'N/A'} - ${budgetMax?.toLocaleString() || 'N/A'}` : '',
      deadline ? `Deadline: ${new Date(deadline).toLocaleDateString()}` : '',
      location ? `Location: ${location}` : '',
      categoryTags ? `Category: ${categoryTags}` : '',
      source ? `Source: ${source}` : '',
      borrower ? `Borrower/Organization: ${borrower}` : '',
      contractType ? `Contract Type: ${contractType}` : '',
    ].filter(Boolean).join('\n');

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are an expert procurement analyst for the Tenet Tender Ecosystem platform. Analyze tenders and provide actionable insights for contractors and bidders. Always respond with valid JSON matching the exact schema requested.`
        },
        {
          role: 'user',
          content: `Analyze this tender opportunity and return a JSON object with these exact fields:
{
  "summary": "2-3 sentence executive summary of this tender",
  "keyRequirements": ["requirement1", "requirement2", ...],
  "eligibilityCheck": {"likely": true/false, "reasons": ["reason1", "reason2"]},
  "riskAssessment": {"level": "low/medium/high", "factors": ["factor1", "factor2"]},
  "recommendedApproach": "2-3 sentence strategy recommendation",
  "competitiveLandscape": "1-2 sentence assessment of competition level",
  "bidReadiness": {"score": 1-10, "checklist": ["item1", "item2"]},
  "estimatedTimeline": "realistic timeline suggestion",
  "tips": ["tip1", "tip2", "tip3"]
}

Tender details:
${tenderInfo}

Provide practical, specific advice. Be concise but thorough.`
        }
      ],
      thinking: { type: 'disabled' },
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Try to parse JSON from the response
    let review;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
      review = JSON.parse(jsonStr);
    } catch {
      // If parsing fails, return the raw text as summary
      review = {
        summary: responseText.slice(0, 500),
        keyRequirements: [],
        eligibilityCheck: { likely: true, reasons: ['Unable to parse full analysis'] },
        riskAssessment: { level: 'medium', factors: ['Analysis incomplete'] },
        recommendedApproach: 'Review the tender details carefully before bidding.',
        competitiveLandscape: 'Unable to assess',
        bidReadiness: { score: 5, checklist: ['Review tender documents', 'Verify eligibility'] },
        estimatedTimeline: '30-60 days',
        tips: ['Review all requirements carefully', 'Prepare documentation early'],
      };
    }

    return NextResponse.json({ success: true, data: review });
  } catch (error) {
    console.error('AI tender review error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate AI review' },
      { status: 500 },
    );
  }
}
