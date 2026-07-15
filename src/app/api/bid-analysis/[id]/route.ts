import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/bid-analysis/[id]
 * Get a specific bid analysis with full data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    const bidAnalysis = await db.bidAnalysis.findUnique({
      where: { id },
      include: {
        tender: {
          select: {
            id: true,
            title: true,
            scope: true,
            budgetMin: true,
            budgetMax: true,
            status: true,
            categoryTags: true,
            location: true,
            deadline: true,
          },
        },
      },
    });

    if (!bidAnalysis) {
      return NextResponse.json(
        { success: false, error: 'Bid analysis not found' },
        { status: 404 }
      );
    }

    // Parse JSON string fields for convenience
    const parsedAnalysis = {
      ...bidAnalysis,
      summary: JSON.parse(bidAnalysis.summary || '{}'),
      rankings: JSON.parse(bidAnalysis.rankings || '[]'),
    };

    return NextResponse.json({
      success: true,
      data: parsedAnalysis,
    });
  } catch (error) {
    console.error('Get bid analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching the bid analysis' },
      { status: 500 }
    );
  }
}
