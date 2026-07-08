import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/contact
 * Submit a contact form message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Validate lengths to prevent abuse
    if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Name must be between 2 and 100 characters' },
        { status: 400 }
      );
    }
    if (typeof message !== 'string' || message.trim().length < 10 || message.length > 5000) {
      return NextResponse.json(
        { success: false, error: 'Message must be between 10 and 5000 characters' },
        { status: 400 }
      );
    }

    // Store as a comment/testimonial for now (can be migrated to a dedicated ContactMessage model later)
    const contactMessage = await db.comment.create({
      data: {
        name: name.trim().slice(0, 100),
        email: email.trim().slice(0, 200),
        company: (subject || 'Contact Form').slice(0, 200),
        role: 'other',
        content: message.trim().slice(0, 5000),
        rating: 5,
        featured: false,
        approved: false, // Needs admin review before publishing
      },
    });

    return NextResponse.json(
      { success: true, data: contactMessage, message: 'Your message has been sent successfully. We will get back to you soon.' },
      { status: 201 }
    );
  } catch (err) {
    console.error('Contact form error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to send message. Please try again later.' },
      { status: 500 }
    );
  }
}
