import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * GET /api/vanity/[slug]
 * Public endpoint — no auth required.
 * Returns company profile + public documents for a vanity URL page.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug || slug.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 }
      );
    }

    const company = await db.company.findUnique({
      where: { vanitySlug: slug },
      include: {
        profiles: {
          select: {
            fullName: true,
            jobTitle: true,
            profilePhoto: true,
          },
          take: 5,
        },
        documents: {
          where: {
            status: 'approved',
            docType: {
              in: ['business_license', 'certificate', 'portfolio'],
            },
          },
          select: {
            id: true,
            fileName: true,
            docType: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 12,
        },
        tenders: {
          where: { status: 'published' },
          select: {
            id: true,
            title: true,
            category: true,
            deadline: true,
            budget: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 6,
        },
        _count: {
          select: {
            documents: true,
            tenders: true,
            projects: true,
            users: true,
          },
        },
      },
    });

    if (!company || company.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 }
      );
    }

    // Sanitize: only return public-safe fields
    const publicData = {
      name: company.name,
      industry: company.industry,
      city: company.city,
      country: company.country,
      logoUrl: company.logoUrl,
      website: company.website,
      verified: company.verified,
      vanitySlug: company.vanitySlug,
      teamMembers: company.profiles,
      documents: company.documents,
      tenders: company.tenders,
      stats: company._count,
    };

    return NextResponse.json({ success: true, data: publicData });
  } catch (error) {
    console.error('Vanity page error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    );
  }
}
