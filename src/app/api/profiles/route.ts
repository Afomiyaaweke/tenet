import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, invalidateAuthCache } from '@/lib/auth';

/**
 * GET /api/profiles
 * Team admin: list profiles in own company
 * User: own profile only
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const includeRelations = {
      user: { select: { id: true, email: true, role: true, status: true } },
      company: { select: { id: true, name: true, industry: true, verified: true } },
    };

    if (user!.role === 'team_admin' && user!.companyId) {
      // Team admin can see profiles in their company
      const profiles = await db.profile.findMany({
        where: { companyId: user!.companyId },
        include: includeRelations,
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({
        success: true,
        data: profiles,
      });
    } else {
      // Regular users can only see their own profile
      const profile = await db.profile.findUnique({
        where: { userId: user!.id },
        include: includeRelations,
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

/**
 * PUT /api/profiles
 * Update the authenticated user's profile
 * Allows updating companyId and jobTitle
 */
export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const {
      fullName,
      jobTitle,
      phone,
      location,
      address,
      tinNumber,
      licenseNumber,
      skillTags,
      bio,
      vanitySlug,
      isPublished,
      publicTagline,
      publicDescription,
    } = body;

    // Verify profile exists
    const existingProfile = await db.profile.findUnique({
      where: { userId: user!.id },
    });

    if (!existingProfile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Vanity slug validation (only if changing)
    if (vanitySlug !== undefined && vanitySlug !== existingProfile.vanitySlug) {
      if (vanitySlug) {
        // Validate slug format: lowercase, alphanumeric, hyphens only, 2+ chars
        if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(vanitySlug) && !/^[a-z0-9]$/.test(vanitySlug)) {
          return NextResponse.json(
            { success: false, error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only. Must be 2+ characters.' },
            { status: 400 }
          );
        }
        if (vanitySlug.length > 40) {
          return NextResponse.json(
            { success: false, error: 'Slug is too long. Maximum 40 characters.' },
            { status: 400 }
          );
        }
        // Block reserved slugs (route segments and app routes)
        const reserved = ['api', 'login', 'register', 'auth', 'admin', 'dashboard', 'tenders', 'bids', 'docs', 'privacy', 'terms', 'settings', 'profile', 'chat', 'projects', 'events', 'contact', 'favicon', '_next', 'u', 'leaderboard', 'social', 'documents', 'companies', 'team', 'applicants'];
        if (reserved.includes(vanitySlug)) {
          return NextResponse.json(
            { success: false, error: 'This slug is reserved and cannot be used.' },
            { status: 400 }
          );
        }
        const duplicateSlug = await db.profile.findUnique({ where: { vanitySlug } });
        if (duplicateSlug) {
          return NextResponse.json(
            { success: false, error: 'This vanity URL is already taken. Try another.' },
            { status: 409 }
          );
        }
      }
    }

    // Build update data (companyId is NOT user-settable - prevents company reassignment attacks)
    const updateData: Record<string, unknown> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle || null;
    if (phone !== undefined) updateData.phone = phone;
    if (location !== undefined) updateData.location = location;
    if (address !== undefined) updateData.address = address || null;
    if (tinNumber !== undefined) updateData.tinNumber = tinNumber || null;
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber || null;
    if (skillTags !== undefined) updateData.skillTags = skillTags;
    if (bio !== undefined) updateData.bio = bio || null;
    if (vanitySlug !== undefined) updateData.vanitySlug = vanitySlug || null;
    if (publicTagline !== undefined) updateData.publicTagline = publicTagline || null;
    if (publicDescription !== undefined) updateData.publicDescription = publicDescription || null;
    if (typeof isPublished === 'boolean') {
      if (isPublished === true && !vanitySlug && !existingProfile.vanitySlug) {
        return NextResponse.json(
          { success: false, error: 'Set a vanity URL before publishing' },
          { status: 400 }
        );
      }
      updateData.isPublished = isPublished;
    }

    const updatedProfile = await db.profile.update({
      where: { userId: user!.id },
      data: updateData,
      include: {
        user: { select: { id: true, email: true, role: true, status: true } },
        company: { select: { id: true, name: true, industry: true, verified: true } },
      },
    });
    invalidateAuthCache(user!.id);

    return NextResponse.json({
      success: true,
      data: updatedProfile,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating the profile' },
      { status: 500 }
    );
  }
}
