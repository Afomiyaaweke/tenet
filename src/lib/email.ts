import crypto from 'crypto';

// ── Email configuration ─────────────────────────────────────────────────
// Configure SMTP for production. Without it, emails log to server console.

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

let transporter: import('nodemailer').Transporter | null = null;

function getTransporter(): import('nodemailer').Transporter | null {
  if (!isSmtpConfigured()) return null;
  if (transporter) return transporter;

  const { host, port, user, pass } = getSmtpConfig();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodemailerLib = require('nodemailer') as typeof import('nodemailer');
  transporter = nodemailerLib.createTransport({
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

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    console.log('──────────────────────────────────────────────────');
    console.log('📧 EMAIL (not sent — SMTP not configured)');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    if (text) console.log(`   Text: ${text}`);
    console.log('   (HTML content omitted from console log)');
    console.log('──────────────────────────────────────────────────');
    return true;
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

interface ResetEmailContext {
  to: string;
  rawToken: string;
  requestIP?: string | null;
  userAgent?: string | null;
  requestTime?: Date;
}

/**
 * Send a secure password reset email with:
 * - HTTPS-only reset link
 * - Copyable reset code
 * - IP/device/time information
 * - Clear expiration warning
 * - "Ignore if you didn't request this" warning
 * - No sensitive information in the email
 */
export async function sendPasswordResetEmail(ctx: ResetEmailContext): Promise<boolean> {
  // Enforce HTTPS in production for reset links
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/^http:/, 'https:');
  const resetLink = `${appUrl}?token=${ctx.rawToken}`;
  const expiresMinutes = 15;
  const requestTime = ctx.requestTime || new Date();
  const timeStr = requestTime.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Parse user agent for a friendly device description
  const deviceInfo = parseUserAgent(ctx.userAgent || null);
  const ipDisplay = ctx.requestIP && ctx.requestIP !== 'unknown' ? ctx.requestIP : null;

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
                            <code style="font-family:'SF Mono',Monaco,Consolas,monospace;font-size:13px;color:#333;word-break:break-all;">${ctx.rawToken}</code>
                          </td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                  <!-- Request details -->
                  ${(ipDisplay || deviceInfo) ? `
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="border-top:1px solid #eee;padding-top:16px;margin-top:8px;">
                      <p style="margin:0 0 8px;font-size:13px;color:#999;">Request details:</p>
                      ${ipDisplay ? `<p style="margin:0 0 4px;font-size:13px;color:#666;">🌐 IP Address: <code style="background:#f4f4f4;padding:2px 6px;border-radius:4px;">${ipDisplay}</code></p>` : ''}
                      ${deviceInfo ? `<p style="margin:0 0 4px;font-size:13px;color:#666;">💻 Device: ${deviceInfo}</p>` : ''}
                      <p style="margin:0;font-size:13px;color:#666;">🕐 Time: ${timeStr}</p>
                    </td></tr>
                  </table>
                  ` : ''}
                  <!-- Warning -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="border-top:1px solid #eee;padding-top:16px;margin-top:8px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f0;border:1px solid #fed7aa;border-radius:8px;">
                        <tr>
                          <td style="padding:14px 18px;">
                            <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#c2410c;">⏱ Expires in ${expiresMinutes} minutes</p>
                            <p style="margin:0;font-size:13px;color:#7c2d12;line-height:1.5;">
                              If you didn't request this password reset, please ignore this email — your password will not change. If you're concerned about your account security, contact support immediately.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
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

Or use this reset code: ${ctx.rawToken}

${ipDisplay ? `IP Address: ${ipDisplay}` : ''}
${deviceInfo ? `Device: ${deviceInfo}` : ''}
Time: ${timeStr}

This link and code expire in ${expiresMinutes} minutes.

If you didn't request this, you can safely ignore this email — your password won't change. If you're concerned, contact support.

— Tenets
  `.trim();

  return sendEmail({
    to: ctx.to,
    subject: 'Tenets — Reset Your Password',
    html,
    text: textContent,
  });
}

/**
 * Parse a user-agent string into a friendly description.
 */
function parseUserAgent(ua: string | null): string | null {
  if (!ua) return null;

  let browser = 'Unknown browser';
  let os = 'Unknown OS';

  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return `${browser} on ${os}`;
}
