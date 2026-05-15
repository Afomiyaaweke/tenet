import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = process.cwd() + '/uploads/profile-photos';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function sanitizeFilename(filename: string): string {
  const basename = filename.replace(/^.*[\\/]/, '');
  return basename.replace(/[\x00<>:"|?*\s]/g, '_');
}

/**
 * POST /api/profiles/upload-photo
 * Upload or update profile photo / cover photo
 * FormData fields: file (required), type ("profile" or "cover")
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const photoType = (formData.get('type') as string) || 'profile'; // profile | cover

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Find profile
    const profile = await db.profile.findUnique({ where: { userId: user!.id } });
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeName = sanitizeFilename(file.name);
    const safeExt = path.extname(safeName).toLowerCase();
    const uniqueName = `${user!.id}-${photoType}-${Date.now()}${safeExt}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/profile-photos/${uniqueName}`;

    // Update profile
    const updateField = photoType === 'cover' ? 'logoUrl' : 'profilePhoto';
    const updatedProfile = await db.profile.update({
      where: { id: profile.id },
      data: { [updateField]: fileUrl },
      include: { user: { select: { id: true, email: true, role: true, status: true } } },
    });

    return NextResponse.json({
      success: true,
      data: { url: fileUrl, profile: updatedProfile },
    });
  } catch (err) {
    console.error('Profile photo upload error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while uploading the photo' },
      { status: 500 }
    );
  }
}
