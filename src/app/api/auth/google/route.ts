import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { requireDatabase } from '@/lib/utils';
import { isValidEmail, normalizeEmail, getClientIP, getUserAgent, isPayloadTooLarge } from '@/lib/validators';
import { auditLog } from '@/lib/audit-logger';

// ── Google Identity Services (Sign In With Google) ──────────────────────────
// The browser obtains a Google-issued ID token (JWT) via the GIS button and
// posts it here. We verify it against Google's tokeninfo endpoint (signature,
// expiry and issuer are validated by Google; we additionally check audience),
// then find-or-create the matching user and issue the app's standard JWT.
//
// NOTE: This flow requires only the OAuth *Client ID* (no client secret).
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '349861539680-uk1gbm740qd6hcbvlicl1nmut3kqi2va.apps.googleusercontent.com';

interface GoogleIdTokenInfo {
  aud?: string;
  sub?: string;
  iss?: string;
  exp?: string | number;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  given_name?: string;
  picture?: string;
}

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

    let body: { credential?: unknown };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 },
      );
    }

    const credential = body.credential;
    if (typeof credential !== 'string' || credential.length < 50 || credential.length > 4096) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid Google credential' },
        { status: 400 },
      );
    }

    // ── Verify the ID token with Google ──
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { cache: 'no-store' },
    );

    if (!verifyRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Google sign-in could not be verified. Please try again.' },
        { status: 401 },
      );
    }

    const tokenInfo: GoogleIdTokenInfo = await verifyRes.json();

    // Audience must match our OAuth client
    if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { success: false, error: 'This Google credential was not issued for this app.' },
        { status: 401 },
      );
    }

    // Issuer must be Google
    if (tokenInfo.iss !== 'accounts.google.com' && tokenInfo.iss !== 'https://accounts.google.com') {
      return NextResponse.json(
        { success: false, error: 'Invalid Google credential issuer.' },
        { status: 401 },
      );
    }

    // Must not be expired (Google already validates the signature)
    const expMs = Number(tokenInfo.exp) * 1000;
    if (!Number.isFinite(expMs) || expMs < Date.now()) {
      return NextResponse.json(
        { success: false, error: 'Your Google session has expired. Please sign in again.' },
        { status: 401 },
      );
    }

    // ── Extract and validate the email ──
    const email = typeof tokenInfo.email === 'string' ? normalizeEmail(tokenInfo.email) : '';
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Your Google account does not have a usable email address.' },
        { status: 400 },
      );
    }

    const emailVerified = tokenInfo.email_verified === true || tokenInfo.email_verified === 'true';
    if (!emailVerified) {
      return NextResponse.json(
        { success: false, error: 'Please verify your email address with Google first, then try again.' },
        { status: 403 },
      );
    }

    const fullName = (tokenInfo.name || tokenInfo.given_name || email.split('@')[0]).slice(0, 100);

    // ── Find or create the user (link by email) ──
    let user = await db.user.findUnique({
      where: { email },
      include: { profile: true, company: true },
    });

    if (!user) {
      // First Google sign-in: auto-create a personal account with an
      // unguessable password (the user signs in via Google, not password).
      const randomPasswordHash = await bcryptjs.hash(crypto.randomBytes(32).toString('hex'), 10);
      user = await db.user.create({
        data: {
          email,
          passwordHash: randomPasswordHash,
          role: 'user',
          accountType: 'personal',
          emailVerified: true,
          status: 'active',
          profile: {
            create: {
              fullName,
              verified: true, // Social logins are pre-verified
            },
          },
        },
        include: { profile: true, company: true },
      });
    } else {
      // Email already registered (password account) — link it and trust
      // Google's verification of the address.
      if (!user.emailVerified) {
        await db.user.update({ where: { id: user.id }, data: { emailVerified: true } });
        user = { ...user, emailVerified: true };
      }
    }

    // ── Check account status ──
    if (user.status === 'suspended' || user.status === 'banned') {
      return NextResponse.json(
        { success: false, error: 'Your account has been suspended. Please contact support.' },
        { status: 403 },
      );
    }

    // ── Issue the app's standard JWT ──
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      tokenVersion: user.tokenVersion ?? 0,
    });

    // ── Audit log (non-critical) ──
    try {
      await auditLog({
        userId: user.id,
        action: 'login',
        resource: 'user',
        resourceId: user.id,
        companyId: user.companyId || undefined,
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
        metadata: { success: true, method: 'google' },
      });
    } catch {
      // ignore audit failures
    }

    const { passwordHash: _omit, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      data: { token, user: safeUser },
    });
  } catch (error) {
    console.error('Google sign-in error:', error);
    return NextResponse.json(
      { success: false, error: 'Google sign-in failed. Please try again or use email & password.' },
      { status: 500 },
    );
  }
}
