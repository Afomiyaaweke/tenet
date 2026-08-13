import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = process.cwd() + '/uploads';

/**
 * GET /api/uploads/[...path]
 *
 * Serves uploaded files from the local filesystem for development.
 * In production (Vercel), files are stored in Vercel Blob with absolute URLs,
 * so this route is only needed for local development.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const filePath = path.join(UPLOAD_DIR, ...pathSegments);

    // Security: prevent path traversal - ensure the resolved path is within UPLOAD_DIR
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check if file exists
    const fileStat = await stat(resolvedPath);
    if (!fileStat.isFile()) {
      return NextResponse.json(
        { success: false, error: 'Not a file' },
        { status: 404 }
      );
    }

    // Read the file
    const fileBuffer = await readFile(resolvedPath);

    // Determine MIME type from extension
    const ext = pathSegments[pathSegments.length - 1].toLowerCase().split('.').pop() || '';
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      txt: 'text/plain',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: unknown) {
    // File not found or other error
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'ENOENT') {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }
    console.error('Upload file serve error:', err);
    return NextResponse.json(
      { success: false, error: 'Error serving file' },
      { status: 500 }
    );
  }
}
