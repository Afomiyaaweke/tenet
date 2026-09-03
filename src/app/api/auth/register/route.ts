import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { validatePassword, isValidEmail, normalizeEmail, getClientIP, getUserAgent, isPayloadTooLarge } from '@/lib/validators';
import { addPasswordHistory } from '@/lib/token-service';
import { auditLog } from '@/lib/audit-logger';
import { requireDatabase } from '@/lib/utils';

const BCRYPT_SALT_ROUNDS = 12;

export async function POST(request: NextRequest) {
  try {
    // ── Database guard ──
    const dbGuard = requireDatabase();
    if (dbGuard) return dbGuard;

    // ── Payload size check ──
    const rawBody = await request.text();
    if (isPayloadTooLarge(rawBody)) {
      return NextResponse.json(
        { success: false, error: 'Request payload too large' },
        { status: 413 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 },
      );
    }

    const {
      email,
      password,
      fullName,
      phone,
      location,
      companyName,
      companyIndustry,
      companyTinNumber,
      companyRegistrationNo,
      companyPhone,
      companyCity,
      companyCountry,
      companyEmail,
      companyWebsite,
    } = body as Record<string, string>;

    // ── Account type: 'company' (default) or 'personal' ──
    // Personal accounts cannot publish tenders or manage teams.
    const accountType = body.accountType === 'personal' ? 'personal' : 'company';

    // ── Validate required fields ──
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: email, password, fullName' },
        { status: 400 },
      );
    }

    // ── Validate email format ──
    if (typeof email !== 'string' || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 },
      );
    }

    // ── Validate password strength ──
    const validation = validatePassword(password);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.errors[0] },
        { status: 400 },
      );
    }

    const normalizedEmail = normalizeEmail(email);

    // ── Check if user already exists ──
    const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'This email is already registered. Please sign in instead.' },
        { status: 409 },
      );
    }

    // ── Hash password with bcrypt ──
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // ── Create Company + User + Profile in a transaction ──
    // Use 15s timeout for Neon cold starts (default is 5s)
    const result = await db.$transaction(async (tx) => {
      // Personal accounts never create a company — company fields are ignored
      let company: { id: string; name: string; [key: string]: unknown } | null = null;
      if (companyName && accountType === 'company') {
        company = await tx.company.create({
          data: {
            name: companyName,
            industry: companyIndustry || 'General',
            tinNumber: (companyTinNumber?.trim() || null),
            registrationNo: (companyRegistrationNo?.trim() || null),
            phone: companyPhone || null,
            city: companyCity || null,
            country: companyCountry || 'Ethiopia',
            email: companyEmail || null,
            website: companyWebsite || null,
            verified: false,
            status: 'active',
          },
        });
      }

      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: company ? 'team_admin' : 'user', // Company registrants become team_admin
          accountType, // 'company' | 'personal'
          companyId: company?.id || null,
          status: 'active',
        },
        include: { company: true },
      });

      const profile = await tx.profile.create({
        data: {
          user: { connect: { id: user.id } },
          company: company ? { connect: { id: company.id } } : undefined,
          fullName,
          jobTitle: (body as Record<string, string>).jobTitle || null,
          phone: phone || null,
          location: location || null,
          tinNumber: companyTinNumber || null,
          skillTags: '',
          bio: null,
        },
        include: { company: true },
      });

      // Auto-create TeamMember as owner for company registrants
      if (company) {
        await tx.teamMember.create({
          data: {
            companyId: company.id,
            userId: user.id,
            role: 'owner',
            permissions: 'view_dashboard,view_tenders,manage_tenders,view_live_tenders,view_bids,manage_bids,view_projects,manage_projects,view_documents,manage_documents,view_chat,send_chat,view_events,manage_events,use_ai,manage_team',
            status: 'active',
          },
        });
      }

      return { user, profile, company };
    }, { timeout: 15000 });

    // ── Store initial password in history (non-critical - don't fail registration) ──
    try {
      await addPasswordHistory(result.user.id, passwordHash);
    } catch (e) {
      console.error('Password history save failed (non-critical):', e);
    }

    // ── Generate JWT token ──
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      companyId: result.user.companyId,
      tokenVersion: result.user.tokenVersion ?? 0,
    });

    // ── Audit log (non-critical) ──
    try {
      const clientIP = getClientIP(request);
      const userAgent = getUserAgent(request);
      await auditLog({
        userId: result.user.id,
        action: 'register',
        resource: 'user',
        resourceId: result.user.id,
        companyId: result.user.companyId || undefined,
        ipAddress: clientIP,
        userAgent,
      });
    } catch (e) {
      console.error('Audit log failed (non-critical):', e);
    }

    const { passwordHash: _, ...userWithoutPassword } = result.user;

    return NextResponse.json(
      {
        success: true,
        data: {
          user: { ...userWithoutPassword, profile: result.profile },
          token,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    // Log the FULL error object for debugging
    console.error('Registration error (full):', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('Registration error message:', error?.message);
    console.error('Registration error code:', error?.code);
    console.error('Registration error meta:', error?.meta);

    // Provide more specific error messages for common failures
    let errorMessage = 'An error occurred during registration';
    const msg = error?.message || '';
    const code = error?.code || '';

    // P1001 = Can't reach database server
    if (code === 'P1001' || msg.includes('P1001') || msg.includes("Can't reach database") || (msg.includes('connect') && msg.includes('database'))) {
      errorMessage = 'Database connection failed. Please ensure DATABASE_URL is set in Vercel environment variables.';
    } else if (msg.includes('JWT_SECRET') || msg.includes('FATAL')) {
      errorMessage = 'Server configuration error. Please contact support.';
    } else if (msg.includes('Unique constraint') || msg.includes('unique') || msg.includes('duplicate key')) {
      errorMessage = 'A record with this information already exists. Please try different details.';
    } else if (msg.includes('connect') || msg.includes('timeout') || msg.includes('ECONNREFUSED')) {
      errorMessage = 'Unable to connect to database. Please try again in a moment.';
    } else if (msg.includes('does not exist') || msg.includes('table')) {
      errorMessage = 'Database schema is not ready. Please try again in a moment.';
    } else if (msg.includes('Transaction') || msg.includes('transaction')) {
      errorMessage = 'Registration timed out. Please try again.';
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
