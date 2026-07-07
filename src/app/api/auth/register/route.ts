import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { generateToken, requireSuperAdmin } from '@/lib/auth';

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

    // Validate role - only allow "user" or "team_admin" for self-registration
    let assignedRole = 'user';
    if (role) {
      if (role === 'super_admin') {
        // Only existing super_admins can create super_admin users
        const adminCheck = await requireSuperAdmin(request);
        if (adminCheck.error) {
          return NextResponse.json(
            { success: false, error: 'Forbidden: Only super admins can create super admin accounts' },
            { status: 403 }
          );
        }
        assignedRole = 'super_admin';
      } else if (role === 'team_admin') {
        assignedRole = 'team_admin';
      } else if (role === 'user') {
        assignedRole = 'user';
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid role. Allowed values: user, team_admin' },
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
