import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { fetchLiveTenders, fetchSectorTenders, getSectorCounts, DATA_SOURCES, SECTOR_IDS } from '@/lib/external-tenders';
import type { LiveTender, DataSource } from '@/lib/api';

/**
 * GET /api/tenders/live
 * Fetches tenders from external public procurement APIs or sector feeds.
 * Requires authentication. Returns normalized LiveTender[] + source metadata.
 *
 * Query params:
 *  - source: 'all' | 'worldbank' | 'eu_ted' | 'ungm' | 'sam_gov' | 'afdb' | 'eu_opentenders' | 'jica' | 'adb' | 'uk_contracts' | 'dgmarket' | 'apify_global' | 'apify_procurement' | 'govrider' | 'tenderwell' | 'seegenebid' | 'canada_buyandsell' | 'austender' | 'portugal_base' | 'ontario_tenders' | 'nigeria_nocopo' | 'kenya_tenders' | 'india_cppp' | 'south_africa' | 'philgeps'
 *  - sector: 'all' | 'medical' | 'construction' | 'retail' | 'it' | 'energy' | 'agriculture' | 'education' | 'transport' | 'finance' | 'telecom'
 *  - search: free-text search term
 *  - rows:   number of records per source (default 20, max 500)
 *  - offset: number of records to skip (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const source = (searchParams.get('source') || 'all').toLowerCase();
    const sector = (searchParams.get('sector') || '').toLowerCase();
    const search = searchParams.get('search') || undefined;
    const rowsRaw = Number(searchParams.get('rows'));
    const rows = Number.isFinite(rowsRaw) && rowsRaw > 0 ? Math.min(rowsRaw, 500) : 20;
    const offsetRaw = Number(searchParams.get('offset'));
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

    const allowedSources = ['all', 'worldbank', 'eu_ted', 'ungm', 'sam_gov', 'afdb', 'eu_opentenders', 'jica', 'adb', 'uk_contracts', 'dgmarket', 'apify_global', 'apify_procurement', 'govrider', 'tenderwell', 'seegenebid', 'canada_buyandsell', 'austender', 'portugal_base', 'ontario_tenders', 'nigeria_nocopo', 'kenya_tenders', 'india_cppp', 'south_africa', 'philgeps'];
    if (!allowedSources.includes(source)) {
      return NextResponse.json(
        { success: false, error: `Invalid source. Allowed: ${allowedSources.join(', ')}` },
        { status: 400 },
      );
    }

    const allowedSectors = ['all', ...SECTOR_IDS];
    if (sector && !allowedSectors.includes(sector)) {
      return NextResponse.json(
        { success: false, error: `Invalid sector. Allowed: ${allowedSectors.join(', ')}` },
        { status: 400 },
      );
    }

    // If sector is specified, use sector feed
    if (sector) {
      const sectorResult = fetchSectorTenders(sector, search);
      const sectors = getSectorCounts();
      return NextResponse.json({
        success: true,
        data: sectorResult.tenders,
        meta: {
          total: sectorResult.tenders.length,
          source: 'sector_feed',
          sector,
          search: search || '',
          rows,
          sectors,
          sources: [{ id: 'sector_feed', name: 'Sector Feed', live: true, ok: sectorResult.ok, count: sectorResult.tenders.length, error: sectorResult.error }],
          dataSources: DATA_SOURCES,
        },
      });
    }

    const result = await fetchLiveTenders({ source, search, rows, offset });

    const tenders: LiveTender[] = result.tenders;
    const dataSources: DataSource[] = DATA_SOURCES;
    const sectors = getSectorCounts();

    return NextResponse.json({
      success: true,
      data: tenders,
      meta: {
        ...result.meta,
        source,
        sector: '',
        search: search || '',
        rows,
        offset,
        hasMore: result.tenders.length >= rows,
        sectors,
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
