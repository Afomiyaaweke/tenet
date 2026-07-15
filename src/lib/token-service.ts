// ── Token Service ────────────────────────────────────────────────────────
// Generates, hashes, validates, and manages password reset tokens.
// Raw tokens are NEVER stored in the database - only SHA-256 hashes.

import crypto from 'crypto';
import { db } from '@/lib/db';

const RESET_TOKEN_BYTES = 32;         // 256-bit token
const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const MAX_PASSWORD_HISTORY = 10;       // Keep last 10 password hashes

/**
 * Generate a cryptographically secure random reset token.
 * Returns both the raw token (to send via email) and its SHA-256 hash (to store in DB).
 */
export function generateResetToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Hash a raw token with SHA-256 for database storage.
 * This is a one-way hash - the raw token cannot be recovered from it.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Create a new password reset token for a user.
 * Invalidates all previous unused tokens for this user first.
 */
export async function createResetToken(
  userId: string,
  requestIP: string | null,
  userAgent: string | null,
): Promise<{ rawToken: string; tokenHash: string }> {
  // Invalidate all previous unused tokens for this user
  await db.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const { rawToken, tokenHash } = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  await db.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      requestIP,
      userAgent,
    },
  });

  return { rawToken, tokenHash };
}

/**
 * Validate a raw reset token.
 * Returns the token record if valid, or null if invalid/expired/used.
 * On success, the token is immediately marked as used (single-use).
 * NEVER reveals WHY validation failed - returns null for all failure cases.
 */
export async function validateAndConsumeResetToken(rawToken: string): Promise<{
  userId: string;
  requestIP: string | null;
} | null> {
  const tokenHash = hashToken(rawToken);

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record) return null;

  // Already used
  if (record.usedAt) return null;

  // Expired
  if (new Date() > record.expiresAt) return null;

  // Mark as used immediately (single-use)
  await db.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return { userId: record.userId, requestIP: record.requestIP };
}

/**
 * Clean up expired reset tokens. Should be called periodically.
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await db.passwordResetToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

/**
 * Add a password hash to the user's password history.
 */
export async function addPasswordHistory(userId: string, passwordHash: string): Promise<void> {
  await db.passwordHistory.create({
    data: { userId, passwordHash },
  });

  // Keep only the last N entries
  const entries = await db.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: MAX_PASSWORD_HISTORY + 1,
    skip: MAX_PASSWORD_HISTORY,
  });

  if (entries.length > 0) {
    await db.passwordHistory.deleteMany({
      where: { id: { in: entries.map(e => e.id) } },
    });
  }
}

/**
 * Check if a new password matches any of the user's previous passwords.
 */
export async function isPasswordInHistory(
  userId: string,
  newPassword: string,
): Promise<boolean> {
  const history = await db.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: MAX_PASSWORD_HISTORY,
  });

  const bcrypt = await import('bcryptjs');
  for (const entry of history) {
    const matches = await bcrypt.compare(newPassword, entry.passwordHash);
    if (matches) return true;
  }
  return false;
}
