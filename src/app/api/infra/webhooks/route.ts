import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: [],
    meta: { total: 0 },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (!body.url) {
    return NextResponse.json({ success: false, error: 'url is required' }, { status: 400 });
  }
  return NextResponse.json({
    success: false,
    error: 'Webhook management is not configured. Connect a webhook service to enable this feature.',
  }, { status: 501 });
}
