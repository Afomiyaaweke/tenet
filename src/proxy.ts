import { NextRequest, NextResponse } from 'next/server';

// ── In-memory rate limiter ──────────────────────────────────────────────────
// NOTE: This in-memory rate limiter works for long-running Node.js processes
// (local dev, Docker/self-hosted) but will NOT persist across Vercel serverless
// function invocations. Each invocation gets a fresh Map instance, so rate
// limiting will effectively reset on every cold start.
//
// For production rate limiting on Vercel, use one of these approaches:
//   1. Upstash Redis (@upstash/ratelimit) — works at the Edge, persists across invocations
//   2. Vercel Edge Config — native Vercel solution for distributed rate limiting
//   3. Vercel KV — Redis-compatible storage that persists across function invocations
//
// This code is kept as-is for local development and self-hosted deployments.
// On Vercel, consider replacing checkRateLimit() with an Upstash/Edge Config call.

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// PRODUCTION NOTE (2000 concurrent users):
// This in-memory Map is suitable for dev and single-instance deployments.
// For production with 2000+ users on serverless/edge (e.g. Vercel), replace
// this store with Upstash Redis rate limiting (@upstash/ratelimit) so that
// rate limits persist across serverless invocations and are enforced
// consistently across all instances. Without a persistent store, each cold
// start resets the Map and rate limiting is effectively bypassed.
const rateLimitStore = new Map<string, RateLimitEntry>();

// Stats tracking for the rate limit dashboard
interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  byEndpoint: Record<string, { total: number; blocked: number; lastBlockedAt?: number }>;
}
const rateLimitStats: RateLimitStats = { totalRequests: 0, blockedRequests: 0, byEndpoint: {} };

// Expose stats globally for the API route to read
declare global {
  var __rateLimitStats: RateLimitStats | undefined;
}
globalThis.__rateLimitStats = rateLimitStats;

// NOTE: setInterval-based cleanup removed — it doesn't work reliably on
// Vercel serverless (function may not be alive long enough for the interval
// to fire). Instead, expired entries are cleaned up inline during rate limit
// checks (see purgeExpiredEntries below).

function purgeExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) rateLimitStore.delete(key);
  }
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  strategy: string = 'sliding_window',
): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
  // Inline cleanup: purge expired entries on every check
  // This keeps the Map from growing unbounded in long-running processes
  // On Vercel serverless, the Map resets on every cold start anyway
  purgeExpiredEntries();

  const now = Date.now();

  // Token bucket strategy
  if (strategy === 'token_bucket') {
    const entry = rateLimitStore.get(key);
    const refillRate = Math.ceil(limit / (windowMs / 1000)); // tokens per second
    if (!entry) {
      const resetTime = now + 1000; // refill check every second
      rateLimitStore.set(key, { count: limit - 1, resetTime });
      return { allowed: true, remaining: limit - 1, resetTime };
    }
    // Refill tokens based on elapsed time
    const elapsed = (now - (entry.resetTime - 1000)) / 1000;
    const newTokens = Math.min(limit, entry.count + Math.floor(elapsed * refillRate));
    if (newTokens <= 0) {
      const retryAfter = Math.ceil(1 / refillRate);
      return { allowed: false, remaining: 0, resetTime: entry.resetTime, retryAfter };
    }
    rateLimitStore.set(key, { count: newTokens - 1, resetTime: now + 1000 });
    return { allowed: true, remaining: newTokens - 1, resetTime: now + 1000 };
  }

  // Fixed window strategy
  if (strategy === 'fixed_window') {
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetTime = windowStart + windowMs;
    const fixedKey = `${key}:${windowStart}`;
    const entry = rateLimitStore.get(fixedKey);

    if (!entry) {
      rateLimitStore.set(fixedKey, { count: 1, resetTime });
      return { allowed: true, remaining: limit - 1, resetTime };
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetTime, retryAfter: Math.ceil((resetTime - now) / 1000) };
    }

    entry.count++;
    return { allowed: true, remaining: limit - entry.count, resetTime };
  }

  // Default: Sliding window strategy
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime, retryAfter: Math.ceil((entry.resetTime - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime };
}

// ── Rate limit configuration ───────────────────────────────────────────────
interface RateLimitConfig {
  limit: number;
  windowMs: number;
  strategy: string; // sliding_window, fixed_window, token_bucket
}

