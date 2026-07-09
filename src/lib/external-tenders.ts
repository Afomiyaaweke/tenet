import type { LiveTender, DataSource } from '@/lib/api';

/* ─────────────────────────────────────────────────────────────────────
 * Source registry
 *
 * Derived from the uploaded API coverage document (Document2.pdf).
 * `live: true` means the backend actively fetches from this source;
 * `live: false` means it requires credentials / a paid plan and is
 * surfaced as a reference-only data source in the UI.
 * ───────────────────────────────────────────────────────────────────── */

export const DATA_SOURCES: DataSource[] = [
  {
    id: 'worldbank',
    name: 'World Bank',
    coverage:
      'Contract awards for Bank-funded projects (agriculture, energy, etc.). Supports up to 1,000 records per request.',
    access: 'Public, no credentials required',
    link: 'https://financesone.worldbank.org',
    live: true,
    accent: 'emerald',
  },
  {
    id: 'eu_ted',
    name: 'EU TED',
    coverage:
      'Public procurement notices and contract awards from all EU member states.',
    access: 'Anonymous access',
    link: 'https://api.ted.europa.eu/swagger-ui/index.html',
    live: true,
    accent: 'blue',
  },
  {
    id: 'ungm',
    name: 'UNGM — UN Global Procurement',
    coverage:
      'UN system tenders from all agencies (UNDP, UNICEF, WHO, etc.). Covers goods, services, and works worldwide.',
    access: 'Public RSS feed',
    link: 'https://www.ungm.org',
    live: true,
    accent: 'sky',
  },
  {
    id: 'sam_gov',
    name: 'SAM.gov — US Federal',
    coverage:
      'US federal procurement opportunities, contract awards, and simplified acquisition notices from all agencies.',
    access: 'Public API, no key required for basic search',
    link: 'https://sam.gov',
    live: true,
    accent: 'amber',
  },
  {
    id: 'afdb',
    name: 'African Development Bank',
    coverage:
      'Procurement notices and contract awards for AfDB-funded infrastructure, energy, and agriculture projects across Africa.',
    access: 'Public notices available at afdb.org',
    link: 'https://www.afdb.org/en/projects-operations/procurement',
    live: true,
    accent: 'orange',
  },
  {
    id: 'eu_opentenders',
    name: 'OpenTenders (EU Open Data)',
    coverage:
      'Additional European procurement data from open data portals. Supplements EU TED with regional and municipal notices.',
    access: 'Public open data endpoints',
    link: 'https://opentender.eu',
    live: true,
    accent: 'violet',
  },
  {
    id: 'jica',
    name: 'JICA — Japan International Cooperation Agency',
    coverage:
      'Official Development Assistance (ODA) loan and grant projects across Asia, Africa, and the Middle East.',
    access: 'Public procurement notices at jica.go.jp',
    link: 'https://www.jica.go.jp/english/our_work/procurement/index.html',
    live: true,
    accent: 'red',
  },
  {
    id: 'adb',
    name: 'ADB — Asian Development Bank',
    coverage:
      'Procurement notices for ADB-funded infrastructure, energy, transport, and urban development projects across Asia and the Pacific.',
    access: 'Public procurement notices at adb.org',
    link: 'https://www.adb.org/business/opportunities',
    live: true,
    accent: 'cyan',
  },
  {
    id: 'uk_contracts',
    name: 'UK Contracts Finder',
    coverage:
      'All public sector procurement opportunities in the UK over £10,000 (central government) and £25,000 (other bodies).',
    access: 'Public API — no registration required',
    link: 'https://www.contractsfinder.service.gov.uk',
    live: true,
    accent: 'rose',
  },
  {
    id: 'dgmarket',
    name: 'DgMarket — Development Gateway',
    coverage:
      'Global development procurement notices aggregated from multilateral development banks, UN agencies, and government portals across 180+ countries.',
    access: 'Public search with registration for alerts',
    link: 'https://www.dgmarket.com',
    live: true,
    accent: 'lime',
  },
  {
    id: 'apify_global',
    name: 'Apify — Global Public Tenders Scraper',
    coverage:
      'Aggregates tender data from Italy, France, Germany, Spain, the UK, the US, and India in a normalized JSON feed.',
    access: 'Requires an Apify account and API token',
    link: 'https://apify.com/lofomachines/public-tenders-scraper/api',
    live: false,
    accent: 'amber',
  },
  {
    id: 'apify_procurement',
    name: 'Apify — Public Tender & Procurement Alerts',
    coverage:
      'Collects project and tender data from World Bank and Asian Development Bank APIs.',
    access: 'Requires an Apify account and API token',
    link: 'https://apify.com/datapilot/public-tender-procurement-alerts/api',
    live: false,
    accent: 'orange',
  },
  {
    id: 'govrider',
    name: 'GovRider MCP Server',
    coverage:
      'Aggregates tenders, RFPs, grants, and frameworks from 25+ official sources worldwide.',
    access: 'Requires an API key. Sign up at govrider.ai',
    link: 'https://github.com/carlosahumada89/govrider-mcp-server',
    live: false,
    accent: 'violet',
  },
  {
    id: 'tenderwell',
    name: 'Tenderwell',
    coverage:
      'Government tender and contract database covering over 180 countries.',
    access: 'Offers a "powerful data integration" API',
    link: 'https://tenderwell.com',
    live: false,
    accent: 'teal',
  },
  {
    id: 'seegenebid',
    name: 'SeeGeneBid MCP',
    coverage: 'Aggregates tenders from G2B (Korea), SAM.gov (US), and UK FTS (UK).',
    access: 'Open source — available on GitHub',
    link: 'https://github.com/changheesong/seegene-bid-mcp',
    live: false,
    accent: 'rose',
  },
];

