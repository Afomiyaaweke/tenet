import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { uploadFile, deleteFile, getFileBuffer } from '@/lib/storage';
import path from 'path';


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
    const submitUrl = (formData.get('submitUrl') as string) || null;
    const reviewPrompt = (formData.get('reviewPrompt') as string) || null;

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

    // Upload file via storage abstraction (local filesystem or Vercel Blob)
    const safeName = sanitizeFilename(file.name);
    const { url: fileUrl } = await uploadFile(file);

    // Create document record linked to the bid
    const document = await db.document.create({
      data: {
        userId: user!.id,
        companyId: user!.companyId || undefined,
        docType,
        fileUrl,
        fileName: safeName,
        status: 'pending',
        bidId,
        ocrStatus: autoOcr ? 'processing' : 'none',
        aiReviewStatus: autoReview ? 'pending' : 'none',
        submitUrl,
        aiReviewPrompt: reviewPrompt,
      },
    });

    // If auto-OCR is requested, trigger it asynchronously (and auto-chain AI Review if requested)
    if (autoOcr) {
      triggerOcrAsync(document.id, safeName, fileUrl, autoReview, reviewPrompt).catch(err => {
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

/**
 * DELETE /api/bids/[id]/documents
 * Delete a document from a bid. Accepts { documentId } in request body.
 * Only the document owner, the bid's tender creator, or company admin can delete.
 * Also removes the physical file from the uploads directory.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id: bidId } = await params;
    const body = await request.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'documentId is required' },
        { status: 400 }
      );
    }

    // Find the bid with tender info for access control
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

    // Find the document
    const document = await db.document.findUnique({ where: { id: documentId } });
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Verify document belongs to this bid
    if (document.bidId !== bidId) {
      return NextResponse.json(
        { success: false, error: 'Document does not belong to this bid' },
        { status: 400 }
      );
    }

    // Access control: document owner OR tender creator OR company admin
    const isOwner = document.userId === user!.id;
    const isTenderCreator = bid.tender.createdBy === user!.id;
    const isCompanyAdmin = user!.role === 'team_admin' && bid.tender.companyId === user!.companyId;

    if (!isOwner && !isTenderCreator && !isCompanyAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You cannot delete this document' },
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
    await db.document.delete({ where: { id: documentId } });

    return NextResponse.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    console.error('Delete bid document error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while deleting the document' },
      { status: 500 }
    );
  }
}

// Helper: trigger OCR asynchronously, and optionally auto-chain AI Review
async function triggerOcrAsync(docId: string, fileName: string, fileUrl: string, autoReview: boolean = false, reviewPrompt: string | null = null) {
  try {
    const fileBuffer = await getFileBuffer(fileUrl);

    const ext = fileName.toLowerCase().split('.').pop() || '';
    let ocrText = '';

    // For plain text files, read content directly (no Vision API needed)
    if (ext === 'txt') {
      ocrText = fileBuffer.toString('utf-8');
    } else {
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

      // Auto-chain AI Review if requested
      if (autoReview) {
        triggerReviewAsync(docId, ocrText, reviewPrompt).catch(err => {
          console.error('Auto AI Review trigger failed:', err);
        });
      }
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

// Helper: trigger AI Review asynchronously after OCR completes
async function triggerReviewAsync(docId: string, ocrText: string, customPrompt: string | null = null) {
  try {
    await db.document.update({
      where: { id: docId },
      data: { aiReviewStatus: 'processing', ...(customPrompt ? { aiReviewPrompt: customPrompt } : {}) },
    });

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const systemPrompt = customPrompt
      ? `You are an expert document reviewer. The user has provided the following specific review criteria:\n\n"${customPrompt}"\n\nAnalyze the provided document text according to the user's criteria and produce a structured review in JSON format with these fields:\n- complianceScore: number 0-100\n- completenessScore: number 0-100\n- riskLevel: "low" | "medium" | "high"\n- findings: array of { type: "positive"|"negative"|"warning", title: string, description: string }\n- strengths: array of strings\n- weaknesses: array of strings\n- missingElements: array of strings\n- recommendations: array of strings\n- overallAssessment: string\n\nRespond ONLY with valid JSON, no other text.`
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

    let reviewData: Record<string, unknown>;
    try {
      const cleaned = rawResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      reviewData = JSON.parse(cleaned);
    } catch {
      reviewData = { summary: rawResponse };
    }

    await db.document.update({
      where: { id: docId },
      data: {
        aiReview: JSON.stringify(reviewData),
        aiReviewStatus: 'completed',
        aiReviewProcessedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('Async AI Review error:', err);
    await db.document.update({
      where: { id: docId },
      data: { aiReviewStatus: 'failed' },
    }).catch(() => {});
  }
}
