import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { uploadFile } from '@/lib/storage';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB for videos
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_MIME_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];

/**
 * POST /api/social/upload
 * Upload images or videos for social posts.
 * FormData fields: file (required)
 * Returns: { success: true, data: { url, type } }
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
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only images (JPEG, PNG, WebP, GIF) and videos (MP4, WebM, MOV) are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    const mediaType = VIDEO_TYPES.includes(file.type) ? 'video' : 'image';
    const subPath = mediaType === 'video' ? 'social/videos' : 'social/images';
    const { url: fileUrl } = await uploadFile(file, subPath);

    return NextResponse.json({
      success: true,
      data: { url: fileUrl, type: mediaType },
    });
  } catch (err) {
    console.error('Social media upload error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while uploading the file' },
      { status: 500 }
    );
  }
}
