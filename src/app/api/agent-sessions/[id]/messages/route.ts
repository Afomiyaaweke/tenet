import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { runAgentLoop, type AgentContext, type AgentTender, type AgentEvent } from '@/lib/agent-loop';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// POST /api/agent-sessions/[id]/messages — Streaming agent chat
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

    const body = await request.json();
    const { message, history = [], tender } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { success: false, error: 'Message too long. Please keep it under 5000 characters.' },
        { status: 400 }
      );
    }

    // Save user message to DB
    await db.agentMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: message,
      },
    });

    // Build AgentContext from session's documents, analyses, artifacts
    const [documents, analyses, artifacts] = await Promise.all([
      db.agentDocument.findMany({
        where: { sessionId, status: 'indexed' },
        select: {
          id: true,
          filename: true,
          pageCount: true,
          pageTexts: true,
        },
      }),
      db.agentAnalysis.findMany({
        where: { sessionId },
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
        },
      }),
      db.agentArtifact.findMany({
        where: { sessionId },
        select: {
          id: true,
          type: true,
          title: true,
          filename: true,
        },
      }),
    ]);

    // Optional structured tender form passed from the UI (e.g. when the user
    // starts an analysis from the tender detail / live tender page). This gives
    // the agent the authoritative tender data without relying solely on the
    // free-text user message.
    const tenderContext: AgentTender | undefined =
      tender && typeof tender === 'object'
        ? {
            id: typeof tender.id === 'string' ? tender.id : undefined,
            title: typeof tender.title === 'string' ? tender.title : undefined,
            scope: typeof tender.scope === 'string' ? tender.scope : undefined,
            location: typeof tender.location === 'string' ? tender.location : undefined,
            deadline: typeof tender.deadline === 'string' ? tender.deadline : undefined,
            budgetMin: typeof tender.budgetMin === 'number' ? tender.budgetMin : undefined,
            budgetMax: typeof tender.budgetMax === 'number' ? tender.budgetMax : undefined,
            currency: typeof tender.currency === 'string' ? tender.currency : undefined,
            categoryTags: typeof tender.categoryTags === 'string' ? tender.categoryTags : undefined,
            requiredDocs: typeof tender.requiredDocs === 'string' ? tender.requiredDocs : undefined,
          }
        : undefined;

    const agentContext: AgentContext = {
      documents: documents.map((d) => ({
        id: d.id,
        filename: d.filename,
        pageCount: d.pageCount,
        pageTexts: d.pageTexts,
      })),
      analyses: analyses.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        content: JSON.parse(a.content),
      })),
      artifacts: artifacts.map((art) => ({
        id: art.id,
        type: art.type,
        title: art.title,
        filename: art.filename,
      })),
      tender: tenderContext,
    };

    // Build conversation history
    const conversationHistory: Array<{ role: string; content: string }> = Array.isArray(history)
      ? history
          .filter((m: any) => m.role && m.content)
          .slice(-20) // limit history to last 20 messages
          .map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          }))
      : [];

    // Run agent loop (async generator)
    const agentGenerator = runAgentLoop(message, agentContext, conversationHistory);

    // Collect events for saving to assistant message later
    const collectedEvents: AgentEvent[] = [];

    // Create NDJSON stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          for await (const event of agentGenerator) {
            // Collect event for later DB save
            collectedEvents.push(event);

            // Enqueue as NDJSON line
            controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
          }
        } catch (streamErr: any) {
          // Emit error event and close
          const errorEvent: AgentEvent = {
            type: 'error',
            data: { message: streamErr?.message || 'Agent stream error' },
          };
          controller.enqueue(encoder.encode(JSON.stringify(errorEvent) + '\n'));
        }

        controller.close();
      },
    });

    // After streaming completes, save assistant message with events JSON
    // We need to wait for the stream to be fully consumed by the client
    // The collectedEvents array is populated as the stream is read
    const saveAssistantMessage = async () => {
      try {
        // Wait for the stream to be fully consumed (events are collected in the stream callback)
        // We poll until we see a 'done' event or timeout after 60 seconds
        const maxWait = 60000;
        const pollInterval = 200;
        let waited = 0;
        while (waited < maxWait) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          waited += pollInterval;
          if (collectedEvents.some((e) => e.type === 'done' || e.type === 'error')) {
            break;
          }
        }

        // Extract the final answer text from collected events
        let answerText = '';
        let thinking = '';
        let intent: string | null = null;
        let confidence: number | null = null;
        const citations: Array<{ docId: string; filename: string; page: number }> = [];

        for (const event of collectedEvents) {
          switch (event.type) {
            case 'answer_delta':
              answerText += event.data?.text || '';
              break;
            case 'thinking_delta':
              thinking += event.data?.text || '';
              break;
            case 'intent':
              intent = event.data?.intent || null;
              break;
            case 'confidence':
              confidence = event.data?.score ?? null;
              break;
            case 'citations':
              if (Array.isArray(event.data?.citations)) {
                citations.push(...event.data.citations);
              }
              break;
          }
        }

        // If no answer was assembled, try to get it from tool results
        if (!answerText.trim()) {
          for (const event of collectedEvents) {
            if (event.type === 'tool_call_result' && event.data?.result) {
              answerText = typeof event.data.result === 'string'
                ? event.data.result
                : JSON.stringify(event.data.result);
              break;
            }
          }
        }

        await db.agentMessage.create({
          data: {
            sessionId,
            role: 'assistant',
            content: answerText || 'No response generated.',
            thinking: thinking || undefined,
            events: JSON.stringify(collectedEvents),
            citations: citations.length > 0 ? JSON.stringify(citations) : undefined,
            intent: intent || undefined,
            confidence: confidence ?? undefined,
          },
        });
      } catch (saveErr) {
        console.error('Failed to save assistant message:', saveErr);
      }
    };

    // Fire-and-forget save (runs after response starts streaming)
    saveAssistantMessage();

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Agent messages error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to process message' },
      { status: 500 }
    );
  }
}
