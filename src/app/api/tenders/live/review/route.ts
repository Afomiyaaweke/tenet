import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getZAI, resetZAI } from '@/lib/zai';

// Vercel Hobby tier: 10s max
export const maxDuration = 10;
export const dynamic = 'force-dynamic';

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
              content: `You are a senior procurement strategist. Respond with valid JSON only. Be concise and actionable.`
            },
            {
              role: 'user',
              content: `Analyze this tender. Return JSON with: executiveSummary (2-3 sentences), opportunityScore (1-100), winProbability (1-100), strategicAnalysis ({swot:{strengths:[],weaknesses:[],opportunities:[],threats:[]},strategicFit:"high/medium/low",strategicFitReasoning:"",marketPositioning:""}), financialAnalysis ({budgetFit:"well_within/within/above/significantly_above",budgetFitReasoning:"",estimatedROI:"low/medium/high",roiReasoning:"",paymentTermsRisk:"low/medium/high",paymentTermsNote:"",costStructureBreakdown:[],financialRisks:[],marginPotential:"thin/moderate/healthy/strong"}), technicalComplexity ({level:"low/medium/high",reasoning:"",keyTechnologies:[],expertiseRequired:[],implementationRisks:[],estimatedDuration:""}), complianceAnalysis ({overallCompliance:"fully_compliant/partially_compliant/non_compliant/unclear",regulatoryFramework:"",mandatoryCertifications:[],complianceGaps:[],documentationRequirements:[],complianceScore:1-100}), eligibilityDeepDive ({overallEligible:true/false,confidenceLevel:"high/medium/low",criteria:[{criterion:"",met:true/false,partial:true/false,note:"",severity:"blocker/warning/info"}],blockers:[],warnings:[]}), riskMatrix ({overallRiskLevel:"low/medium/high/critical",overallRiskScore:1-100,dimensions:{financial:{score:1-10,factors:[],mitigation:""},technical:{score:1-10,factors:[],mitigation:""},legal:{score:1-10,factors:[],mitigation:""},operational:{score:1-10,factors:[],mitigation:""},reputational:{score:1-10,factors:[],mitigation:""}},criticalRisks:[],dealBreakers:[]}), competitiveIntelligence ({estimatedBidders:"low/medium/high",competitionLevel:"low/medium/high",typicalCompetitors:[],differentiationStrategies:[],incumbentAdvantage:true/false,incumbentNote:"",pricingStrategy:"aggressive/competitive/premium/value_based",pricingNote:""}), bidStrategy ({recommendedApproach:"",priorityLevel:"must_win/high/medium/low/monitor",keyWinFactors:[],differentiationPoints:[],partnershipOpportunities:[],proposalHighlights:[],estimatedPrepTime:"",resourceRequirements:""}), timelineAnalysis ({deadlineAssessment:"comfortable/tight/very_tight/already_passed",daysToDeadline:0,recommendedStartDaysBefore:0,milestones:[{phase:"",duration:"",deadline:""}],criticalPathItems:[]}), valueAddOpportunities ([{opportunity:"",impact:"low/medium/high",effort:"low/medium/high"}]), redFlags ([]), actionableRecommendations ([{action:"",priority:"critical/high/medium/low",category:"compliance/financial/technical/strategy",timeline:""}]).

Tender:
${tenderInfo}`
            }
          ],
          thinking: { type: 'disabled' },
        });
        responseText = completion.choices[0]?.message?.content || '';
        if (responseText) break;
      } catch (aiErr) {
        console.error(`AI review attempt ${attempt} failed:`, aiErr instanceof Error ? aiErr.message : aiErr);
        // Reset ZAI instance for retry
        resetZAI();
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