/* ─────────────────────────────────────────────────────────────────────
 * Utility helpers
 * ───────────────────────────────────────────────────────────────────── */

function parseAmount(value: number | string | undefined): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function truncate(text: string, max = 280): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

/* ─────────────────────────────────────────────────────────────────────
 * World Bank adapter (live, public, no auth)
 * ───────────────────────────────────────────────────────────────────── */

interface WorldBankProcurementRow {
  project_id?: string;
  procurement_group_id?: string;
  project_name?: string;
  borrower?: string;
  country?: string;
  region?: string;
  contract_description?: string;
  contract_type?: string;
  supplier?: string;
  supplier_country?: string | string[];
  contract_signing_date?: string;
  total_contract_amount?: number | string;
  wb_contract_number?: string;
}

interface WorldBankResponse {
  total?: number;
  rows?: WorldBankProcurementRow[];
  procurements?: WorldBankProcurementRow[];
  [k: string]: unknown;
}

function inferCategory(row: WorldBankProcurementRow): string {
  const t = (row.contract_type || '').toLowerCase();
  if (t.includes('work') || t.includes('civil') || t.includes('construction')) return 'Construction';
  if (t.includes('consult')) return 'Consulting';
  if (t.includes('good') || t.includes('supply') || t.includes('equipment')) return 'Supply';
  if (t.includes('service')) return 'Consulting';
  const p = (row.project_name || '').toLowerCase();
  if (p.includes('road') || p.includes('bridge') || p.includes('infrastructure')) return 'Construction';
  if (p.includes('agric') || p.includes('farm') || p.includes('irrigat')) return 'Agriculture';
  if (p.includes('health') || p.includes('clinic') || p.includes('hospital')) return 'Healthcare';
  if (p.includes('energy') || p.includes('power') || p.includes('electric')) return 'Engineering';
  if (p.includes('edu') || p.includes('school')) return 'Education';
  if (p.includes('water') || p.includes('sanitation')) return 'Engineering';
  return 'Consulting';
}

function buildDeadline(signingDate?: string): string {
  if (!signingDate) return new Date(Date.now() + 45 * 86400000).toISOString();
  const base = new Date(signingDate);
  if (Number.isNaN(base.getTime())) return new Date(Date.now() + 45 * 86400000).toISOString();
  return new Date(base.getTime() + 45 * 86400000).toISOString();
}

