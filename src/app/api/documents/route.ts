import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { uploadFile } from '@/lib/storage';
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

/**
 * Sanitize filename to prevent path traversal attacks
 */
function sanitizeFilename(filename: string): string {
  // Remove any path components
  const basename = filename.replace(/^.*[\\/]/, '');
  // Remove any null bytes or dangerous characters
  return basename.replace(/[\x00<>:"|?*\s]/g, '_');
}

/**
 * POST /api/documents
 * Upload a document (form data with file + docType + userId)
 * Only allows PDF, JPEG, PNG files up to 10MB
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const docType = formData.get('docType') as string | null;
    const userId = formData.get('userId') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type. Only PDF, JPEG, and PNG files are allowed. Received: ${file.type || 'unknown'}` },
        { status: 400 }
      );
    }

    // Validate file extension
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { success: false, error: `Invalid file extension. Only ${ALLOWED_EXTENSIONS.join(', ')} are allowed. Received: ${ext || 'none'}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is 10MB. Received: ${(file.size / (1024 * 1024)).toFixed(2)}MB` },
        { status: 400 }
      );
    }

    if (!docType) {
      return NextResponse.json(
        { success: false, error: 'Document type (docType) is required' },
        { status: 400 }
      );
    }

    const validDocTypes = ['business_license', 'tax_clearance', 'portfolio', 'certificate', 'other', 'bid_attachment', 'technical_proposal', 'financial_proposal', 'timeline_doc', 'external_doc', 'tender_document'];
    if (!validDocTypes.includes(docType)) {
      return NextResponse.json(
        { success: false, error: `Invalid docType. Must be one of: ${validDocTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Use the userId from form data, or fall back to the authenticated user's id
    // Only team_admin can upload documents for other users
    const targetUserId = userId || user!.id;
    if (userId && userId !== user!.id && user!.role !== 'team_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only upload documents for yourself' },
        { status: 403 }
      );
    }

    // Verify target user exists
    const targetUser = await db.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Target user not found' },
        { status: 404 }
      );
    }

    // Upload file via storage abstraction (local filesystem or Vercel Blob)
    const safeName = sanitizeFilename(file.name);
    const { url: fileUrl } = await uploadFile(file);

    // Create document record
    const document = await db.document.create({
      data: {
        userId: targetUserId,
        docType,
        fileUrl,
        fileName: safeName,
        status: 'pending',
      },
    });

    return NextResponse.json(
      { success: true, data: document },
      { status: 201 }
    );
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while uploading the document' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents
 * List documents: admin sees all, user sees own only
 * Supports pagination via ?page=1&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    let documents;
    let total;

    if (user!.role === 'team_admin') {
      // Team admin can see their company's documents
      const where = user!.companyId ? { user: { companyId: user!.companyId } } : {};
      [documents, total] = await Promise.all([
        db.document.findMany({
          where,
          include: { user: { select: { id: true, email: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
        }),
        db.document.count({ where }),
      ]);
    } else {
      // Regular users can only see their own documents
      const where = { userId: user!.id };
      [documents, total] = await Promise.all([
        db.document.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
        }),
        db.document.count({ where }),
      ]);
    }

    return NextResponse.json({
      success: true,
      data: documents,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + documents.length < total,
      },
    });
  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching documents' },
      { status: 500 }
    );
  }
}
