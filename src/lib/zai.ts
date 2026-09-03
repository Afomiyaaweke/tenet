/**
 * Shared ZAI SDK wrapper with lazy loading and singleton pattern.
 * Uses dynamic import to avoid bundling the SDK into every serverless function
 * on Vercel cold starts. The singleton is per-function-instance.
 */

import type ZAIType from 'z-ai-web-dev-sdk';

type ZAIInstance = Awaited<ReturnType<typeof ZAIType.create>>;

let zaiInstance: ZAIInstance | null = null;
let zaiPromise: Promise<ZAIInstance> | null = null;

/**
 * Get or create the ZAI SDK instance (lazy-loaded, singleton).
 * Safe to call multiple times — returns the same promise.
 */
export async function getZAI(): Promise<ZAIInstance> {
  if (zaiInstance) return zaiInstance;

  if (!zaiPromise) {
    zaiPromise = (async () => {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      return ZAI.create();
    })();
  }

  zaiInstance = await zaiPromise;
  return zaiInstance;
}

/**
 * Reset the ZAI instance (use after errors to force re-creation).
 */
export function resetZAI() {
  zaiInstance = null;
  zaiPromise = null;
}

/**
 * Get ZAI with retry logic. Resets instance on first failure.
 */
export async function getZAIWithRetry(retries = 1): Promise<ZAIInstance> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await getZAI();
    } catch (err: any) {
      resetZAI();
      if (attempt === retries) {
        const msg = err?.message || String(err);
        throw new Error(
          msg.includes('JWT_SECRET')
            ? 'AI service configuration error (JWT_SECRET missing). Please set JWT_SECRET in your environment.'
            : `AI service unavailable after ${retries + 1} attempts: ${msg}`
        );
      }
    }
  }
  throw new Error('AI service unavailable');
}

/**
 * Message content: plain string for text-only chats, or an array of
 * text/image parts for vision requests (matches the OpenAI-style shape
 * used by the SDK's createVision endpoint).
 */
export type ZAIMessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;

export interface ZAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: ZAIMessageContent;
}

/**
 * Call the ZAI chat completions API with a hard deadline.
 *
 * Vercel Hobby tier kills serverless functions at 10s. ZAI calls for document
 * generation routinely take 20-30s, so they always time out in production.
 *
 * This helper races the AI call against a deadline (default 8s, leaving ~2s
 * headroom for auth + DB + response serialization). If the deadline wins,
 * the caller can fall back to a structured template instead of letting Vercel
 * return a 504 / HTML error page.
 *
 * If any message's content is an array (text/image parts), the call is routed
 * through the vision endpoint (createVision) so attached images are analyzed.
 *
 * @returns The completion if the AI won the race, or `null` if the deadline
 *          won or the call threw. Callers MUST handle the null case.
 */
export async function callZAIWithDeadline(
  messages: ZAIMessage[],
  deadlineMs = 8000
): Promise<string | null> {
  try {
    const zai = await getZAI();
    const isVision = messages.some((m) => Array.isArray(m.content));
    const aiPromise = isVision
      ? zai.chat.completions.createVision({
          model: 'glm-4.6v',
          messages: messages as never,
          thinking: { type: 'disabled' },
        })
      : zai.chat.completions.create({
          messages: messages as never,
          thinking: { type: 'disabled' },
        });
    const deadlinePromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), deadlineMs);
    });
    const completion = await Promise.race([aiPromise, deadlinePromise]);
    if (!completion) return null;
    return completion.choices[0]?.message?.content || '';
  } catch {
    // Network/config/rate-limit error — caller falls back
    return null;
  }
}

/**
 * Vision variant that STREAMS the reply and captures partial output.
 *
 * Vision calls are slower than text ones, and inside Next.js dev they can
 * take 8-10s even for small images. With streaming, the first tokens arrive
 * early; if the deadline fires before the stream finishes, whatever the model
 * has produced so far is returned instead of nothing. Only returns `null`
 * when the model has not produced ANY content by the deadline (or on error).
 */
export async function callZAIVisionWithDeadline(
  messages: ZAIMessage[],
  deadlineMs = 9000
): Promise<string | null> {
  let accumulated = '';
  try {
    const zai = await getZAI();
    const aiPromise = (async () => {
      const stream = await zai.chat.completions.createVision({
        model: 'glm-4.6v',
        messages: messages as never,
        thinking: { type: 'disabled' },
        stream: true,
      });
      const reader = (stream as unknown as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            accumulated += json.choices?.[0]?.delta?.content || '';
          } catch {
            // Skip malformed chunk
          }
        }
      }
      return accumulated;
    })();

    const deadlinePromise = new Promise<string | null>((resolve) => {
      setTimeout(() => resolve(accumulated || null), deadlineMs);
    });

    return await Promise.race([aiPromise, deadlinePromise]);
  } catch {
    return accumulated || null;
  }
}
