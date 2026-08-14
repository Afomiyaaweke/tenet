import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Resolve the database URL for the current environment.
 * In production on Vercel, the Neon integration may set env vars with various prefixes:
 * - POSTGRES_PRISMA_URL (default Neon integration)
 * - POSTGRES_URL (alternative Neon naming)
 * - tenet_POSTGRES_PRISMA_URL (project-prefixed)
 * - tenet_DATABASE_URL (project-prefixed)
 * - DATABASE_URL (fallback)
 */
function resolveDatabaseUrl(): string | undefined {
  if (process.env.NODE_ENV === 'production') {
    // Try all possible Neon env var names in order of preference
    // Prefer Prisma-specific URL (includes connection_limit support)
    const envKeys = [
      'POSTGRES_PRISMA_URL',
      'tenet_POSTGRES_PRISMA_URL',
      'POSTGRES_URL',
      'tenet_DATABASE_URL',
      'tenet_POSTGRES_URL',
      'DATABASE_URL',
    ];

    for (const key of envKeys) {
      const value = (process.env as Record<string, string | undefined>)[key];
      if (value && (value.startsWith('postgresql') || value.startsWith('postgres'))) return value;
    }
  }
  return process.env.DATABASE_URL
}

function createPrismaClient(): PrismaClient {
  const isProduction = process.env.NODE_ENV === 'production'
  const databaseUrl = resolveDatabaseUrl()

  if (isProduction && databaseUrl && (databaseUrl.startsWith('postgresql') || databaseUrl.startsWith('postgres'))) {
    const url = new URL(databaseUrl)
    if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '20')
    if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '30')
    if (!url.searchParams.has('connect_timeout')) url.searchParams.set('connect_timeout', '10')
    if (databaseUrl.includes('neon.tech') && !url.searchParams.has('pooled')) url.searchParams.set('pooled', 'true')
    return new PrismaClient({
      datasourceUrl: url.toString(),
      log: [{ level: 'error', emit: 'stdout' }, { level: 'warn', emit: 'stdout' }],
    })
  }

  return new PrismaClient({
    log: isProduction ? [{ level: 'error', emit: 'stdout' }] : ['error', 'warn', 'query'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
