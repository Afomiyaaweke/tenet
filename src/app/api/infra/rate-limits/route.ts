import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      rules: [
        { id: 'rl-1', name: 'General API', path: '/api/*', limit: 100, window: '60s', blocked: 42 },
        { id: 'rl-2', name: 'Auth Endpoints', path: '/api/auth/*', limit: 20, window: '60s', blocked: 18 },
        { id: 'rl-3', name: 'File Upload', path: '/api/upload/*', limit: 10, window: '300s', blocked: 3 },
      ],
      stats: { totalBlocked24h: 63, currentRps: 245 },
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, path, limit, window } = body;
  if (!name || !path) {
    return NextResponse.json({ success: false, error: 'Name and path are required' }, { status: 400 });
  }
  return NextResponse.json({
    success: true,
    data: { id: `rl-${Date.now()}`, name, path, limit: limit || 100, window: `${window || 60}s`, blocked: 0 },
  });
}
