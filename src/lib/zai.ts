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
