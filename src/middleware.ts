import { NextRequest, NextResponse } from 'next/server';

// ── In-memory rate limiter ──────────────────────────────────────────────────
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

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

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

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

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth routes — strict
  '/api/auth/login': { limit: 5, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/auth/register': { limit: 3, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/auth/forgot-password': { limit: 3, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/auth/reset-password': { limit: 3, windowMs: 60 * 1000, strategy: 'sliding_window' },
  // AI routes — moderate (expensive operations)
  '/api/ai/': { limit: 10, windowMs: 60 * 1000, strategy: 'token_bucket' },
  '/api/agent': { limit: 15, windowMs: 60 * 1000, strategy: 'token_bucket' },
  // Document operations
  '/api/documents/generate': { limit: 5, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/documents/ai-extract': { limit: 8, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/document-ocr/': { limit: 5, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/bid-analysis': { limit: 5, windowMs: 60 * 1000, strategy: 'sliding_window' },
  // Bid & tender submissions
  '/api/bids': { limit: 20, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/tenders': { limit: 30, windowMs: 60 * 1000, strategy: 'sliding_window' },
  // Communication
  '/api/chats/': { limit: 30, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/conversations': { limit: 30, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/social/': { limit: 20, windowMs: 60 * 1000, strategy: 'fixed_window' },
  // Public routes
  '/api/contact': { limit: 3, windowMs: 60 * 1000, strategy: 'sliding_window' },
  '/api/comments': { limit: 10, windowMs: 60 * 1000, strategy: 'sliding_window' },
  // General API — catch-all default
  '/api/': { limit: 60, windowMs: 60 * 1000, strategy: 'sliding_window' },
};

// Expose config globally for the API route to read
declare global {
  var __rateLimitConfig: Record<string, RateLimitConfig> | undefined;
}
globalThis.__rateLimitConfig = RATE_LIMITS;

// ── Security headers ───────────────────────────────────────────────────────
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.clarity.ms",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https: https://www.clarity.ms",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss: https://www.clarity.ms https://*.clarity.ms",
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

// ── Middleware ──────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Handle CORS preflight ──
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    const response = new NextResponse(null, { status: 204 });
    const origin = request.headers.get('origin');
    if (origin) {
      const allowedOrigins = [new URL(request.url).origin, 'https://tenet.space-z.ai', 'http://localhost:3000'];
      if (allowedOrigins.includes(origin)) {
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
        const allowedOrigins = [new URL(request.url).origin, 'https://tenet.space-z.ai', 'http://localhost:3000'];
        if (allowedOrigins.includes(origin)) {
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
      const allowedOrigins = [new URL(request.url).origin, 'https://tenet.space-z.ai', 'http://localhost:3000'];
      if (allowedOrigins.includes(origin)) {
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
