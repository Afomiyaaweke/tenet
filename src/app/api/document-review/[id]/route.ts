import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

// Allow up to 60s on Vercel Pro (10s on Hobby)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * POST /api/document-review/[id]
 * Triggers AI review processing for a document by its ID.
 * Uses the z-ai-web-dev-sdk Chat Completions API to analyze document text
 * and provide structured review feedback.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    // Parse body for optional custom prompt
    let body: { prompt?: string } = {};
    try {
      body = await request.json();
    } catch {
      // No body or invalid JSON - that's fine, use defaults
    }
    const customPrompt = body.prompt?.trim() || '';

    // Find the document with related data for access checks
    const doc = await db.document.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, companyId: true } },
        bid: {
          select: {
            tender: {
              select: { createdBy: true },
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

    // Access rules:
    // - Team admin can access any document in their company
    // - Regular user can only access their own documents
    // - If document has a bidId, the tender creator can also access it
    const isOwner = doc.userId === user!.id;
    const isCompanyAdmin =
      user!.role === 'team_admin' && doc.user?.companyId === user!.companyId;
    const isTenderCreator = doc.bidId ? doc.bid?.tender?.createdBy === user!.id : false;

    if (!isOwner && !isCompanyAdmin && !isTenderCreator) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have access to this document' },
        { status: 403 }
      );
    }

    // If document has no OCR text yet, return error suggesting OCR first
    if (doc.ocrStatus !== 'completed' || !doc.ocrText) {
      return NextResponse.json(
        {
          success: false,
          error: 'OCR must be completed before AI review. Please run OCR first.',
        },
        { status: 400 }
      );
    }

    // Store custom prompt if provided
    const updateData: Record<string, unknown> = { aiReviewStatus: 'processing' };
    if (customPrompt) updateData.aiReviewPrompt = customPrompt;
    await db.document.update({
      where: { id },
      data: updateData,
    });

    try {
      const zai = await ZAI.create();

      const ocrText = doc.ocrText;

      // Build the system prompt based on whether user provided a custom prompt
      const systemPrompt = customPrompt
        ? `You are an expert document reviewer. The user has provided the following specific review criteria:\n\n"${customPrompt}"\n\nAnalyze the provided document text according to the user's criteria and produce a structured review in JSON format with these fields:\n- complianceScore: number 0-100 (how well the document meets the user's criteria)\n- completenessScore: number 0-100 (how complete the document is relative to the criteria)\n- riskLevel: "low" | "medium" | "high" (overall risk assessment)\n- findings: array of { type: "positive"|"negative"|"warning", title: string, description: string }\n- strengths: array of strings\n- weaknesses: array of strings\n- missingElements: array of strings (what's missing or incomplete)\n- recommendations: array of strings\n- overallAssessment: string (summary of the review)\n\nRespond ONLY with valid JSON, no other text.`
        : `You are an expert procurement document reviewer. Analyze the provided document text and produce a structured review in JSON format with these fields:\n- complianceScore: number 0-100 (how well the document meets procurement standards)\n- completenessScore: number 0-100 (how complete the document is)\n- riskLevel: "low" | "medium" | "high" (overall risk assessment)\n- findings: array of { type: "positive"|"negative"|"warning", title: string, description: string }\n- strengths: array of strings\n- weaknesses: array of strings\n- missingElements: array of strings (what's missing or incomplete)\n- recommendations: array of strings\n- overallAssessment: string (summary of the review)\n\nRespond ONLY with valid JSON, no other text.`;

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Please review this document:\n\n${ocrText}`,
          },
        ],
        thinking: { type: 'disabled' },
      });

      const rawResponse = completion.choices?.[0]?.message?.content || '';

      if (!rawResponse || rawResponse.trim().length === 0) {
        throw new Error('AI review returned empty result');
      }

      // Parse the response as JSON; if parsing fails, wrap as { summary: rawResponse }
      let reviewData: Record<string, unknown>;
      try {
        // Clean up response - remove markdown code fences if present
        const cleaned = rawResponse
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        reviewData = JSON.parse(cleaned);
      } catch {
        reviewData = { summary: rawResponse };
      }

      // Store as JSON string in aiReview field and update status
      const updated = await db.document.update({
        where: { id },
        data: {
          aiReview: JSON.stringify(reviewData),
          aiReviewStatus: 'completed',
          aiReviewProcessedAt: new Date(),
          ...(customPrompt ? {} : {}), // prompt already saved above
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: updated.id,
          aiReviewStatus: updated.aiReviewStatus,
          aiReview: updated.aiReview,
          aiReviewProcessedAt: updated.aiReviewProcessedAt,
          aiReviewPrompt: updated.aiReviewPrompt,
        },
      });
    } catch (reviewError) {
      console.error('AI review processing error:', reviewError);

      // On failure, set aiReviewStatus to 'failed'
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
 * GET /api/document-review/[id]
 * Gets the current AI review status and result for a document.
 * aiReview is stored as a JSON string in the database - returned as-is
 * (the frontend will parse it).
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
        aiReviewPrompt: true,
        submitUrl: true,
        userId: true,
        user: { select: { companyId: true } },
        bidId: true,
        bid: {
          select: {
            tender: {
              select: { createdBy: true },
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

    // Same access rules as POST
    const isOwner = doc.userId === user!.id;
    const isCompanyAdmin =
      user!.role === 'team_admin' && doc.user?.companyId === user!.companyId;
    const isTenderCreator = doc.bidId ? doc.bid?.tender?.createdBy === user!.id : false;

    if (!isOwner && !isCompanyAdmin && !isTenderCreator) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have access to this document' },
        { status: 403 }
      );
    }

    // aiReview is stored as a JSON string - return it as-is (frontend will parse)
    return NextResponse.json({
      success: true,
      data: {
        id: doc.id,
        aiReviewStatus: doc.aiReviewStatus,
        aiReview: doc.aiReview,
        aiReviewProcessedAt: doc.aiReviewProcessedAt,
        aiReviewPrompt: doc.aiReviewPrompt,
        submitUrl: doc.submitUrl,
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
