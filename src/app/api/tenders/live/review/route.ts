import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

// Allow up to 60s on Vercel Pro (10s on Hobby)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Cache ZAI instance across invocations within the same function lifetime
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// Fallback review structure when AI fails
function getFallbackReview(partialText = '') {
  return {
    executiveSummary: partialText.slice(0, 500) || 'AI analysis could not be completed. Please try again.',
    opportunityScore: 50,
    winProbability: 40,
    strategicAnalysis: {
      swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      strategicFit: 'medium' as const,
      strategicFitReasoning: 'Unable to complete full analysis',
      marketPositioning: 'Review tender details carefully',
    },
    financialAnalysis: {
      budgetFit: 'within' as const,
      budgetFitReasoning: 'Unable to analyze',
      estimatedROI: 'medium' as const,
      roiReasoning: 'Analysis incomplete',
      paymentTermsRisk: 'medium' as const,
      paymentTermsNote: 'Standard terms expected',
      costStructureBreakdown: [],
      financialRisks: [],
      marginPotential: 'moderate' as const,
    },
    technicalComplexity: {
      level: 'medium' as const,
      reasoning: 'Unable to assess',
      keyTechnologies: [],
      expertiseRequired: [],
      implementationRisks: [],
      estimatedDuration: 'TBD',
    },
    complianceAnalysis: {
      overallCompliance: 'unclear' as const,
      regulatoryFramework: 'Review applicable regulations',
      mandatoryCertifications: [],
      voluntaryCertifications: [],
      complianceGaps: [],
      documentationRequirements: [],
      complianceScore: 50,
    },
    eligibilityDeepDive: {
      overallEligible: true,
      confidenceLevel: 'low' as const,
      criteria: [],
      blockers: [],
      warnings: ['Full analysis could not be completed'],
    },
    riskMatrix: {
      overallRiskLevel: 'medium' as const,
      overallRiskScore: 50,
      dimensions: {
        financial: { score: 5, factors: [], mitigation: '' },
        technical: { score: 5, factors: [], mitigation: '' },
        legal: { score: 5, factors: [], mitigation: '' },
        operational: { score: 5, factors: [], mitigation: '' },
        reputational: { score: 5, factors: [], mitigation: '' },
      },
      criticalRisks: [],
      dealBreakers: [],
    },
    competitiveIntelligence: {
      estimatedBidders: 'medium' as const,
      competitionLevel: 'medium' as const,
      typicalCompetitors: [],
      differentiationStrategies: [],
      incumbentAdvantage: false,
      incumbentNote: '',
      pricingStrategy: 'competitive' as const,
      pricingNote: 'Standard competitive pricing',
    },
    bidStrategy: {
      recommendedApproach: 'Review the tender documents carefully before bidding.',
      priorityLevel: 'medium' as const,
      keyWinFactors: [],
      differentiationPoints: [],
      partnershipOpportunities: [],
      proposalHighlights: [],
      estimatedPrepTime: '2-4 weeks',
      resourceRequirements: 'Standard bid team',
    },
    timelineAnalysis: {
      deadlineAssessment: 'comfortable' as const,
      daysToDeadline: 30,
      recommendedStartDaysBefore: 45,
      milestones: [],
      criticalPathItems: [],
    },
    valueAddOpportunities: [],
    redFlags: [],
    actionableRecommendations: [],
  };
}

