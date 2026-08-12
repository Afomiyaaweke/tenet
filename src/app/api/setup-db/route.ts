import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Dynamically import to ensure we get the configured client
    const { db } = await import('@/lib/db');
    
    // Try a simple query to check if tables exist
    const result = await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public' LIMIT 10`;
    
    return NextResponse.json({ 
      success: true, 
      tables: result,
      envCheck: {
        hasTenetPrismaUrl: !!process.env.tenet_POSTGRES_PRISMA_URL,
        hasTenetDbUrl: !!process.env.tenet_DATABASE_URL,
        hasTenetPostgresUrl: !!process.env.tenet_POSTGRES_URL,
        hasDbUrl: !!process.env.DATABASE_URL,
        dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + '...',
        nodeEnv: process.env.NODE_ENV,
      }
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      success: false, 
      error: msg,
      envCheck: {
        hasTenetPrismaUrl: !!process.env.tenet_POSTGRES_PRISMA_URL,
        hasTenetDbUrl: !!process.env.tenet_DATABASE_URL,
        hasTenetPostgresUrl: !!process.env.tenet_POSTGRES_URL,
        hasDbUrl: !!process.env.DATABASE_URL,
        dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + '...',
        nodeEnv: process.env.NODE_ENV,
      }
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { execSync } = await import('child_process');
    
    // Set DATABASE_URL from Neon integration vars
    const dbUrl = process.env.tenet_POSTGRES_PRISMA_URL || 
                  process.env.tenet_DATABASE_URL || 
                  process.env.tenet_POSTGRES_URL || 
                  process.env.DATABASE_URL;
    
    if (!dbUrl) {
      return NextResponse.json({ success: false, error: 'No DATABASE_URL found' }, { status: 500 });
    }
    
    // Run prisma db push
    const output = execSync(
      `npx prisma db push --accept-data-loss --schema=prisma/schema.prod.prisma`,
      { 
        env: { ...process.env, DATABASE_URL: dbUrl },
        timeout: 60000,
        encoding: 'utf-8',
      }
    );
    
    return NextResponse.json({ success: true, output });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
