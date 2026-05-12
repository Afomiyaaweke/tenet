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
];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

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

    const validDocTypes = ['business_license', 'tax_clearance', 'portfolio', 'certificate', 'other'];
    if (!validDocTypes.includes(docType)) {
      return NextResponse.json(
        { success: false, error: `Invalid docType. Must be one of: ${validDocTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Use the userId from form data, or fall back to the authenticated user's id
    // Only admin can upload documents for other users
    const targetUserId = userId || user!.id;
    if (userId && userId !== user!.id && user!.role !== 'admin') {
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

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize the filename and create unique filename
    const safeName = sanitizeFilename(file.name);
    const safeExt = path.extname(safeName).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${safeExt}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

    // Ensure uploads directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(filePath, buffer);

    // Create document record
    const document = await db.document.create({
      data: {
        userId: targetUserId,
        docType,
        fileUrl: `/uploads/${uniqueName}`,
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
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    let documents;

    if (user!.role === 'admin') {
      // Admin can see all documents
      documents = await db.document.findMany({
        include: { user: { select: { id: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Regular users can only see their own documents
      documents = await db.document.findMany({
        where: { userId: user!.id },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching documents' },
      { status: 500 }
    );
  }
}
