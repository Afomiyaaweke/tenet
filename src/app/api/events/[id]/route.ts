import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';

/**
 * GET /api/events/[id]
 * Get event with registration count
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;
    const event = await db.event.findUnique({
      where: { id },
      include: {
        _count: { select: { registrations: true } },
      },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (err) {
    console.error('Get event error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching the event' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/events/[id]
 * Admin: update event
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const event = await db.event.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, description, eventDate, location, capacity, status, category } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (eventDate !== undefined) updateData.eventDate = new Date(eventDate);
    if (location !== undefined) updateData.location = location;
    if (capacity !== undefined) updateData.capacity = parseInt(String(capacity), 10);
    if (status !== undefined) updateData.status = status;
    if (category !== undefined) updateData.category = category;

    const updatedEvent = await db.event.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedEvent,
    });
  } catch (err) {
    console.error('Update event error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating the event' },
      { status: 500 }
    );
  }
}
