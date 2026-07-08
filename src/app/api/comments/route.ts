import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/comments — Returns approved comments, ordered by createdAt desc, with stats
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const [comments, total, ratingAgg] = await Promise.all([
      db.comment.findMany({
        where: { approved: true },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      db.comment.count({ where: { approved: true } }),
      db.comment.aggregate({
        where: { approved: true },
        _avg: { rating: true },
      }),
    ]);

    // Compute rating distribution
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const c of comments) {
      if (c.rating >= 1 && c.rating <= 5) {
        ratingDistribution[c.rating]++;
      }
    }

    // For accurate distribution, query all approved comments grouped by rating
    const allRatings = await db.comment.findMany({
      where: { approved: true },
      select: { rating: true },
    });
    const fullDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const c of allRatings) {
      if (c.rating >= 1 && c.rating <= 5) {
        fullDistribution[c.rating]++;
      }
    }

    return NextResponse.json({
      success: true,
      data: comments,
      stats: {
        totalCount: total,
        avgRating: ratingAgg._avg.rating
          ? Math.round(ratingAgg._avg.rating * 10) / 10
          : 0,
        ratingDistribution: fullDistribution,
      },
    });
  } catch (error) {
    console.error('GET /api/comments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST /api/comments — Create a new comment (public, requires admin approval)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, role, content, rating } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Name is required (min 2 characters)' },
        { status: 400 }
      );
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }
    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Comment must be at least 10 characters' },
        { status: 400 }
      );
    }
    if (content.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Comment must be under 2000 characters' },
        { status: 400 }
      );
    }
    const validRating = Math.min(Math.max(Math.round(rating || 5), 1), 5);
    const validRole = ['contractor', 'tender_owner', 'admin', 'other'].includes(role)
      ? role
      : 'other';

    const comment = await db.comment.create({
      data: {
        name: name.trim().slice(0, 100),
        email: email.trim().slice(0, 200),
        company: company?.trim()?.slice(0, 200) || null,
        role: validRole,
        content: content.trim().slice(0, 2000),
        rating: validRating,
        approved: false, // Requires admin approval — prevents spam/abuse
        featured: false,
      },
    });

    return NextResponse.json(
      { success: true, data: comment, message: 'Your comment has been submitted and is awaiting review.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/comments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
