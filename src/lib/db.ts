import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Resolve the database URL for the current environment.
 * In production on Vercel, the Neon integration sets env vars prefixed with
 * the project name (e.g. tenet_DATABASE_URL, tenet_POSTGRES_PRISMA_URL).
 */
function resolveDatabaseUrl(): string | undefined {
  if (process.env.NODE_ENV === 'production') {
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

  if (isProduction && databaseUrl && databaseUrl.startsWith('postgresql')) {
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
