import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/chats/[id]/messages
 * Get messages for a chat (paginated)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    // Check chat exists
    const chat = await db.chat.findUnique({
      where: { id },
      include: { project: { select: { bid: { select: { userId: true } } } } },
    });

    if (!chat) {
      return NextResponse.json(
        { success: false, error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Standard users can only access chats for their own projects
    if (user!.role === 'user' && chat.project?.bid.userId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only access chats for your own projects' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      db.message.findMany({
        where: { chatId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        },
      }),
      db.message.count({ where: { chatId: id } }),
    ]);

    return NextResponse.json({
      success: true,
      data: messages,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Get chat messages error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chats/[id]/messages
 * Send message { content } - also stores to DB
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    // Check chat exists
    const chat = await db.chat.findUnique({
      where: { id },
      include: { project: { select: { bid: { select: { userId: true } } } } },
    });

    if (!chat) {
      return NextResponse.json(
        { success: false, error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Standard users can only send to chats for their own projects
    if (user!.role === 'user' && chat.project?.bid.userId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only send messages in chats for your own projects' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Check for suspicious content
    const suspiciousPhrases = [
      'outside platform', 'direct payment', 'cash only', 'no receipt',
      'off platform', 'bypass', 'under the table', 'personal transfer', 'private deal',
    ];
    const flagged = suspiciousPhrases.some(
      (phrase) => content.toLowerCase().includes(phrase)
    );

    const message = await db.message.create({
      data: {
        chatId: id,
        userId: user!.id,
        content: content.trim(),
        flagged,
      },
      include: {
        user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      },
    });

    return NextResponse.json(
      { success: true, data: message },
      { status: 201 }
    );
  } catch (err) {
    console.error('Send message error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while sending the message' },
      { status: 500 }
    );
  }
}
