import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword, confirmPassword } = await request.json();

    if (!token || !newPassword || !confirmPassword) {
      return NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ success: false, error: 'Passwords do not match' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Find the reset token
    const resetRecord = await db.passwordReset.findUnique({
      where: { token },
    });

    if (!resetRecord) {
      return NextResponse.json({ success: false, error: 'Invalid or expired reset token' }, { status: 400 });
    }

    if (resetRecord.used) {
      return NextResponse.json({ success: false, error: 'This reset link has already been used' }, { status: 400 });
    }

    if (new Date() > resetRecord.expiresAt) {
      return NextResponse.json({ success: false, error: 'This reset link has expired. Please request a new one.' }, { status: 400 });
    }

    // Hash the new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update the user's password
    await db.user.update({
      where: { email: resetRecord.email },
      data: { passwordHash },
    });

    // Mark the token as used
    await db.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.',
    });
  } catch (err) {
    console.error('[POST /api/auth/reset-password] error:', err);
    return NextResponse.json({ success: false, error: 'An error occurred' }, { status: 500 });
  }
}
