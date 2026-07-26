import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Prisma client configuration optimized for Vercel serverless deployment.
 *
 * - In production (Vercel): uses connection pooling with `connection_limit` and `pool_timeout`
 *   to prevent exhausting PostgreSQL connections in serverless functions.
 *   Each serverless invocation gets a PrismaClient from the global singleton,
 *   and connection limits ensure we don't overwhelm the database.
 *
 * - In development: uses standard SQLite with error/warning logging.
 *
 * Connection pooling parameters are appended to the DATABASE_URL at runtime
 * only when running in production with a PostgreSQL connection string.
 */

function createPrismaClient(): PrismaClient {
  const isProduction = process.env.NODE_ENV === 'production'
  const databaseUrl = process.env.DATABASE_URL

  // For production PostgreSQL on Vercel, append connection pooling params
  if (isProduction && databaseUrl && databaseUrl.startsWith('postgresql')) {
    // Parse the URL and append connection pooling parameters if not already present
    const url = new URL(databaseUrl)
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '5')
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '10')
    }
    // For Neon PostgreSQL: enable pipelining for serverless performance
    if (databaseUrl.includes('neon.tech') && !url.searchParams.has('pooled')) {
      url.searchParams.set('pooled', 'true')
    }

    return new PrismaClient({
      datasourceUrl: url.toString(),
      log: [],
    })
  }

  // Development mode: use DATABASE_URL as-is (SQLite or local PostgreSQL)
  return new PrismaClient({
    log: isProduction ? [] : ['error', 'warn'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

// In development, cache the Prisma client on the global object
// to prevent creating new connections on every hot-reload.
// In production (Vercel serverless), each function invocation is isolated,
// so we don't cache globally — but the globalForPrisma pattern still helps
// avoid multiple clients within a single invocation.
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
