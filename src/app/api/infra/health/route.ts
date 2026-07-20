import { NextResponse } from 'next/server';

const concerns: Record<string, string> = {
  authentication: 'healthy',
  analytics: 'healthy',
  dns: 'healthy',
  stressTesting: 'not_configured',
  penTesting: 'warning',
  loadHandling: 'healthy',
  failTolerance: 'healthy',
  backup: 'warning',
  dataModeling: 'healthy',
  rateLimiting: 'healthy',
  caching: 'healthy',
  edgeComputing: 'warning',
  webPerformance: 'healthy',
  cdn: 'healthy',
  monitoring: 'healthy',
  networkSecurity: 'healthy',
  apiIntegration: 'warning',
  idempotency: 'healthy',
  automation: 'healthy',
  webhooks: 'healthy',
  secretManagement: 'healthy',
  audits: 'healthy',
  stateless: 'not_configured',
};

const statusWeights: Record<string, number> = { healthy: 1, warning: 0.6, critical: 0.2, not_configured: 0.4 };

export async function GET() {
  const values = Object.values(concerns);
  const score = Math.round(
    (values.reduce((sum, s) => sum + (statusWeights[s] ?? 0.5), 0) / values.length) * 100
  );

  return NextResponse.json({
    success: true,
    data: {
      score,
      concerns,
      lastChecked: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
}
