import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { containsInsensitive } from '@/lib/search';

/**
 * GET /api/social/posts
 * List social feed with pagination.
 * Includes: author profile (fullName, jobTitle, profilePhoto),
 *           company (name, industry, verified),
 *           reaction summary, comment count.
 * Query params: page, limit, authorId (filter by author), tags (filter by tag)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 50);
    const skip = (page - 1) * limit;
    const authorId = searchParams.get('authorId') || undefined;
    const tags = searchParams.get('tags') || undefined;

    // Build where clause
    const where: Record<string, unknown> = {};

    // Visibility filter: public posts OR own posts OR posts from connections
    if (authorId) {
      where.userId = authorId;
    }

    if (tags) {
      where.tags = containsInsensitive(tags);
    }

    // Only show public posts or posts from connections or own posts
    const connectedUserIds = await getConnectedUserIds(user!.id);
    where.OR = [
      { visibility: 'public' },
      { userId: user!.id },
      { visibility: 'connections', userId: { in: connectedUserIds } },
    ];

    const [posts, total] = await Promise.all([
      db.socialPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
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
                  verified: true,
                },
              },
            },
          },
          reactions: {
            select: {
              id: true,
              emoji: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  profile: { select: { fullName: true, profilePhoto: true } },
                },
              },
            },
          },
          _count: {
            select: { postComments: true, reactions: true },
          },
        },
      }),
      db.socialPost.count({ where }),
    ]);

    // Build reaction summary for each post
    const enrichedPosts = posts.map((post) => {
      const reactionSummary = buildReactionSummary(post.reactions, user!.id);
      const { reactions, _count, ...postData } = post;
      return {
        ...postData,
        commentCount: _count.postComments,
        reactionSummary,
        totalReactions: _count.reactions,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedPosts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Get social posts error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching posts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/posts
 * Create a new social post.
 * Body: { content, imageUrls?, tags?, visibility? }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { content, imageUrls, tags, visibility } = body as {
      content?: string;
      imageUrls?: string[];
      tags?: string;
      visibility?: string;
    };

    const trimmedContent = typeof content === 'string' ? content.trim() : '';
    const hasImages = Array.isArray(imageUrls) && imageUrls.length > 0;
    if (!trimmedContent && !hasImages) {
      return NextResponse.json(
        { success: false, error: 'Post content or media is required' },
        { status: 400 }
      );
    }

    if (trimmedContent.length > 5000) {
      return NextResponse.json(
        { success: false, error: 'Post content must be 5000 characters or less' },
        { status: 400 }
      );
    }

    const validVisibilities = ['public', 'connections', 'private'];
    const postVisibility = validVisibilities.includes(visibility || '') ? visibility : 'public';

    // Validate imageUrls array
    let serializedImageUrls = '[]';
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      if (imageUrls.length > 10) {
        return NextResponse.json(
          { success: false, error: 'Maximum 10 images allowed per post' },
          { status: 400 }
        );
      }
      serializedImageUrls = JSON.stringify(imageUrls.filter((url) => typeof url === 'string'));
    }

    const post = await db.socialPost.create({
      data: {
        userId: user!.id,
        content: trimmedContent,
        imageUrls: serializedImageUrls,
        tags: tags || '',
        visibility: postVisibility!,
      },
      include: {
        user: {
          select: {
            id: true,
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
                verified: true,
              },
            },
          },
        },
        reactions: {
          select: {
            id: true,
            emoji: true,
            userId: true,
            user: {
              select: {
                id: true,
                profile: { select: { fullName: true, profilePhoto: true } },
              },
            },
          },
        },
        _count: {
          select: { postComments: true, reactions: true },
        },
      },
    });

    const reactionSummary = buildReactionSummary(post.reactions, user!.id);
    const { reactions, _count, ...postData } = post;

    return NextResponse.json(
      {
        success: true,
        data: {
          ...postData,
          commentCount: _count.postComments,
          reactionSummary,
          totalReactions: _count.reactions,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Create social post error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while creating the post' },
      { status: 500 }
    );
  }
}

// ─── Helper functions ──────────────────────────────────────────────────────

/** Get IDs of users that the current user has accepted connections with */
async function getConnectedUserIds(userId: string): Promise<string[]> {
  const sentConnections = await db.connection.findMany({
    where: { requesterId: userId, status: 'accepted' },
    select: { receiverId: true },
  });
  const receivedConnections = await db.connection.findMany({
    where: { receiverId: userId, status: 'accepted' },
    select: { requesterId: true },
  });
  return [
    ...sentConnections.map((c) => c.receiverId),
    ...receivedConnections.map((c) => c.requesterId),
  ];
}

/** Build a reaction summary grouped by emoji with current user's reaction status */
function buildReactionSummary(
  reactions: Array<{
    id: string;
    emoji: string;
    userId: string;
    user: { id: string; profile: { fullName: string; profilePhoto: string | null } | null };
  }>,
  currentUserId: string
): Array<{ emoji: string; count: number; hasReacted: boolean; users: Array<{ id: string; fullName: string; profilePhoto: string | null }> }> {
  const emojiMap = new Map<
    string,
    {
      count: number;
      hasReacted: boolean;
      users: Array<{ id: string; fullName: string; profilePhoto: string | null }>;
    }
  >();

  for (const reaction of reactions) {
    const existing = emojiMap.get(reaction.emoji);
    const profileUser = reaction.user;
    const userInfo = {
      id: reaction.user.id,
      fullName: profileUser?.profile?.fullName || 'Unknown',
      profilePhoto: profileUser?.profile?.profilePhoto || null,
    };

    if (existing) {
      existing.count++;
      if (reaction.userId === currentUserId) existing.hasReacted = true;
      existing.users.push(userInfo);
    } else {
      emojiMap.set(reaction.emoji, {
        count: 1,
        hasReacted: reaction.userId === currentUserId,
        users: [userInfo],
      });
    }
  }

  return Array.from(emojiMap.entries()).map(([emoji, data]) => ({
    emoji,
    ...data,
  }));
}
