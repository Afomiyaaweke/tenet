import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createResetToken } from '@/lib/token-service';
import { sendPasswordResetEmail } from '@/lib/email';
import { auditLog } from '@/lib/audit-logger';
import {
  isValidEmail,
  normalizeEmail,
  getClientIP,
  getUserAgent,
  maskEmail,
  isPayloadTooLarge,
} from '@/lib/validators';

// ── Per-email rate limiter (in-memory, per-process) ──
const emailRequestCounts = new Map<string, { count: number; resetTime: number }>();
const MAX_PER_EMAIL = 3;       // 3 requests per email per window
const EMAIL_RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkEmailRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = emailRequestCounts.get(email);

  if (!entry || now > entry.resetTime) {
    emailRequestCounts.set(email, { count: 1, resetTime: now + EMAIL_RATE_WINDOW });
    return true;
  }

  if (entry.count >= MAX_PER_EMAIL) {
    return false;
  }

  entry.count++;
  return true;
}

// Clean up periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of emailRequestCounts.entries()) {
    if (now > entry.resetTime) emailRequestCounts.delete(key);
  }
}, 5 * 60 * 1000);

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

    let body: { email?: unknown };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 },
      );
    }

    const { email } = body;

    // ── Input validation ──
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 },
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const clientIP = getClientIP(request);
    const userAgent = getUserAgent(request);

    // ── Per-email rate limiting ──
    if (!checkEmailRateLimit(normalizedEmail)) {
      await auditLog({
        email: normalizedEmail,
        action: 'rate_limit_exceeded',
        ipAddress: clientIP,
        userAgent,
        metadata: { endpoint: 'forgot-password' },
      }).catch(() => {});

      // Still return generic success to prevent enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    // ── Check if user exists ──
    const user = await db.user.findUnique({ where: { email: normalizedEmail } });

    // Always return the same response to prevent email enumeration
    if (!user) {
      await auditLog({
        email: normalizedEmail,
        action: 'forgot_password_requested',
        ipAddress: clientIP,
        userAgent,
        metadata: { userExists: false },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    // ── Create secure reset token (SHA-256 hashed in DB) ──
    const { rawToken } = await createResetToken(user.id, clientIP, userAgent);

    // ── Send reset email with security context ──
    const emailSent = await sendPasswordResetEmail({
      to: normalizedEmail,
      rawToken,
      requestIP: clientIP,
      userAgent,
      requestTime: new Date(),
    });

    if (!emailSent) {
      console.error('[POST /api/auth/forgot-password] Failed to send reset email to', maskEmail(normalizedEmail));
      // Don't reveal email sending failure to the client
    }

    // ── Audit log ──
    await auditLog({
      userId: user.id,
      email: normalizedEmail,
      action: 'forgot_password_email_sent',
      ipAddress: clientIP,
      userAgent,
    });

    // SECURITY: Never include the reset token in the API response
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (err) {
    console.error('[POST /api/auth/forgot-password] error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 },
    );
  }
}
