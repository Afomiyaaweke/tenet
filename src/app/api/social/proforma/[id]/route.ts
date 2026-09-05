import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { deleteFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/social/proforma/[id]
 * Public single-listing detail. No auth required — travelers and buyers
 * can view a listing without an account. Increments the view counter
 * (best-effort, non-blocking) so popularity sorts stay meaningful.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Listing ID is required' },
        { status: 400 },
      );
    }

    const listing = await db.proformaListing.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            accountType: true,
            profile: {
              select: {
                fullName: true,
                profilePhoto: true,
                verified: true,
                jobTitle: true,
                location: true,
                vanitySlug: true,
                isPublished: true,
              },
            },
            company: {
              select: {
                name: true,
                logoUrl: true,
                verified: true,
                industry: true,
                city: true,
                country: true,
                vanitySlug: true,
                isPublished: true,
              },
            },
          },
        },
      },
    });

    if (!listing || listing.status === 'deleted') {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 },
      );
    }

    // Best-effort view increment — never fail the request if this errors
    db.proformaListing
      .update({ where: { id }, data: { views: { increment: 1 } } })
      .catch(() => {});

    return NextResponse.json({ success: true, data: listing });
  } catch (err) {
    console.error('[GET /api/social/proforma/[id]] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch listing' },
      { status: 500 },
    );
  }
}

/**
 * Parse the JSON-encoded imageUrls column into a string[].
 * Falls back to [] for missing/malformed values.
 */
function parseImageUrls(imageUrls: string): string[] {
  if (!imageUrls) return [];
  try {
    const parsed = JSON.parse(imageUrls);
    return Array.isArray(parsed) ? parsed.filter((u) => typeof u === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * DELETE /api/social/proforma?id={listingId}
 * Delete own listing (or mark as sold).
 * Query params:
 *  - id: listing ID (required)
 *  - action: 'delete' (default) or 'sold' (marks as sold instead of deleting)
 *
 * On hard delete, attached product images are removed from storage (best-effort).
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action') || 'delete';

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Listing ID is required' },
        { status: 400 },
      );
    }

    const listing = await db.proformaListing.findUnique({ where: { id } });
    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 },
      );
    }

    // Only the owner can delete/mark sold
    if (listing.userId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'You can only manage your own listings' },
        { status: 403 },
      );
    }

    if (action === 'sold') {
      await db.proformaListing.update({ where: { id }, data: { status: 'sold' } });
      return NextResponse.json({ success: true, data: { message: 'Marked as sold' } });
    }

    await db.proformaListing.delete({ where: { id } });

    // Best-effort cleanup of attached image files. Failures here must not fail
    // the delete — the DB row is already gone.
    const urls = parseImageUrls(listing.imageUrls);
    if (urls.length > 0) {
      await Promise.allSettled(urls.map((u) => deleteFile(u)));
    }

    return NextResponse.json({ success: true, data: { message: 'Listing deleted' } });
  } catch (err) {
    console.error('[DELETE /api/social/proforma] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to delete listing' },
      { status: 500 },
    );
  }
}
