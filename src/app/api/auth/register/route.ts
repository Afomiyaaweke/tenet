import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { validatePassword, isValidEmail, normalizeEmail, getClientIP, getUserAgent, isPayloadTooLarge } from '@/lib/validators';
import { addPasswordHistory } from '@/lib/token-service';
import { auditLog } from '@/lib/audit-logger';

const BCRYPT_SALT_ROUNDS = 12;

export async function POST(request: NextRequest) {
  try {
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
        { success: false, error: 'A user with this email already exists' },
        { status: 409 },
      );
    }

    // ── Hash password with bcrypt ──
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // ── Create Company + User + Profile in a transaction ──
    const result = await db.$transaction(async (tx) => {
      let company: { id: string; name: string; [key: string]: unknown } | null = null;
      if (companyName) {
        company = await tx.company.create({
          data: {
            name: companyName,
            industry: companyIndustry || 'General',
            tinNumber: companyTinNumber || null,
            registrationNo: companyRegistrationNo || null,
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
          role: 'user',
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

      return { user, profile, company };
    });

    // ── Store initial password in history ──
    await addPasswordHistory(result.user.id, passwordHash);

    // ── Generate JWT token ──
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      companyId: result.user.companyId,
    });

    // ── Audit log ──
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
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during registration' },
      { status: 500 },
    );
  }
}
