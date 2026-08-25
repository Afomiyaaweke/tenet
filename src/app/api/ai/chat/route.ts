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
    const { message, history, documentTitle, documentContent } = body as {
      message?: string;
      history?: ChatMessage[];
      documentTitle?: string;
      documentContent?: string;
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

    // Include a trimmed view of the document currently open in the editor so the
    // assistant can read, reference and refine the user's work.
    const docPreview =
      typeof documentContent === 'string' && documentContent.trim()
        ? documentContent.slice(0, 6000)
        : '';

    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are the AI Doc Studio assistant, a helpful procurement and tender expert working INSIDE a document editor.
Help the user draft, brainstorm, summarise, refine, or answer questions about tenders, bids, proposals, requirements and procurement documents.
Keep answers concise and practical. Use short paragraphs and bullet lists where helpful.

The user is editing a document in the editor on the right side of the screen.
${documentTitle ? `The document title is: "${documentTitle}".` : 'No document title is set yet.'}
${docPreview ? `The current content of the document is:\n"""\n${docPreview}\n"""` : 'The document is currently empty.'}

Because you can see the document, you can directly reference, critique and improve what is already there.
When the user asks you to write, draft, rewrite, expand or generate content that should go INTO the document, wrap exactly the content to insert inside a fenced block using the language tag "doc", like this:

\`\`\`doc
<the document content to insert>
\`\`\`

Rules for the doc block:
- Put only the content that should appear in the document between the fences (no commentary inside).
- Use plain text with blank lines between paragraphs and "# " for headings, "- " for bullets.
- You may include multiple separate doc blocks in one reply (for example one per section).
- Always add a short spoken explanation BEFORE or AFTER each doc block describing what it is.

Everything outside a \`\`\`doc block is shown as normal chat text and will NOT be inserted.`,
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
