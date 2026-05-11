import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * PATCH /api/notifications/[id]
 * Mark notification as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await requireAuth(request);
    if (error) return error;

    // Find the notification
    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (notification.userId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only mark your own notifications as read' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const read = body.read !== undefined ? body.read : true;

    const updatedNotification = await db.notification.update({
      where: { id },
      data: { read },
    });

    return NextResponse.json({
      success: true,
      data: updatedNotification,
    });
  } catch (error) {
    console.error('Mark notification error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating the notification' },
      { status: 500 }
    );
  }
}
