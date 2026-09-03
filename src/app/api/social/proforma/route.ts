import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { containsInsensitive } from '@/lib/search';

export const dynamic = 'force-dynamic';

/**
 * GET /api/social/proforma
 * Public marketplace — everyone (even travelers browsing) can see all
 * product price listings. Supports filtering by country, category, search.
 *
 * Query params:
 *  - country: filter by country name
 *  - category: filter by category
 *  - search: free-text search on product name/description
 *  - mine: 'true' to only return the current user's listings
 *  - limit: max results (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || '';
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const mine = searchParams.get('mine') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const where: Record<string, unknown> = { status: 'active' };
    if (country) where.country = country;
    if (category) where.category = category;
    if (mine) {
      const { user, error } = await requireAuth(request);
      if (error) return error;
      where.userId = user!.id;
    }
    if (search) {
      where.OR = [
        { productName: containsInsensitive(search) },
        { description: containsInsensitive(search) },
        { city: containsInsensitive(search) },
        { country: containsInsensitive(search) },
      ];
    }

    const [listings, total, countries] = await Promise.all([
      db.proformaListing.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { fullName: true, profilePhoto: true, verified: true } },
              company: { select: { name: true, logoUrl: true, verified: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      db.proformaListing.count({ where }),
      db.proformaListing.groupBy({
        by: ['country'],
        where: { status: 'active', country: { not: '' } },
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: listings,
      meta: {
        total,
        countries: countries.map(c => ({ name: c.country, count: c._count.country })),
      },
    });
  } catch (err) {
    console.error('[GET /api/social/proforma] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch proforma listings' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/social/proforma
 * Post a product price listing (requires auth).
 * People share their country's products so travelers can browse prices.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const {
      productName,
      description,
      category,
      quantity,
      unit,
      unitPrice,
      currency,
      city,
      country,
      contactInfo,
      imageUrls,
    } = body;

    if (!productName || !productName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Product name is required' },
        { status: 400 },
      );
    }
    if (unitPrice === undefined || unitPrice === null || Number(unitPrice) < 0) {
      return NextResponse.json(
        { success: false, error: 'Valid unit price is required' },
        { status: 400 },
      );
    }

    // Normalise incoming image URLs: accept a string[] or a JSON-encoded string,
    // strip anything that doesn't look like a URL, cap at 6 images.
    let normalizedImageUrls: string[] = [];
    if (Array.isArray(imageUrls)) {
      normalizedImageUrls = imageUrls
        .map((u) => (typeof u === 'string' ? u.trim() : ''))
        .filter((u) => u.startsWith('/uploads/') || u.startsWith('http'))
        .slice(0, 6);
    } else if (typeof imageUrls === 'string' && imageUrls.trim()) {
      try {
        const parsed = JSON.parse(imageUrls);
        if (Array.isArray(parsed)) {
          normalizedImageUrls = parsed
            .map((u: unknown) => (typeof u === 'string' ? u.trim() : ''))
            .filter((u: string) => u.startsWith('/uploads/') || u.startsWith('http'))
            .slice(0, 6);
        }
      } catch {
        // ignore malformed JSON — fall back to empty
      }
    }

    // Default country/city from the user's company or profile if not provided
    let finalCountry = (country || '').trim();
    let finalCity = (city || '').trim();
    if (!finalCountry && user!.companyId) {
      const company = await db.company.findUnique({
        where: { id: user!.companyId },
        select: { country: true, city: true },
      });
      if (company) {
        finalCountry = finalCountry || company.country || '';
        finalCity = finalCity || company.city || '';
      }
    }

    const listing = await db.proformaListing.create({
      data: {
        userId: user!.id,
        productName: productName.trim(),
        description: (description || '').trim(),
        category: category || 'General',
        quantity: Math.max(parseInt(String(quantity)) || 1, 1),
        unit: unit || 'unit',
        unitPrice: parseFloat(String(unitPrice)) || 0,
        currency: currency || 'ETB',
        city: finalCity,
        country: finalCountry,
        contactInfo: (contactInfo || '').trim(),
        imageUrls: JSON.stringify(normalizedImageUrls),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, profilePhoto: true, verified: true } },
            company: { select: { name: true, logoUrl: true, verified: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: listing }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/social/proforma] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to create listing' },
      { status: 500 },
    );
  }
}
