import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { containsInsensitive } from '@/lib/search';

/**
 * GET /api/users/search?q=...
 * Search users by email or profile.fullName (case-insensitive, contains).
 * Limited to 10 results. Excludes the current user.
 * Returns { id, email, profile: { fullName, jobTitle, profilePhoto }, company: { id, name } }.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Use containsInsensitive for cross-database compatibility (SQLite + PostgreSQL).
    const users = await db.user.findMany({
      where: {
        id: { not: user!.id },
        OR: [
          { email: containsInsensitive(q) },
          { profile: { fullName: containsInsensitive(q) } },
        ],
      },
      take: 10,
      select: {
        id: true,
        email: true,
        profile: {
          select: {
            fullName: true,
            jobTitle: true,
            profilePhoto: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { email: 'asc' },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (err) {
    console.error('Search users error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while searching users' },
      { status: 500 }
    );
  }
}
