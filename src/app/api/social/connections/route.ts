import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/social/connections
 * List the current user's connections.
 * Query params: status (pending, accepted, declined, blocked), type (sent, received, all), page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const type = searchParams.get('type') || 'all'; // sent, received, all
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '20', 10), 1),
      100
    );
    const skip = (page - 1) * limit;

    // Validate status filter
    const validStatuses = ['pending', 'accepted', 'declined', 'blocked'];
    const statusFilter = status && validStatuses.includes(status) ? status : undefined;

    // Build where clause based on type
    const where: Record<string, unknown> = {};
    if (statusFilter) where.status = statusFilter;

    if (type === 'sent') {
      where.requesterId = user!.id;
    } else if (type === 'received') {
      where.receiverId = user!.id;
    } else {
      // all: both sent and received
      where.OR = [
        { requesterId: user!.id },
        { receiverId: user!.id },
      ];
      // Remove status from top level since OR is present
      if (statusFilter) {
        // Apply status to each OR branch
        where.OR = [
          { requesterId: user!.id, status: statusFilter },
          { receiverId: user!.id, status: statusFilter },
        ];
        delete where.status;
      }
    }

    const [connections, total] = await Promise.all([
      db.connection.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          requester: {
            select: {
              id: true,
              profile: {
                select: {
                  fullName: true,
                  jobTitle: true,
                  profilePhoto: true,
                  location: true,
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
                  location: true,
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
      }),
      db.connection.count({ where }),
    ]);

    // Add a direction field to indicate whether the current user is requester or receiver
    const enriched = connections.map((conn) => ({
      ...conn,
      direction: conn.requesterId === user!.id ? 'sent' : 'received',
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Get connections error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching connections' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/connections
 * Send a connection request.
 * Body: { receiverId: string, message?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { receiverId, message } = body as {
      receiverId?: string;
      message?: string;
    };

    if (!receiverId || typeof receiverId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Receiver ID is required' },
        { status: 400 }
      );
    }

    if (receiverId === user!.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot connect with yourself' },
        { status: 400 }
      );
    }

    // Check if receiver exists
    const receiver = await db.user.findUnique({
      where: { id: receiverId },
      select: { id: true, status: true },
    });

    if (!receiver) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (receiver.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Cannot connect with an inactive user' },
        { status: 400 }
      );
    }

    // Check if a connection already exists (in either direction)
    const existingConnection = await db.connection.findFirst({
      where: {
        OR: [
          { requesterId: user!.id, receiverId },
          { requesterId: receiverId, receiverId: user!.id },
        ],
      },
    });

    if (existingConnection) {
      const statusMsg =
        existingConnection.status === 'pending'
          ? 'A pending connection request already exists'
          : existingConnection.status === 'accepted'
            ? 'You are already connected'
            : existingConnection.status === 'declined'
              ? 'A previous connection request was declined'
              : 'A connection already exists';

      return NextResponse.json(
        {
          success: false,
          error: statusMsg,
          data: { existingStatus: existingConnection.status, connectionId: existingConnection.id },
        },
        { status: 409 }
      );
    }

    const connection = await db.connection.create({
      data: {
        requesterId: user!.id,
        receiverId,
        message: message?.trim() || null,
        status: 'pending',
      },
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

    return NextResponse.json(
      {
        success: true,
        data: {
          ...connection,
          direction: 'sent',
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Create connection error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while creating the connection' },
      { status: 500 }
    );
  }
}
