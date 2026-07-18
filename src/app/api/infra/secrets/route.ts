import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      secrets: [
        { id: 'sec-1', name: 'DATABASE_URL', value: 'postgres://****:****@db.internal:5432/prod', lastRotated: new Date(Date.now() - 3 * 86400000).toISOString(), expiresAt: new Date(Date.now() + 27 * 86400000).toISOString() },
        { id: 'sec-2', name: 'JWT_SECRET', value: '****************************', lastRotated: new Date(Date.now() - 7 * 86400000).toISOString(), expiresAt: new Date(Date.now() + 23 * 86400000).toISOString() },
        { id: 'sec-3', name: 'STRIPE_API_KEY', value: 'sk_live_********************', lastRotated: new Date(Date.now() - 14 * 86400000).toISOString(), expiresAt: new Date(Date.now() + 16 * 86400000).toISOString() },
        { id: 'sec-4', name: 'SENDGRID_API_KEY', value: 'SG.********************', lastRotated: null, expiresAt: null },
        { id: 'sec-5', name: 'AWS_SECRET_ACCESS_KEY', value: '****************************', lastRotated: new Date(Date.now() - 1 * 86400000).toISOString(), expiresAt: new Date(Date.now() + 29 * 86400000).toISOString() },
      ],
      stats: {
        status: 'healthy',
        totalSecrets: 18,
        rotationEnabled: true,
        lastRotation: new Date(Date.now() - 1 * 86400000).toISOString(),
        expiringSoon: 2,
        vaultHealth: 'healthy',
      },
    },
  });
}
