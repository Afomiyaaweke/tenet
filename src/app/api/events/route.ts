import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';

/**
 * POST /api/events
 * Admin only: Create event
 */
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const body = await request.json();
    const { title, description, eventDate, location, capacity, category } = body;

    if (!title || !description || !eventDate || !location || !capacity) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, description, eventDate, location, capacity' },
        { status: 400 }
      );
    }

    const event = await db.event.create({
      data: {
        title,
        description,
        eventDate: new Date(eventDate),
        location,
        capacity: parseInt(String(capacity), 10),
        category: category || 'workshop',
      },
    });

    return NextResponse.json(
      { success: true, data: event },
      { status: 201 }
    );
  } catch (err) {
    console.error('Create event error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while creating the event' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events
 * List events (query: status, category)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    const [events, total] = await Promise.all([
      db.event.findMany({
        where,
        orderBy: { eventDate: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { registrations: true } },
        },
      }),
      db.event.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: events,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('List events error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching events' },
      { status: 500 }
    );
  }
}
