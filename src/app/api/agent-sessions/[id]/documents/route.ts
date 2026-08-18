import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseDocument, summarizeDocument } from '@/lib/agent-document';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/agent-sessions/[id]/documents — List documents for the session
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const documents = await db.agentDocument.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: documents });
  } catch (err: any) {
    console.error('List agent documents error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to list documents' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/agent-sessions/[id]/documents — Upload a document
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'tender';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = file.name || 'unnamed';
    const fileSize = buffer.length;

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'agent-uploads', sessionId);
    fs.mkdirSync(uploadDir, { recursive: true });

    // Save file to disk
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    // Create initial document record
    const doc = await db.agentDocument.create({
      data: {
        sessionId,
        filename,
        filetype: filename.split('.').pop()?.toLowerCase() || 'unknown',
        filepath: `/agent-uploads/${sessionId}/${filename}`,
        fileSize,
        pageCount: 0,
        pageTexts: '[]',
        category,
        status: 'processing',
      },
    });

    // Parse document in the background (non-blocking for response)
    try {
      const parsed = await parseDocument(filename, buffer);

      // Generate summary
      let summary: string | null = null;
      try {
        summary = await summarizeDocument(parsed.pages);
      } catch (summaryErr) {
        console.warn('Summary generation failed:', summaryErr);
      }

      // Serialize page texts
      const pageTexts = JSON.stringify(parsed.pages.map((p) => p.text));

      // Update document with parsed data
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
      // Parsing failed — mark document as error
      console.error('Document parsing error:', parseErr);
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
    console.error('Upload agent document error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to upload document' },
      { status: 500 }
    );
  }
}
