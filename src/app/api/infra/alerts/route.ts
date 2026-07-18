import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: [
      { id: 'alert-1', severity: 'warning', message: 'Backup is 2 hours overdue', source: 'Backup Service', timestamp: new Date(Date.now() - 7200000).toISOString(), acknowledged: false, resolved: false },
      { id: 'alert-2', severity: 'warning', message: 'SMS Provider latency above threshold (340ms)', source: 'API Integration', timestamp: new Date(Date.now() - 3600000).toISOString(), acknowledged: false, resolved: false },
      { id: 'alert-3', severity: 'info', message: 'Pen test scan scheduled for next week', source: 'Security Scanner', timestamp: new Date(Date.now() - 14400000).toISOString(), acknowledged: true, resolved: false },
      { id: 'alert-4', severity: 'critical', message: 'Sydney edge node offline', source: 'Edge Computing', timestamp: new Date(Date.now() - 1800000).toISOString(), acknowledged: false, resolved: false },
      { id: 'alert-5', severity: 'info', message: '2 secrets expiring within 30 days', source: 'Secret Management', timestamp: new Date(Date.now() - 28800000).toISOString(), acknowledged: true, resolved: false },
    ],
  });
}
