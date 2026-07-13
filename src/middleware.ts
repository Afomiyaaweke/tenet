import { NextRequest, NextResponse } from 'next/server';

// ── In-memory rate limiter ──────────────────────────────────────────────────
// Simple sliding-window rate limiter keyed by IP.
// For production, replace with Redis-backed store.

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

function getClientIp(request: NextRequest): string {
  // Try common headers first (behind proxy/load balancer)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return 'unknown';
}

function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // New window
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime };
}

// ── Rate limit configuration ───────────────────────────────────────────────
const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  '/api/auth/login': { limit: 5, windowMs: 60 * 1000 },          // 5 req/min
  '/api/auth/register': { limit: 3, windowMs: 60 * 1000 },       // 3 req/min
  '/api/auth/forgot-password': { limit: 3, windowMs: 60 * 1000 }, // 3 req/min
  '/api/auth/reset-password': { limit: 3, windowMs: 60 * 1000 },  // 3 req/min
  '/api/contact': { limit: 3, windowMs: 60 * 1000 },             // 3 req/min
  '/api/comments': { limit: 10, windowMs: 60 * 1000 },           // 10 req/min
  '/api/agent': { limit: 10, windowMs: 60 * 1000 },              // 10 req/min
  '/api/ai/': { limit: 5, windowMs: 60 * 1000 },                 // 5 req/min for AI routes
};

// ── Middleware ──────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Rate limiting ──
  for (const [path, config] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(path) || pathname === path) {
      const ip = getClientIp(request);
      const rateLimitKey = `${ip}:${pathname}`;
      const result = checkRateLimit(rateLimitKey, config.limit, config.windowMs);

      if (!result.allowed) {
        return NextResponse.json(
          { success: false, error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
              'X-RateLimit-Limit': String(config.limit),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
            },
          }
        );
      }
      break; // Only apply the first matching rate limit
    }
  }

  // ── CORS headers for API routes ──
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();

    // Restrict CORS to same-origin in production
    const origin = request.headers.get('origin');
    if (origin) {
      const allowedOrigins = [
        new URL(request.url).origin,
        'http://localhost:3000',
      ];
      if (allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
