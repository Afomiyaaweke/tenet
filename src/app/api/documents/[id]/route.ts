import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

/**
 * PATCH /api/documents/[id]
 * Admin only: approve/reject document
 * Body: { status: "approved" | "rejected", reviewNotes?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await requireAdmin(request);
    if (error) return error;

    // Find the document
    const document = await db.document.findUnique({ where: { id } });
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status, reviewNotes } = body;

    // Validate status
    const validStatuses = ['approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be approved or rejected' },
        { status: 400 }
      );
    }

    // Update document
    const updatedDocument = await db.document.update({
      where: { id },
      data: {
        status,
        reviewNotes: reviewNotes || null,
        reviewedAt: new Date(),
      },
    });

    // Create notification for the user
    await db.notification.create({
      data: {
        userId: document.userId || '',
        title: `Document ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message:
          status === 'approved'
            ? `Your document "${document.fileName}" has been approved.`
            : `Your document "${document.fileName}" has been rejected.${reviewNotes ? ` Reason: ${reviewNotes}` : ''}`,
        type: status === 'approved' ? 'success' : 'warning',
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedDocument,
    });
  } catch (error) {
    console.error('Review document error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while reviewing the document' },
      { status: 500 }
    );
  }
}
