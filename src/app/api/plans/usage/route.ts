import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUsageSummary, getPlanForUser } from '@/lib/rate-limiter';

/**
 * GET /api/plans/usage
 * Get current usage statistics for the authenticated user
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const userId = auth.user.id;
    const plan = auth.user.plan || 'free';
    const planDef = getPlanForUser(plan);
    const usage = getUsageSummary(userId, plan);

    // Calculate total usage
    const totalUsed = usage.reduce((sum, u) => sum + u.used, 0);
    const totalLimit = usage.reduce((sum, u) => sum + (u.unlimited ? Infinity : u.limit), 0);

    return NextResponse.json({
      success: true,
      data: {
        plan: planDef,
        usage,
        totalUsed,
        totalLimit: totalLimit === Infinity ? -1 : totalLimit,
        summary: {
          aiCallsToday: usage.find(u => u.category === 'ai')?.used || 0,
          aiCallLimit: planDef.aiCallsPerDay,
          apiCallsMinute: usage.find(u => u.category === 'api_general')?.used || 0,
          apiCallLimit: planDef.limits.api_general,
        },
      },
    });
  } catch (error) {
    console.error('Usage GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch usage' }, { status: 500 });
  }
}
