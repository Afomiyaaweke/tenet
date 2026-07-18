import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      endpoints: [
        { id: 'wh-1', url: 'https://partner-a.com/hooks/events', events: ['order.created', 'order.updated'], active: true, successRate: 99.2, lastDelivery: new Date(Date.now() - 300000).toISOString() },
        { id: 'wh-2', url: 'https://analytics.internal/process', events: ['user.signup', 'user.login'], active: true, successRate: 98.7, lastDelivery: new Date(Date.now() - 600000).toISOString() },
        { id: 'wh-3', url: 'https://slack.internal/notify', events: ['alert.critical', 'deploy.complete'], active: true, successRate: 95.1, lastDelivery: new Date(Date.now() - 1800000).toISOString() },
      ],
      stats: { totalDeliveries24h: 4520, failedDeliveries24h: 12 },
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { url, events, active } = body;
  if (!url) {
    return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
  }
  return NextResponse.json({
    success: true,
    data: { id: `wh-${Date.now()}`, url, events: events || [], active: active !== false, successRate: 0, lastDelivery: null },
  });
}
