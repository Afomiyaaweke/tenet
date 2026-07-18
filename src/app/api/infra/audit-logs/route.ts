import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      events: [
        { action: 'user.login', user: 'admin@company.com', timestamp: new Date(Date.now() - 300000).toISOString(), severity: 'info' },
        { action: 'secret.rotated', user: 'system', timestamp: new Date(Date.now() - 3600000).toISOString(), severity: 'info' },
        { action: 'rate_limit.triggered', user: 'anonymous', timestamp: new Date(Date.now() - 7200000).toISOString(), severity: 'warning' },
        { action: 'firewall.rule.updated', user: 'admin@company.com', timestamp: new Date(Date.now() - 14400000).toISOString(), severity: 'info' },
        { action: 'backup.completed', user: 'system', timestamp: new Date(Date.now() - 28800000).toISOString(), severity: 'info' },
        { action: 'deploy.completed', user: 'ci-pipeline', timestamp: new Date(Date.now() - 43200000).toISOString(), severity: 'info' },
        { action: 'user.password_reset', user: 'user@company.com', timestamp: new Date(Date.now() - 86400000).toISOString(), severity: 'info' },
      ],
      stats: {
        status: 'healthy',
        events24h: 3420,
        complianceScore: 94,
        retentionDays: 365,
      },
    },
  });
}
