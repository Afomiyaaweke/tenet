/**
 * Auto-creates Agent tables if they don't exist.
 * Uses raw SQL so it works even if Prisma schema is out of sync.
 * Safe to call repeatedly (IF NOT EXISTS / ON CONFLICT DO NOTHING).
 */
import { db } from './db';

let ensured = false;

export async function ensureAgentTables() {
  if (ensured) return;
  try {
    // Quick probe — if this succeeds, tables already exist
    await db.agentSession.count({ take: 0 });
    ensured = true;
    return;
  } catch {
    // Tables missing — create them
  }

  try {
    const isPostgres = process.env.DATABASE_URL?.startsWith('postgres');

    if (isPostgres) {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AgentSession" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "title" TEXT NOT NULL DEFAULT 'New Tender Review',
          "summary" TEXT,
          "status" TEXT NOT NULL DEFAULT 'active',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "AgentDocument" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "sessionId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'pdf',
          "size" INTEGER NOT NULL DEFAULT 0,
          "url" TEXT,
          "content" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "AgentMessage" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "sessionId" TEXT NOT NULL,
          "role" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "AgentAnalysis" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "sessionId" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'general',
          "content" TEXT,
          "score" DOUBLE PRECISION,
          "criteria" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "AgentArtifact" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "sessionId" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'text',
          "name" TEXT,
          "content" TEXT,
          "url" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } else {
      // SQLite fallback
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AgentSession" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "title" TEXT NOT NULL DEFAULT 'New Tender Review',
          "summary" TEXT,
          "status" TEXT NOT NULL DEFAULT 'active',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "AgentDocument" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "sessionId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'pdf',
          "size" INTEGER NOT NULL DEFAULT 0,
          "url" TEXT,
          "content" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "AgentMessage" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "sessionId" TEXT NOT NULL,
          "role" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "AgentAnalysis" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "sessionId" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'general',
          "content" TEXT,
          "score" REAL,
          "criteria" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "AgentArtifact" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "sessionId" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'text',
          "name" TEXT,
          "content" TEXT,
          "url" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    console.log('✅ Agent tables auto-created successfully');
    ensured = true;
  } catch (err) {
    console.error('❌ Failed to auto-create Agent tables:', err);
  }
}
