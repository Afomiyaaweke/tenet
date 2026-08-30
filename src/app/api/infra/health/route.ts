import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      score: 100,
      status: 'healthy',
      lastChecked: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      concerns: {},
    },
  });
}
