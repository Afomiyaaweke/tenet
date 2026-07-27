/**
 * TenetBid Rate Limiter — Per-Plan Enforcement
 *
 * Enforces rate limits based on the user's subscription plan:
 * - Free: Strict limits (basic access)
 * - Pro: Enhanced limits (advanced features)
 * - Enterprise: Unlimited / generous limits (full access)
 */

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// ─── Plan Definitions ─────────────────────────────────────────────────

export interface PlanDefinition {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: string;
  description: string;
  features: string[];
  limits: Record<string, number>; // category → max requests per window
  aiCallsPerDay: number;
  maxTenders: number;
  maxBids: number;
  maxProjects: number;
  maxDocuments: number;
  maxTeamMembers: number;
  prioritySupport: boolean;
  customAiPrompts: boolean;
  apiAccess: boolean;
  highlight: boolean; // recommended plan
  badge: string;
  badgeColor: string;
}

export const PLANS: Record<string, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    description: 'Get started with basic procurement tools. Perfect for individuals exploring the platform.',
    features: [
      'Browse & search tenders',
      'Submit up to 3 bids per month',
      'Basic document storage (5 docs)',
      'Community support',
      '1 team member',
      'Standard rate limits',
    ],
    limits: {
      api_general: 60,    // 60 req/min general API
      ai: 5,              // 5 AI calls/min
      documents: 10,      // 10 doc ops/min
      bids: 15,           // 15 bid ops/min
      tenders: 30,        // 30 tender ops/min
      chat: 20,           // 20 chat ops/min
      social: 15,         // 15 social ops/min
      auth: 5,            // 5 auth ops/min (login/register)
    },
    aiCallsPerDay: 10,
    maxTenders: 10,
    maxBids: 3,
    maxProjects: 1,
    maxDocuments: 5,
    maxTeamMembers: 1,
    prioritySupport: false,
    customAiPrompts: false,
    apiAccess: false,
    highlight: false,
    badge: 'Free',
    badgeColor: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    currency: 'USD',
    billingCycle: 'monthly',
    description: 'Unlock advanced AI tools and higher limits. Ideal for growing teams and active bidders.',
    features: [
      'Unlimited tender browsing & search',
      'Submit up to 20 bids per month',
      'Advanced AI document studio',
      'AI bid preparation & analysis',
      '50 document storage',
      'Up to 5 team members',
      'Priority email support',
      'Custom AI prompts',
      'Export to PDF/Excel',
      'Enhanced rate limits',
    ],
    limits: {
      api_general: 120,   // 120 req/min general API
      ai: 20,             // 20 AI calls/min
      documents: 30,      // 30 doc ops/min
      bids: 30,           // 30 bid ops/min
      tenders: 60,        // 60 tender ops/min
      chat: 40,           // 40 chat ops/min
      social: 30,         // 30 social ops/min
      auth: 10,           // 10 auth ops/min
    },
    aiCallsPerDay: 100,
    maxTenders: 50,
    maxBids: 20,
    maxProjects: 10,
    maxDocuments: 50,
    maxTeamMembers: 5,
    prioritySupport: true,
    customAiPrompts: true,
    apiAccess: true,
    highlight: true,
    badge: 'Pro',
    badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    currency: 'USD',
    billingCycle: 'monthly',
    description: 'Full access with unlimited capacity. Built for large organizations with high-volume procurement.',
    features: [
      'Unlimited everything — bids, tenders, projects',
      'Unlimited AI calls & custom prompts',
      'Unlimited document storage',
      'Unlimited team members',
      'Dedicated account manager',
      '24/7 priority support',
      'Custom integrations & API access',
      'SSO & advanced security',
      'Custom rate limits',
      'White-label options',
    ],
    limits: {
      api_general: 300,   // 300 req/min general API
      ai: 60,             // 60 AI calls/min
      documents: 100,     // 100 doc ops/min
      bids: 60,           // 60 bid ops/min
      tenders: 120,       // 120 tender ops/min
      chat: 80,           // 80 chat ops/min
      social: 60,         // 60 social ops/min
      auth: 20,           // 20 auth ops/min
    },
    aiCallsPerDay: -1,    // unlimited
    maxTenders: -1,       // unlimited
    maxBids: -1,          // unlimited
    maxProjects: -1,      // unlimited
    maxDocuments: -1,     // unlimited
    maxTeamMembers: -1,   // unlimited
    prioritySupport: true,
    customAiPrompts: true,
    apiAccess: true,
    highlight: false,
    badge: 'Enterprise',
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  },
};

// ─── Category mapping from endpoint path ──────────────────────────────

