/**
 * Auto-creates Agent tables if they don't exist.
 * Uses raw SQL so it works even if Prisma schema is out of sync.
 * Safe to call repeatedly (IF NOT EXISTS).
 *
 * IMPORTANT: Column names MUST match the Prisma schema exactly.
 */
import { db } from './db';

let ensured = false;

async function runSQL(sql: string) {
  try {
    await db.$executeRawUnsafe(sql);
    return true;
  } catch (err) {
    console.error('SQL failed:', sql.substring(0, 100), err);
    return false;
  }
}

export async function ensureAgentTables() {
  if (ensured) return;

  // Quick probe — if this succeeds, tables already exist
  try {
    await db.agentSession.count({ take: 0 });
    ensured = true;
    return;
  } catch {
    // Tables missing — create them
  }

  console.log('🔄 Auto-creating Agent tables...');

  const isPostgres = process.env.DATABASE_URL?.startsWith('postgres');
  const ts = isPostgres ? 'TIMESTAMP(3)' : 'DATETIME';
  const tsDef = isPostgres ? 'NOT NULL DEFAULT CURRENT_TIMESTAMP' : 'NOT NULL DEFAULT CURRENT_TIMESTAMP';
  const tsUpd = isPostgres ? 'NOT NULL DEFAULT CURRENT_TIMESTAMP' : 'NOT NULL DEFAULT CURRENT_TIMESTAMP';

  // AgentSession — matches Prisma schema exactly
  const ok1 = await runSQL(`CREATE TABLE IF NOT EXISTS "AgentSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Tender Review',
    "summary" TEXT,
    "createdAt" ${ts} ${tsDef},
    "updatedAt" ${ts} ${tsUpd}
  )`);

  // AgentDocument — matches Prisma schema exactly
  const ok2 = await runSQL(`CREATE TABLE IF NOT EXISTS "AgentDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filetype" TEXT NOT NULL DEFAULT 'pdf',
    "filepath" TEXT NOT NULL DEFAULT '',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "pageTexts" TEXT NOT NULL DEFAULT '[]',
    "summary" TEXT,
    "category" TEXT NOT NULL DEFAULT 'tender',
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "createdAt" ${ts} ${tsDef},
    "updatedAt" ${ts} ${tsUpd}
  )`);

  // AgentMessage — matches Prisma schema exactly
  const ok3 = await runSQL(`CREATE TABLE IF NOT EXISTS "AgentMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "thinking" TEXT,
    "events" TEXT,
    "citations" TEXT,
    "intent" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" ${ts} ${tsDef}
  )`);

  // AgentAnalysis — matches Prisma schema exactly
  const ok4 = await runSQL(`CREATE TABLE IF NOT EXISTS "AgentAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT,
    "createdAt" ${ts} ${tsDef}
  )`);

  // AgentArtifact — matches Prisma schema exactly
  const ok5 = await runSQL(`CREATE TABLE IF NOT EXISTS "AgentArtifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "title" TEXT NOT NULL DEFAULT '',
    "filename" TEXT NOT NULL DEFAULT '',
    "filepath" TEXT NOT NULL DEFAULT '',
    "meta" TEXT,
    "createdAt" ${ts} ${tsDef}
  )`);

  if (ok1 && ok2 && ok3 && ok4 && ok5) {
    console.log('✅ Agent tables auto-created successfully');
    ensured = true;
  } else {
    console.error('❌ Some Agent tables failed to create');
  }
}
