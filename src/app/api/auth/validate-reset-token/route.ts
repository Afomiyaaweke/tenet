import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token');

  if (!token) {
    return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
  }

  try {
    const resetRecord = await db.passwordReset.findUnique({
      where: { token },
    });

    if (!resetRecord) {
      return NextResponse.json({ valid: false, error: 'Invalid token' });
    }

    if (resetRecord.used) {
      return NextResponse.json({ valid: false, error: 'Token already used' });
    }

    if (new Date() > resetRecord.expiresAt) {
      return NextResponse.json({ valid: false, error: 'Token expired' });
    }

    return NextResponse.json({ valid: true, email: resetRecord.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') });
  } catch (err) {
    console.error('[GET /api/auth/validate-reset-token] error:', err);
    return NextResponse.json({ success: false, error: 'An error occurred' }, { status: 500 });
  }
}
