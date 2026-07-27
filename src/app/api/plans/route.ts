import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, invalidateAuthCache } from '@/lib/auth';
import { db } from '@/lib/db';
import { PLANS, getPlanForUser, getAllPlans, getUsageSummary } from '@/lib/rate-limiter';

/**
 * GET /api/plans
 * Get all available plans + current user's plan + usage summary
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const userId = auth.user.id;
    const currentPlan = auth.user.plan || 'free';
    const planDef = getPlanForUser(currentPlan);
    const allPlans = getAllPlans();

    // Get or create subscription record
    let subscription = await db.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      subscription = await db.subscription.create({
        data: {
          userId,
          plan: currentPlan,
          status: 'active',
          billingCycle: 'monthly',
          amount: 0,
        },
      });
    }

    // Get usage summary
    const usage = getUsageSummary(userId, currentPlan);

    return NextResponse.json({
      success: true,
      data: {
        currentPlan: planDef,
        subscription,
        allPlans,
        usage,
        planName: currentPlan,
      },
    });
  } catch (error) {
    console.error('Plans GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch plans' }, { status: 500 });
  }
}

/**
 * POST /api/plans
 * Upgrade/downgrade user's plan (creates subscription record)
 * For now this is a "manual upgrade" — Stripe integration would replace this
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const userId = auth.user.id;
    const body = await request.json();
    const { plan } = body;

    if (!plan || !PLANS[plan]) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan. Choose: free, pro, or enterprise' },
        { status: 400 },
      );
    }

    const planDef = PLANS[plan];

    // Update user's plan
    await db.user.update({
      where: { id: userId },
      data: { plan },
    });

    // Invalidate auth cache so next /api/auth/me returns updated plan
    invalidateAuthCache(userId);

    // Update or create subscription
    const existingSub = await db.subscription.findUnique({ where: { userId } });

    if (existingSub) {
      await db.subscription.update({
        where: { userId },
        data: {
          plan,
          status: plan === 'free' ? 'active' : 'active',
          amount: planDef.price,
          billingCycle: planDef.billingCycle,
          startDate: new Date(),
          endDate: plan === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          updatedAt: new Date(),
        },
      });
    } else {
      await db.subscription.create({
        data: {
          userId,
          plan,
          status: 'active',
          amount: planDef.price,
          billingCycle: planDef.billingCycle,
          startDate: new Date(),
          endDate: plan === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId,
        action: `plan_upgrade_${plan}`,
        resource: 'subscription',
        companyId: auth.user.companyId,
        metadata: JSON.stringify({ fromPlan: auth.user.plan, toPlan: plan, amount: planDef.price }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        plan,
        planDef,
        message: plan === 'free'
          ? 'Plan switched to Free tier'
          : `Plan upgraded to ${planDef.name} ($${planDef.price}/${planDef.billingCycle}). In production, this would redirect to Stripe checkout.`,
      },
    });
  } catch (error) {
    console.error('Plans POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update plan' }, { status: 500 });
  }
}
