import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';

/**
 * GET /api/tenders/[id]
 * Get single tender with bids count
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;
    const tender = await db.tender.findUnique({
      where: { id },
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

    // Company access check: non-super_admin can only see their own company's tenders or open tenders
    if (user!.role !== 'super_admin' && user!.companyId && tender.companyId !== user!.companyId && tender.status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have access to this tender' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tender,
    });
  } catch (err) {
    console.error('Get tender error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching the tender' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tenders/[id]
 * Admin only: Update tender
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const tender = await db.tender.findUnique({ where: { id } });
    if (!tender) {
      return NextResponse.json(
        { success: false, error: 'Tender not found' },
        { status: 404 }
      );
    }

    // Company access check: non-super_admin can only update their own company's tenders
    if (user!.role !== 'super_admin' && user!.companyId && tender.companyId !== user!.companyId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only update tenders from your own company' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      scope,
      budgetMin,
      budgetMax,
      deadline,
      location,
      categoryTags,
      requiredDocs,
      status,
    } = body;

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (scope !== undefined) updateData.scope = scope;
    if (budgetMin !== undefined) updateData.budgetMin = parseFloat(String(budgetMin));
    if (budgetMax !== undefined) updateData.budgetMax = parseFloat(String(budgetMax));
    if (deadline !== undefined) updateData.deadline = new Date(deadline);
    if (location !== undefined) updateData.location = location;
    if (categoryTags !== undefined) updateData.categoryTags = categoryTags;
    if (requiredDocs !== undefined) updateData.requiredDocs = requiredDocs;
    if (status !== undefined) updateData.status = status;

    const updatedTender = await db.tender.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedTender,
    });
  } catch (err) {
    console.error('Update tender error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating the tender' },
      { status: 500 }
    );
  }
}
