import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * Helper to determine MIME type from file extension
 */
function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    txt: 'text/plain',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Helper to check if a file extension is an image type
 */
function isImageFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
}

/**
 * POST /api/document-ocr/[id]
 * Triggers OCR processing for a document by its ID.
 * Uses the z-ai-web-dev-sdk Vision API to extract text from documents.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    // Find the document with related data for access checks
    const doc = await db.document.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, companyId: true } },
        bid: {
          select: {
            id: true,
            tenderId: true,
            tender: { select: { createdBy: true } },
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

    // Access control:
    // - Team admin can access any document in their company
    // - Regular user can only access their own documents
    // - If document has a bidId, the tender creator can also access it
    const isOwner = doc.userId === user!.id;
    const isCompanyAdmin =
      user!.role === 'team_admin' && doc.user?.companyId === user!.companyId;
    const isTenderCreator = doc.bid?.tender?.createdBy === user!.id;

    if (!isOwner && !isCompanyAdmin && !isTenderCreator) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have access to this document' },
        { status: 403 }
      );
    }

    // If already processing, return current status
    if (doc.ocrStatus === 'processing') {
      return NextResponse.json({
        success: true,
        data: {
          id: doc.id,
          ocrStatus: doc.ocrStatus,
          ocrText: null,
          ocrProcessedAt: null,
        },
        message: 'OCR is already being processed',
      });
    }

    // If already completed, return existing result
    if (doc.ocrStatus === 'completed' && doc.ocrText) {
      return NextResponse.json({
        success: true,
        data: {
          id: doc.id,
          ocrStatus: doc.ocrStatus,
          ocrText: doc.ocrText,
          ocrProcessedAt: doc.ocrProcessedAt,
        },
        message: 'OCR already completed',
      });
    }

    // Mark as processing
    await db.document.update({
      where: { id },
      data: { ocrStatus: 'processing' },
    });

    try {
      // Read the file from the uploads directory
      // fileUrl is like "/uploads/filename.ext" — actual file is at process.cwd() + fileUrl
      const filePath = process.cwd() + doc.fileUrl;
      const fileBuffer = await readFile(filePath);
      const base64Data = fileBuffer.toString('base64');

      // Determine MIME type and create data URL
      const mimeType = getMimeType(doc.fileName);
      const dataUrl = `data:${mimeType};base64,${base64Data}`;

      // Use z-ai-web-dev-sdk Vision API to extract text
      const zai = await ZAI.create();

      // For images: use image_url type; for documents (pdf/docx/txt): use file_url type
      const isImage = isImageFile(doc.fileName);
      const contentItem = isImage
        ? { type: 'image_url' as const, image_url: { url: dataUrl } }
        : { type: 'file_url' as const, file_url: { url: dataUrl } };

      const response = await zai.chat.completions.createVision({
        model: 'default',
        messages: [
          {
            role: 'assistant',
            content: [
              {
                type: 'text',
                text: 'You are an expert OCR system. Extract ALL text from the provided document precisely. Preserve structure, headings, tables, and formatting. Output only the extracted text, no commentary.',
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this document. Preserve structure and formatting.',
              },
              contentItem,
            ],
          },
        ],
        thinking: { type: 'disabled' },
      });

      const ocrText = response.choices?.[0]?.message?.content || '';

      // Update the document with OCR results
      const updated = await db.document.update({
        where: { id },
        data: {
          ocrText,
          ocrStatus: 'completed',
          ocrProcessedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: updated.id,
          ocrStatus: updated.ocrStatus,
          ocrText: updated.ocrText,
          ocrProcessedAt: updated.ocrProcessedAt,
        },
      });
    } catch (ocrError) {
      console.error('OCR processing error:', ocrError);

      // Mark as failed on error
      await db.document.update({
        where: { id },
        data: { ocrStatus: 'failed' },
      });

      return NextResponse.json(
        {
          success: false,
          error: `OCR processing failed: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}`,
          data: { id, ocrStatus: 'failed' },
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('OCR route error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred during OCR processing' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/document-ocr/[id]
 * Gets the current OCR status and extracted text for a document.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    // Find the document with related data for access checks
    const doc = await db.document.findUnique({
      where: { id },
      select: {
        id: true,
        ocrStatus: true,
        ocrText: true,
        ocrProcessedAt: true,
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

    // Same access rules as POST
    const isOwner = doc.userId === user!.id;
    const isCompanyAdmin =
      user!.role === 'team_admin' && doc.user?.companyId === user!.companyId;
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
        ocrStatus: doc.ocrStatus,
        ocrText: doc.ocrText,
        ocrProcessedAt: doc.ocrProcessedAt,
      },
    });
  } catch (err) {
    console.error('Get OCR status error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
