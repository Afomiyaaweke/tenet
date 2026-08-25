import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getZAI } from '@/lib/zai';

// Vercel Hobby tier: 10s max
export const maxDuration = 10;
export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { message, history, documentTitle } = body as {
      message?: string;
      history?: ChatMessage[];
      documentTitle?: string;
    };

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 },
      );
    }

    // Cap incoming history to last 8 messages for token safety
    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (m) =>
              (m.role === 'user' || m.role === 'assistant') &&
              typeof m.content === 'string',
          )
          .slice(-8)
      : [];

    const truncatedMessage = message.length > 4000 ? message.slice(0, 4000) + '...' : message;

    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are the AI Doc Studio assistant, a helpful procurement and tender expert inside a document editor.
Help the user draft, brainstorm, summarise, refine, or answer questions about tenders, bids, proposals, requirements and procurement documents.
Keep answers concise and practical. Use short paragraphs and bullet lists where helpful.
${documentTitle ? `The user is currently working on a document titled: "${documentTitle}".` : ''}`,
        },
        ...safeHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: truncatedMessage },
      ],
      thinking: { type: 'disabled' },
    });

    const reply = completion.choices[0]?.message?.content?.trim() || '';

    return NextResponse.json({
      success: true,
      data: { reply },
    });
  } catch (err) {
    console.error('[POST /api/ai/chat] error:', err);
    return NextResponse.json(
      { success: false, error: 'Chat failed' },
      { status: 500 },
    );
  }
}
