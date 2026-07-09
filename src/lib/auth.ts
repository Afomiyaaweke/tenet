import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '24h'; // Reduced from 7d for better security

function getSecret(): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is not set');
  if (JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters long');
  return JWT_SECRET;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  companyId?: string | null;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRY });
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
 */
export async function getAuthUser(request: NextRequest) {
  const token = extractBearerToken(request);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    include: { profile: true, company: true },
  });

  if (!user) return null;

  return user;
}

/**
 * Require authentication - returns user or a JSON error response
 */
export async function requireAuth(request: NextRequest) {
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
