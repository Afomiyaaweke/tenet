import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET must be set in production. Generate one with: openssl rand -base64 48');
    }
    console.warn('WARNING: JWT_SECRET not set. Using development-only secret. This MUST be set in production!');
    return 'dev-only-secret-do-not-use-in-production-environment-32ch';
  }
  if (secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters long');
  return secret;
}

// ── Lightweight auth cache ────────────────────────────────────────────────
// Avoids a 3-table JOIN on every authenticated request.
// In production, replace with Redis. This in-process cache works for single-instance.
//
// IMPORTANT: For multi-instance production deployments with 2000+ concurrent users,
// this in-memory cache will NOT be shared across Vercel serverless invocations.
// Each cold start gets a fresh empty cache. Use Redis-backed caching (Upstash Redis
// or Vercel KV) for distributed, persistent session/auth caching in production.
// This in-process cache is kept as a per-invocation optimization to reduce DB
// load within a single serverless function lifetime.
const AUTH_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes — shorter TTL clears stale data faster at scale
const MAX_AUTH_CACHE_SIZE = 2000; // Cap cache size for 2000 concurrent users, prevent unbounded growth

// Explicit type for the auth user with includes
export type AuthUser = {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  companyId: string | null;
  status: string;
  plan: string;
  emailVerified: boolean;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
  profile: {
    id: string;
    userId: string;
    companyId: string | null;
    fullName: string;
    jobTitle: string | null;
    phone: string | null;
    location: string | null;
    address: string | null;
    tinNumber: string | null;
    licenseNumber: string | null;
    skillTags: string;
    bio: string | null;
    logoUrl: string | null;
    profilePhoto: string | null;
    verified: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  company: {
    id: string;
    name: string;
    registrationNo: string | null;
    industry: string;
    tinNumber: string | null;
    address: string | null;
    city: string | null;
    country: string;
    phone: string | null;
    email: string | null;
    website: string | null;
    logoUrl: string | null;
    verified: boolean;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

interface CachedAuthUser {
  user: AuthUser;
  cachedAt: number;
}
const authCache = new Map<string, CachedAuthUser>();

/**
 * Evict entries when the cache exceeds MAX_AUTH_CACHE_SIZE.
 * Strategy: remove expired entries first, then evict the oldest (LRU-like).
 */
function evictCacheIfNeeded(): void {
  if (authCache.size <= MAX_AUTH_CACHE_SIZE) return;

  // First pass: remove all expired entries
  const now = Date.now();
  for (const [key, entry] of authCache.entries()) {
    if (now - entry.cachedAt > AUTH_CACHE_TTL_MS) {
      authCache.delete(key);
    }
  }

  // If still over limit after clearing expired, remove oldest entries (LRU-like)
  if (authCache.size > MAX_AUTH_CACHE_SIZE) {
    const entries = [...authCache.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    const excess = authCache.size - MAX_AUTH_CACHE_SIZE;
    for (let i = 0; i < excess; i++) {
      authCache.delete(entries[i][0]);
    }
  }
}

// Periodic cleanup of expired entries — every 30s for 2000-user scale
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of authCache.entries()) {
      if (now - entry.cachedAt > AUTH_CACHE_TTL_MS) {
        authCache.delete(key);
      }
    }
    // Also enforce size limit during periodic cleanup
    evictCacheIfNeeded();
  }, 30 * 1000);
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  companyId?: string | null;
  tokenVersion?: number;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, tokenVersion: payload.tokenVersion ?? 0 }, getSecret(), { expiresIn: '24h' });
}

/**
 * Verify a JWT token and return the decoded payload
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getSecret()) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Extract the Bearer token from the Authorization header
 */
export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

/**
 * Get the current authenticated user from the request.
 * Returns the user with profile and company, or null if not authenticated.
 * Uses an in-process cache (3-min TTL) to avoid DB queries on every request.
 * For multi-instance deployments, replace with Redis-backed cache (Upstash/Vercel KV).
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  // Check cache first
  const cacheKey = payload.userId;
  const cached = authCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < AUTH_CACHE_TTL_MS) {
    // Check tokenVersion to invalidate JWTs issued before a password reset
    if (payload.tokenVersion !== undefined && cached.user.tokenVersion !== undefined && payload.tokenVersion !== cached.user.tokenVersion) {
      authCache.delete(cacheKey);
      return null;
    }
    return cached.user;
  }

  // Cache miss - query DB
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    include: { profile: true, company: true },
  });

  if (!user) return null;

  // Check tokenVersion — if the JWT was issued before a password reset, reject it
  if (payload.tokenVersion !== undefined && user.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
    return null;
  }

  // Update cache (cast to AuthUser since we know the shape matches)
  authCache.set(cacheKey, { user: user as AuthUser, cachedAt: Date.now() });
  evictCacheIfNeeded();

  return user as AuthUser;
}

/**
 * Require authentication - returns user or a JSON error response
 */
export async function requireAuth(request: NextRequest): Promise<{ user: AuthUser; error: null } | { user: null; error: Response }> {
  const user = await getAuthUser(request);
  if (!user) {
    return { user: null, error: Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user, error: null };
}

/**
 * Require team_admin role - returns user or a JSON error response
 */
export async function requireTeamAdmin(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult.error) return authResult;

  if (authResult.user!.role !== 'team_admin') {
    return { user: null, error: Response.json({ success: false, error: 'Forbidden: Team admin access required' }, { status: 403 }) };
  }

  return authResult;
}

/**
 * Require admin role (team_admin) - alias for requireTeamAdmin
 * Used by routes that need admin-level access (create tenders, manage projects, etc.)
 */
export const requireAdmin = requireTeamAdmin;

/**
 * Invalidate the auth cache for a specific user.
 * Used after password reset to force re-authentication on all devices.
 */
export function invalidateAuthCache(userId: string): void {
  authCache.delete(userId);
}

/**
 * Invalidate all auth cache entries.
 * Used for global session invalidation.
 */
export function invalidateAllAuthCache(): void {
  authCache.clear();
}
