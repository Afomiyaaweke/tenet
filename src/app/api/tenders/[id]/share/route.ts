import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * POST /api/tenders/[id]/share
 * Share a tender with another user (contractor) by creating a notification.
 * Body: { userId: string, message?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id: tenderId } = await params;
    const body = await request.json();
    const { userId: recipientId, message } = body;

    if (!recipientId) {
      return NextResponse.json(
        { success: false, error: 'Recipient user ID is required' },
        { status: 400 }
      );
    }

    // Verify tender exists
    const tender = await db.tender.findUnique({ where: { id: tenderId } });
    if (!tender) {
      return NextResponse.json(
        { success: false, error: 'Tender not found' },
        { status: 404 }
      );
    }

    // Verify recipient exists
    const recipient = await db.user.findUnique({
      where: { id: recipientId },
      include: { profile: true },
    });
    if (!recipient) {
      return NextResponse.json(
        { success: false, error: 'Recipient user not found' },
        { status: 404 }
      );
    }

    // Create notification for the recipient
    const sharerName = user?.profile?.fullName || user?.email || 'Someone';
    const notificationMessage =
      message ||
      `${sharerName} shared a tender with you: "${tender.title}"`;

    await db.notification.create({
      data: {
        userId: recipientId,
        title: 'Tender Shared With You',
        message: notificationMessage,
        type: 'info',
        link: `tender-detail?id=${tenderId}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        shared: true,
        recipient: {
          id: recipient.id,
          email: recipient.email,
          fullName: recipient.profile?.fullName,
        },
      },
    });
  } catch (err) {
    console.error('Share tender error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to share tender' },
      { status: 500 }
    );
  }
}
