import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profiles/public/[slug]
 * Public endpoint — no auth required.
 * Returns the "Personal Portfolio" data for a profile's vanity page.
 * Respects isPublished; preview mode (?preview=true) shows unpublished pages.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug || slug.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 }
      );
    }

    const profile = await db.profile.findUnique({
      where: { vanitySlug: slug },
      include: {
        user: {
          select: {
            id: true,
            accountType: true,
            status: true,
            createdAt: true,
            bids: {
              select: {
                id: true,
                status: true,
                financialProposal: true,
                createdAt: true,
                tender: { select: { id: true, title: true, categoryTags: true } },
              },
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
            endorsementsReceived: {
              select: {
                id: true,
                skill: true,
                createdAt: true,
                fromUser: { select: { profile: { select: { fullName: true, jobTitle: true } } } },
              },
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
            socialPosts: {
              where: { visibility: 'public' },
              select: {
                id: true,
                content: true,
                imageUrls: true,
                createdAt: true,
                reactions: { select: { emoji: true } },
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
            proformaListings: {
              where: { status: 'active' },
              select: {
                id: true,
                productName: true,
                description: true,
                category: true,
                unitPrice: true,
                currency: true,
                city: true,
                country: true,
                imageUrls: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 6,
            },
          },
        },
      },
    });

    if (!profile || profile.user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const preview = url.searchParams.get('preview') === 'true';

    if (!profile.isPublished && !preview) {
      return NextResponse.json(
        { success: false, error: 'This profile is not published' },
        { status: 404 }
      );
    }

    // Parse portfolio images (JSON array)
    let portfolioImages: string[] = [];
    try {
      portfolioImages = profile.portfolioImages ? JSON.parse(profile.portfolioImages) : [];
      if (!Array.isArray(portfolioImages)) portfolioImages = [];
    } catch {
      portfolioImages = [];
    }

    // Parse skill tags
    const skills = (profile.skillTags || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Aggregate endorsements by skill
    const endorsementMap = new Map<string, number>();
    for (const e of profile.user.endorsementsReceived) {
      endorsementMap.set(e.skill, (endorsementMap.get(e.skill) || 0) + 1);
    }
    const topEndorsements = Array.from(endorsementMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count }));

    // Bids summary
    const bids = profile.user.bids;
    const bidsWon = bids.filter((b) => b.status === 'awarded').length;
    const bidsSubmitted = bids.length;

    // Proforma listings summary
    const listings = profile.user.proformaListings;
    const listingsCount = listings.length;

    // ── Profile completeness score (0–100) for personal portfolios ──
    let score = 0;
    // Photo (+15)
    if (profile.profilePhoto) score += 15;
    // Bio (+15)
    if (profile.bio && profile.bio.trim().length >= 20) score += 15;
    // Skills (+15, needs ≥2)
    if (skills.length >= 2) score += 15;
    else if (skills.length === 1) score += 8;
    // Location (+10)
    if (profile.location) score += 10;
    // Job title (+10)
    if (profile.jobTitle) score += 10;
    // Tagline/description (+10)
    if (profile.publicTagline || profile.publicDescription) score += 10;
    // Portfolio images (+10, needs ≥3)
    if (portfolioImages.length >= 3) score += 10;
    else if (portfolioImages.length >= 1) score += 5;
    // Verified (+5)
    if (profile.verified) score += 5;
    // Activity (+10, needs bids OR listings OR posts)
    if (bidsSubmitted >= 1 || listingsCount >= 1 || profile.user.socialPosts.length >= 1) score += 5;
    if (bidsSubmitted >= 3 || listingsCount >= 3) score += 5;
    score = Math.min(score, 100);

    // Badge level
    let badge: 'platinum' | 'gold' | 'silver' | 'bronze' | 'new' = 'new';
    if (score >= 90) badge = 'platinum';
    else if (score >= 70) badge = 'gold';
    else if (score >= 50) badge = 'silver';
    else if (score >= 30) badge = 'bronze';

    // Activity feed (merge bids + listings + posts, sort by date desc)
    const activityFeed: Array<{ type: string; label: string; date: string }> = [];
    for (const b of bids.slice(0, 5)) {
      activityFeed.push({
        type: 'bid',
        label: `Submitted bid on ${b.tender?.title?.substring(0, 50) || 'a tender'}${
          b.status === 'awarded' ? ' — Won' : b.status === 'rejected' ? ' — Lost' : ''
        }`,
        date: b.createdAt.toISOString(),
      });
    }
    for (const l of listings.slice(0, 5)) {
      activityFeed.push({
        type: 'listing',
        label: `Posted listing: ${l.productName.substring(0, 50)}`,
        date: l.createdAt.toISOString(),
      });
    }
    for (const p of profile.user.socialPosts.slice(0, 3)) {
      activityFeed.push({
        type: 'post',
        label: `Posted on social circle`,
        date: p.createdAt.toISOString(),
      });
    }
    activityFeed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const publicData = {
      // Identity
      fullName: profile.fullName,
      jobTitle: profile.jobTitle,
      location: profile.location,
      profilePhoto: profile.profilePhoto,
      bio: profile.bio,
      skills,
      verified: profile.verified,
      accountType: profile.user.accountType,

      // Publishing
      vanitySlug: profile.vanitySlug,
      isPublished: profile.isPublished,
      publicTagline: profile.publicTagline,
      publicDescription: profile.publicDescription,
      isPreview: !profile.isPublished && preview,
      memberSince: profile.user.createdAt.toISOString(),

      // Portfolio gallery (the media the user uploaded)
      portfolioImages,

      // Recent activity
      listings,
      listingsCount,
      socialPosts: profile.user.socialPosts.map((p) => {
        let imgs: string[] = [];
        try {
          imgs = p.imageUrls ? JSON.parse(p.imageUrls) : [];
          if (!Array.isArray(imgs)) imgs = [];
        } catch {
          imgs = [];
        }
        return {
          id: p.id,
          content: p.content,
          imageUrls: imgs,
          createdAt: p.createdAt.toISOString(),
          reactionCount: p.reactions.length,
        };
      }),

      // Bids
      bidsSubmitted,
      bidsWon,

      // Endorsements
      topEndorsements,
      totalEndorsements: profile.user.endorsementsReceived.length,

      // Score
      qualityScore: score,
      badge,

      // Activity feed
      activityFeed: activityFeed.slice(0, 12),
    };

    return NextResponse.json({ success: true, data: publicData });
  } catch (error) {
    console.error('Public profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    );
  }
}