// Rate limits are tuned for ~2000 concurrent users on tenet.space-z.ai.
// These limits balance legitimate high-frequency usage (messaging, AI queries)
// against abuse prevention. Adjust based on actual usage patterns observed
// in production — monitor the /api/rate-limit-stats endpoint for real data.
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth routes — strict (security-sensitive, keep low regardless of user count)
  '/api/auth/login': { limit: 5, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/auth/register': { limit: 3, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/auth/forgot-password': { limit: 3, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/auth/reset-password': { limit: 3, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/auth/validate-reset-token': { limit: 10, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/auth/cleanup-tokens': { limit: 2, windowMs: 60 * 1000, strategy: 'fixed_window' },
  // AI routes — increased from 10/min to 30/min (2000 users means more legitimate AI usage)
  '/api/ai/': { limit: 30, windowMs: 60 * 1000, strategy: 'token_bucket' },
  '/api/agent': { limit: 15, windowMs: 60 * 1000, strategy: 'token_bucket' },
  // Document operations — increased from 5-8/min to 15/min
  '/api/documents/generate': { limit: 15, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/documents/ai-extract': { limit: 15, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/document-ocr/': { limit: 15, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/bid-analysis': { limit: 15, windowMs: 60 * 1000, strategy: 'sliding_window' },
  // Bid & tender submissions
  '/api/bids': { limit: 20, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/tenders': { limit: 30, windowMs: 60 * 1000, strategy: 'sliding_window' },
  // Communication — increased from 30/min to 60/min (messaging is high-frequency)
  '/api/chats/': { limit: 60, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/conversations': { limit: 60, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/social/': { limit: 20, windowMs: 60 * 1000, strategy: 'fixed_window' },
  // Public routes
  '/api/contact': { limit: 3, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/comments': { limit: 10, windowMs: 60 * 1000, strategy: 'sliding_window' },
  // General API — catch-all default increased from 60/min to 120/min
  '/api/': { limit: 120, windowMs: 60 * 1000, strategy: 'sliding_window' },
};

// Expose config globally for the API route to read
declare global {
  var __rateLimitConfig: Record<string, RateLimitConfig> | undefined;
}
globalThis.__rateLimitConfig = RATE_LIMITS;

// ── CORS configuration ─────────────────────────────────────────────────────
// CORS origins are now configurable via environment variables instead of
// hardcoded values. This makes deployment to different environments easy.
//
// NEXT_PUBLIC_APP_URL — primary app origin (e.g. https://tenet.space-z.ai)
// CORS_EXTRA_ORIGINS — comma-separated additional origins (e.g. https://staging.tenet.space-z.ai)
//
// Falls back to localhost for development if no env vars are set.

function getAllowedOrigins(requestUrl: string): string[] {
  const origins: string[] = [];

  // 1. Primary production origin — the canonical domain for tenet.space-z.ai
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    origins.push(appUrl);
  } else {
    // Fallback for local development when NEXT_PUBLIC_APP_URL is not set
    origins.push('http://localhost:3000');
  }

  // 2. Request origin — always allow the origin of the incoming request
  //    (handles cases where the app is accessed via an alias or proxy)
  try {
    const requestOrigin = new URL(requestUrl).origin;
    if (!origins.includes(requestOrigin)) {
      origins.push(requestOrigin);
    }
  } catch {
    // Invalid URL — skip
  }

  // 3. Local development origins
  origins.push('http://localhost:3000');
  origins.push('http://127.0.0.1:3000');

  // 4. Sandbox preview origins — used by the space-z.ai platform for
  //    preview deployments (e.g. preview-chat-abc123.space-z.ai)
  origins.push('https://preview-chat-*.space-z.ai');

  // 5. Extra origins from environment variable (comma-separated)
  if (process.env.CORS_EXTRA_ORIGINS) {
    for (const origin of process.env.CORS_EXTRA_ORIGINS.split(',')) {
      const trimmed = origin.trim();
      if (trimmed && !origins.includes(trimmed)) {
        origins.push(trimmed);
      }
    }
  }

  return origins;
}

/**
 * Checks whether a given request origin matches any entry in the allowed
 * origins list, supporting wildcard subdomains (e.g. preview-chat-*.space-z.ai).
 */
function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  for (const allowed of allowedOrigins) {
    if (allowed === origin) return true;
    // Support wildcard patterns like https://preview-chat-*.space-z.ai
    if (allowed.includes('*')) {
      const pattern = allowed
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex special chars except *
        .replace(/\*/g, '.*');                    // replace * with .*
      try {
        if (new RegExp(`^${pattern}$`).test(origin)) return true;
      } catch {
        continue;
      }
    }
  }
  return false;
}

// ── Security headers ───────────────────────────────────────────────────────
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.clarity.ms",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https: https://www.clarity.ms https://*.blob.vercel-storage.com",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss: https: https://www.clarity.ms https://*.clarity.ms https://*.blob.vercel-storage.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  );

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

// ── Find matching rate limit config (most specific match first) ────────────
function findRateLimitConfig(pathname: string): { config: RateLimitConfig; matchedPath: string } | null {
  // Sort by specificity — longer paths match first
  const sortedPaths = Object.keys(RATE_LIMITS).sort((a, b) => b.length - a.length);

  for (const path of sortedPaths) {
    if (pathname.startsWith(path) || pathname === path) {
      return { config: RATE_LIMITS[path], matchedPath: path };
    }
  }
  return null;
}

// ── Proxy (Next.js 16 convention) ────────────────────────────────────────────
// In Next.js 16, "middleware" is deprecated. Use "proxy" instead.
// See: https://nextjs.org/docs/messages/middleware-to-proxy

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Handle CORS preflight ──
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    const response = new NextResponse(null, { status: 204 });
    const origin = request.headers.get('origin');
    if (origin) {
      const allowedOrigins = getAllowedOrigins(request.url);
      if (isOriginAllowed(origin, allowedOrigins)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
    return addSecurityHeaders(response);
  }

  // ── Rate limiting for API routes ──
  if (pathname.startsWith('/api/')) {
    const match = findRateLimitConfig(pathname);

    if (match) {
      const { config, matchedPath } = match;
      const ip = getClientIp(request);
      const rateLimitKey = `${ip}:${matchedPath}`;
      const result = checkRateLimit(rateLimitKey, config.limit, config.windowMs, config.strategy);

      // Track stats
      rateLimitStats.totalRequests++;
      if (!rateLimitStats.byEndpoint[matchedPath]) {
        rateLimitStats.byEndpoint[matchedPath] = { total: 0, blocked: 0 };
      }
      rateLimitStats.byEndpoint[matchedPath].total++;

      if (!result.allowed) {
        rateLimitStats.blockedRequests++;
        rateLimitStats.byEndpoint[matchedPath].blocked++;
        rateLimitStats.byEndpoint[matchedPath].lastBlockedAt = Date.now();

        const response = NextResponse.json(
          {
            success: false,
            error: 'Too many requests. Please try again later.',
            retryAfter: result.retryAfter || Math.ceil((result.resetTime - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(result.retryAfter || Math.ceil((result.resetTime - Date.now()) / 1000)),
              'X-RateLimit-Limit': String(config.limit),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
              'X-RateLimit-Policy': `${config.limit};w=${config.windowMs / 1000};strategy=${config.strategy}`,
            },
          },
        );
        return addSecurityHeaders(response);
      }

      // Pass through with rate limit headers
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', String(config.limit));
      response.headers.set('X-RateLimit-Remaining', String(result.remaining));
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));
      response.headers.set('X-RateLimit-Policy', `${config.limit};w=${config.windowMs / 1000};strategy=${config.strategy}`);

      // CORS
      const origin = request.headers.get('origin');
      if (origin) {
        const allowedOrigins = getAllowedOrigins(request.url);
        if (isOriginAllowed(origin, allowedOrigins)) {
          response.headers.set('Access-Control-Allow-Origin', origin);
          response.headers.set('Access-Control-Allow-Credentials', 'true');
        }
      }
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Max-Age', '86400');

      return addSecurityHeaders(response);
    }

    // ── CORS headers for API routes (no rate limit matched) ──
    const response = NextResponse.next();
    const origin = request.headers.get('origin');
    if (origin) {
      const allowedOrigins = getAllowedOrigins(request.url);
      if (isOriginAllowed(origin, allowedOrigins)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');

    return addSecurityHeaders(response);
  }

  // ── Security headers for non-API routes ──
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
