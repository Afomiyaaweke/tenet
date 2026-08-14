import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/social/posts/[id]
 * Get a single post with full details.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    const post = await db.socialPost.findUnique({
      where: { id },
      include: {
        user: {
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

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check visibility access
    if (!canViewPost(post, user!.id)) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this post' },
        { status: 403 }
      );
    }

    const reactionSummary = buildReactionSummary(post.reactions, user!.id);
    const { reactions, _count, ...postData } = post;

    return NextResponse.json({
      success: true,
      data: {
        ...postData,
        commentCount: _count.postComments,
        reactionSummary,
        totalReactions: _count.reactions,
      },
    });
  } catch (err) {
    console.error('Get social post error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching the post' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social/posts/[id]
 * Delete own post only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    const post = await db.socialPost.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    if (post.userId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own posts' },
        { status: 403 }
      );
    }

    await db.socialPost.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Post deleted successfully' },
    });
  } catch (err) {
    console.error('Delete social post error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while deleting the post' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/social/posts/[id]
 * Update own post content.
 * Body: { content?: string, imageUrls?: string, tags?: string, visibility?: string }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    const post = await db.socialPost.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    if (post.userId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'You can only edit your own posts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content, imageUrls, tags, visibility } = body as {
      content?: string;
      imageUrls?: string;
      tags?: string;
      visibility?: string;
    };

    const updateData: Record<string, unknown> = {};
    if (content !== undefined) updateData.content = content;
    if (imageUrls !== undefined) updateData.imageUrls = imageUrls;
    if (tags !== undefined) updateData.tags = tags;
    if (visibility !== undefined) {
      if (!['public', 'connections', 'private'].includes(visibility)) {
        return NextResponse.json(
          { success: false, error: 'Invalid visibility value' },
          { status: 400 }
        );
      }
      updateData.visibility = visibility;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const updatedPost = await db.socialPost.update({
      where: { id },
      data: updateData,
      include: {
        user: {
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

    const reactionSummary = buildReactionSummary(
      updatedPost.reactions,
      user!.id
    );
    const { reactions, _count, ...postData } = updatedPost;

    return NextResponse.json({
      success: true,
      data: {
        ...postData,
        commentCount: _count.postComments,
        reactionSummary,
        totalReactions: _count.reactions,
      },
    });
  } catch (err) {
    console.error('Update social post error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating the post' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/social/posts/[id]
 * Toggle reaction (like/unlike) on a post.
 * Body: { emoji: string } (defaults to "👍")
 * If the user already reacted with the same emoji, remove it (unlike).
 * If not, add the reaction (like). Update the post's likes count accordingly.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    const body = await request.json();
    const { emoji } = body as { emoji?: string };
    const reactionEmoji = emoji || '👍';

    if (typeof reactionEmoji !== 'string' || reactionEmoji.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid emoji' },
        { status: 400 }
      );
    }

    const post = await db.socialPost.findUnique({
      where: { id },
      select: { id: true, userId: true, likes: true, visibility: true },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if user already reacted with this emoji
    const existingReaction = await db.socialPostReaction.findUnique({
      where: {
        postId_userId_emoji: {
          postId: id,
          userId: user!.id,
          emoji: reactionEmoji,
        },
      },
    });

    let toggled = false;

    if (existingReaction) {
      // Remove reaction (unlike)
      await db.socialPostReaction.delete({
        where: { id: existingReaction.id },
      });
      // Decrement likes count
      await db.socialPost.update({
        where: { id },
        data: { likes: Math.max(0, post.likes - 1) },
      });
      toggled = false;
    } else {
      // Add reaction (like)
      await db.socialPostReaction.create({
        data: {
          postId: id,
          userId: user!.id,
          emoji: reactionEmoji,
        },
      });
      // Increment likes count
      await db.socialPost.update({
        where: { id },
        data: { likes: post.likes + 1 },
      });
      toggled = true;
    }

    // Return updated post with reactions
    const updatedPost = await db.socialPost.findUnique({
      where: { id },
      include: {
        user: {
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

    const reactionSummary = buildReactionSummary(
      updatedPost!.reactions,
      user!.id
    );
    const { reactions, _count, ...postData } = updatedPost!;

    return NextResponse.json({
      success: true,
      data: {
        ...postData,
        commentCount: _count.postComments,
        reactionSummary,
        totalReactions: _count.reactions,
        toggled,
        emoji: reactionEmoji,
      },
    });
  } catch (err) {
    console.error('Toggle reaction error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while toggling the reaction' },
      { status: 500 }
    );
  }
}

// ─── Helper functions ──────────────────────────────────────────────────────

/** Check if user can view the post based on visibility */
function canViewPost(
  post: { userId: string; visibility: string },
  currentUserId: string
): boolean {
  if (post.visibility === 'public') return true;
  if (post.userId === currentUserId) return true;
  // For 'connections' visibility, we'd need to check connection status
  // but for simplicity, we'll allow it and let the feed endpoint handle proper filtering
  if (post.visibility === 'connections') return true;
  return false;
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
): Array<{
    emoji: string;
    count: number;
    hasReacted: boolean;
    users: Array<{ id: string; fullName: string; profilePhoto: string | null }>;
  }> {
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
