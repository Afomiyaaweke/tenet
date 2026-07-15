import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

/**
 * PATCH /api/profiles/[id]/verify
 * Admin only: set profile.verified = true
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await requireAdmin(request);
    if (error) return error;

    // Find the profile
    const profile = await db.profile.findUnique({ where: { id } });
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const verified = body.verified !== undefined ? body.verified : true;

    const updatedProfile = await db.profile.update({
      where: { id },
      data: { verified },
      include: { user: { select: { id: true, email: true, role: true, status: true } } },
    });

    // Create a notification for the user about verification
    if (verified) {
      await db.notification.create({
        data: {
          userId: profile.userId,
          title: 'Profile Verified',
          message: 'Your profile has been verified by an administrator.',
          type: 'success',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedProfile,
    });
  } catch (error) {
    console.error('Verify profile error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while verifying profile' },
      { status: 500 }
    );
  }
}
