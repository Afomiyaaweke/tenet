import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await db.user.findUnique({ where: { email: normalizedEmail } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    // Invalidate any existing unused tokens for this email
    await db.passwordReset.updateMany({
      where: { email: normalizedEmail, used: false },
      data: { used: true },
    });

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    await db.passwordReset.create({
      data: {
        email: normalizedEmail,
        token,
        expiresAt,
      },
    });

    // In production, you would send an email with the reset link
    // For now, return the token so the frontend can use it
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
      // Only in development - remove in production
      resetToken: token,
    });
  } catch (err) {
    console.error('[POST /api/auth/forgot-password] error:', err);
    return NextResponse.json({ success: false, error: 'An error occurred' }, { status: 500 });
  }
}
