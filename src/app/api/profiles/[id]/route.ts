import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * PUT /api/profiles/[id]
 * Update profile - owner or admin only
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await requireAuth(request);
    if (error) return error;

    // Find the profile
    const profile = await db.profile.findUnique({ where: { id } });
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Check ownership or admin role
    if (profile.userId !== user!.id && user!.role !== 'team_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only update your own profile' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      fullName,
      phone,
      location,
      address,
      type,
      jobTitle,
      tinNumber,
      licenseNumber,
      skillTags,
      bio,
      logoUrl,
      profilePhoto,
    } = body;

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (location !== undefined) updateData.location = location;
    if (address !== undefined) updateData.address = address;
    if (type !== undefined) updateData.type = type;
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
    if (tinNumber !== undefined) updateData.tinNumber = tinNumber;
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
    if (skillTags !== undefined) updateData.skillTags = skillTags;
    if (bio !== undefined) updateData.bio = bio;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (profilePhoto !== undefined) updateData.profilePhoto = profilePhoto;

    const updatedProfile = await db.profile.update({
      where: { id },
      data: updateData,
      include: { user: { select: { id: true, email: true, role: true, status: true } } },
    });

    return NextResponse.json({
      success: true,
      data: updatedProfile,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating profile' },
      { status: 500 }
    );
  }
}
