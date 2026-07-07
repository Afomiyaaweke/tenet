import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/companies/[id]
 * Get company by ID with users
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    const company = await db.company.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            profile: { select: { fullName: true, jobTitle: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { users: true, profiles: true, documents: true } },
      },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    // Non-super-admin users can only view their own company
    if (user!.role !== 'super_admin' && user!.companyId !== id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only view your own company' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error('Get company error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching the company' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/companies/[id]
 * Update company (super_admin or team_admin of that company)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id } = await params;

    // Check permission: super_admin can update any, team_admin can update own company
    if (user!.role !== 'super_admin' && !(user!.role === 'team_admin' && user!.companyId === id)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to update this company' },
        { status: 403 }
      );
    }

    // Verify company exists
    const existingCompany = await db.company.findUnique({ where: { id } });
    if (!existingCompany) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      industry,
      tinNumber,
      registrationNo,
      phone,
      city,
      country,
      email,
      website,
      address,
      status,
    } = body;

    // Check for duplicate registration number or TIN if being updated
    if (registrationNo && registrationNo !== existingCompany.registrationNo) {
      const duplicateReg = await db.company.findUnique({ where: { registrationNo } });
      if (duplicateReg) {
        return NextResponse.json(
          { success: false, error: 'A company with this registration number already exists' },
          { status: 409 }
        );
      }
    }

    if (tinNumber && tinNumber !== existingCompany.tinNumber) {
      const duplicateTin = await db.company.findUnique({ where: { tinNumber } });
      if (duplicateTin) {
        return NextResponse.json(
          { success: false, error: 'A company with this TIN number already exists' },
          { status: 409 }
        );
      }
    }

    // Build update data - only include fields that are provided
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (industry !== undefined) updateData.industry = industry;
    if (tinNumber !== undefined) updateData.tinNumber = tinNumber || null;
    if (registrationNo !== undefined) updateData.registrationNo = registrationNo || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (city !== undefined) updateData.city = city || null;
    if (country !== undefined) updateData.country = country;
    if (email !== undefined) updateData.email = email || null;
    if (website !== undefined) updateData.website = website || null;
    if (address !== undefined) updateData.address = address || null;
    // Only super_admin can change status
    if (status !== undefined && user!.role === 'super_admin') {
      updateData.status = status;
    }

    const updatedCompany = await db.company.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedCompany,
    });
  } catch (error) {
    console.error('Update company error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while updating the company' },
      { status: 500 }
    );
  }
}
