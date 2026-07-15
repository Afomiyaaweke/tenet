import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * POST /api/documents/[id]/review
 * AI review of a document - analyzes the document content for
 * compliance, completeness, risk, and provides recommendations.
 * Uses OCR text if available, otherwise triggers OCR first.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    // Find the document
    const doc = await db.document.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, companyId: true, profile: { select: { fullName: true } } } },
        bid: {
          select: {
            id: true,
            tenderId: true,
            financialProposal: true,
            technicalProposal: true,
            timeline: true,
            status: true,
            tender: {
              select: {
                id: true,
                title: true,
                scope: true,
                budgetMin: true,
                budgetMax: true,
                deadline: true,
                requiredDocs: true,
                categoryTags: true,
                createdBy: true,
              },
            },
          },
        },
      },
    });

    if (!doc) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Authorization
    const isOwner = doc.userId === user!.id;
    const isCompanyAdmin = user!.role === 'team_admin' && doc.user?.companyId === user!.companyId;
    const isTenderCreator = doc.bid?.tender?.createdBy === user!.id;

    if (!isOwner && !isCompanyAdmin && !isTenderCreator) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You cannot review this document' },
        { status: 403 }
      );
    }

    // If already processing, return status
    if (doc.aiReviewStatus === 'processing') {
      return NextResponse.json({
        success: true,
        data: { id: doc.id, aiReviewStatus: doc.aiReviewStatus, aiReview: null },
        message: 'AI review is already being processed',
      });
    }

    // Need OCR text to review - if not completed, we need to do OCR first
    if (!doc.ocrText && doc.ocrStatus !== 'completed') {
      return NextResponse.json(
        {
          success: false,
          error: 'OCR must be completed before AI review. Please run OCR first.',
          data: { id: doc.id, ocrStatus: doc.ocrStatus, aiReviewStatus: doc.aiReviewStatus },
        },
        { status: 400 }
      );
    }

    // Mark as processing
    await db.document.update({
      where: { id },
      data: { aiReviewStatus: 'processing' },
    });

    try {
      const zai = await ZAI.create();

      // Build context for the AI review
      const tenderInfo = doc.bid?.tender;
      const bidInfo = doc.bid;

      const tenderContext = tenderInfo
        ? `
Tender: ${tenderInfo.title}
Scope: ${tenderInfo.scope}
Budget Range: ETB ${tenderInfo.budgetMin.toLocaleString()} - ${tenderInfo.budgetMax.toLocaleString()}
Required Documents: ${tenderInfo.requiredDocs || 'Not specified'}
Category: ${tenderInfo.categoryTags}
Deadline: ${new Date(tenderInfo.deadline).toLocaleDateString()}
${bidInfo ? `Bid Amount: ETB ${bidInfo.financialProposal.toLocaleString()}
Bid Timeline: ${bidInfo.timeline}
Bid Status: ${bidInfo.status}` : ''}`
        : '';

      const reviewPrompt = `You are an expert procurement document reviewer. Analyze the following document text and provide a comprehensive review.

Document Type: ${doc.docType}
Document Name: ${doc.fileName}
${tenderContext}

Document Content (OCR extracted):
---
${doc.ocrText || '(No text extracted)'}
---

Provide your review in the following JSON structure:
{
  "overallAssessment": "approved|conditionally_approved|rejected|needs_clarification",
  "complianceScore": <0-100>,
  "completenessScore": <0-100>,
  "riskLevel": "low|medium|high|critical",
  "findings": [
    {
      "category": "compliance|completeness|accuracy|risk|recommendation",
      "severity": "info|warning|critical",
      "description": "finding description"
    }
  ],
  "strengths": ["list of strengths"],
  "weaknesses": ["list of weaknesses or concerns"],
  "missingElements": ["list of missing required elements"],
  "recommendations": ["list of actionable recommendations"],
  "summary": "Brief overall summary of the review"
}

Be thorough, objective, and specific. Focus on procurement compliance, document completeness, and risk assessment.`;

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: 'You are an expert procurement document reviewer. Analyze documents for compliance, completeness, risk, and provide detailed findings. Always respond with valid JSON only - no markdown, no code fences, just the raw JSON object.',
          },
          {
            role: 'user',
            content: reviewPrompt,
          },
        ],
        thinking: { type: 'disabled' },
      });

      const responseText = completion.choices?.[0]?.message?.content || '';

      if (!responseText || responseText.trim().length === 0) {
        throw new Error('AI review returned empty result');
      }

      // Try to parse as JSON; if it fails, store as raw text
      let reviewJson: string;
      try {
        // Clean up response - remove markdown code fences if present
        const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        JSON.parse(cleaned); // validate it parses
        reviewJson = cleaned;
      } catch {
        // If not valid JSON, wrap it
        reviewJson = JSON.stringify({
          overallAssessment: 'needs_clarification',
          complianceScore: 50,
          completenessScore: 50,
          riskLevel: 'medium',
          findings: [],
          strengths: [],
          weaknesses: [],
          missingElements: [],
          recommendations: [],
          summary: responseText,
        });
      }

      // Save AI review result
      const updated = await db.document.update({
        where: { id },
        data: {
          aiReview: reviewJson,
          aiReviewStatus: 'completed',
          aiReviewProcessedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: updated.id,
          aiReview: updated.aiReview,
          aiReviewStatus: updated.aiReviewStatus,
          aiReviewProcessedAt: updated.aiReviewProcessedAt,
        },
      });
    } catch (reviewError) {
      console.error('AI review processing error:', reviewError);

      await db.document.update({
        where: { id },
        data: { aiReviewStatus: 'failed' },
      });

      return NextResponse.json(
        {
          success: false,
          error: `AI review failed: ${reviewError instanceof Error ? reviewError.message : 'Unknown error'}`,
          data: { id, aiReviewStatus: 'failed' },
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('AI review route error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred during AI review' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents/[id]/review
 * Get the current AI review status and result for a document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    const doc = await db.document.findUnique({
      where: { id },
      select: {
        id: true,
        aiReview: true,
        aiReviewStatus: true,
        aiReviewProcessedAt: true,
        userId: true,
        user: { select: { companyId: true } },
        bid: { select: { tender: { select: { createdBy: true } } } },
      },
    });

    if (!doc) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    const isOwner = doc.userId === user!.id;
    const isCompanyAdmin = user!.role === 'team_admin' && doc.user?.companyId === user!.companyId;
    const isTenderCreator = doc.bid?.tender?.createdBy === user!.id;

    if (!isOwner && !isCompanyAdmin && !isTenderCreator) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: doc.id,
        aiReview: doc.aiReview,
        aiReviewStatus: doc.aiReviewStatus,
        aiReviewProcessedAt: doc.aiReviewProcessedAt,
      },
    });
  } catch (err) {
    console.error('Get AI review status error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
