import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredTokens } from '@/lib/token-service';
import { requireAdmin } from '@/lib/auth';

/**
 * Clean up expired password reset tokens.
 * Should be called periodically (e.g., via cron job or scheduled task).
 * Requires admin authentication.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const deletedCount = await cleanupExpiredTokens();

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired token(s)`,
      deletedCount,
    });
  } catch (err) {
    console.error('[POST /api/auth/cleanup-tokens] error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 },
    );
  }
}
