import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

/**
 * PATCH /api/companies/[id]/verify
 * Verify a company (team_admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;

    // Verify company exists
    const existingCompany = await db.company.findUnique({ where: { id } });
    if (!existingCompany) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { verified } = body;

    if (typeof verified !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'verified field must be a boolean' },
        { status: 400 }
      );
    }

    const updatedCompany = await db.company.update({
      where: { id },
      data: { verified },
    });

    return NextResponse.json({
      success: true,
      data: updatedCompany,
    });
  } catch (error) {
    console.error('Verify company error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while verifying the company' },
      { status: 500 }
    );
  }
}
