import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/events/[id]/register
 * Register for event (contractor only, check capacity)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    // Only contractors can register
    if (user!.role !== 'contractor') {
      return NextResponse.json(
        { success: false, error: 'Only contractors can register for events' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const event = await db.event.findUnique({
      where: { id },
      include: { _count: { select: { registrations: true } } },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check capacity
    if (event._count.registrations >= event.capacity) {
      return NextResponse.json(
        { success: false, error: 'Event is at full capacity' },
        { status: 400 }
      );
    }

    // Check if already registered
    const existingReg = await db.registration.findUnique({
      where: { eventId_userId: { eventId: id, userId: user!.id } },
    });

    if (existingReg) {
      return NextResponse.json(
        { success: false, error: 'You are already registered for this event' },
        { status: 409 }
      );
    }

    const registration = await db.registration.create({
      data: {
        eventId: id,
        userId: user!.id,
      },
    });

    return NextResponse.json(
      { success: true, data: registration },
      { status: 201 }
    );
  } catch (err) {
    console.error('Register for event error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while registering for the event' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]/register
 * Unregister from event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    const registration = await db.registration.findUnique({
      where: { eventId_userId: { eventId: id, userId: user!.id } },
    });

    if (!registration) {
      return NextResponse.json(
        { success: false, error: 'You are not registered for this event' },
        { status: 404 }
      );
    }

    await db.registration.delete({
      where: { id: registration.id },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Successfully unregistered from the event' },
    });
  } catch (err) {
    console.error('Unregister from event error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while unregistering from the event' },
      { status: 500 }
    );
  }
}
