# Task 2 — Database Configuration for Vercel PostgreSQL Deployment

## Agent: db-config-agent

## Task
Update TenetBid's Prisma schema and configuration for Vercel deployment with PostgreSQL. The project currently uses SQLite which won't work on Vercel due to ephemeral filesystems in serverless functions.

## Work Completed

### 1. prisma/schema.prisma
- Changed `provider = "sqlite"` to `provider = "postgresql"`
- Reviewed all 25 models for SQLite→PostgreSQL compatibility:
  - All `String` fields storing JSON remain as `String` (PostgreSQL handles large strings well)
  - All default values work in PostgreSQL (cuid(), now(), false, 0, "", "active", "[]", "{}")
  - `@unique` on nullable fields (Company.registrationNo, Company.tinNumber) kept as-is with documented caveat

### 2. src/lib/db.ts
- Enhanced from simple PrismaClient instantiation to production-grade factory function
- Production branch: auto-appends `connection_limit=5` and `pool_timeout=10` to PostgreSQL URLs
- Production branch: auto-detects Neon.tech and appends `pooled=true` for serverless pipelining
- Development branch: uses DATABASE_URL as-is (SQLite) with error/warn logging
- Maintains global singleton pattern for hot-reload prevention in development

### 3. .env
- Kept SQLite DATABASE_URL for local development
- Added comprehensive commented templates for Neon, Vercel Postgres, and Supabase connection strings
- Documented that db.ts auto-appends connection pooling params in production

### 4. Prisma Client Regeneration
- Ran `bun run db:generate` successfully
- Did NOT run `bun run db:push` (would wipe local SQLite database)

## Known Considerations
- `@unique` on nullable fields (registrationNo, tinNumber) allows only ONE NULL in PostgreSQL vs multiple NULLs in SQLite
- May need a partial unique index in future if multiple companies lack these fields
- Local development still works with SQLite; PostgreSQL only active in production on Vercel
