import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, invalidateAuthCache } from '@/lib/auth';
import { uploadFile, deleteFile, StorageConfigError } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per image
const MAX_IMAGES = 12; // max portfolio images per profile
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * POST /api/profiles/upload-media
 * Upload one portfolio/gallery image for the authenticated user's profile.
 * Appends the new image URL to the profile.portfolioImages JSON array
 * (capped at MAX_IMAGES). Stored via shared storage abstraction
 * (local /uploads in dev, Vercel Blob in prod).
 *
 * FormData fields:
 *  - file: image File (required)
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

    const profile = await db.profile.findUnique({ where: { userId: user!.id } });
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 },
      );
    }

    // Parse existing portfolio images
    let images: string[] = [];
    try {
      images = profile.portfolioImages ? JSON.parse(profile.portfolioImages) : [];
      if (!Array.isArray(images)) images = [];
    } catch {
      images = [];
    }

    if (images.length >= MAX_IMAGES) {
      return NextResponse.json(
        { success: false, error: `You can upload a maximum of ${MAX_IMAGES} portfolio images. Remove one first.` },
        { status: 400 },
      );
    }

    const { url } = await uploadFile(file, 'profile-media');
    images.push(url);

    const updated = await db.profile.update({
      where: { id: profile.id },
      data: { portfolioImages: JSON.stringify(images) },
    });
    invalidateAuthCache(user!.id);

    return NextResponse.json(
      { success: true, data: { url, images, count: images.length } },
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/profiles/upload-media] error:', err);
    if (err instanceof StorageConfigError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { success: false, error: 'Failed to upload image' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/profiles/upload-media?url=<imageUrl>
 * Remove a portfolio image by URL. Deletes the file from storage and
 * removes it from the profile.portfolioImages array.
 *
 * Query params:
 *  - url: the image URL to remove (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Image URL is required' },
        { status: 400 },
      );
    }

    const profile = await db.profile.findUnique({ where: { userId: user!.id } });
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 },
      );
    }

    let images: string[] = [];
    try {
      images = profile.portfolioImages ? JSON.parse(profile.portfolioImages) : [];
      if (!Array.isArray(images)) images = [];
    } catch {
      images = [];
    }

    if (!images.includes(url)) {
      return NextResponse.json(
        { success: false, error: 'Image not found in your portfolio' },
        { status: 404 },
      );
    }

    // Remove from storage (best-effort) and from the array
    try {
      await deleteFile(url);
    } catch {
      // non-fatal: file may already be gone
    }
    images = images.filter((u) => u !== url);

    await db.profile.update({
      where: { id: profile.id },
      data: { portfolioImages: JSON.stringify(images) },
    });
    invalidateAuthCache(user!.id);

    return NextResponse.json({ success: true, data: { images, count: images.length } });
  } catch (err) {
    console.error('[DELETE /api/profiles/upload-media] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to remove image' },
      { status: 500 },
    );
  }
}
