import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { uploadFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per image
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * POST /api/social/proforma/upload
 * Upload one product photo for a Proforma marketplace listing.
 * Files are stored via the shared storage abstraction (local /uploads in dev,
 * Vercel Blob in prod). Returns the public URL to be collected client-side
 * and submitted with the listing creation.
 *
 * FormData fields:
 *  - file: image File (required)
 */
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.',
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 5MB per image.' },
        { status: 400 },
      );
    }

    const { url } = await uploadFile(file, 'proforma-images');

    return NextResponse.json({ success: true, data: { url } }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/social/proforma/upload] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to upload image' },
      { status: 500 },
    );
  }
}
