import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { fetchLiveTenders, DATA_SOURCES } from '@/lib/external-tenders';
import type { LiveTender, DataSource } from '@/lib/api';

/**
 * GET /api/tenders/live
 * Fetches tenders from external public procurement APIs (World Bank, EU TED).
 * Requires authentication. Returns normalized LiveTender[] + source metadata.
 *
 * Query params:
 *  - source: 'all' | 'worldbank' | 'eu_ted'  (default 'all')
 *  - search: free-text search term
 *  - rows:   number of records per source (default 20, max 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const source = (searchParams.get('source') || 'all').toLowerCase();
    const search = searchParams.get('search') || undefined;
    const rowsRaw = Number(searchParams.get('rows'));
    const rows = Number.isFinite(rowsRaw) && rowsRaw > 0 ? Math.min(rowsRaw, 50) : 20;

    const allowedSources = ['all', 'worldbank', 'eu_ted'];
    if (!allowedSources.includes(source)) {
      return NextResponse.json(
        { success: false, error: `Invalid source. Allowed: ${allowedSources.join(', ')}` },
        { status: 400 },
      );
    }

    const result = await fetchLiveTenders({ source, search, rows });

    const tenders: LiveTender[] = result.tenders;
    const dataSources: DataSource[] = DATA_SOURCES;

    return NextResponse.json({
      success: true,
      data: tenders,
      meta: {
        ...result.meta,
        source,
        search: search || '',
        rows,
        sources: result.meta.sources,
        dataSources,
      },
    });
  } catch (err) {
    console.error('[GET /api/tenders/live] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch live tenders' },
      { status: 500 },
    );
  }
}
