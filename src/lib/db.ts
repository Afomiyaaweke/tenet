import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Prisma client configuration optimized for Vercel serverless deployment
 * targeting 2000+ concurrent users with PostgreSQL (Neon).
 *
 * - In production (Vercel + Neon PostgreSQL): uses connection pooling with
 *   `connection_limit=20`, `pool_timeout=30`, `connect_timeout=10`, and
 *   `pooled=true` (Neon's PgBouncer) to handle high concurrency in serverless
 *   functions without exhausting database connections.
 *
 * - In development: uses standard SQLite with error/warning logging.
 *
 * Connection pooling parameters are appended to the DATABASE_URL at runtime
 * only when running in production with a PostgreSQL connection string.
 *
 * NOTE: For future rate-limit caching at scale (2000+ users), consider
 * integrating Upstash Redis as a caching layer alongside this database
 * configuration. Upstash is Vercel-native and ideal for serverless rate
 * limiting, session caching, and ephemeral data that doesn't need DB persistence.
 */

/**
 * Resolve the database URL for the current environment.
 *
 * In production on Vercel, the Neon integration sets env vars prefixed with
 * the project name (e.g. `tenet_DATABASE_URL`, `tenet_POSTGRES_PRISMA_URL`).
 * We prefer these over `DATABASE_URL` because the manually-set `DATABASE_URL`
 * may be a placeholder (e.g. pointing to localhost).
 *
 * Resolution order in production:
 *   1. tenet_POSTGRES_PRISMA_URL (Neon pooled URL, ideal for Prisma serverless)
 *   2. tenet_DATABASE_URL        (Neon direct URL)
 *   3. DATABASE_URL              (manually set, fallback)
 *
 * In development, always use DATABASE_URL.
 */
function resolveDatabaseUrl(): string | undefined {
  if (process.env.NODE_ENV === 'production') {
    // Neon integration vars (prefixed with project name "tenet_")
    const neonPrismaUrl = process.env.tenet_POSTGRES_PRISMA_URL
    const neonDatabaseUrl = process.env.tenet_DATABASE_URL
    if (neonPrismaUrl) return neonPrismaUrl
    if (neonDatabaseUrl) return neonDatabaseUrl
  }
  return process.env.DATABASE_URL
}

function createPrismaClient(): PrismaClient {
  const isProduction = process.env.NODE_ENV === 'production'
  const databaseUrl = resolveDatabaseUrl()

  // For production PostgreSQL on Vercel, append connection pooling params
  if (isProduction && databaseUrl && databaseUrl.startsWith('postgresql')) {
    // Parse the URL and append connection pooling parameters if not already present
    const url = new URL(databaseUrl)

    // connection_limit=20: Vercel serverless can have many concurrent function
    // invocations; 20 connections per client allows adequate throughput at scale.
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '20')
    }

    // pool_timeout=30: more patient waiting for a connection from the pool
    // under heavy load, reducing premature "connection not available" errors.
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '30')
    }

    // connect_timeout=10: prevent hanging on unreachable DB hosts; fail fast
    // so serverless functions don't burn time waiting on network issues.
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '10')
    }

    // For Neon PostgreSQL: enable pooled connection (PgBouncer) for serverless
    // performance — this is critical for avoiding connection exhaustion on Neon.
    if (databaseUrl.includes('neon.tech') && !url.searchParams.has('pooled')) {
      url.searchParams.set('pooled', 'true')
    }

    const datasourceUrl = url.toString()

    return new PrismaClient({
      datasourceUrl,
      log: [
        { level: 'error', emit: 'stdout' },
        {
          level: 'warn',
          emit: 'stdout',
        },
      ],
    })
  }

  // Development mode: use DATABASE_URL as-is (SQLite or local PostgreSQL)
  return new PrismaClient({
    log: isProduction
      ? [{ level: 'error', emit: 'stdout' }]
      : ['error', 'warn', 'query'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

// In development, cache the Prisma client on the global object
// to prevent creating new connections on every hot-reload.
// In production (Vercel serverless), each function invocation is isolated,
// so we don't cache globally — but the globalForPrisma pattern still helps
// avoid multiple clients within a single invocation.
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
