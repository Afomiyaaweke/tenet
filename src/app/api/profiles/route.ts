import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/profiles
 * Admin: list all profiles
 * Contractor/Tender Owner: own profile only
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    if (user!.role === 'admin') {
      // Admin can see all profiles
      const profiles = await db.profile.findMany({
        include: { user: { select: { id: true, email: true, role: true, status: true } } },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({
        success: true,
        data: profiles,
      });
    } else {
      // Non-admin users can only see their own profile
      const profile = await db.profile.findUnique({
        where: { userId: user!.id },
        include: { user: { select: { id: true, email: true, role: true, status: true } } },
      });

      if (!profile) {
        return NextResponse.json(
          { success: false, error: 'Profile not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: [profile],
      });
    }
  } catch (error) {
    console.error('Get profiles error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching profiles' },
      { status: 500 }
    );
  }
}
