import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/profiles
 * Super admin: list all profiles
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

    if (user!.role === 'super_admin') {
      // Super admin can see all profiles
      const profiles = await db.profile.findMany({
        include: includeRelations,
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({
        success: true,
        data: profiles,
      });
    } else if (user!.role === 'team_admin' && user!.companyId) {
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
      companyId,
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

    // Validate companyId if being updated
    if (companyId !== undefined && companyId !== null) {
      const company = await db.company.findUnique({ where: { id: companyId } });
      if (!company) {
        return NextResponse.json(
          { success: false, error: 'Company not found' },
          { status: 400 }
        );
      }
    }

    // Build update data
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
    if (companyId !== undefined) updateData.companyId = companyId || null;

    const updatedProfile = await db.profile.update({
      where: { userId: user!.id },
      data: updateData,
      include: {
        user: { select: { id: true, email: true, role: true, status: true } },
        company: { select: { id: true, name: true, industry: true, verified: true } },
      },
    });

    // Also update user's companyId if profile companyId changed
    if (companyId !== undefined && user!.companyId !== companyId) {
      await db.user.update({
        where: { id: user!.id },
        data: { companyId: companyId || null },
      });
    }

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
