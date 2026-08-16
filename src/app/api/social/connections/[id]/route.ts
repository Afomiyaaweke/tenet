import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * PATCH /api/social/connections/[id]
 * Accept or decline a connection request.
 * Only the receiver can accept/decline.
 * Body: { action: "accept" | "decline" }
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
    const { action } = body as { action?: string };

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Action must be "accept" or "decline"' },
        { status: 400 }
      );
    }

    const connection = await db.connection.findUnique({
      where: { id },
    });

    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Only the receiver can accept/decline
    if (connection.receiverId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'Only the request recipient can accept or decline' },
        { status: 403 }
      );
    }

    if (connection.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Connection request is already ${connection.status}` },
        { status: 400 }
      );
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';

    const updatedConnection = await db.connection.update({
      where: { id },
      data: { status: newStatus },
      include: {
        requester: {
          select: {
            id: true,
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
        receiver: {
          select: {
            id: true,
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
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedConnection,
        direction: 'received',
      },
    });
  } catch (err) {
    console.error('Update connection error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating the connection' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social/connections/[id]
 * Remove a connection.
 * Both the requester and receiver can remove an accepted connection.
 * The requester can also cancel a pending request.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    const connection = await db.connection.findUnique({
      where: { id },
    });

    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Only involved parties can remove the connection
    if (connection.requesterId !== user!.id && connection.receiverId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'You can only remove your own connections' },
        { status: 403 }
      );
    }

    // If the connection is pending, only the requester can cancel (withdraw) it,
    // and only the receiver can reject (decline) it
    // For accepted connections, either party can remove
    if (connection.status === 'pending' && connection.receiverId === user!.id) {
      // Receiver declining a pending request should use PATCH instead
      return NextResponse.json(
        { success: false, error: 'Use PATCH with action "decline" to decline a pending request' },
        { status: 400 }
      );
    }

    await db.connection.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Connection removed successfully' },
    });
  } catch (err) {
    console.error('Delete connection error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while removing the connection' },
      { status: 500 }
    );
  }
}
