import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/tenders/[id]/requirements
 * 
 * Fetches the full tender requirements including:
 * - Tender details (scope, requiredDocs, budget, deadline)
 * - Attached documents list with download URLs
 * - Bid requirements
 * - AI analysis if available
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    const tender = await db.tender.findUnique({
      where: { id },
      include: {
        documents: {
          select: {
            id: true,
            fileName: true,
            docType: true,
            fileUrl: true,
            status: true,
            ocrText: true,
            ocrStatus: true,
            aiReview: true,
            aiReviewStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        bids: {
          select: {
            id: true,
            status: true,
            financialProposal: true,
            timeline: true,
            createdAt: true,
            user: {
              select: {
                profile: { select: { fullName: true } },
                company: { select: { name: true } },
              },
            },
          },
        },
        bidAnalysis: {
          select: {
            summary: true,
            rankings: true,
            recommendation: true,
            budgetAnalysis: true,
            riskSummary: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        company: {
          select: { name: true, industry: true },
        },
      },
    });

    if (!tender) {
      return NextResponse.json({ success: false, error: 'Tender not found' }, { status: 404 });
    }

    // Parse required documents
    const requiredDocs = tender.requiredDocs
      .split(',')
      .map(d => d.trim())
      .filter(Boolean);

    // Organize documents by type
    const documentsByType: Record<string, typeof tender.documents> = {};
    for (const doc of tender.documents) {
      if (!documentsByType[doc.docType]) documentsByType[doc.docType] = [];
      documentsByType[doc.docType].push(doc);
    }

    // Build the requirements response
    const requirements = {
      tender: {
        id: tender.id,
        title: tender.title,
        scope: tender.scope,
        status: tender.status,
        budgetMin: tender.budgetMin,
        budgetMax: tender.budgetMax,
        deadline: tender.deadline,
        location: tender.location,
        categoryTags: tender.categoryTags,
        requiredDocs,
        company: tender.company,
        createdAt: tender.createdAt,
        updatedAt: tender.updatedAt,
      },
      documents: {
        all: tender.documents,
        byType: documentsByType,
        downloadable: tender.documents
          .filter(d => d.fileUrl)
          .map(d => ({
            id: d.id,
            fileName: d.fileName,
            docType: d.docType,
            url: d.fileUrl,
            status: d.status,
            hasOcr: d.ocrStatus === 'completed',
            hasAiReview: d.aiReviewStatus === 'completed',
          })),
      },
      bidAnalysis: tender.bidAnalysis[0] || null,
      bidSummary: {
        total: tender.bids.length,
        byStatus: tender.bids.reduce((acc, b) => {
          acc[b.status] = (acc[b.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        financialRange: tender.bids.length > 0
          ? {
              min: Math.min(...tender.bids.map(b => b.financialProposal)),
              max: Math.max(...tender.bids.map(b => b.financialProposal)),
              average: tender.bids.reduce((s, b) => s + b.financialProposal, 0) / tender.bids.length,
            }
          : null,
      },
    };

    return NextResponse.json({
      success: true,
      data: requirements,
    });
  } catch (err) {
    console.error('[GET /api/tenders/[id]/requirements] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch requirements' },
      { status: 500 },
    );
  }
}
