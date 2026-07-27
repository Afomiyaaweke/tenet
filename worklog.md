# TenetBid Project Worklog

---
Task ID: 1
Agent: Main
Task: Make TenetBid production-ready for 2000 users on tenet.space-z.ai

Work Log:
- Analyzed all production blockers for 2000-user deployment
- Updated db.ts: connection_limit=20, pool_timeout=30, connect_timeout=10 for production PostgreSQL
- Updated auth.ts: MAX_AUTH_CACHE_SIZE=2000, 3-min TTL, aggressive 30-sec cleanup, LRU eviction
- Updated proxy.ts: scaled rate limits for 2000 users (AI 30/min, docs 15/min, chat 60/min, API 120/min), fixed CORS for tenet.space-z.ai domain with wildcard support
- Updated vercel.json: all maxDuration=10 (Hobby plan), added chats/conversations/projects functions, dual regions (iad1+cdg1), HSTS headers
- Updated .env: comprehensive production config template with all needed env vars documented
- Fixed PostgreSQL case-insensitive search: created lib/search.ts utility with containsInsensitive() helper, updated 7 API route files
- Synced prisma/schema.prod.prisma: added missing Subscription model, UsageRecord model, plan field on User, proper indexes
- Updated .zscripts/dev.sh: production server (next start) with auto-restart loop, builds first for memory efficiency
- Build succeeds, agent browser verified: landing page renders, Get Started works, auth gate appears, no errors

Stage Summary:
- All production blockers fixed for 2000-user scale
- Cross-database compatibility: containsInsensitive() helper works on both SQLite (dev) and PostgreSQL (production)
- Rate limits scaled for 2000 concurrent users
- Auth cache sized for 2000 users with LRU eviction
- CORS properly configured for tenet.space-z.ai domain
- Vercel deployment configuration ready (vercel.json)
- Production schema (schema.prod.prisma) synced with dev schema including Subscription and UsageRecord models

---
Task ID: 2
Agent: Main
Task: Required Vercel environment variables for production deployment

Critical env vars needed in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Value | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | PostgreSQL connection string (Neon recommended) | Primary database - SQLite won't work on Vercel |
| `JWT_SECRET` | Strong 32+ char secret (openssl rand -base64 48) | Auth token signing - REQUIRED in production |
| `NEXT_PUBLIC_APP_URL` | https://tenet.space-z.ai | Primary domain URL |
| `NEXTAUTH_URL` | https://tenet.space-z.ai | NextAuth URL |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store token | File uploads - Vercel Blob instead of local filesystem |
| `CORS_EXTRA_ORIGINS` | (optional) | Additional CORS origins |

Without DATABASE_URL and JWT_SECRET, the deployment will fail at runtime.
