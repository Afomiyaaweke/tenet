import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/companies/public
 * Public endpoint — no auth required.
 * Returns a curated sample of verified companies for social proof.
 */
export async function GET() {
  try {
    const companies = await db.company.findMany({
      where: {
        status: 'active',
        verified: true,
      },
      select: {
        name: true,
        industry: true,
        logoUrl: true,
        city: true,
        country: true,
        vanitySlug: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    return NextResponse.json({ success: true, data: companies });
  } catch (error) {
    console.error('Public companies error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    );
  }
}
