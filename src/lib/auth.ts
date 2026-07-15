import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { db } from './db';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  company: string | null;
}

export function signToken(payload: { userId: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

/**
 * Extract the auth token from cookies or Authorization header
 */
export async function extractToken(request?: NextRequest): Promise<string | null> {
  // Try Authorization header first (Bearer token from localStorage)
  if (request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
  }

  // Try cookie
  try {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('tenet_token')?.value;
    if (cookieToken) return cookieToken;
  } catch {
    // cookies() may not be available in some contexts
  }

  return null;
}

/**
 * Get the authenticated user - checks both cookies and Authorization header
 */
export async function getAuthUser(request?: NextRequest): Promise<AuthUser | null> {
  try {
    const token = await extractToken(request);
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true, company: true },
    });

    return user;
  } catch {
    return null;
  }
}

export async function requireAuth(request?: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(request);
  if (!user) throw new Error('Unauthorized');
  return user;
}