// POST /api/tenders/live/review - Generate deep, multi-dimensional AI review for a live tender
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const {
      title, scope, budgetMin, budgetMax, deadline, location,
      categoryTags, source, currency, borrower, contractType, region,
      externalUrl,
    } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Missing tender title' },
        { status: 400 },
      );
    }

    const tenderInfo = [
      `Title: ${title}`,
      scope ? `Scope: ${scope}` : '',
      budgetMin || budgetMax ? `Budget: ${currency || 'USD'} ${budgetMin?.toLocaleString() || 'N/A'} - ${budgetMax?.toLocaleString() || 'N/A'}` : '',
      deadline ? `Deadline: ${new Date(deadline).toLocaleDateString()}` : '',
      location ? `Location: ${location}` : '',
      region ? `Region: ${region}` : '',
      categoryTags ? `Category/Tags: ${categoryTags}` : '',
      source ? `Source: ${source}` : '',
      borrower ? `Borrower/Organization: ${borrower}` : '',
      contractType ? `Contract Type: ${contractType}` : '',
      externalUrl ? `External URL: ${externalUrl}` : '',
    ].filter(Boolean).join('\n');

    // Try up to 2 attempts (reset ZAI instance on first failure)
    let responseText = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const zai = await getZAI();
        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'assistant',
              content: `You are a senior procurement strategist and tender analyst with 20+ years of experience across government, multilateral (World Bank, UN, AfDB, ADB), private sector, and healthcare procurement. You have deep expertise in bid strategy, compliance, risk management, financial modeling, and competitive positioning. Always respond with valid JSON matching the exact schema requested. Be thorough, specific, and actionable.`
            },
            {
              role: 'user',
              content: `Perform a comprehensive, multi-dimensional deep analysis of this tender opportunity. Return a JSON object with these exact fields:

{
  "executiveSummary": "3-4 sentence strategic executive summary covering the opportunity, key challenge, and strategic recommendation",
  "opportunityScore": 1-100,
  "winProbability": 1-100,

  "strategicAnalysis": {
    "swot": {
      "strengths": ["strength1", "strength2", "strength3"],
      "weaknesses": ["weakness1", "weakness2"],
      "opportunities": ["opportunity1", "opportunity2", "opportunity3"],
      "threats": ["threat1", "threat2"]
    },
    "strategicFit": "high/medium/low",
    "strategicFitReasoning": "1-2 sentence explanation",
    "marketPositioning": "1-2 sentence advice on how to position for this tender"
  },

  "financialAnalysis": {
    "budgetFit": "well_within/within/above/significantly_above",
    "budgetFitReasoning": "1-2 sentence explanation of budget alignment",
    "estimatedROI": "low/medium/high/very_high",
    "roiReasoning": "1-2 sentence explanation",
    "paymentTermsRisk": "low/medium/high",
    "paymentTermsNote": "1 sentence on typical payment terms for this type",
    "costStructureBreakdown": ["item1: %", "item2: %", "item3: %"],
    "financialRisks": ["risk1", "risk2"],
    "marginPotential": "thin/moderate/healthy/strong"
  },

  "technicalComplexity": {
    "level": "low/medium/high/very_high",
    "reasoning": "1-2 sentence explanation",
    "keyTechnologies": ["tech1", "tech2"],
    "expertiseRequired": ["expertise1", "expertise2", "expertise3"],
    "implementationRisks": ["risk1", "risk2"],
    "estimatedDuration": "e.g. 6-12 months"
  },

  "complianceAnalysis": {
    "overallCompliance": "fully_compliant/partially_compliant/non_compliant/unclear",
    "regulatoryFramework": "1 sentence on relevant regulations",
    "mandatoryCertifications": ["cert1", "cert2"],
    "voluntaryCertifications": ["cert1", "cert2"],
    "complianceGaps": ["gap1", "gap2"],
    "documentationRequirements": ["doc1", "doc2", "doc3", "doc4"],
    "complianceScore": 1-100
  },

  "eligibilityDeepDive": {
    "overallEligible": true/false,
    "confidenceLevel": "high/medium/low",
    "criteria": [
      {"criterion": "name", "met": true/false, "partial": true/false, "note": "explanation", "severity": "blocker/warning/info"}
    ],
    "blockers": ["blocker1"],
    "warnings": ["warning1"]
  },

  "riskMatrix": {
    "overallRiskLevel": "low/medium/high/critical",
    "overallRiskScore": 1-100,
    "dimensions": {
      "financial": {"score": 1-10, "factors": ["factor1"], "mitigation": "strategy"},
      "technical": {"score": 1-10, "factors": ["factor1"], "mitigation": "strategy"},
      "legal": {"score": 1-10, "factors": ["factor1"], "mitigation": "strategy"},
      "operational": {"score": 1-10, "factors": ["factor1"], "mitigation": "strategy"},
      "reputational": {"score": 1-10, "factors": ["factor1"], "mitigation": "strategy"}
    },
    "criticalRisks": ["risk1"],
    "dealBreakers": ["dealbreaker1"]
  },

  "competitiveIntelligence": {
    "estimatedBidders": "low(1-3)/medium(4-8)/high(9+)/very_high(15+)",
    "competitionLevel": "low/medium/high/very_high",
    "typicalCompetitors": ["type1", "type2", "type3"],
    "differentiationStrategies": ["strategy1", "strategy2", "strategy3"],
    "incumbentAdvantage": true/false,
    "incumbentNote": "1 sentence if relevant",
    "pricingStrategy": "aggressive/competitive/premium/value_based",
    "pricingNote": "1 sentence explanation"
  },

  "bidStrategy": {
    "recommendedApproach": "2-3 sentence strategic recommendation",
    "priorityLevel": "must_win/high/medium/low/monitor",
    "keyWinFactors": ["factor1", "factor2", "factor3"],
    "differentiationPoints": ["point1", "point2"],
    "partnershipOpportunities": ["partner1", "partner2"],
    "proposalHighlights": ["highlight1", "highlight2", "highlight3"],
    "estimatedPrepTime": "e.g. 2-4 weeks",
    "resourceRequirements": "1 sentence on team/resources needed"
  },

  "timelineAnalysis": {
    "deadlineAssessment": "comfortable/tight/very_tight/already_passed",
    "daysToDeadline": estimated_number,
    "recommendedStartDaysBefore": recommended_number,
    "milestones": [
      {"phase": "name", "duration": "e.g. 1 week", "deadline": "relative date"}
    ],
    "criticalPathItems": ["item1", "item2"]
  },

  "valueAddOpportunities": [
    {"opportunity": "description", "impact": "low/medium/high", "effort": "low/medium/high"}
  ],

  "redFlags": ["flag1", "flag2"],

  "actionableRecommendations": [
    {"action": "description", "priority": "critical/high/medium/low", "category": "compliance/financial/technical/strategy", "timeline": "e.g. within 48h"}
  ]
}

Tender details:
${tenderInfo}

Provide practical, specific, expert-level advice. Think like a senior bid manager at a top consulting firm. Be concise but comprehensive. Each field should contain genuinely useful insights, not generic filler.`
            }
          ],
          thinking: { type: 'disabled' },
        });
        responseText = completion.choices[0]?.message?.content || '';
        if (responseText) break;
      } catch (aiErr) {
        console.error(`AI review attempt ${attempt} failed:`, aiErr instanceof Error ? aiErr.message : aiErr);
        // Reset ZAI instance for retry
        zaiInstance = null;
        if (attempt === 2) throw aiErr;
      }
    }

    if (!responseText) {
      return NextResponse.json(
        { success: false, error: 'AI returned empty response. Please try again.' },
        { status: 500 },
      );
    }

    // Try to parse JSON from the response
    let review;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
      review = JSON.parse(jsonStr);
    } catch {
      review = getFallbackReview(responseText);
    }

    return NextResponse.json({ success: true, data: review });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('AI tender review error:', errMsg);

    // Return specific error messages for common issues
    if (errMsg.includes('JWT_SECRET')) {
      return NextResponse.json(
        { success: false, error: 'Server auth not configured. Please set JWT_SECRET environment variable.' },
        { status: 500 },
      );
    }
    if (errMsg.includes('timeout') || errMsg.includes('TIMEOUT') || errMsg.includes('timed out')) {
      return NextResponse.json(
        { success: false, error: 'AI review timed out. Please try again — the server may be busy.' },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to generate AI review. Please try again.' },
      { status: 500 },
    );
  }
}
