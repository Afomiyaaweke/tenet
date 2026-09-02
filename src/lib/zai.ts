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
 * @returns The completion if the AI won the race, or `null` if the deadline
 *          won or the call threw. Callers MUST handle the null case.
 */
export async function callZAIWithDeadline(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  deadlineMs = 8000
): Promise<string | null> {
  try {
    const zai = await getZAI();
    const aiPromise = zai.chat.completions.create({
      messages,
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
