import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { callZAIWithDeadline, callZAIVisionWithDeadline } from '@/lib/zai';

// Vercel Hobby tier: 10s max. ZAI calls can take 20-30s for long replies,
// so we race against an 8s deadline and fall back to a helpful canned reply.
export const maxDuration = 10;
export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBody {
  message?: string;
  history?: ChatMessage[];
  documentTitle?: string;
  documentContent?: string;
  tenderId?: string;
  tool?: string;
  /** Base64 data URL of an attached image (user media upload). */
  image?: string;
}

// Max accepted data-URL length (~3MB image). Keeps the request well under
// Vercel's 4.5MB body limit after base64 expansion.
const MAX_IMAGE_DATA_URL_LENGTH = 4_000_000;

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json() as ChatBody;
    const {
      message, history, documentTitle, documentContent,
      tenderId, tool, image,
    } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 },
      );
    }

    // Validate the attached image (if any): must be a base64 image data URL.
    const imageDataUrl =
      typeof image === 'string' &&
      image.startsWith('data:image/') &&
      image.length <= MAX_IMAGE_DATA_URL_LENGTH
        ? image
        : '';

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

    const truncatedMessage =
      message.length > 4000 ? message.slice(0, 4000) + '...' : message;

    // ── Load the user's profile + company so the assistant can personalise ──
    let profileCtx = '';
    let fullUser: typeof user | null = user;
    try {
      fullUser = await db.user.findUnique({
        where: { id: user!.id },
        include: { profile: true, company: true },
      }) || user;
      const bits: string[] = [];
      if (fullUser?.profile?.fullName) bits.push(`Name: ${fullUser.profile.fullName}`);
      if (fullUser?.profile?.skillTags) bits.push(`Skills: ${fullUser.profile.skillTags}`);
      if (fullUser?.company?.name) bits.push(`Company: ${fullUser.company.name}`);
      if (fullUser?.company?.industry) bits.push(`Industry: ${fullUser.company.industry}`);
      if (fullUser?.company?.city) bits.push(`Location: ${fullUser.company.city}`);
      profileCtx = bits.length ? bits.join('\n') : 'No profile data on file.';
    } catch {
      // Optional enrichment — fall through with empty profileCtx
    }

    // ── Load the tender the user is currently working on (if any) ──
    let tenderCtx = '';
    if (tenderId) {
      try {
        const tender = await db.tender.findUnique({ where: { id: tenderId } });
        if (tender) {
          tenderCtx = [
            `Tender: ${tender.title}`,
            tender.scope ? `Scope: ${tender.scope.slice(0, 800)}` : '',
            `Budget: ${Number(tender.budgetMin).toLocaleString()} - ${Number(tender.budgetMax).toLocaleString()} ETB`,
            tender.categoryTags ? `Category: ${tender.categoryTags}` : '',
            tender.requiredDocs ? `Required Docs: ${tender.requiredDocs}` : '',
            `Deadline: ${new Date(tender.deadline).toLocaleDateString()}`,
            tender.location ? `Location: ${tender.location}` : '',
          ].filter(Boolean).join('\n');
        }
      } catch {
        // Tender lookup optional
      }
    }

    // Include a trimmed view of the document currently open in the editor so
    // the assistant can read, reference and refine the user's work. When an
    // image is attached we trim harder — the vision model needs headroom.
    const docPreviewLimit = imageDataUrl ? 3000 : 6000;
    const docPreview =
      typeof documentContent === 'string' && documentContent.trim()
        ? documentContent.slice(0, docPreviewLimit)
        : '';

    const toolLabelMap: Record<string, string> = {
      'tender-builder': 'Tender Specification Builder',
      'bid-builder': 'Bid Proposal Builder',
      'requirement-analyzer': 'Requirement Analyzer',
      'applicant-analyzer': 'Applicant Analyzer',
    };
    const toolLabel = tool && toolLabelMap[tool] ? toolLabelMap[tool] : '';

    const systemPrompt = `You are the AI Doc Studio assistant, a helpful procurement and tender expert working INSIDE a document editor.
Help the user draft, brainstorm, summarise, refine, or answer questions about tenders, bids, proposals, requirements and procurement documents.
Keep answers concise and practical. Use short paragraphs and bullet lists where helpful.

USER PROFILE (use this to personalise your answers):
${profileCtx}

${tenderCtx ? `ACTIVE TENDER (the user is working on this):\n${tenderCtx}` : 'No specific tender selected.'}

${toolLabel ? `ACTIVE TOOL: ${toolLabel} — the user has this template generator open in the sidebar. You may reference it.` : ''}

The user is editing a document in the editor on the right side of the screen.
${documentTitle ? `The document title is: "${documentTitle}".` : 'No document title is set yet.'}
${docPreview ? `The current content of the document is:\n"""\n${docPreview}\n"""` : 'The document is currently empty.'}

Because you can see the document, you can directly reference, critique and improve what is already there. Use the user's profile, company and the active tender to make answers specific and actionable — never generic.
When the user asks you to write, draft, rewrite, expand or generate content that should go INTO the document, wrap exactly the content to insert inside a fenced block using the language tag "doc", like this:

\`\`\`doc
<the document content to insert>
\`\`\`

Rules for the doc block:
- Put only the content that should appear in the document between the fences (no commentary inside).
- Use plain text with blank lines between paragraphs and "# " for headings, "- " for bullets.
- You may include multiple separate doc blocks in one reply (for example one per section).
- Always add a short spoken explanation BEFORE or AFTER each doc block describing what it is.

Everything outside a \`\`\`doc block is shown as normal chat text and will NOT be inserted.

MEDIA: The user can attach images (photos of tender documents, certificates, licences, screenshots, site photos, etc.).
${imageDataUrl ? 'An image IS attached to the latest message — read it carefully and use what you see in your answer. If it contains a document (licence, certificate, form, tender page), summarise its key fields and flag anything missing or non-compliant.' : 'No image is attached to the latest message.'}`;

    // Latest user message: plain text, or text + image parts for vision.
    const latestUserMessage = imageDataUrl
      ? [
          { type: 'text' as const, text: truncatedMessage },
          { type: 'image_url' as const, image_url: { url: imageDataUrl } },
        ]
      : truncatedMessage;

    const chatMessagesPayload = [
      { role: 'system' as const, content: systemPrompt },
      ...safeHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: latestUserMessage },
    ];

    // Vision calls stream with partial capture (image analysis is slower);
    // text-only calls use the standard deadline race.
    const response = imageDataUrl
      ? await callZAIVisionWithDeadline(chatMessagesPayload, 9000)
      : await callZAIWithDeadline(chatMessagesPayload, 8000);

    if (!response) {
      // AI was too slow for Vercel's 10s cap — give the user a useful,
      // context-aware reply instead of a 504. Offer to insert a doc block
      // derived from the active tender so the chat still feels productive.
      const docBlock = tenderCtx
        ? `\n\n\`\`\`doc\n# ${documentTitle || 'Draft Section'}\n\nBased on the active tender, here is a starting point you can edit:\n\n- Key requirement: see tender scope above\n- Recommended action: tailor this section to your company's experience\n- Budget reference: see tender budget\n\`\`\`\n\nClick **Insert** on the block above to add it to your document, or ask me to refine it.`
        : '';
      const imageNote = imageDataUrl
        ? '\n\nI received your image, but the AI took a bit longer than expected to analyze it. Please send it again — or describe what it shows and I\'ll help from there.'
        : '';
      const fallback = `I'm here and reading your document${tenderCtx ? ' and the active tender' : ''}.${imageNote}\n\n${docPreview ? `- Your document "${documentTitle || 'Untitled'}" has ${docPreview.split(/\s+/).length} words of content.` : '- Your document is empty — try the Template Generator on the left, or ask me to draft a section.'}${tenderCtx ? `\n- You're working on a tender with a deadline of ${tenderCtx.match(/Deadline: (.+)/)?.[1] || 'TBD'}.` : ''}${profileCtx !== 'No profile data on file.' ? `\n- I can see your profile and company — ask me to tailor any section to your experience.` : ''}${docBlock}`;
      return NextResponse.json({
        success: true,
        data: { reply: fallback, fallback: true },
      });
    }

    return NextResponse.json({
      success: true,
      data: { reply: response.trim() },
    });
  } catch (err) {
    console.error('[POST /api/ai/chat] error:', err);
    return NextResponse.json(
      { success: false, error: 'Chat failed' },
      { status: 500 },
    );
  }
}
