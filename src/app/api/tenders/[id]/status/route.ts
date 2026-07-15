import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

/**
 * PATCH /api/tenders/[id]/status
 * Admin only: Change tender status (open, closed, awarded, cancelled)
 */
export async function PATCH(
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

    // Company isolation: non-team_admin can only update their own company's tenders
    if (user!.role !== 'team_admin' && user!.companyId && tender.companyId !== user!.companyId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only update tenders from your own company' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;

    const validStatuses = ['open', 'closed', 'awarded', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updatedTender = await db.tender.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      data: updatedTender,
    });
  } catch (err) {
    console.error('Update tender status error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating tender status' },
      { status: 500 }
    );
  }
}
