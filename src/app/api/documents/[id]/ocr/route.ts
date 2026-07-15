import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * POST /api/documents/[id]/ocr
 * Extract text from a document using OCR (VLM with file_url).
 * Supports PDF, DOCX, images - reads the file from disk and sends
 * it as a base64 data URL to the VLM model.
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
        user: { select: { id: true, companyId: true } },
        bid: { select: { id: true, tenderId: true, tender: { select: { createdBy: true } } } },
      },
    });

    if (!doc) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Authorization: user must own the doc OR be team_admin of the company
    // OR be the tender creator (for bid documents)
    const isOwner = doc.userId === user!.id;
    const isCompanyAdmin = user!.role === 'team_admin' && doc.user?.companyId === user!.companyId;
    const isTenderCreator = doc.bid?.tender?.createdBy === user!.id;

    if (!isOwner && !isCompanyAdmin && !isTenderCreator) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You cannot OCR this document' },
        { status: 403 }
      );
    }

    // If already processing, return status
    if (doc.ocrStatus === 'processing') {
      return NextResponse.json({
        success: true,
        data: { id: doc.id, ocrStatus: doc.ocrStatus, ocrText: null },
        message: 'OCR is already being processed',
      });
    }

    // Mark as processing
    await db.document.update({
      where: { id },
      data: { ocrStatus: 'processing' },
    });

    try {
      // Read the file from disk
      const fs = await import('fs/promises');
      const filePath = process.cwd() + '/uploads/' + doc.fileUrl.split('/uploads/')[1];

      if (!filePath) {
        throw new Error('Invalid file URL');
      }

      const fileBuffer = await fs.readFile(filePath);
      const base64File = fileBuffer.toString('base64');

      // Determine MIME type based on file extension
      const ext = doc.fileName.toLowerCase().split('.').pop();
      const mimeMap: Record<string, string> = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        doc: 'application/msword',
        txt: 'text/plain',
      };
      const mimeType = mimeMap[ext || ''] || 'application/octet-stream';
      const dataUrl = `data:${mimeType};base64,${base64File}`;

      // Use VLM to extract text from document
      const zai = await ZAI.create();

      // For PDFs and documents, use file_url type; for images, use image_url
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '');
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
                text: 'You are an expert OCR system. Extract ALL text from the provided document precisely. Preserve the document structure, headings, tables, and formatting as much as possible. Output only the extracted text content, no additional commentary.',
              },
            ],
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract all text from this document. Preserve structure, headings, tables and formatting.' },
              contentItem,
            ],
          },
        ],
        thinking: { type: 'disabled' },
      });

      const ocrText = response.choices?.[0]?.message?.content || '';

      if (!ocrText || ocrText.trim().length === 0) {
        throw new Error('OCR returned empty result');
      }

      // Save OCR result
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
          ocrText: updated.ocrText,
          ocrStatus: updated.ocrStatus,
          ocrProcessedAt: updated.ocrProcessedAt,
        },
      });
    } catch (ocrError) {
      console.error('OCR processing error:', ocrError);

      // Mark as failed
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
 * GET /api/documents/[id]/ocr
 * Get the current OCR status and result for a document
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
        ocrText: true,
        ocrStatus: true,
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
        ocrText: doc.ocrText,
        ocrStatus: doc.ocrStatus,
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
