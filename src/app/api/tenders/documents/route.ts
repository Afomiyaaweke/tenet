import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { uploadFile, deleteFile, getFileBuffer } from '@/lib/storage';
import { getZAI } from '@/lib/zai';
import path from 'path';

// Vercel Hobby tier: 10s max
export const maxDuration = 10;
export const dynamic = 'force-dynamic';


const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.doc', '.txt'];

function sanitizeFilename(filename: string): string {
  const basename = filename.replace(/^.*[\\/]/, '');
  return basename.replace(/[\x00<>:"|?*\s]/g, '_');
}

/**
 * POST /api/tenders/documents
 * Upload a document for a tender (RFP, specifications, terms of reference, etc.)
 * Can be used during tender creation (no tenderId yet) or after.
 * The document will be linked to the tender and can be OCR'd and AI-reviewed.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const docType = (formData.get('docType') as string) || 'tender_document';
    const tenderId = (formData.get('tenderId') as string) || null;
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

    // If tenderId is provided, verify the tender exists and user has access
    if (tenderId) {
      const tender = await db.tender.findUnique({
        where: { id: tenderId },
      });

      if (!tender) {
        return NextResponse.json(
          { success: false, error: 'Tender not found' },
          { status: 404 }
        );
      }

      // Only the tender creator or company admin can upload documents
      const isCreator = tender.createdBy === user!.id;
      const isCompanyAdmin = user!.role === 'team_admin' && tender.companyId === user!.companyId;

      if (!isCreator && !isCompanyAdmin) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You cannot upload documents for this tender' },
          { status: 403 }
        );
      }
    }

    // Upload file via storage abstraction (local filesystem or Vercel Blob)
    const safeName = sanitizeFilename(file.name);
    const { url: fileUrl } = await uploadFile(file);

    // Create document record linked to the tender
    const document = await db.document.create({
      data: {
        userId: user!.id,
        companyId: user!.companyId || undefined,
        docType,
        fileUrl,
        fileName: safeName,
        status: 'pending',
        tenderId: tenderId || undefined,
        ocrStatus: autoOcr ? 'processing' : 'none',
        aiReviewStatus: autoReview ? 'pending' : 'none',
      },
    });

    // If auto-OCR is requested, trigger it asynchronously (and auto-chain AI Review if requested)
    if (autoOcr) {
      triggerOcrAsync(document.id, safeName, fileUrl, autoReview).catch(err => {
        console.error('Async OCR trigger failed:', err);
      });
    }

    return NextResponse.json(
      { success: true, data: document },
      { status: 201 }
    );
  } catch (err) {
    console.error('Tender document upload error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while uploading the document' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tenders/documents?tenderId=<id>
 * List all documents linked to a tender
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const url = new URL(request.url);
    const tenderId = url.searchParams.get('tenderId');

    if (!tenderId) {
      return NextResponse.json(
        { success: false, error: 'tenderId query parameter is required' },
        { status: 400 }
      );
    }

    const tender = await db.tender.findUnique({
      where: { id: tenderId },
    });

    if (!tender) {
      return NextResponse.json(
        { success: false, error: 'Tender not found' },
        { status: 404 }
      );
    }

    // Access control: tender creator or company admin
    const isCreator = tender.createdBy === user!.id;
    const isCompanyAdmin = user!.role === 'team_admin' && tender.companyId === user!.companyId;
    const isOpenTender = tender.status === 'open';

    if (!isCreator && !isCompanyAdmin && !isOpenTender) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const documents = await db.document.findMany({
      where: { tenderId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: documents,
    });
  } catch (err) {
    console.error('Get tender documents error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenders/documents
 * Delete a document from a tender. Accepts { documentId } in request body.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'documentId is required' },
        { status: 400 }
      );
    }

    const document = await db.document.findUnique({ where: { id: documentId } });
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // If linked to a tender, verify access
    if (document.tenderId) {
      const tender = await db.tender.findUnique({
        where: { id: document.tenderId },
      });

      if (tender) {
        const isCreator = tender.createdBy === user!.id;
        const isCompanyAdmin = user!.role === 'team_admin' && tender.companyId === user!.companyId;
        const isDocOwner = document.userId === user!.id;

        if (!isCreator && !isCompanyAdmin && !isDocOwner) {
          return NextResponse.json(
            { success: false, error: 'Forbidden: You cannot delete this document' },
            { status: 403 }
          );
        }
      }
    } else {
      // No tender link - only document owner or admin can delete
      const isDocOwner = document.userId === user!.id;
      const isAdmin = user!.role === 'team_admin';

      if (!isDocOwner && !isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You cannot delete this document' },
          { status: 403 }
        );
      }
    }

    // Delete file via storage abstraction
    try {
      if (document.fileUrl) {
        await deleteFile(document.fileUrl);
      }
    } catch {
      // File may already be deleted or not exist
    }

    // Delete database record
    await db.document.delete({ where: { id: documentId } });

    return NextResponse.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    console.error('Delete tender document error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while deleting the document' },
      { status: 500 }
    );
  }
}

// Helper: trigger OCR asynchronously, and optionally auto-chain AI Review
async function triggerOcrAsync(docId: string, fileName: string, fileUrl: string, autoReview: boolean = false) {
  try {
    const fileBuffer = await getFileBuffer(fileUrl);

    const ext = fileName.toLowerCase().split('.').pop() || '';
    let ocrText = '';

    // For plain text files, read content directly
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

      const zai = await getZAI();

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
        triggerReviewAsync(docId, ocrText).catch(err => {
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
async function triggerReviewAsync(docId: string, ocrText: string) {
  try {
    await db.document.update({
      where: { id: docId },
      data: { aiReviewStatus: 'processing' },
    });

    const zai = await getZAI();

    const systemPrompt = `You are an expert procurement document reviewer specializing in tender/RFP documents. Analyze the provided document text and produce a structured review in JSON format with these fields:
- complianceScore: number 0-100 (how well the document meets procurement standards)
- completenessScore: number 0-100 (how complete the document is)
- riskLevel: "low" | "medium" | "high" (overall risk assessment)
- findings: array of { type: "positive"|"negative"|"warning", title: string, description: string }
- strengths: array of strings
- weaknesses: array of strings
- missingElements: array of strings (what's missing or incomplete)
- recommendations: array of strings
- overallAssessment: string (summary of the review)

Respond ONLY with valid JSON, no other text.`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Please review this tender document:\n\n${ocrText}`,
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
