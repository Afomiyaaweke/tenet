import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';

const SUPPORT_EMAIL = 'support@tenetbid.com';

/**
 * POST /api/contact
 * Submit a contact form message — sends directly to support email AND stores in DB
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

    const sanitizedName = name.trim().slice(0, 100);
    const sanitizedEmail = email.trim().slice(0, 200);
    const sanitizedSubject = (subject || 'Contact Form').trim().slice(0, 200);
    const sanitizedMessage = message.trim().slice(0, 5000);

    // ── Send email directly to support ──
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
          <tr><td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:24px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">New Contact Form Message</h1>
                </td>
              </tr>
              <tr><td style="padding:32px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:8px 0;"><p style="margin:0;font-size:14px;color:#555;"><strong style="color:#1a1a1a;">From:</strong> ${sanitizedName}</p></td></tr>
                  <tr><td style="padding:8px 0;"><p style="margin:0;font-size:14px;color:#555;"><strong style="color:#1a1a1a;">Email:</strong> <a href="mailto:${sanitizedEmail}" style="color:#f97316;">${sanitizedEmail}</a></p></td></tr>
                  <tr><td style="padding:8px 0;"><p style="margin:0;font-size:14px;color:#555;"><strong style="color:#1a1a1a;">Subject:</strong> ${sanitizedSubject}</p></td></tr>
                  <tr><td style="padding:16px 0 0;"><p style="margin:0;font-size:14px;color:#555;"><strong style="color:#1a1a1a;">Message:</strong></p></td></tr>
                  <tr><td style="padding:8px 0;">
                    <div style="background:#f8f8f8;border-radius:8px;padding:16px;border:1px solid #eee;">
                      <p style="margin:0;font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap;">${sanitizedMessage}</p>
                    </div>
                  </td></tr>
                  <tr><td style="padding:16px 0;">
                    <a href="mailto:${sanitizedEmail}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#ffffff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;">
                      Reply to ${sanitizedName}
                    </a>
                    <a href="tel:+251956140291" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;margin-left:8px;">
                      Call +251 956 140 291
                    </a>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;

    const emailText = `
New Contact Form Message

From: ${sanitizedName}
Email: ${sanitizedEmail}
Subject: ${sanitizedSubject}

Message:
${sanitizedMessage}

Reply: mailto:${sanitizedEmail}
Call: tel:+251956140291
    `.trim();

    // Send email to support (fire and forget — don't block the response)
    sendEmail({
      to: SUPPORT_EMAIL,
      subject: `[Contact Form] ${sanitizedSubject} — from ${sanitizedName}`,
      html: emailHtml,
      text: emailText,
    }).catch(err => console.error('[Contact] Email send failed:', err));

    // Also send a confirmation email to the user
    sendEmail({
      to: sanitizedEmail,
      subject: 'Thank you for contacting TenetBid',
      html: `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <tr><td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:24px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">TenetBid</h1>
                  <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Message Received</p>
                </td></tr>
                <tr><td style="padding:32px 40px;">
                  <p style="margin:0 0 12px;font-size:16px;color:#1a1a1a;">Hi ${sanitizedName},</p>
                  <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.6;">Thank you for reaching out! We've received your message and our team will respond within 24 hours.</p>
                  <div style="background:#f8f8f8;border-radius:8px;padding:16px;border:1px solid #eee;">
                    <p style="margin:0;font-size:13px;color:#777;"><strong>Your subject:</strong> ${sanitizedSubject}</p>
                    <p style="margin:8px 0 0;font-size:13px;color:#777;"><strong>Your message:</strong> ${sanitizedMessage.slice(0, 200)}${sanitizedMessage.length > 200 ? '...' : ''}</p>
                  </div>
                  <p style="margin:20px 0 0;font-size:13px;color:#777;line-height:1.6;">Need immediate help? Call us at <a href="tel:+251956140291" style="color:#f97316;">+251 956 140 291</a> or email <a href="mailto:support@tenetbid.com" style="color:#f97316;">support@tenetbid.com</a></p>
                </td></tr>
                <tr><td style="background:#fafafa;padding:16px 40px;border-top:1px solid #eee;">
                  <p style="margin:0;font-size:12px;color:#999;text-align:center;">TenetBid — Transforming Procurement Through Technology</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body></html>
      `,
      text: `Thank you for contacting TenetBid! We've received your message and will respond within 24 hours.\n\nNeed immediate help? Call +251 956 140 291 or email support@tenetbid.com\n\n— TenetBid`,
    }).catch(err => console.error('[Contact] Confirmation email failed:', err));

    // Store in DB for admin review
    await db.comment.create({
      data: {
        name: sanitizedName,
        email: sanitizedEmail,
        company: sanitizedSubject,
        role: 'other',
        content: sanitizedMessage,
        rating: 5,
        featured: false,
        approved: false,
      },
    });

    return NextResponse.json(
      { success: true, message: 'Your message has been sent successfully. We will get back to you soon.' },
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
