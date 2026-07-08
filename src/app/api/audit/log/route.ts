import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { action, resource, resourceId, metadata } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action is required' }, { status: 400 });
    }

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')?.trim()
      || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const log = await db.auditLog.create({
      data: {
        userId: user!.id,
        action,
        resource: resource || null,
        resourceId: resourceId || null,
        companyId: user!.companyId || null,
        metadata: metadata ? JSON.stringify(metadata) : '{}',
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({ success: true, data: log }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/audit/log] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to log audit event' }, { status: 500 });
  }
}
