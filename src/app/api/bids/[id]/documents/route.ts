import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = process.cwd() + '/uploads';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.doc', '.txt'];

function sanitizeFilename(filename: string): string {
  const basename = filename.replace(/^.*[\\/]/, '');
  return basename.replace(/[\x00<>:"|?*\s]/g, '_');
}

/**
 * POST /api/bids/[id]/documents
 * Upload a document for a specific bid (e.g., from external tender sites).
 * The document will be linked to the bid and can be OCR'd and AI-reviewed.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id: bidId } = await params;

    // Find the bid
    const bid = await db.bid.findUnique({
      where: { id: bidId },
      include: {
        tender: { select: { createdBy: true, companyId: true } },
      },
    });

    if (!bid) {
      return NextResponse.json(
        { success: false, error: 'Bid not found' },
        { status: 404 }
      );
    }

    // Authorization: bid owner OR tender creator (team_admin)
    const isBidOwner = bid.userId === user!.id;
    const isTenderCreator = bid.tender.createdBy === user!.id;
    const isCompanyAdmin = user!.role === 'team_admin' && bid.tender.companyId === user!.companyId;

    if (!isBidOwner && !isTenderCreator && !isCompanyAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You cannot upload documents for this bid' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const docType = (formData.get('docType') as string) || 'bid_attachment';
    const autoOcr = formData.get('autoOcr') === 'true';
    const autoReview = formData.get('autoReview') === 'true';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum 10MB. Got ${(file.size / (1024 * 1024)).toFixed(2)}MB` },
        { status: 400 }
      );
    }

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeName = sanitizeFilename(file.name);
    const safeExt = path.extname(safeName).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${safeExt}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(filePath, buffer);

    // Create document record linked to the bid
    const document = await db.document.create({
      data: {
        userId: user!.id,
        companyId: user!.companyId || undefined,
        docType,
        fileUrl: `/uploads/${uniqueName}`,
        fileName: safeName,
        status: 'pending',
        bidId,
        ocrStatus: autoOcr ? 'processing' : 'none',
        aiReviewStatus: autoReview ? 'pending' : 'none',
      },
    });

    // If auto-OCR is requested, trigger it asynchronously
    if (autoOcr) {
      // We'll process OCR in the background after returning the response
      // The client can poll for status
      triggerOcrAsync(document.id, safeName, `/uploads/${uniqueName}`).catch(err => {
        console.error('Async OCR trigger failed:', err);
      });
    }

    return NextResponse.json(
      { success: true, data: document },
      { status: 201 }
    );
  } catch (err) {
    console.error('Bid document upload error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while uploading the document' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bids/[id]/documents
 * List all documents linked to a bid
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id: bidId } = await params;

    const bid = await db.bid.findUnique({
      where: { id: bidId },
      include: {
        tender: { select: { createdBy: true, companyId: true } },
      },
    });

    if (!bid) {
      return NextResponse.json(
        { success: false, error: 'Bid not found' },
        { status: 404 }
      );
    }

    const isBidOwner = bid.userId === user!.id;
    const isTenderCreator = bid.tender.createdBy === user!.id;
    const isCompanyAdmin = user!.role === 'team_admin' && bid.tender.companyId === user!.companyId;

    if (!isBidOwner && !isTenderCreator && !isCompanyAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const documents = await db.document.findMany({
      where: { bidId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: documents,
    });
  } catch (err) {
    console.error('Get bid documents error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// Helper: trigger OCR asynchronously
async function triggerOcrAsync(docId: string, fileName: string, fileUrl: string) {
  try {
    const fs = await import('fs/promises');
    const filePath = process.cwd() + '/uploads/' + fileUrl.split('/uploads/')[1];
    const fileBuffer = await fs.readFile(filePath);

    const ext = fileName.toLowerCase().split('.').pop() || '';
    let ocrText = '';

    // For plain text files, read content directly (no Vision API needed)
    if (ext === 'txt') {
      ocrText = fileBuffer.toString('utf-8');
    } else {
      // For images and documents (PDF, DOCX), use Vision API with image_url type
      // image_url accepts data: URLs, file_url does NOT accept data: URLs
      const base64File = fileBuffer.toString('base64');
      const mimeMap: Record<string, string> = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      const mimeType = mimeMap[ext] || 'application/octet-stream';
      const dataUrl = `data:${mimeType};base64,${base64File}`;

      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      // Always use image_url type — it supports data: URLs for both images and PDFs
      const contentItem = { type: 'image_url' as const, image_url: { url: dataUrl } };

      const response = await zai.chat.completions.createVision({
        model: 'default',
        messages: [
          {
            role: 'assistant',
            content: [{ type: 'text', text: 'You are an expert OCR system. Extract ALL text from the provided document precisely. Preserve structure, headings, tables, and formatting. Output only the extracted text, no commentary.' }],
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract all text from this document. Preserve structure and formatting.' },
              contentItem,
            ],
          },
        ],
        thinking: { type: 'disabled' },
      });

      ocrText = response.choices?.[0]?.message?.content || '';
    }

    if (ocrText && ocrText.trim().length > 0) {
      await db.document.update({
        where: { id: docId },
        data: {
          ocrText,
          ocrStatus: 'completed',
          ocrProcessedAt: new Date(),
        },
      });
    } else {
      await db.document.update({
        where: { id: docId },
        data: { ocrStatus: 'failed' },
      });
    }
  } catch (err) {
    console.error('Async OCR error:', err);
    await db.document.update({
      where: { id: docId },
      data: { ocrStatus: 'failed' },
    }).catch(() => {});
  }
}
