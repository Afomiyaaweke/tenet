# Task 3 — Vercel Deployment Compatibility

## Agent: main

## Summary
Updated next.config.ts, middleware.ts, and created vercel.json for Vercel deployment compatibility.

## Changes Made

### 1. next.config.ts
- **Removed** `output: "standalone"` — Vercel handles builds natively; standalone is for Docker/self-hosted only
- **Added** `experimental: { maxDuration: 60 }` — AI/OCR routes need >10s timeout
- **Made** `allowedDevOrigins` dynamic — derived from `NEXT_PUBLIC_APP_URL` env var
- **Kept** `serverExternalPackages: ["xlsx"]`, `reactStrictMode: true`, all security headers

### 2. middleware.ts
- **Added** comprehensive comments documenting in-memory rate limiter limitations on Vercel serverless
- **Removed** `setInterval` cleanup — replaced with inline `purgeExpiredEntries()` called during each rate limit check
- **Made** CORS origins configurable via `NEXT_PUBLIC_APP_URL` and `CORS_EXTRA_ORIGINS` env vars
- **Recommended** Upstash Redis, Vercel Edge Config, or Vercel KV for production rate limiting
- **Kept** all rate limit configs, security headers, and strategy implementations unchanged

### 3. vercel.json (new file)
- `framework: "nextjs"` for auto-detection
- Route-specific `maxDuration`: 60s (AI/agent), 30s (documents/tenders), 15s (auth/bids)
- `regions: ["iad1"]` for deployment
- Build-time env var `NEXT_PUBLIC_APP_URL`
- Edge-level security headers

## Verification
- Lint passes with 0 errors (5 pre-existing warnings unrelated to our changes)
- Dev server running correctly
