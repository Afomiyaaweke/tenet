import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: string[] = [];

  // Check if table exists
  try {
    await db.$queryRawUnsafe('SELECT 1 FROM "AgentSession" LIMIT 1');
    results.push('AgentSession table: EXISTS');
  } catch (e: any) {
    results.push('AgentSession table: MISSING - ' + (e?.message || 'unknown error'));
  }

  // Try creating the table
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AgentSession" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "title" TEXT NOT NULL DEFAULT 'New Tender Review',
        "summary" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    results.push('AgentSession CREATE: SUCCESS');
  } catch (e: any) {
    results.push('AgentSession CREATE: FAILED - ' + (e?.message || 'unknown error'));
  }

  // Verify
  try {
    await db.$queryRawUnsafe('SELECT 1 FROM "AgentSession" LIMIT 1');
    results.push('AgentSession verify: EXISTS');
  } catch (e: any) {
    results.push('AgentSession verify: STILL MISSING - ' + (e?.message || 'unknown error'));
  }

  return NextResponse.json({ results, dbUrl: process.env.DATABASE_URL?.replace(/:([^@]+)@/, ':***@') || 'not set' });
}
