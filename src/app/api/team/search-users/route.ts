import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/team/search-users?q=email
 * Search for users in the same company who are NOT yet team members.
 * Used for the "Add Member" dropdown.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const companyId = user!.companyId;
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'You are not associated with a company' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';

    // Get all company users
    const where: Record<string, unknown> = {
      companyId,
      status: 'active',
    };

    if (q) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { profile: { fullName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const companyUsers = await db.user.findMany({
      where,
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
      },
      take: 20,
    });

    // Filter out users who are already active team members
    const existingMembers = await db.teamMember.findMany({
      where: { companyId, status: 'active' },
      select: { userId: true },
    });
    const memberIds = new Set(existingMembers.map((m) => m.userId));

    const available = companyUsers.filter((u) => !memberIds.has(u.id));

    return NextResponse.json({ success: true, data: available });
  } catch (err) {
    console.error('Search users for team error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to search users' },
      { status: 500 }
    );
  }
}
