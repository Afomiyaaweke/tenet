import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      entries: [
        { key: 'user:profile:*', size: '2.1 KB', ttl: 300, hits: 4520 },
        { key: 'api:tenders:list', size: '14.3 KB', ttl: 60, hits: 8940 },
        { key: 'api:dashboard:stats', size: '8.7 KB', ttl: 120, hits: 3200 },
        { key: 'session:*', size: '0.5 KB', ttl: 3600, hits: 1200 },
        { key: 'static:translations:en', size: '45.2 KB', ttl: 86400, hits: 24500 },
      ],
      stats: {
        status: 'healthy',
        hitRate: 87,
        missRate: 13,
        sizeMB: 256,
        maxSizMB: 512,
        entries: 14520,
        defaultTTL: 300,
      },
    },
  });
}
