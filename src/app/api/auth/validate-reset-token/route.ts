import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashToken } from '@/lib/token-service';

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token');

  if (!token) {
    return NextResponse.json({ valid: false });
  }

  try {
    const tokenHash = hashToken(token);

    const record = await db.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    // Generic error - never reveal WHY validation failed
    if (!record || record.usedAt || new Date() > record.expiresAt) {
      return NextResponse.json({ valid: false });
    }

    // Don't reveal the user's email even on valid tokens
    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
