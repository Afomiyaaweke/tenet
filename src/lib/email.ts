import nodemailer from 'nodemailer';

// ── Email configuration ─────────────────────────────────────────────────
// In production, set these environment variables for your SMTP provider
// (SendGrid, AWS SES, Mailgun, Gmail, etc.)
//
// SMTP_HOST=smtp.sendgrid.net
// SMTP_PORT=587
// SMTP_USER=apikey
// SMTP_PASS=your-api-key
// SMTP_FROM="Tenets <noreply@tenet.app>"
//
// In development, if SMTP is not configured, emails are logged to the
// server console instead of being sent.

function getSmtpConfig() {
  return {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Tenets <noreply@tenet.app>',
  };
}

function isSmtpConfigured(): boolean {
  const { host, user, pass } = getSmtpConfig();
  return !!(host && user && pass);
}

// Lazy transporter — only created when SMTP is configured
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!isSmtpConfigured()) return null;
  if (transporter) return transporter;

  const { host, port, user, pass } = getSmtpConfig();
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

// ── Public API ──────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email. In development without SMTP configured, the email
 * content is logged to the server console instead.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    // No SMTP configured — log to console for development
    console.log('──────────────────────────────────────────────────');
    console.log('📧 EMAIL (not sent — SMTP not configured)');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    if (text) console.log(`   Text: ${text}`);
    console.log('   (HTML content omitted from console log)');
    console.log('──────────────────────────────────────────────────');
    return true; // Pretend success in dev
  }

  try {
    const { from } = getSmtpConfig();
    await transport.sendMail({ from, to, subject, html, text });
    console.log(`📧 Email sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error('📧 Failed to send email:', err);
    return false;
  }
}

/**
 * Send a password reset email with the reset token/link.
 * The token is included both as a clickable link and as a
 * plain code the user can copy-paste.
 */
export async function sendPasswordResetEmail(
  to: string,
  token: string,
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetLink = `${appUrl}?token=${token}`;
  const expiresMinutes = 60;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Tenets</h1>
                  <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Password Reset Request</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;">Hello,</p>
                  <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
                    We received a request to reset your password. Click the button below to choose a new one:
                  </p>
                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding-bottom:24px;">
                        <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:16px;font-weight:600;box-shadow:0 4px 12px rgba(249,115,22,0.3);">
                          Reset My Password
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 16px;font-size:14px;color:#777;line-height:1.6;">
                    If the button doesn't work, copy and paste this link into your browser:
                  </p>
                  <p style="margin:0 0 24px;font-size:13px;color:#f97316;word-break:break-all;line-height:1.5;">
                    ${resetLink}
                  </p>
                  <!-- Divider -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="border-top:1px solid #eee;padding-top:20px;">
                      <p style="margin:0 0 12px;font-size:14px;color:#777;line-height:1.6;">
                        Alternatively, you can enter this reset code manually on the reset page:
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background:#f8f8f8;border:1px dashed #ddd;border-radius:8px;padding:14px 18px;text-align:center;">
                            <code style="font-family:'SF Mono',Monaco,Consolas,monospace;font-size:13px;color:#333;word-break:break-all;">${token}</code>
                          </td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                  <p style="margin:20px 0 0;font-size:13px;color:#999;line-height:1.5;">
                    ⏱ This link and code expire in <strong>${expiresMinutes} minutes</strong>.<br>
                    If you didn't request this, you can safely ignore this email — your password won't change.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#fafafa;padding:20px 40px;border-top:1px solid #eee;">
                  <p style="margin:0;font-size:12px;color:#999;text-align:center;">
                    Tenets — Transforming Procurement<br>
                    This is an automated message. Please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const textContent = `
Tenets — Password Reset

We received a request to reset your password.

Reset link: ${resetLink}

Or use this reset code: ${token}

This link and code expire in ${expiresMinutes} minutes.
If you didn't request this, you can safely ignore this email.

— Tenets
  `.trim();

  return sendEmail({
    to,
    subject: 'Tenets — Reset Your Password',
    html,
    text: textContent,
  });
}
