import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { validateAndConsumeResetToken, addPasswordHistory, isPasswordInHistory } from '@/lib/token-service';
import { validatePassword, getClientIP, getUserAgent, maskEmail, isPayloadTooLarge } from '@/lib/validators';
import { auditLog } from '@/lib/audit-logger';
import { invalidateAuthCache } from '@/lib/auth';

const BCRYPT_SALT_ROUNDS = 12;

export async function POST(request: NextRequest) {
  try {
    // ── Payload size check ──
    const rawBody = await request.text();
    if (isPayloadTooLarge(rawBody)) {
      return NextResponse.json(
        { success: false, error: 'Request payload too large' },
        { status: 413 },
      );
    }

    let body: { token?: unknown; newPassword?: unknown; confirmPassword?: unknown };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 },
      );
    }

    const { token, newPassword, confirmPassword } = body;
    const clientIP = getClientIP(request);
    const userAgent = getUserAgent(request);

    // ── Input validation ──
    if (!token || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 },
      );
    }

    if (typeof token !== 'string' || typeof newPassword !== 'string' || typeof confirmPassword !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid input format' },
        { status: 400 },
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 },
      );
    }

    // ── Password strength validation ──
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.errors[0] },
        { status: 400 },
      );
    }

    // ── Validate and consume the reset token ──
    // Returns null for ALL failure cases (invalid, expired, used) - generic error
    const tokenResult = await validateAndConsumeResetToken(token);

    if (!tokenResult) {
      // Generic error - never reveal WHY the token failed
      await auditLog({
        action: 'reset_token_invalid',
        ipAddress: clientIP,
        userAgent,
      }).catch(() => {});

      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token. Please request a new one.' },
        { status: 400 },
      );
    }

    const { userId } = tokenResult;

    // ── Get the user ──
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token. Please request a new one.' },
        { status: 400 },
      );
    }

    // ── Check password isn't the same as current ──
    const isSameAsCurrent = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSameAsCurrent) {
      await auditLog({
        userId,
        email: user.email,
        action: 'password_in_history',
        ipAddress: clientIP,
        userAgent,
        metadata: { reason: 'same_as_current' },
      }).catch(() => {});

      return NextResponse.json(
        { success: false, error: 'New password must be different from your current password' },
        { status: 400 },
      );
    }

    // ── Check password history ──
    const isInHistory = await isPasswordInHistory(userId, newPassword);
    if (isInHistory) {
      await auditLog({
        userId,
        email: user.email,
        action: 'password_in_history',
        ipAddress: clientIP,
        userAgent,
      }).catch(() => {});

      return NextResponse.json(
        { success: false, error: 'This password was recently used. Please choose a different one' },
        { status: 400 },
      );
    }

    // ── Store old password in history ──
    await addPasswordHistory(userId, user.passwordHash);

    // ── Hash and update the new password ──
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    await db.user.update({
      where: { id: userId },
      data: { passwordHash, updatedAt: new Date() },
    });

    // ── Invalidate all other reset tokens for this user ──
    await db.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    // ── Invalidate auth cache (forces re-login on all devices) ──
    invalidateAuthCache(userId);

    // ── Audit log ──
    await auditLog({
      userId,
      email: user.email,
      action: 'password_reset_completed',
      ipAddress: clientIP,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. Please sign in with your new password.',
    });
  } catch (err) {
    console.error('[POST /api/auth/reset-password] error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 },
    );
  }
}
