import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  _dbConfigured: boolean | undefined
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

/**
 * Check whether a real (non-placeholder) database URL is available.
 * The build script uses a placeholder URL so prisma generate succeeds;
 * this function detects that at runtime.
 */
function isPlaceholderUrl(url: string | undefined): boolean {
  if (!url) return true;
  return url.includes('placeholder:placeholder') || url.includes('localhost:5432/placeholder');
}

export function isDatabaseConfigured(): boolean {
  if (globalForPrisma._dbConfigured !== undefined) return globalForPrisma._dbConfigured;
  const url = resolveDatabaseUrl();
  const configured = !isPlaceholderUrl(url);
  globalForPrisma._dbConfigured = configured;
  return configured;
}

function createPrismaClient(): PrismaClient {
  const isProduction = process.env.NODE_ENV === 'production'
  const databaseUrl = resolveDatabaseUrl()

  // In production, only use PostgreSQL — never fall back to SQLite
  if (isProduction) {
    if (databaseUrl && !isPlaceholderUrl(databaseUrl)) {
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
    // No real database — return a client that will fail on use, but doesn't crash on import.
    // The app-layer code should check isDatabaseConfigured() before using db.
    console.warn('[db] No real DATABASE_URL configured. Database operations will fail.')
    return new PrismaClient({
      datasourceUrl: 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
      log: [{ level: 'error', emit: 'stdout' }],
    })
  }

  return new PrismaClient({
    datasourceUrl: databaseUrl || 'file:/home/z/my-project/db/custom.db',
    log: isProduction ? [{ level: 'error', emit: 'stdout' }] : ['error', 'warn', 'query'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
