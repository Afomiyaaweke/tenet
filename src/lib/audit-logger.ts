// ── Secure Audit Logger ───────────────────────────────────────────────────
// Logs security events with strict rules:
// - NEVER logs raw passwords or reset tokens
// - Always masks emails
// - Captures IP, user-agent, timestamps
// - Uses the AuditLog Prisma model

import { db } from '@/lib/db';
import { maskEmail } from './validators';

type AuditAction =
  | 'forgot_password_requested'
  | 'forgot_password_email_sent'
  | 'reset_token_validated'
  | 'reset_token_invalid'
  | 'reset_token_expired'
  | 'reset_token_reused'
  | 'password_reset_completed'
  | 'password_reset_failed'
  | 'password_in_history'
  | 'rate_limit_exceeded'
  | 'suspicious_activity'
  | 'login'
  | 'register'
  | 'session_invalidated';

interface AuditLogOptions {
  userId?: string;
  email?: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  companyId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write a security audit log entry.
 * All PII is masked before storage. Raw tokens/passwords are NEVER logged.
 */
export async function auditLog(options: AuditLogOptions): Promise<void> {
  try {
    // Sanitize metadata - strip any raw tokens or passwords
    const safeMetadata: Record<string, unknown> = {};
    if (options.metadata) {
      for (const [key, value] of Object.entries(options.metadata)) {
        const k = key.toLowerCase();
        if (k.includes('password') || k.includes('token') || k.includes('secret')) {
          safeMetadata[key] = '[REDACTED]';
        } else if (typeof value === 'string' && value.includes('@')) {
          safeMetadata[key] = maskEmail(value);
        } else {
          safeMetadata[key] = value;
        }
      }
    }

    await db.auditLog.create({
      data: {
        userId: options.userId || null,
        action: options.action,
        resource: options.resource || 'auth',
        resourceId: options.resourceId || (options.email ? maskEmail(options.email) : null),
        companyId: options.companyId || null,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent ? options.userAgent.substring(0, 500) : null,
        metadata: JSON.stringify(safeMetadata),
      },
    });
  } catch (err) {
    // Audit logging must never crash the app
    console.error('[AuditLogger] Failed to write log:', err);
  }
}
