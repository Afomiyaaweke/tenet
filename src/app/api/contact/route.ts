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

    // Store as a comment/testimonial for now (can be migrated to a dedicated ContactMessage model later)
    const contactMessage = await db.comment.create({
      data: {
        name,
        email,
        company: subject || 'Contact Form',
        role: 'other',
        content: message,
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