const ENDPOINT_CATEGORY_MAP: Record<string, string> = {
  '/api/auth/': 'auth',
  '/api/ai/': 'ai',
  '/api/agent': 'ai',
  '/api/documents/': 'documents',
  '/api/document-ocr/': 'documents',
  '/api/document-review/': 'documents',
  '/api/bids/': 'bids',
  '/api/bid-analysis': 'bids',
  '/api/tenders/': 'tenders',
  '/api/chats/': 'chat',
  '/api/conversations/': 'chat',
  '/api/social/': 'social',
  '/api/contact': 'api_general',
  '/api/comments/': 'api_general',
  '/api/projects/': 'api_general',
  '/api/events/': 'api_general',
  '/api/companies/': 'api_general',
  '/api/profiles/': 'api_general',
  '/api/users/': 'api_general',
  '/api/staff/': 'api_general',
  '/api/notifications/': 'api_general',
};

export function categorizeEndpoint(path: string): string {
  // Check specific paths first (longer paths are more specific)
  const sortedPaths = Object.keys(ENDPOINT_CATEGORY_MAP).sort((a, b) => b.length - a.length);
  for (const prefix of sortedPaths) {
    if (path.startsWith(prefix)) return ENDPOINT_CATEGORY_MAP[prefix];
  }
  return 'api_general';
}

// ─── In-memory rate limit tracker (fast, per-process) ──────────────────

interface RateLimitEntry {
  count: number;
  windowStart: number; // epoch ms
}

// Map: `${userId}:${category}` → RateLimitEntry
const rateLimitMap = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000; // 1-minute rolling window

function getEntryKey(userId: string, category: string): string {
  return `${userId}:${category}`;
}

/**
 * Check and increment rate limit for a user+category.
 * Returns { allowed, remaining, resetAt, limit } headers.
 */
export function checkRateLimit(userId: string, plan: string, category: string): {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number; // epoch ms when window resets
} {
  const planDef = PLANS[plan] || PLANS.free;
  const limit = planDef.limits[category] || planDef.limits.api_general || 60;

  const key = getEntryKey(userId, category);
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    // New window
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, limit, resetAt: now + WINDOW_MS };
  }

  if (entry.count >= limit) {
    // Rate limited
    return { allowed: false, remaining: 0, limit, resetAt: entry.windowStart + WINDOW_MS };
  }

  // Increment
  entry.count++;
  return { allowed: true, remaining: limit - entry.count, limit, resetAt: entry.windowStart + WINDOW_MS };
}

/**
 * Middleware-style rate limit check for API routes.
 * Can be called at the top of any route handler.
 * Returns null if allowed, or a NextResponse (429) if blocked.
 */
export async function enforceRateLimit(
  request: NextRequest,
  userId: string,
  plan: string,
): Promise<NextResponse | null> {
  const path = new URL(request.url).pathname;
  const category = categorizeEndpoint(path);
  const result = checkRateLimit(userId, plan, category);

  if (!result.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded',
        message: `You've reached the ${result.limit} requests per minute limit for ${category} on the ${plan} plan. Upgrade your plan for higher limits.`,
        plan,
        category,
        limit: result.limit,
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  // Add rate limit headers to the response — but we return null here
  // The route handler will add these headers to its own response
  return null;
}

/**
 * Get rate limit headers to add to successful responses.
 */
export function getRateLimitHeaders(userId: string, plan: string, category: string): Record<string, string> {
  const planDef = PLANS[plan] || PLANS.free;
  const limit = planDef.limits[category] || planDef.limits.api_general || 60;
  const key = getEntryKey(userId, category);
  const entry = rateLimitMap.get(key);
  const used = entry?.count || 0;
  const now = Date.now();
  const resetAt = entry ? entry.windowStart + WINDOW_MS : now + WINDOW_MS;

  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, limit - used)),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
    'X-RateLimit-Plan': plan,
  };
}

// ─── Usage tracking for dashboard display ──────────────────────────────

export interface UsageSummary {
  category: string;
  used: number;
  limit: number;
  percentage: number;
  unlimited: boolean;
}

export function getUsageSummary(userId: string, plan: string): UsageSummary[] {
  const planDef = PLANS[plan] || PLANS.free;
  const categories = Object.keys(planDef.limits);

  return categories.map(category => {
    const key = getEntryKey(userId, category);
    const entry = rateLimitMap.get(key);
    const used = entry?.count || 0;
    const limit = planDef.limits[category];
    const unlimited = limit === -1;

    return {
      category,
      used,
      limit,
      percentage: unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100)),
      unlimited,
    };
  });
}

/**
 * Get the plan definition for a user.
 */
export function getPlanForUser(plan: string): PlanDefinition {
  return PLANS[plan] || PLANS.free;
}

/**
 * Get all available plans for the pricing page.
 */
export function getAllPlans(): PlanDefinition[] {
  return Object.values(PLANS);
}
