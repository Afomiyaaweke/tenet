import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { isValidEmail, normalizeEmail, getClientIP, getUserAgent, isPayloadTooLarge } from '@/lib/validators';
import { auditLog } from '@/lib/audit-logger';
import { requireDatabase } from '@/lib/utils';

// ── Failed login tracking (in-memory, per-process) ──
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function checkFailedAttempts(email: string): { allowed: boolean; lockedUntil?: number } {
  const entry = failedAttempts.get(email);
  if (!entry) return { allowed: true };

  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    return { allowed: false, lockedUntil: entry.lockedUntil };
  }

  // Lockout expired, reset
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    failedAttempts.delete(email);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedAttempt(email: string): void {
  const entry = failedAttempts.get(email) || { count: 0, lockedUntil: 0 };
  entry.count++;

  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }

  failedAttempts.set(email, entry);
}

function clearFailedAttempts(email: string): void {
  failedAttempts.delete(email);
}

// Clean up periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of failedAttempts.entries()) {
    if (entry.lockedUntil && now >= entry.lockedUntil) {
      failedAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    // ── Database guard ──
    const dbGuard = requireDatabase();
    if (dbGuard) return dbGuard;

    // ── Payload size check ──
    const rawBody = await request.text();
    if (isPayloadTooLarge(rawBody)) {
      return NextResponse.json(
        { success: false, error: 'Request payload too large' },
        { status: 413 },
      );
    }

    let body: { email?: unknown; password?: unknown };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 },
      );
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: email, password' },
        { status: 400 },
      );
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid input format' },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const clientIP = getClientIP(request);
    const userAgent = getUserAgent(request);

    // ── Check brute-force lockout ──
    const attemptCheck = checkFailedAttempts(normalizedEmail);
    if (!attemptCheck.allowed) {
      await auditLog({
        email: normalizedEmail,
        action: 'rate_limit_exceeded',
        ipAddress: clientIP,
        userAgent,
        metadata: { endpoint: 'login', reason: 'account_locked' },
      }).catch(() => {});

      return NextResponse.json(
        { success: false, error: 'Too many failed attempts. Please try again later.' },
        { status: 429 },
      );
    }

    // ── Find user ──
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true, company: true },
    });

    if (!user) {
      recordFailedAttempt(normalizedEmail);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    // ── Verify password ──
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      recordFailedAttempt(normalizedEmail);

      await auditLog({
        userId: user.id,
        email: normalizedEmail,
        action: 'login',
        ipAddress: clientIP,
        userAgent,
        metadata: { success: false },
      }).catch(() => {});

      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    // ── Clear failed attempts on success ──
    clearFailedAttempts(normalizedEmail);

    // ── Check user status ──
    if (user.status === 'suspended') {
      return NextResponse.json(
        { success: false, error: 'Your account has been suspended. Please contact support.' },
        { status: 403 },
      );
    }

    if (user.status === 'banned') {
      return NextResponse.json(
        { success: false, error: 'Your account has been banned. Please contact support.' },
        { status: 403 },
      );
    }

    // ── Generate JWT ──
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      tokenVersion: user.tokenVersion ?? 0,
    });

    // ── Audit log ──
    await auditLog({
      userId: user.id,
      action: 'login',
      resource: 'user',
      resourceId: user.id,
      companyId: user.companyId || undefined,
      ipAddress: clientIP,
      userAgent,
      metadata: { success: true },
    });

    const { passwordHash: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 },
    );
  }
}
