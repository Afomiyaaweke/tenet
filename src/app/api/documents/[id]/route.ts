import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { deleteFile } from '@/lib/storage';

/**
 * DELETE /api/documents/[id]
 * Delete a document by ID. Only the document owner or company admin can delete.
 * Also removes the physical file from the uploads directory.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const document = await db.document.findUnique({ where: { id } });
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Access control: owner or company admin
    const isOwner = document.userId === user!.id;
    const isCompanyAdmin = user!.role === 'team_admin' && document.companyId === user!.companyId;
    if (!isOwner && !isCompanyAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only delete your own documents' },
        { status: 403 }
      );
    }

    // Delete file via storage abstraction
    try {
      if (document.fileUrl) {
        await deleteFile(document.fileUrl);
      }
    } catch {
      // File may already be deleted or not exist - that's OK
    }

    // Delete database record (cascades to related data)
    await db.document.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    console.error('Delete document error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while deleting the document' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/documents/[id]
 * Supports two use cases:
 * 1. Admin: approve/reject document (status + reviewNotes)
 * 2. Document owner: update submitUrl on their own document
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await requireAuth(request);
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

    // Case 1: Admin approve/reject (status field present)
    if (body.status) {
      if (user!.role !== 'team_admin') {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Only admins can approve/reject documents' },
          { status: 403 }
        );
      }

      const validStatuses = ['approved', 'rejected'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status. Must be approved or rejected' },
          { status: 400 }
        );
      }

      const updatedDocument = await db.document.update({
        where: { id },
        data: {
          status: body.status,
          reviewNotes: body.reviewNotes || null,
          reviewedAt: new Date(),
        },
      });

      await db.notification.create({
        data: {
          userId: document.userId || '',
          title: `Document ${body.status === 'approved' ? 'Approved' : 'Rejected'}`,
          message:
            body.status === 'approved'
              ? `Your document "${document.fileName}" has been approved.`
              : `Your document "${document.fileName}" has been rejected.${body.reviewNotes ? ` Reason: ${body.reviewNotes}` : ''}`,
          type: body.status === 'approved' ? 'success' : 'warning',
        },
      });

      return NextResponse.json({ success: true, data: updatedDocument });
    }

    // Case 2: Document owner updating submitUrl or aiReviewPrompt
    const isOwner = document.userId === user!.id;
    const isCompanyAdmin = user!.role === 'team_admin' && document.companyId === user!.companyId;
    if (!isOwner && !isCompanyAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only update your own documents' },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.submitUrl !== undefined) updateData.submitUrl = body.submitUrl || null;
    if (body.aiReviewPrompt !== undefined) updateData.aiReviewPrompt = body.aiReviewPrompt || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No updatable fields provided' },
        { status: 400 }
      );
    }

    const updatedDocument = await db.document.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updatedDocument });
  } catch (error) {
    console.error('Update document error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating the document' },
      { status: 500 }
    );
  }
}
