import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/social/proforma?id={listingId}
 * Delete own listing (or mark as sold).
 * Query params:
 *  - id: listing ID (required)
 *  - action: 'delete' (default) or 'sold' (marks as sold instead of deleting)
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
    return NextResponse.json({ success: true, data: { message: 'Listing deleted' } });
  } catch (err) {
    console.error('[DELETE /api/social/proforma] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to delete listing' },
      { status: 500 },
    );
  }
}
