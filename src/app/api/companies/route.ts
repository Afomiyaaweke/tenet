import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireSuperAdmin } from '@/lib/auth';

/**
 * GET /api/companies
 * Super admin sees all companies, others see their own company only
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    let companies;

    if (user!.role === 'super_admin') {
      // Super admin can see all companies
      companies = await db.company.findMany({
        include: {
          _count: { select: { users: true, profiles: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Non-super-admin users can only see their own company
      if (!user!.companyId) {
        return NextResponse.json({
          success: true,
          data: [],
        });
      }

      const company = await db.company.findUnique({
        where: { id: user!.companyId },
        include: {
          _count: { select: { users: true, profiles: true } },
        },
      });

      companies = company ? [company] : [];
    }

    return NextResponse.json({
      success: true,
      data: companies,
    });
  } catch (error) {
    console.error('Get companies error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching companies' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companies
 * Create a new company (super_admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireSuperAdmin(request);
    if (error) return error;

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
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Check if company with same registration number or TIN already exists
    if (registrationNo) {
      const existingByReg = await db.company.findUnique({ where: { registrationNo } });
      if (existingByReg) {
        return NextResponse.json(
          { success: false, error: 'A company with this registration number already exists' },
          { status: 409 }
        );
      }
    }

    if (tinNumber) {
      const existingByTin = await db.company.findUnique({ where: { tinNumber } });
      if (existingByTin) {
        return NextResponse.json(
          { success: false, error: 'A company with this TIN number already exists' },
          { status: 409 }
        );
      }
    }

    const company = await db.company.create({
      data: {
        name,
        industry: industry || 'General',
        tinNumber: tinNumber || null,
        registrationNo: registrationNo || null,
        phone: phone || null,
        city: city || null,
        country: country || 'Ethiopia',
        email: email || null,
        website: website || null,
        address: address || null,
        verified: false,
        status: 'active',
      },
    });

    return NextResponse.json(
      { success: true, data: company },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create company error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while creating the company' },
      { status: 500 }
    );
  }
}
