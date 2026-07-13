import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/social/endorsements
 * Get endorsements for a user, grouped by skill.
 * Query params: userId (required - the user to get endorsements for)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get all endorsements for the user
    const endorsements = await db.endorsement.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: {
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
                industry: true,
              },
            },
          },
        },
      },
    });

    // Check which skills the current user has already endorsed
    const currentUserEndorsements = endorsements.filter(
      (e) => e.fromUserId === user!.id
    );
    const endorsedSkillSet = new Set(currentUserEndorsements.map((e) => e.skill));

    // Group endorsements by skill
    const groupedBySkill = new Map<
      string,
      {
        skill: string;
        count: number;
        endorsers: Array<{
          id: string;
          fullName: string;
          jobTitle: string | null;
          profilePhoto: string | null;
          company: { id: string; name: string; industry: string } | null;
          endorsedAt: Date;
        }>;
        hasEndorsed: boolean;
      }
    >();

    for (const endorsement of endorsements) {
      const existing = groupedBySkill.get(endorsement.skill);
      const fromProfile = endorsement.fromUser.profile;
      const endorserInfo = {
        id: endorsement.fromUser.id,
        fullName: fromProfile?.fullName || 'Unknown',
        jobTitle: fromProfile?.jobTitle || null,
        profilePhoto: fromProfile?.profilePhoto || null,
        company: endorsement.fromUser.company
          ? {
              id: endorsement.fromUser.company.id,
              name: endorsement.fromUser.company.name,
              industry: endorsement.fromUser.company.industry,
            }
          : null,
        endorsedAt: endorsement.createdAt,
      };

      if (existing) {
        existing.count++;
        existing.endorsers.push(endorserInfo);
        if (endorsement.fromUserId === user!.id) {
          existing.hasEndorsed = true;
        }
      } else {
        groupedBySkill.set(endorsement.skill, {
          skill: endorsement.skill,
          count: 1,
          endorsers: [endorserInfo],
          hasEndorsed: endorsement.fromUserId === user!.id,
        });
      }
    }

    // Convert to array sorted by count (most endorsed first)
    const skills = Array.from(groupedBySkill.values()).sort(
      (a, b) => b.count - a.count
    );

    return NextResponse.json({
      success: true,
      data: {
        userId,
        totalEndorsements: endorsements.length,
        totalSkills: skills.length,
        skills,
        currentUserEndorsedSkills: Array.from(endorsedSkillSet),
      },
    });
  } catch (err) {
    console.error('Get endorsements error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching endorsements' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/endorsements
 * Endorse a user's skill.
 * Body: { toUserId: string, skill: string }
 * A user can only endorse each skill for a user once.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { toUserId, skill } = body as {
      toUserId?: string;
      skill?: string;
    };

    if (!toUserId || typeof toUserId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'toUserId is required' },
        { status: 400 }
      );
    }

    if (!skill || typeof skill !== 'string' || skill.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Skill is required' },
        { status: 400 }
      );
    }

    const trimmedSkill = skill.trim();
    if (trimmedSkill.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Skill name must be 100 characters or less' },
        { status: 400 }
      );
    }

    if (toUserId === user!.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot endorse yourself' },
        { status: 400 }
      );
    }

    // Verify target user exists
    const targetUser = await db.user.findUnique({
      where: { id: toUserId },
      select: { id: true, status: true, profile: { select: { skillTags: true } } },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already endorsed this skill for this user
    const existingEndorsement = await db.endorsement.findUnique({
      where: {
        fromUserId_toUserId_skill: {
          fromUserId: user!.id,
          toUserId,
          skill: trimmedSkill,
        },
      },
    });

    if (existingEndorsement) {
      return NextResponse.json(
        {
          success: false,
          error: 'You have already endorsed this skill for this user',
        },
        { status: 409 }
      );
    }

    const endorsement = await db.endorsement.create({
      data: {
        fromUserId: user!.id,
        toUserId,
        skill: trimmedSkill,
      },
      include: {
        fromUser: {
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
                industry: true,
              },
            },
          },
        },
        toUser: {
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
        },
      },
    });

    return NextResponse.json(
      { success: true, data: endorsement },
      { status: 201 }
    );
  } catch (err) {
    console.error('Create endorsement error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while creating the endorsement' },
      { status: 500 }
    );
  }
}
