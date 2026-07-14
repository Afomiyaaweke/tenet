import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
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

    // Send the reset token via email — NEVER in the API response
    const emailSent = await sendPasswordResetEmail(normalizedEmail, token);

    if (!emailSent) {
      console.error('[POST /api/auth/forgot-password] Failed to send reset email to', normalizedEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3'));
      // Don't reveal email sending failure to the client (prevents information leakage)
    }

    // Audit log (mask email)
    await db.auditLog.create({
      data: {
        action: 'forgot_password',
        resource: 'user',
        resourceId: normalizedEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
        metadata: JSON.stringify({ email: normalizedEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3') }),
      },
    }).catch(() => {});

    // SECURITY: Never include the reset token in the API response.
    // The token is only sent to the user's email address.
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (err) {
    console.error('[POST /api/auth/forgot-password] error:', err);
    return NextResponse.json({ success: false, error: 'An error occurred' }, { status: 500 });
  }
}