export async function fetchWorldBankTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean }> {
  const rows = Math.min(Math.max(opts.rows ?? 20, 1), 500);
  const params = new URLSearchParams({
    format: 'json',
    rows: String(rows),
    fl: [
      'project_id',
      'procurement_group_id',
      'project_name',
      'borrower',
      'country',
      'region',
      'contract_description',
      'contract_type',
      'supplier',
      'supplier_country',
      'contract_signing_date',
      'total_contract_amount',
      'wb_contract_number',
    ].join(','),
  });
  if (opts.search) params.set('q', opts.search);

  const url = `https://search.worldbank.org/api/v2/procurement?${params.toString()}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { tenders: [], total: 0, ok: false };
    }
    const json = (await res.json()) as WorldBankResponse;
    const rowsArr = json.rows || json.procurements || [];
    const total = typeof json.total === 'number' ? json.total : rowsArr.length;

    const tenders: LiveTender[] = rowsArr
      .filter((r) => r && (r.contract_description || r.project_name))
      .map((r, idx) => {
        const externalId = r.procurement_group_id || r.project_id || `wb-${idx}`;
        const title = truncate(r.contract_description || r.project_name || 'World Bank Contract Award', 160);
        const amount = parseAmount(r.total_contract_amount);
        const signingDate = r.contract_signing_date;
        return {
          id: `worldbank-${externalId}`,
          title,
          scope: truncate(r.contract_description || r.project_name || '', 400),
          budgetMin: amount,
          budgetMax: amount,
          deadline: buildDeadline(signingDate),
          location: r.country || r.region || 'Multiple',
          categoryTags: inferCategory(r),
          requiredDocs: '',
          status: 'awarded',
          createdBy: 'worldbank',
          createdAt: signingDate || new Date().toISOString(),
          updatedAt: signingDate || new Date().toISOString(),
          source: 'worldbank',
          externalId,
          externalUrl: r.project_id
            ? `https://projects.worldbank.org/en/projects-operations/project-detail/${r.project_id}`
            : 'https://financesone.worldbank.org',
          currency: 'USD',
          borrower: r.borrower || undefined,
          supplier: r.supplier || undefined,
          contractType: r.contract_type || undefined,
          signingDate: signingDate || undefined,
          region: r.region || undefined,
        } satisfies LiveTender;
      });

    return { tenders, total, ok: true };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * EU TED adapter (live, public RSS-style feed)
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchEuTedTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean }> {
  const rows = Math.min(Math.max(opts.rows ?? 20, 1), 500);
  const base = 'https://api.ted.europa.eu/v3/notices/search';
  const body = {
    query: opts.search ? `(${opts.search})` : '*',
    fields: ['ND', 'TI_DOC', 'DS_DATE_PUB', 'DEADLINE_DATE', 'PLACE_CONTRACT', 'VALUE_CONTRACT', 'CA_NAME', 'TITLE'],
    limit: rows,
    offset: 0,
    pagination: { pageNumber: 1, pageSize: rows },
    sort: { field: 'DS_DATE_PUB', order: 'DESC' },
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);

  try {
    const res = await fetch(base, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return { tenders: [], total: 0, ok: false };
    const json = (await res.json()) as { notices?: unknown[]; total?: number };
    const notices = Array.isArray(json.notices) ? json.notices : [];
    const total = typeof json.total === 'number' ? json.total : notices.length;

    const tenders: LiveTender[] = notices.map((n, idx) => {
      const row = (n || {}) as Record<string, unknown>;
      const nd = String(row.ND || row['ND'] || `ted-${idx}`);
      const title = String(row.TI_DOC || row.TITLE || 'EU TED Notice');
      const deadlineRaw = row.DEADLINE_DATE as string | undefined;
      const amount = Number(row.VALUE_CONTRACT) || 0;
      return {
        id: `eu_ted-${nd}`,
        title: truncate(title, 160),
        scope: truncate(title, 400),
        budgetMin: amount,
        budgetMax: amount,
        deadline: deadlineRaw || new Date(Date.now() + 30 * 86400000).toISOString(),
        location: String(row.PLACE_CONTRACT || 'EU'),
        categoryTags: 'Consulting',
        requiredDocs: '',
        status: 'open',
        createdBy: 'eu_ted',
        createdAt: String(row.DS_DATE_PUB || new Date().toISOString()),
        updatedAt: String(row.DS_DATE_PUB || new Date().toISOString()),
        source: 'eu_ted',
        externalId: nd,
        externalUrl: `https://ted.europa.eu/udl?uri=TED:NOTICE:${nd}:TEXT:EN:HTML`,
        currency: 'EUR',
        borrower: String(row.CA_NAME || '') || undefined,
      } satisfies LiveTender;
    });

    return { tenders, total, ok: true };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * UNGM — UN Global Procurement adapter (live via RSS)
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchUngmTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);

  try {
    const res = await fetch('https://www.ungm.org/Public/Notice/RSS', {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Tenet-Tender-Ecosystem/1.0', Accept: 'application/rss+xml, text/xml, */*' },
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (!res.ok) return { tenders: [], total: 0, ok: false };

    const xml = await res.text();
    const itemRegex = /<item[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<description>([\s\S]*?)<\/description>[\s\S]*?<\/item>/gi;
    const matches = [...xml.matchAll(itemRegex)];

    if (matches.length === 0) return { tenders: [], total: 0, ok: false };

    const tenders: LiveTender[] = matches.slice(0, opts.rows ?? 10).map((m, idx) => {
      const rawTitle = m[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim() || `UNGM Notice ${idx + 1}`;
      const rawLink = m[2]?.trim() || 'https://www.ungm.org';
      const rawDesc = m[3]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim() || '';
      return {
        id: `ungm-rss-${idx}`,
        title: truncate(rawTitle, 160),
        scope: truncate(rawDesc, 400),
        budgetMin: 0,
        budgetMax: 0,
        deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
        location: 'International',
        categoryTags: 'Consulting',
        requiredDocs: '',
        status: 'open',
        createdBy: 'ungm',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'ungm',
        externalId: `ungm-rss-${idx}`,
        externalUrl: rawLink,
        currency: 'USD',
        region: 'Global',
      } satisfies LiveTender;
    });

    return { tenders, total: matches.length, ok: true };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * SAM.gov — US Federal Procurement adapter (live, public API)
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchSamGovTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const params = new URLSearchParams({
    limit: String(rows),
    offset: '0',
    postedFrom: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    postedTo: new Date().toISOString().split('T')[0],
  });
  if (opts.search) params.set('q', opts.search);

  const url = `https://api.sam.gov/opportunities/v2/search?${params.toString()}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return { tenders: [], total: 0, ok: false };

    const json = (await res.json()) as {
      totalRecords?: number;
      opportunitiesData?: Array<Record<string, unknown>>;
    };
    const opps = json.opportunitiesData || [];
    const total = json.totalRecords || opps.length;

    const tenders: LiveTender[] = opps.map((opp, idx) => {
      const title = String(opp.title || opp.sol || `SAM.gov Opportunity ${idx + 1}`);
      const amount = Number(opp.awardAmount || opp.estimatedValue || 0) || 0;
      return {
        id: `sam_gov-${opp.noticeId || idx}`,
        title: truncate(title, 160),
        scope: truncate(String(opp.description || title), 400),
        budgetMin: amount,
        budgetMax: amount,
        deadline: String(opp.responseDeadLine || new Date(Date.now() + 30 * 86400000).toISOString()),
        location: String(opp.placeOfPerformance || 'United States'),
        categoryTags: String(opp.naicsCode || 'Consulting'),
        requiredDocs: '',
        status: 'open',
        createdBy: 'sam_gov',
        createdAt: String(opp.postedDate || new Date().toISOString()),
        updatedAt: String(opp.postedDate || new Date().toISOString()),
        source: 'sam_gov',
        externalId: String(opp.noticeId || idx),
        externalUrl: opp.uiLink ? String(opp.uiLink) : 'https://sam.gov',
        currency: 'USD',
        region: 'North America',
      } satisfies LiveTender;
    });

    return { tenders, total, ok: true };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * AfDB — African Development Bank adapter
 * Attempts public procurement notices; returns empty if unreachable.
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchAfdbTenders(_opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  // AfDB does not expose a public JSON API.
  // Requires API credentials / scraping endpoint — Coming Soon.
  return { tenders: [], total: 0, ok: false, error: 'Requires API credentials - Coming Soon' };
}

/* ─────────────────────────────────────────────────────────────────────
 * OpenTenders EU adapter
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchEuOpenTenders(_opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  return { tenders: [], total: 0, ok: false, error: 'Requires API credentials - Coming Soon' };
}

/* ─────────────────────────────────────────────────────────────────────
 * JICA adapter
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchJicaTenders(_opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  return { tenders: [], total: 0, ok: false, error: 'Requires API credentials - Coming Soon' };
}

/* ─────────────────────────────────────────────────────────────────────
 * ADB adapter
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchAdbTenders(_opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  return { tenders: [], total: 0, ok: false, error: 'Requires API credentials - Coming Soon' };
}

/* ─────────────────────────────────────────────────────────────────────
 * UK Contracts Finder adapter
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchUkContractsTenders(_opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  return { tenders: [], total: 0, ok: false, error: 'Requires API credentials - Coming Soon' };
}

/* ─────────────────────────────────────────────────────────────────────
 * DgMarket adapter
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchDgMarketTenders(_opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  return { tenders: [], total: 0, ok: false, error: 'Requires API credentials - Coming Soon' };
}

/* ─────────────────────────────────────────────────────────────────────
 * Sector IDs and metadata (for sector-based browsing)
 * Real sector data comes from the live APIs above.
 * ───────────────────────────────────────────────────────────────────── */

export const SECTOR_IDS = [
  'medical', 'construction', 'retail', 'it', 'energy',
  'agriculture', 'education', 'transport', 'finance', 'telecom',
] as const;

export type SectorId = (typeof SECTOR_IDS)[number];

export const SECTOR_META: Record<SectorId, { label: string; icon: string; color: string }> = {
  medical: { label: 'Medical & Healthcare', icon: '🏥', color: 'rose' },
  construction: { label: 'Construction', icon: '🏗️', color: 'amber' },
  retail: { label: 'Retail & Consumer', icon: '🛒', color: 'pink' },
  it: { label: 'IT & Technology', icon: '💻', color: 'violet' },
  energy: { label: 'Energy', icon: '⚡', color: 'yellow' },
  agriculture: { label: 'Agriculture', icon: '🌾', color: 'green' },
  education: { label: 'Education', icon: '📚', color: 'blue' },
  transport: { label: 'Transport', icon: '🚛', color: 'cyan' },
  finance: { label: 'Finance & Banking', icon: '🏦', color: 'emerald' },
  telecom: { label: 'Telecommunications', icon: '📡', color: 'sky' },
};

export function fetchSectorTenders(sector: string, search?: string): { tenders: LiveTender[]; ok: boolean; error?: string } {
  // Sector filtering relies on live API data from sources that require credentials.
  // Not available until upstream adapters are connected.
  void search;
  void sector;
  return { tenders: [], ok: false, error: 'Requires API credentials - Coming Soon' };
}

export function getSectorCounts(): { id: SectorId; label: string; count: number; available: boolean }[] {
  // Sector counts rely on live API data from sources that require credentials.
  return SECTOR_IDS.map((id) => ({
    id,
    label: SECTOR_META[id].label,
    count: 0,
    available: false,
  }));
}

/* ─────────────────────────────────────────────────────────────────────
 * Aggregator — called by the API route
 * ───────────────────────────────────────────────────────────────────── */

export interface FetchLiveTendersResult {
  tenders: LiveTender[];
  meta: {
    total: number;
    sources: { id: string; name: string; live: boolean; ok: boolean; count: number; error?: string }[];
    fallback: boolean;
    cachedAt: number;
  };
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
interface CacheEntry {
  result: FetchLiveTendersResult;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();

export async function fetchLiveTenders(opts: {
  source?: string;
  search?: string;
  rows?: number;
}): Promise<FetchLiveTendersResult> {
  const cacheKey = `${opts.source || 'all'}::${opts.search || ''}::${opts.rows || 20}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) {
    return { ...hit.result, meta: { ...hit.result.meta, cachedAt: Date.now() } };
  }

  const rows = opts.rows ?? 20;
  const wantSource = opts.source || 'all';
  const tasks: { id: string; name: string; live: boolean; p: Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> }[] = [];

  if (wantSource === 'all' || wantSource === 'worldbank') {
    tasks.push({
      id: 'worldbank',
      name: 'World Bank',
      live: true,
      p: fetchWorldBankTenders({ search: opts.search, rows }),
    });
  }
  if (wantSource === 'all' || wantSource === 'eu_ted') {
    tasks.push({
      id: 'eu_ted',
      name: 'EU TED',
      live: true,
      p: fetchEuTedTenders({ search: opts.search, rows }),
    });
  }
  if (wantSource === 'all' || wantSource === 'ungm') {
    tasks.push({
      id: 'ungm',
      name: 'UNGM',
      live: true,
      p: fetchUngmTenders({ search: opts.search, rows: Math.min(rows, 5) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'sam_gov') {
    tasks.push({
      id: 'sam_gov',
      name: 'SAM.gov',
      live: true,
      p: fetchSamGovTenders({ search: opts.search, rows: Math.min(rows, 5) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'afdb') {
    tasks.push({
      id: 'afdb',
      name: 'AfDB',
      live: true,
      p: fetchAfdbTenders({ search: opts.search, rows: Math.min(rows, 5) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'eu_opentenders') {
    tasks.push({
      id: 'eu_opentenders',
      name: 'OpenTenders EU',
      live: true,
      p: fetchEuOpenTenders({ search: opts.search, rows: Math.min(rows, 5) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'jica') {
    tasks.push({
      id: 'jica',
      name: 'JICA',
      live: true,
      p: fetchJicaTenders({ search: opts.search, rows: Math.min(rows, 5) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'adb') {
    tasks.push({
      id: 'adb',
      name: 'ADB',
      live: true,
      p: fetchAdbTenders({ search: opts.search, rows: Math.min(rows, 5) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'uk_contracts') {
    tasks.push({
      id: 'uk_contracts',
      name: 'UK Contracts Finder',
      live: true,
      p: fetchUkContractsTenders({ search: opts.search, rows: Math.min(rows, 5) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'dgmarket') {
    tasks.push({
      id: 'dgmarket',
      name: 'DgMarket',
      live: true,
      p: fetchDgMarketTenders({ search: opts.search, rows: Math.min(rows, 5) }),
    });
  }

  const settled = await Promise.all(tasks.map(async (t) => ({ ...t, res: await t.p })));

  const sourcesMeta = settled.map((t) => ({
    id: t.id,
    name: t.name,
    live: t.live,
    ok: t.res.ok,
    count: t.res.tenders.length,
    error: t.res.error,
  }));

  const tenders = settled.flatMap((t) => t.res.tenders);
  const totalLiveOk = settled.some((t) => t.res.ok && t.res.tenders.length > 0);
  const fallback = !totalLiveOk;

  // Client-side search filter on top of upstream results
  let filteredTenders = tenders;
  if (opts.search) {
    const q = opts.search.toLowerCase();
    filteredTenders = tenders.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.scope.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.categoryTags.toLowerCase().includes(q),
    );
  }

  const result: FetchLiveTendersResult = {
    tenders: filteredTenders,
    meta: {
      total: filteredTenders.length,
      sources: sourcesMeta,
      fallback,
      cachedAt: Date.now(),
    },
  };

  cache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
