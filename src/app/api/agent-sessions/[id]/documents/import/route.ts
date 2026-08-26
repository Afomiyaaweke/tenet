import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ensureAgentTables } from '@/lib/ensure-agent-tables';
import { parseDocument, summarizeDocument } from '@/lib/agent-document';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * POST /api/agent-sessions/[id]/documents/import
 *
 * Import a document from an existing tender or bid into an agent session.
 * Body (JSON or FormData):
 *   - fileUrl: string (path like /tender-docs/xxx.pdf or full URL)
 *   - fileName: string
 *   - category: string ('tender' | 'submission' | 'reference' | 'support')
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureAgentTables();
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id: sessionId } = await params;

    // Verify session belongs to user
    const session = await db.agentSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session || session.userId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Parse body — support both JSON and FormData
    let fileUrl: string;
    let fileName: string;
    let category: string;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      fileUrl = (formData.get('fileUrl') as string) || '';
      fileName = (formData.get('fileName') as string) || 'imported.pdf';
      category = (formData.get('category') as string) || 'tender';
    } else {
      const body = await request.json();
      fileUrl = body.fileUrl || '';
      fileName = body.fileName || 'imported.pdf';
      category = body.category || 'tender';
    }

    if (!fileUrl) {
      return NextResponse.json(
        { success: false, error: 'fileUrl is required' },
        { status: 400 }
      );
    }

    // Resolve the source file
    let buffer: Buffer;
    let resolvedFilename = fileName;

    // Check if it's a local file path (starts with /)
    if (fileUrl.startsWith('/')) {
      const localPath = path.join(process.cwd(), 'public', fileUrl);
      if (!fs.existsSync(localPath)) {
        return NextResponse.json(
          { success: false, error: `Source file not found: ${fileUrl}` },
          { status: 404 }
        );
      }
      buffer = fs.readFileSync(localPath);
    } else if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      // Fetch remote URL
      try {
        const res = await fetch(fileUrl, {
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) {
          return NextResponse.json(
            { success: false, error: `Failed to fetch remote file: ${res.status}` },
            { status: 422 }
          );
        }
        const arrayBuf = await res.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      } catch (fetchErr: any) {
        return NextResponse.json(
          { success: false, error: `Failed to fetch remote file: ${fetchErr?.message || 'Unknown error'}` },
          { status: 422 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'fileUrl must start with / or http(s)://' },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'agent-uploads', sessionId);
    fs.mkdirSync(uploadDir, { recursive: true });

    // Save file to agent-uploads
    const filepath = path.join(uploadDir, resolvedFilename);
    fs.writeFileSync(filepath, buffer);

    // Create document record
    const doc = await db.agentDocument.create({
      data: {
        sessionId,
        filename: resolvedFilename,
        filetype: resolvedFilename.split('.').pop()?.toLowerCase() || 'unknown',
        filepath: `/agent-uploads/${sessionId}/${resolvedFilename}`,
        fileSize: buffer.length,
        pageCount: 0,
        pageTexts: '[]',
        category,
        status: 'processing',
      },
    });

    // Parse document in background
    try {
      const parsed = await parseDocument(resolvedFilename, buffer);

      let summary: string | null = null;
      try {
        summary = await summarizeDocument(parsed.pages);
      } catch (summaryErr) {
        console.warn('Summary generation failed:', summaryErr);
      }

      const pageTexts = JSON.stringify(parsed.pages.map((p) => p.text));

      const updatedDoc = await db.agentDocument.update({
        where: { id: doc.id },
        data: {
          pageCount: parsed.totalPages,
          pageTexts,
          summary,
          status: 'indexed',
        },
      });

      return NextResponse.json({ success: true, data: updatedDoc });
    } catch (parseErr: any) {
      console.error('Import document parsing error:', parseErr);
      await db.agentDocument.update({
        where: { id: doc.id },
        data: { status: 'error' },
      });
      return NextResponse.json(
        { success: false, error: `Document parsing failed: ${parseErr?.message || 'Unknown error'}` },
        { status: 422 }
      );
    }
  } catch (err: any) {
    console.error('Import agent document error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to import document' },
      { status: 500 }
    );
  }
}
