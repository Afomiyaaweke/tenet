import { NextRequest, NextResponse } from 'next/server';
import { requireTeamAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

// ── System default rate limit configs (same as middleware.ts) ────────────────
const SYSTEM_DEFAULTS: Record<string, { limit: number; windowMs: number; strategy: string }> = {
  '/api/auth/login': { limit: 5, windowMs: 60000, strategy: 'sliding_window' },
  '/api/auth/register': { limit: 3, windowMs: 60000, strategy: 'sliding_window' },
  '/api/auth/forgot-password': { limit: 3, windowMs: 60000, strategy: 'sliding_window' },
  '/api/auth/reset-password': { limit: 3, windowMs: 60000, strategy: 'sliding_window' },
  '/api/ai/': { limit: 10, windowMs: 60000, strategy: 'token_bucket' },
  '/api/agent': { limit: 15, windowMs: 60000, strategy: 'token_bucket' },
  '/api/documents/generate': { limit: 5, windowMs: 60000, strategy: 'sliding_window' },
  '/api/documents/ai-extract': { limit: 8, windowMs: 60000, strategy: 'sliding_window' },
  '/api/document-ocr/': { limit: 5, windowMs: 60000, strategy: 'sliding_window' },
  '/api/bid-analysis': { limit: 5, windowMs: 60000, strategy: 'sliding_window' },
  '/api/bids': { limit: 20, windowMs: 60000, strategy: 'sliding_window' },
  '/api/tenders': { limit: 30, windowMs: 60000, strategy: 'sliding_window' },
  '/api/chats/': { limit: 30, windowMs: 60000, strategy: 'sliding_window' },
  '/api/conversations': { limit: 30, windowMs: 60000, strategy: 'sliding_window' },
  '/api/social/': { limit: 20, windowMs: 60000, strategy: 'fixed_window' },
  '/api/contact': { limit: 3, windowMs: 60000, strategy: 'sliding_window' },
  '/api/comments': { limit: 10, windowMs: 60000, strategy: 'sliding_window' },
  '/api/': { limit: 60, windowMs: 60000, strategy: 'sliding_window' },
};

/**
 * GET /api/rate-limits
 * Get all rate limit configs + live stats from middleware
 */
export async function GET(request: NextRequest) {
  const auth = await requireTeamAdmin(request);
  if (auth.error) return auth.error;

  try {
    // Get database-stored configs
    const dbConfigs = await db.rateLimitConfig.findMany({
      orderBy: { endpoint: 'asc' },
    });

    // Get live stats from middleware (in-memory), fall back to empty
    const stats = globalThis.__rateLimitStats || { totalRequests: 0, blockedRequests: 0, byEndpoint: {} };
    // Get live config from middleware, fall back to system defaults
    const liveConfig = globalThis.__rateLimitConfig || SYSTEM_DEFAULTS;

    // Merge system defaults, live config, and DB configs
    const allEndpoints = new Set([
      ...Object.keys(SYSTEM_DEFAULTS),
      ...Object.keys(liveConfig),
      ...dbConfigs.map(c => c.endpoint),
    ]);

    const configs = Array.from(allEndpoints).map(endpoint => {
      const systemDefault = SYSTEM_DEFAULTS[endpoint];
      const live = liveConfig[endpoint];
      const dbConfig = dbConfigs.find(c => c.endpoint === endpoint);
      const stat = stats.byEndpoint?.[endpoint] || { total: 0, blocked: 0 };

      return {
        endpoint,
        limit: dbConfig?.maxRequests || live?.limit || systemDefault?.limit || 60,
        windowMs: dbConfig?.windowMs || live?.windowMs || systemDefault?.windowMs || 60000,
        strategy: dbConfig?.strategy || live?.strategy || systemDefault?.strategy || 'sliding_window',
        active: dbConfig?.active ?? true,
        source: dbConfig ? 'database' as const : 'system' as const,
        stats: {
          totalRequests: stat.total || 0,
          blockedRequests: stat.blocked || 0,
          blockRate: (stat.total || 0) > 0 ? (((stat.blocked || 0) / stat.total) * 100).toFixed(1) : '0',
          lastBlockedAt: stat.lastBlockedAt || null,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        configs,
        overview: {
          totalRequests: stats.totalRequests || 0,
          blockedRequests: stats.blockedRequests || 0,
          blockRate: (stats.totalRequests || 0) > 0 ? (((stats.blockedRequests || 0) / stats.totalRequests) * 100).toFixed(2) : '0',
          activeEndpoints: configs.filter(c => c.active).length,
          totalEndpoints: configs.length,
        },
      },
    });
  } catch (error) {
    console.error('Rate limits GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch rate limits' }, { status: 500 });
  }
}

/**
 * POST /api/rate-limits
 * Create or update a rate limit config
 */
export async function POST(request: NextRequest) {
  const auth = await requireTeamAdmin(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { endpoint, maxRequests, windowMs, strategy, active } = body;

    if (!endpoint || !maxRequests || !windowMs) {
      return NextResponse.json(
        { success: false, error: 'Endpoint, maxRequests, and windowMs are required' },
        { status: 400 },
      );
    }

    const validStrategies = ['sliding_window', 'fixed_window', 'token_bucket'];
    if (strategy && !validStrategies.includes(strategy)) {
      return NextResponse.json(
        { success: false, error: `Strategy must be one of: ${validStrategies.join(', ')}` },
        { status: 400 },
      );
    }

    const config = await db.rateLimitConfig.upsert({
      where: { endpoint },
      update: {
        maxRequests: Number(maxRequests),
        windowMs: Number(windowMs),
        strategy: strategy || 'sliding_window',
        active: active !== undefined ? Boolean(active) : true,
      },
      create: {
        endpoint,
        maxRequests: Number(maxRequests),
        windowMs: Number(windowMs),
        strategy: strategy || 'sliding_window',
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    // Update live middleware config
    const liveConfig = globalThis.__rateLimitConfig || {};
    liveConfig[endpoint] = {
      limit: config.maxRequests,
      windowMs: config.windowMs,
      strategy: config.strategy,
    };
    globalThis.__rateLimitConfig = liveConfig;

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Rate limits POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save rate limit config' }, { status: 500 });
  }
}

/**
 * DELETE /api/rate-limits
 * Delete a rate limit config (reverts to system default)
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireTeamAdmin(request);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json({ success: false, error: 'Endpoint is required' }, { status: 400 });
    }

    await db.rateLimitConfig.deleteMany({ where: { endpoint } });

    return NextResponse.json({ success: true, message: `Rate limit config for ${endpoint} deleted` });
  } catch (error) {
    console.error('Rate limits DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete rate limit config' }, { status: 500 });
  }
}

/**
 * PATCH /api/rate-limits
 * Reset stats
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireTeamAdmin(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'reset-stats') {
      globalThis.__rateLimitStats = { totalRequests: 0, blockedRequests: 0, byEndpoint: {} };
      return NextResponse.json({ success: true, message: 'Rate limit stats reset' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Rate limits PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to perform action' }, { status: 500 });
  }
}
