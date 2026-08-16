import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { containsInsensitive } from '@/lib/search';

/**
 * GET /api/social/discover
 * Discover users - profiles with company info, connection status relative to
 * current user, endorsement counts, pagination.
 * Query params: page, limit, search (search by name/job title/company),
 *               industry (filter by company industry), skills (filter by skill tags)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '20', 10), 1),
      50
    );
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || undefined;
    const industry = searchParams.get('industry') || undefined;
    const skills = searchParams.get('skills') || undefined;

    // Build where clause for profiles
    const where: Record<string, unknown> = {
      userId: { not: user!.id }, // Exclude self
    };

    // Search filter: match against fullName, jobTitle, or company name
    if (search) {
      where.OR = [
        { fullName: containsInsensitive(search) },
        { jobTitle: containsInsensitive(search) },
        { bio: containsInsensitive(search) },
        { company: { name: containsInsensitive(search) } },
      ];
    }

    // Industry filter
    if (industry) {
      where.company = {
        ...(where.company as Record<string, unknown> || {}),
        industry: containsInsensitive(industry),
      };
    }

    // Skills filter
    if (skills) {
      where.skillTags = containsInsensitive(skills);
    }

    // Only show profiles of active users
    where.user = { status: 'active' };

    // Get current user's connections to determine connection status
    const sentConnections = await db.connection.findMany({
      where: { requesterId: user!.id },
      select: { receiverId: true, status: true, id: true },
    });
    const receivedConnections = await db.connection.findMany({
      where: { receiverId: user!.id },
      select: { requesterId: true, status: true, id: true },
    });

    // Build connection status maps
    const connectionMap = new Map<
      string,
      { status: string; direction: string; connectionId: string }
    >();

    for (const conn of sentConnections) {
      connectionMap.set(conn.receiverId, {
        status: conn.status,
        direction: 'sent',
        connectionId: conn.id,
      });
    }
    for (const conn of receivedConnections) {
      // If there's already a sent connection (shouldn't happen due to unique constraint,
      // but handle gracefully), prefer the existing one
      if (!connectionMap.has(conn.requesterId)) {
        connectionMap.set(conn.requesterId, {
          status: conn.status,
          direction: 'received',
          connectionId: conn.id,
        });
      }
    }

    // Get endorsement counts per user
    const endorsementCounts = await db.endorsement.groupBy({
      by: ['toUserId'],
      _count: { id: true },
    });
    const endorsementMap = new Map<string, number>();
    for (const ec of endorsementCounts) {
      endorsementMap.set(ec.toUserId, ec._count.id);
    }

    // Get endorsement breakdown by skill per user (for top users in results)
    // We'll do this after getting profile results to avoid massive queries

    const [profiles, total] = await Promise.all([
      db.profile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              role: true,
              status: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              industry: true,
              verified: true,
              logoUrl: true,
            },
          },
        },
      }),
      db.profile.count({ where }),
    ]);

    // Get endorsement skill breakdown for discovered users
    const discoveredUserIds = profiles.map((p) => p.userId);
    const skillEndorsements = discoveredUserIds.length > 0
      ? await db.endorsement.groupBy({
          by: ['toUserId', 'skill'],
          where: { toUserId: { in: discoveredUserIds } },
          _count: { id: true },
          orderBy: { toUserId: 'asc' },
        })
      : [];

    // Build per-user skill endorsement map
    const userSkillMap = new Map<string, Array<{ skill: string; count: number }>>();
    for (const se of skillEndorsements) {
      const existing = userSkillMap.get(se.toUserId) || [];
      existing.push({ skill: se.skill, count: se._count.id });
      userSkillMap.set(se.toUserId, existing);
    }

    // Enrich profiles with connection status and endorsement info
    const enrichedProfiles = profiles.map((profile) => {
      const connInfo = connectionMap.get(profile.userId);
      let connectionStatus: 'none' | 'pending' | 'connected' | 'declined' = 'none';
      let connectionDirection: string | null = null;
      let connectionId: string | null = null;

      if (connInfo) {
        if (connInfo.status === 'accepted') {
          connectionStatus = 'connected';
        } else if (connInfo.status === 'pending') {
          connectionStatus = 'pending';
        } else if (connInfo.status === 'declined') {
          connectionStatus = 'declined';
        }
        connectionDirection = connInfo.direction;
        connectionId = connInfo.connectionId;
      }

      const totalEndorsements = endorsementMap.get(profile.userId) || 0;
      const skillBreakdown = userSkillMap.get(profile.userId) || [];

      // Sort skills by endorsement count descending
      skillBreakdown.sort((a, b) => b.count - a.count);

      return {
        id: profile.id,
        userId: profile.userId,
        fullName: profile.fullName,
        jobTitle: profile.jobTitle,
        profilePhoto: profile.profilePhoto,
        location: profile.location,
        bio: profile.bio,
        skillTags: profile.skillTags,
        verified: profile.verified,
        user: profile.user,
        company: profile.company,
        connectionStatus,
        connectionDirection,
        connectionId,
        totalEndorsements,
        topSkills: skillBreakdown.slice(0, 5), // Top 5 most endorsed skills
      };
    });

    // Sort by total endorsements (most endorsed first), then by name
    enrichedProfiles.sort((a, b) => {
      if (b.totalEndorsements !== a.totalEndorsements) {
        return b.totalEndorsements - a.totalEndorsements;
      }
      return a.fullName.localeCompare(b.fullName);
    });

    return NextResponse.json({
      success: true,
      data: enrichedProfiles,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Discover users error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while discovering users' },
      { status: 500 }
    );
  }
}
