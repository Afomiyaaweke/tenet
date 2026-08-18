import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getZAI } from '@/lib/zai';

// Vercel Hobby tier: 10s max
export const maxDuration = 10;
export const dynamic = 'force-dynamic';

/**
 * POST /api/documents/ai-extract
 * Extract specific information from a document using AI based on a user prompt.
 * Requires OCR to have been completed on the document first.
 *
 * Body: { documentId: string, prompt: string }
 * - documentId: The ID of the document to extract info from
 * - prompt: What information to extract (e.g., "Extract all financial figures", "List all contract terms")
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { documentId, prompt } = body;

    if (!documentId || !prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: 'documentId and prompt are required' },
        { status: 400 }
      );
    }

    // Find document with access check
    const doc = await db.document.findUnique({
      where: { id: documentId },
      include: {
        user: { select: { companyId: true } },
        bid: {
          select: {
            tender: { select: { createdBy: true } },
          },
        },
      },
    });

    if (!doc) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Access control
    const isOwner = doc.userId === user!.id;
    const isCompanyAdmin = user!.role === 'team_admin' && doc.user?.companyId === user!.companyId;
    const isTenderCreator = doc.bidId ? doc.bid?.tender?.createdBy === user!.id : false;

    if (!isOwner && !isCompanyAdmin && !isTenderCreator) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have access to this document' },
        { status: 403 }
      );
    }

    // Need OCR text
    if (doc.ocrStatus !== 'completed' || !doc.ocrText) {
      return NextResponse.json(
        { success: false, error: 'OCR must be completed first. Run OCR on the document before extracting information.' },
        { status: 400 }
      );
    }

    // Use AI to extract information based on the user's prompt
    const zai = await getZAI();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are an expert document information extractor. The user will provide a document's text and a specific prompt about what information they want extracted. Your job is to:

1. Carefully read through the document text
2. Extract ONLY the information requested in the user's prompt
3. Format the extracted information clearly and concisely
4. If the requested information is not found in the document, say so explicitly
5. Always quote relevant sections from the document when possible

Respond in a clear, structured format. Use headings, bullet points, or numbered lists as appropriate for the type of information extracted.`,
        },
        {
          role: 'user',
          content: `Here is the document text:\n\n${doc.ocrText}\n\n---\n\nMy request: ${prompt}`,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const extractedInfo = completion.choices?.[0]?.message?.content || '';

    if (!extractedInfo || extractedInfo.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'AI extraction returned empty result' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        documentId: doc.id,
        fileName: doc.fileName,
        prompt,
        extractedInfo,
        ocrTextLength: doc.ocrText.length,
      },
    });
  } catch (err) {
    console.error('AI extract error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred during AI extraction' },
      { status: 500 }
    );
  }
}
