import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      role,
      fullName,
      phone,
      location,
      type,
      companyName,
      tinNumber,
      licenseNumber,
      skillTags,
      bio,
    } = body;

    // Validate required fields
    if (!email || !password || !role || !fullName || !phone || !location) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: email, password, role, fullName, phone, location' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['admin', 'contractor', 'tender_owner'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be admin, contractor, or tender_owner' },
        { status: 400 }
      );
    }

    // Validate type
    const profileType = type || 'individual';
    const validTypes = ['individual', 'company'];
    if (!validTypes.includes(profileType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be individual or company' },
        { status: 400 }
      );
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

    // Create User + Profile in a transaction
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role,
          status: 'active',
        },
      });

      const profile = await tx.profile.create({
        data: {
          userId: user.id,
          type: profileType,
          fullName,
          companyName: companyName || null,
          phone,
          location,
          tinNumber: tinNumber || null,
          licenseNumber: licenseNumber || null,
          skillTags: skillTags || '',
          bio: bio || null,
        },
      });

      return { user, profile };
    });

    // Generate JWT token
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
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
