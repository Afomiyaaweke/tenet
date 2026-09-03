import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { uploadFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per image
const MAX_IMAGES_PER_LISTING = 6; // matches the cap enforced client-side
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * POST /api/social/proforma/upload
 * Upload one product image for a marketplace (proforma) listing.
 *
 * The image is stored via the shared storage abstraction (local /uploads in
 * dev, Vercel Blob in prod). The returned URL is collected client-side and
 * sent as part of `imageUrls` when the listing itself is POSTed to
 * /api/social/proforma — so this endpoint does NOT touch the database.
 *
 * FormData fields:
 *  - file: image File (required)
 *
 * Response: { success: true, data: { url } }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
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

    // Lightweight per-user rate guard: cap concurrent uploads so a single
    // user can't trivially fill storage. The hard cap (MAX_IMAGES_PER_LISTING)
    // is enforced client-side; here we just sanity-check the count field if
    // the client sends it.
    const declaredCount = Number(formData.get('count') || 1);
    if (
      !Number.isFinite(declaredCount) ||
      declaredCount < 1 ||
      declaredCount > MAX_IMAGES_PER_LISTING
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `A listing can have at most ${MAX_IMAGES_PER_LISTING} images.`,
        },
        { status: 400 },
      );
    }

    const { url } = await uploadFile(file, 'proforma-images');

    return NextResponse.json(
      { success: true, data: { url } },
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/social/proforma/upload] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to upload image' },
      { status: 500 },
    );
  }
}
