import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/social/posts/[id]/comments
 * Get comments for a post with pagination.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    // Verify post exists
    const post = await db.socialPost.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '20', 10), 1),
      100
    );
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      db.socialPostComment.findMany({
        where: { postId: id },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
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
                },
              },
            },
          },
        },
      }),
      db.socialPostComment.count({
        where: { postId: id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: comments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Get post comments error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching comments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/posts/[id]/comments
 * Add a comment to a post.
 * Body: { content: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    // Verify post exists
    const post = await db.socialPost.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { content } = body as { content?: string };

    const trimmedContent = typeof content === 'string' ? content.trim() : '';
    if (!trimmedContent) {
      return NextResponse.json(
        { success: false, error: 'Comment content is required' },
        { status: 400 }
      );
    }

    if (trimmedContent.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Comment must be 2000 characters or less' },
        { status: 400 }
      );
    }

    // Create comment and increment comment count in a transaction
    const comment = await db.$transaction(async (tx) => {
      const newComment = await tx.socialPostComment.create({
        data: {
          postId: id,
          userId: user!.id,
          content: trimmedContent,
        },
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
                },
              },
            },
          },
        },
      });

      // Increment the post's comment count
      await tx.socialPost.update({
        where: { id },
        data: { comments: { increment: 1 } },
      });

      return newComment;
    });

    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (err) {
    console.error('Create post comment error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while creating the comment' },
      { status: 500 }
    );
  }
}
