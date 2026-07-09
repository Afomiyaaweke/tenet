import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { generateToken, requireTeamAdmin } from '@/lib/auth';

// ── Input validation helpers ──
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`;
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      fullName,
      phone,
      location,
      // Company fields
      companyName,
      companyIndustry,
      companyTinNumber,
      companyRegistrationNo,
      companyPhone,
      companyCity,
      companyCountry,
      companyEmail,
      companyWebsite,
      // Role
      role,
    } = body;

    // Validate required fields
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: email, password, fullName' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json(
        { success: false, error: passwordError },
        { status: 400 }
      );
    }

    // Validate role - self-registration only allows "user" role
    // Admin roles require existing admin authorization
    let assignedRole = 'user';
    if (role) {
      if (role === 'super_admin') {
        // Only existing super_admins can create super_admin users
        const adminCheck = await requireTeamAdmin(request);
        if (adminCheck.error) {
          return NextResponse.json(
            { success: false, error: 'Forbidden: Only super admins can create super admin accounts' },
            { status: 403 }
          );
        }
        // Even team_admin cannot create super_admin, double-check
        if (adminCheck.user!.role !== 'super_admin') {
          return NextResponse.json(
            { success: false, error: 'Forbidden: Only super admins can create super admin accounts' },
            { status: 403 }
          );
        }
        assignedRole = 'super_admin';
      } else if (role === 'team_admin') {
        // Only existing admins can create team_admin accounts
        const adminCheck = await requireTeamAdmin(request);
        if (adminCheck.error) {
          return NextResponse.json(
            { success: false, error: 'Forbidden: Only admins can create team admin accounts. Please register as a regular user.' },
            { status: 403 }
          );
        }
        assignedRole = 'team_admin';
      } else if (role === 'user') {
        assignedRole = 'user';
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid role. Allowed values: user, team_admin, super_admin' },
          { status: 400 }
        );
      }
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create Company + User + Profile in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create Company first if companyName is provided
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

      // Create User linked to Company
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: assignedRole,
          companyId: company?.id || null,
          status: 'active',
        },
        include: { company: true },
      });

      // Create Profile linked to both User and Company
      const profile = await tx.profile.create({
        data: {
          user: { connect: { id: user.id } },
          company: company ? { connect: { id: company.id } } : undefined,
          fullName,
          jobTitle: body.jobTitle || null,
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

    // Generate JWT token
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      companyId: result.user.companyId,
    });

    // Audit log
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')?.trim()
      || 'unknown';
    await db.auditLog.create({
      data: {
        userId: result.user.id,
        action: 'register',
        resource: 'user',
        resourceId: result.user.id,
        companyId: result.user.companyId || null,
        ipAddress,
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    }).catch(() => {}); // Non-critical

    // Return user data (without password hash)
    const { passwordHash: _, ...userWithoutPassword } = result.user;

    return NextResponse.json(
      {
        success: true,
        data: {
          user: { ...userWithoutPassword, profile: result.profile },
          token,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
