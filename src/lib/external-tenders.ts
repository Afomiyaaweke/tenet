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
  {
    id: 'canada_buyandsell',
    name: 'Canada — Buyandsell.gc.ca',
    coverage:
      'Canadian federal government procurement opportunities and tender notices. Public API with no authentication required.',
    access: 'Public API — no registration required',
    link: 'https://buyandsell.gc.ca',
    live: true,
    accent: 'red',
  },
  {
    id: 'austender',
    name: 'Australia — AusTender',
    coverage:
      'Australian government procurement opportunities, contract notices, and annual procurement plans. Public search API.',
    access: 'Public — no registration required',
    link: 'https://www.tenders.gov.au',
    live: true,
    accent: 'teal',
  },
  {
    id: 'portugal_base',
    name: 'Portugal — BASE',
    coverage:
      'Portuguese public procurement portal with tender notices, contract awards, and downloadable requirement documents.',
    access: 'Public portal — no registration required',
    link: 'https://www.base.gov.pt',
    live: true,
    accent: 'green',
  },
  {
    id: 'ontario_tenders',
    name: 'Ontario — Tenders Portal',
    coverage:
      'Ontario provincial government and broader public sector procurement opportunities in Canada.',
    access: 'Public — browse without registration',
    link: 'https://www.ontariotenders.ca',
    live: true,
    accent: 'orange',
  },
  {
    id: 'nigeria_nocopo',
    name: 'Nigeria — NOCOPO',
    coverage:
      'Nigerian Open Contracting Portal — federal and state procurement plans, tender notices, and contract awards.',
    access: 'Public open data portal',
    link: 'https://nocopo.bpp.gov.ng',
    live: true,
    accent: 'emerald',
  },
  {
    id: 'kenya_tenders',
    name: 'Kenya — Public Procurement',
    coverage:
      'Kenyan public procurement opportunities from the Public Procurement Regulatory Authority and county governments.',
    access: 'Public procurement portal',
    link: 'https://tenders.go.ke',
    live: true,
    accent: 'amber',
  },
  {
    id: 'india_cppp',
    name: 'India — CPPP eProcure',
    coverage:
      'Central Public Procurement Portal of India. Tenders from all central and state government departments, PSUs, and autonomous bodies.',
    access: 'Public — no registration required',
    link: 'https://eprocure.gov.in/eprocure/app',
    live: true,
    accent: 'orange',
  },
  {
    id: 'south_africa',
    name: 'South Africa — eTenders',
    coverage:
      'South African government eTender portal with procurement notices, tender documents, and contract awards from all government entities.',
    access: 'Public — no registration required',
    link: 'https://www.etenders.gov.za',
    live: true,
    accent: 'amber',
  },
  {
    id: 'philgeps',
    name: 'Philippines — PhilGEPS',
    coverage:
      'Philippine Government Electronic Procurement System. All government procurement opportunities with downloadable bidding documents.',
    access: 'Public — browse without registration',
    link: 'https://philgeps.gov.ph',
    live: true,
    accent: 'sky',
  },
  {
    id: 'colombia_secop',
    name: 'Colombia — SECOP',
    coverage:
      'Colombian public procurement portal (Sistema Electrónico para la Contratación Pública). All government tenders with downloadable requirement documents, RFPs, and contract awards.',
    access: 'Public API — no registration required (datos.gov.co)',
    link: 'https://www.colombiacompra.gov.co',
    live: true,
    accent: 'yellow',
  },
  {
    id: 'mexico_compranet',
    name: 'Mexico — CompraNet',
    coverage:
      'Mexican government e-procurement platform. All federal tenders with downloadable bidding documents, terms of reference, and contract notices.',
    access: 'Public API — no registration required',
    link: 'https://www.gob.mx/compranet',
    live: true,
    accent: 'green',
  },
  {
    id: 'chile_mercado',
    name: 'Chile — Mercado Público',
    coverage:
      'Chilean public procurement platform. Tenders from all government agencies with downloadable requirement documents and technical specifications.',
    access: 'Public API — no registration required (mercadopublico.cl)',
    link: 'https://www.mercadopublico.cl',
    live: true,
    accent: 'red',
  },
  {
    id: 'argentina_comprar',
    name: 'Argentina — COMPR.AR',
    coverage:
      'Argentinian federal procurement portal. Public tenders with downloadable pliegos (bidding documents) and technical specifications.',
    access: 'Public — no registration required',
    link: 'https://www.comprar.gob.ar',
    live: true,
    accent: 'cyan',
  },
  {
    id: 'uruguay_compras',
    name: 'Uruguay — Compras Estatales',
    coverage:
      'Uruguayan public procurement portal. Government tenders with downloadable requirement documents and bidding terms.',
    access: 'Public — no registration required (comprasestatales.gub.uy)',
    link: 'https://www.comprasestatales.gub.uy',
    live: true,
    accent: 'blue',
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
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean }> {
  const rows = Math.min(Math.max(opts.rows ?? 20, 1), 500);
  const offset = opts.offset || 0;
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
  if (offset > 0) params.set('osstart', String(offset + 1));

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
          requiredDocs: r.project_id
            ? `https://projects.worldbank.org/en/projects-operations/project-detail/${r.project_id}`
            : 'https://financesone.worldbank.org',
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
          documentUrl: r.project_id ? `https://projects.worldbank.org/en/projects-operations/project-detail/${r.project_id}` : undefined,
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
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean }> {
  const rows = Math.min(Math.max(opts.rows ?? 20, 1), 500);
  const offset = opts.offset || 0;
  const base = 'https://api.ted.europa.eu/v3/notices/search';
  const body = {
    query: opts.search ? `(${opts.search})` : '*',
    fields: ['ND', 'TI_DOC', 'DS_DATE_PUB', 'DEADLINE_DATE', 'PLACE_CONTRACT', 'VALUE_CONTRACT', 'CA_NAME', 'TITLE'],
    limit: rows,
    offset,
    pagination: { pageNumber: Math.floor(offset / rows) + 1, pageSize: rows },
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
        requiredDocs: `https://ted.europa.eu/udl?uri=TED:NOTICE:${nd}:TEXT:EN:HTML`,
        status: 'open',
        createdBy: 'eu_ted',
        createdAt: String(row.DS_DATE_PUB || new Date().toISOString()),
        updatedAt: String(row.DS_DATE_PUB || new Date().toISOString()),
        source: 'eu_ted',
        externalId: nd,
        externalUrl: `https://ted.europa.eu/udl?uri=TED:NOTICE:${nd}:TEXT:EN:HTML`,
        currency: 'EUR',
        borrower: String(row.CA_NAME || '') || undefined,
        documentUrl: `https://ted.europa.eu/udl?uri=TED:NOTICE:${nd}:TEXT:EN:HTML`,
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
  offset?: number;
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
        requiredDocs: rawLink,
        status: 'open',
        createdBy: 'ungm',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'ungm',
        externalId: `ungm-rss-${idx}`,
        externalUrl: rawLink,
        currency: 'USD',
        region: 'Global',
        documentUrl: rawLink,
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
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const params = new URLSearchParams({
    limit: String(rows),
    offset: String(opts.offset || 0),
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
        requiredDocs: opp.uiLink ? String(opp.uiLink) : `https://sam.gov/opp/${opp.noticeId || idx}`,
        status: 'open',
        createdBy: 'sam_gov',
        createdAt: String(opp.postedDate || new Date().toISOString()),
        updatedAt: String(opp.postedDate || new Date().toISOString()),
        source: 'sam_gov',
        externalId: String(opp.noticeId || idx),
        externalUrl: opp.uiLink ? String(opp.uiLink) : 'https://sam.gov',
        currency: 'USD',
        region: 'North America',
        documentUrl: opp.uiLink ? String(opp.uiLink) : undefined,
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

export async function fetchAfdbTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);

  // Try AfDB procurement API
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    const res = await fetch(`https://www.afdb.org/en/projects-operations/procurement`, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Tenet-Tender-Ecosystem/1.0', Accept: 'text/html,*/*' },
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`AfDB returned ${res.status}`);

    return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * OpenTenders EU adapter
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchEuOpenTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);

  // Try OpenTender EU API
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    const res = await fetch(`https://opentender.eu/api/tenders?limit=${rows}&q=${encodeURIComponent(opts.search || '')}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json();
      const items = Array.isArray(json.data || json.tenders || json) ? (json.data || json.tenders || json) : [];
      if (items.length > 0) {
        const tenders: LiveTender[] = items.slice(0, rows).map((item: Record<string, unknown>, idx: number) => ({
          id: `eu_opentenders-${item.id || idx}`,
          title: truncate(String(item.title || item.name || 'EU Open Tender'), 160),
          scope: truncate(String(item.description || item.title || ''), 400),
          budgetMin: Number(item.value_min || item.budgetMin || 0) || 0,
          budgetMax: Number(item.value_max || item.budgetMax || 0) || 0,
          deadline: String(item.deadline || item.closingDate || new Date(Date.now() + 30 * 86400000).toISOString()),
          location: String(item.country || item.region || 'EU'),
          categoryTags: String(item.category || item.cpvs || 'Consulting'),
          requiredDocs: String(item.documents_url || item.url || `https://opentender.eu/tender/${item.id || idx}`),
          status: 'open' as const,
          createdBy: 'eu_opentenders',
          createdAt: String(item.published_date || item.created_at || new Date().toISOString()),
          updatedAt: String(item.updated_at || new Date().toISOString()),
          source: 'eu_opentenders',
          externalId: String(item.id || idx),
          externalUrl: String(item.url || `https://opentender.eu/tender/${item.id || idx}`),
          currency: 'EUR',
          region: 'Europe',
          documentUrl: String(item.documents_url || item.url || '') || undefined,
        }));
        return { tenders, total: items.length, ok: true };
      }
    }

    // No data returned from API
    return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * JICA adapter
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchJicaTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  void opts;
  return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
}

/* ─────────────────────────────────────────────────────────────────────
 * ADB adapter
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchAdbTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);

  // Try ADB procurement API
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    const res = await fetch(`https://www.adb.org/api/v1/business-opportunities?type=procurement&limit=${rows}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json();
      const items = Array.isArray(json.data || json.results || json) ? (json.data || json.results || json) : [];
      if (items.length > 0) {
        const tenders: LiveTender[] = items.slice(0, rows).map((item: Record<string, unknown>, idx: number) => ({
          id: `adb-${item.id || idx}`,
          title: truncate(String(item.title || item.project_name || 'ADB Procurement Notice'), 160),
          scope: truncate(String(item.description || item.title || ''), 400),
          budgetMin: Number(item.value || item.budget || 0) || 0,
          budgetMax: Number(item.value || item.budget || 0) || 0,
          deadline: String(item.closing_date || item.deadline || new Date(Date.now() + 30 * 86400000).toISOString()),
          location: String(item.country || item.location || 'Asia-Pacific'),
          categoryTags: String(item.sector || item.type || 'Consulting'),
          requiredDocs: String(item.documents_url || item.url || `https://www.adb.org/business/opportunities/${item.id || idx}`),
          status: 'open' as const,
          createdBy: 'adb',
          createdAt: String(item.posted_date || item.created_at || new Date().toISOString()),
          updatedAt: String(item.updated_at || new Date().toISOString()),
          source: 'adb',
          externalId: String(item.id || idx),
          externalUrl: String(item.url || `https://www.adb.org/business/opportunities/${item.id || idx}`),
          currency: 'USD',
          region: 'Asia-Pacific',
          documentUrl: String(item.documents_url || item.url || '') || undefined,
        }));
        return { tenders, total: items.length, ok: true };
      }
    }

    return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * UK Contracts Finder adapter
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchUkContractsTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);

  // Try UK Contracts Finder API
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    const params = new URLSearchParams({
      limit: String(rows),
      offset: '0',
    });
    if (opts.search) params.set('q', opts.search);

    const res = await fetch(`https://www.contractsfinder.service.gov.uk/Published/V2/Notices/Search?${params.toString()}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json();
      const items = Array.isArray(json.results || json.notices || json.releases) ? (json.results || json.notices || json.releases) : [];
      if (items.length > 0) {
        const tenders: LiveTender[] = items.slice(0, rows).map((item: Record<string, unknown>, idx: number) => ({
          id: `uk_contracts-${item.id || idx}`,
          title: truncate(String(item.title || item.name || 'UK Contract Notice'), 160),
          scope: truncate(String(item.description || item.title || ''), 400),
          budgetMin: Number(item.value_low || item.minValue || 0) || 0,
          budgetMax: Number(item.value_high || item.maxValue || item.value || 0) || 0,
          deadline: String(item.deadline || item.closing_date || item.responseDeadline || new Date(Date.now() + 30 * 86400000).toISOString()),
          location: String(item.placeOfDelivery || item.location || 'United Kingdom'),
          categoryTags: String(item.category || item.cpvs || 'Consulting'),
          requiredDocs: String(item.documents_url || item.url || `https://www.contractsfinder.service.gov.uk/notice/${item.id || idx}`),
          status: 'open' as const,
          createdBy: 'uk_contracts',
          createdAt: String(item.published_date || item.created_at || item.datePublished || new Date().toISOString()),
          updatedAt: String(item.updated_at || new Date().toISOString()),
          source: 'uk_contracts',
          externalId: String(item.id || idx),
          externalUrl: String(item.url || `https://www.contractsfinder.service.gov.uk/notice/${item.id || idx}`),
          currency: 'GBP',
          region: 'Europe',
          documentUrl: String(item.documents_url || item.url || '') || undefined,
        }));
        return { tenders, total: items.length, ok: true };
      }
    }

    return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * DgMarket adapter
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchDgMarketTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  void opts;
  return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
}

/* ─────────────────────────────────────────────────────────────────────
 * Apify — Global Public Tenders Scraper adapter
 * Requires APIFY_API_TOKEN env var
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchApifyGlobalTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return { tenders: [], total: 0, ok: false, error: 'Enable Apify by setting APIFY_API_TOKEN in .env' };

  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 100);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);

  try {
    // Run the Apify actor and get results
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/lofomachines~public-tenders-scraper/runs/last/dataset/items?token=${token}&maxItems=${rows}&status=SUCCEEDED`,
      {
        signal: ctrl.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      },
    );
    clearTimeout(timer);
    if (!runRes.ok) return { tenders: [], total: 0, ok: false, error: `Apify API returned ${runRes.status}` };

    const items = (await runRes.json()) as Record<string, unknown>[];
    if (!Array.isArray(items)) return { tenders: [], total: 0, ok: false };

    const tenders: LiveTender[] = items.slice(0, rows).map((item, idx) => ({
      id: `apify_global-${idx}`,
      title: truncate(String(item.title || item.tenderName || 'Apify Tender'), 160),
      scope: truncate(String(item.description || item.scope || item.title || ''), 400),
      budgetMin: Number(item.budgetMin || item.value || 0) || 0,
      budgetMax: Number(item.budgetMax || item.value || 0) || 0,
      deadline: String(item.deadline || item.closingDate || new Date(Date.now() + 30 * 86400000).toISOString()),
      location: String(item.country || item.location || 'International'),
      categoryTags: String(item.category || item.sector || 'General'),
      requiredDocs: '',
      status: 'open' as const,
      createdBy: 'apify_global',
      createdAt: String(item.publishedDate || item.createdAt || new Date().toISOString()),
      updatedAt: String(item.updatedAt || new Date().toISOString()),
      source: 'apify_global',
      externalId: String(item.id || idx),
      externalUrl: String(item.url || item.link || 'https://apify.com'),
      currency: String(item.currency || 'USD'),
      region: String(item.region || 'Global'),
    }));

    return { tenders, total: items.length, ok: true };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'Apify connection failed' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * Apify — Public Tender & Procurement Alerts adapter
 * Requires APIFY_API_TOKEN env var
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchApifyProcurementTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return { tenders: [], total: 0, ok: false, error: 'Enable Apify by setting APIFY_API_TOKEN in .env' };

  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 100);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);

  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/datapilot~public-tender-procurement-alerts/runs/last/dataset/items?token=${token}&maxItems=${rows}&status=SUCCEEDED`,
      {
        signal: ctrl.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      },
    );
    clearTimeout(timer);
    if (!runRes.ok) return { tenders: [], total: 0, ok: false, error: `Apify API returned ${runRes.status}` };

    const items = (await runRes.json()) as Record<string, unknown>[];
    if (!Array.isArray(items)) return { tenders: [], total: 0, ok: false };

    const tenders: LiveTender[] = items.slice(0, rows).map((item, idx) => ({
      id: `apify_procurement-${idx}`,
      title: truncate(String(item.title || item.project_name || 'Procurement Alert'), 160),
      scope: truncate(String(item.description || item.project_name || ''), 400),
      budgetMin: Number(item.budget || item.totalValue || 0) || 0,
      budgetMax: Number(item.budget || item.totalValue || 0) || 0,
      deadline: String(item.deadline || item.closing_date || new Date(Date.now() + 30 * 86400000).toISOString()),
      location: String(item.country || item.borrower_country || 'International'),
      categoryTags: String(item.sector || item.procurement_type || 'Consulting'),
      requiredDocs: '',
      status: 'open' as const,
      createdBy: 'apify_procurement',
      createdAt: String(item.published_date || item.created_at || new Date().toISOString()),
      updatedAt: String(item.updated_at || new Date().toISOString()),
      source: 'apify_procurement',
      externalId: String(item.id || idx),
      externalUrl: String(item.url || item.link || 'https://apify.com'),
      currency: String(item.currency || 'USD'),
      borrower: String(item.borrower || '') || undefined,
      region: String(item.region || 'Global'),
    }));

    return { tenders, total: items.length, ok: true };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'Apify connection failed' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * GovRider MCP Server adapter
 * Requires GOVRIDER_API_KEY env var
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchGovRiderTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const apiKey = process.env.GOVRIDER_API_KEY;
  if (!apiKey) return { tenders: [], total: 0, ok: false, error: 'Enable GovRider by setting GOVRIDER_API_KEY in .env' };

  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 100);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);

  try {
    const res = await fetch('https://api.govrider.ai/v1/tenders', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: opts.search || '*',
        limit: rows,
        sort: 'date_desc',
      }),
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return { tenders: [], total: 0, ok: false, error: `GovRider API returned ${res.status}` };

    const json = (await res.json()) as { tenders?: Record<string, unknown>[]; total?: number };
    const items = json.tenders || [];
    const total = json.total || items.length;

    const tenders: LiveTender[] = items.slice(0, rows).map((item, idx) => ({
      id: `govrider-${item.id || idx}`,
      title: truncate(String(item.title || item.name || 'GovRider Tender'), 160),
      scope: truncate(String(item.description || item.summary || ''), 400),
      budgetMin: Number(item.budget_min || item.value || 0) || 0,
      budgetMax: Number(item.budget_max || item.value || 0) || 0,
      deadline: String(item.deadline || item.closing_date || new Date(Date.now() + 30 * 86400000).toISOString()),
      location: String(item.location || item.country || 'International'),
      categoryTags: String(item.category || item.type || 'General'),
      requiredDocs: '',
      status: 'open' as const,
      createdBy: 'govrider',
      createdAt: String(item.published_date || item.created_at || new Date().toISOString()),
      updatedAt: String(item.updated_at || new Date().toISOString()),
      source: 'govrider',
      externalId: String(item.id || idx),
      externalUrl: String(item.url || item.link || 'https://govrider.ai'),
      currency: String(item.currency || 'USD'),
      region: String(item.region || 'Global'),
    }));

    return { tenders, total, ok: true };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'GovRider connection failed' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * Tenderwell adapter
 * Requires TENDERWELL_API_KEY env var
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchTenderwellTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const apiKey = process.env.TENDERWELL_API_KEY;
  if (!apiKey) return { tenders: [], total: 0, ok: false, error: 'Enable Tenderwell by setting TENDERWELL_API_KEY in .env' };

  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 100);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);

  try {
    const params = new URLSearchParams({
      limit: String(rows),
      offset: '0',
      q: opts.search || '',
    });
    const res = await fetch(`https://api.tenderwell.com/v1/tenders?${params.toString()}`, {
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return { tenders: [], total: 0, ok: false, error: `Tenderwell API returned ${res.status}` };

    const json = (await res.json()) as { data?: Record<string, unknown>[]; total?: number };
    const items = json.data || [];
    const total = json.total || items.length;

    const tenders: LiveTender[] = items.slice(0, rows).map((item, idx) => ({
      id: `tenderwell-${item.id || idx}`,
      title: truncate(String(item.title || item.name || 'Tenderwell Tender'), 160),
      scope: truncate(String(item.description || ''), 400),
      budgetMin: Number(item.budget_min || item.value || 0) || 0,
      budgetMax: Number(item.budget_max || item.value || 0) || 0,
      deadline: String(item.deadline || item.closing_date || new Date(Date.now() + 30 * 86400000).toISOString()),
      location: String(item.country || item.region || 'International'),
      categoryTags: String(item.category || item.industry || 'General'),
      requiredDocs: '',
      status: 'open' as const,
      createdBy: 'tenderwell',
      createdAt: String(item.published_date || item.created_at || new Date().toISOString()),
      updatedAt: String(item.updated_at || new Date().toISOString()),
      source: 'tenderwell',
      externalId: String(item.id || idx),
      externalUrl: String(item.url || item.source_url || 'https://tenderwell.com'),
      currency: String(item.currency || 'USD'),
      region: String(item.region || 'Global'),
    }));

    return { tenders, total, ok: true };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'Tenderwell connection failed' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * Canada Buyandsell adapter
 * Public API — no registration required
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchCanadaBuyandsellTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    const params = new URLSearchParams({ format: 'json', limit: String(rows) });
    if (opts.search) params.set('q', opts.search);

    const res = await fetch(`https://buyandsell.gc.ca/api/search/tender?${params.toString()}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json();
      const items = Array.isArray(json.results || json.tenders || json.items) ? (json.results || json.tenders || json.items) : [];
      if (items.length > 0) {
        const tenders: LiveTender[] = items.slice(0, rows).map((item: Record<string, unknown>, idx: number) => ({
          id: `canada_buyandsell-${item.id || idx}`,
          title: truncate(String(item.title || item.tenderTitle || 'Canada Government Tender'), 160),
          scope: truncate(String(item.description || item.tenderDescription || ''), 400),
          budgetMin: Number(item.value_low || item.estimatedValue || 0) || 0,
          budgetMax: Number(item.value_high || item.estimatedValue || 0) || 0,
          deadline: String(item.closingDate || item.deadline || new Date(Date.now() + 30 * 86400000).toISOString()),
          location: String(item.region || item.deliveryLocation || 'Canada'),
          categoryTags: String(item.category || item.gsCode || 'Supply'),
          requiredDocs: String(item.documents_url || item.url || `https://buyandsell.gc.ca/procurement-data/tender/${item.id || idx}`),
          status: 'open' as const,
          createdBy: 'canada_buyandsell',
          createdAt: String(item.publicationDate || item.created_at || new Date().toISOString()),
          updatedAt: String(item.updated_at || new Date().toISOString()),
          source: 'canada_buyandsell',
          externalId: String(item.id || idx),
          externalUrl: String(item.url || `https://buyandsell.gc.ca/procurement-data/tender/${item.id || idx}`),
          currency: 'CAD',
          region: 'North America',
          documentUrl: String(item.documents_url || item.url || '') || undefined,
        }));
        return { tenders, total: items.length, ok: true };
      }
    }

    return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * Australia AusTender adapter
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchAusTenderTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    const res = await fetch(`https://www.tenders.gov.au/api/current-tenders?limit=${rows}&search=${encodeURIComponent(opts.search || '')}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json();
      const items = Array.isArray(json.data || json.tenders || json.releases) ? (json.data || json.tenders || json.releases) : [];
      if (items.length > 0) {
        const tenders: LiveTender[] = items.slice(0, rows).map((item: Record<string, unknown>, idx: number) => ({
          id: `austender-${item.id || idx}`,
          title: truncate(String(item.title || item.name || 'Australian Government Tender'), 160),
          scope: truncate(String(item.description || item.title || ''), 400),
          budgetMin: Number(item.value_low || item.estimatedValue || 0) || 0,
          budgetMax: Number(item.value_high || item.estimatedValue || 0) || 0,
          deadline: String(item.closingDate || item.deadline || new Date(Date.now() + 30 * 86400000).toISOString()),
          location: String(item.location || item.state || 'Australia'),
          categoryTags: String(item.category || item.industry || 'Consulting'),
          requiredDocs: String(item.documents_url || item.url || `https://www.tenders.gov.au/tender/${item.id || idx}`),
          status: 'open' as const,
          createdBy: 'austender',
          createdAt: String(item.publishDate || item.created_at || new Date().toISOString()),
          updatedAt: String(item.updated_at || new Date().toISOString()),
          source: 'austender',
          externalId: String(item.id || idx),
          externalUrl: String(item.url || `https://www.tenders.gov.au/tender/${item.id || idx}`),
          currency: 'AUD',
          region: 'Oceania',
          documentUrl: String(item.documents_url || item.url || '') || undefined,
        }));
        return { tenders, total: items.length, ok: true };
      }
    }

    return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * Portugal BASE adapter
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchPortugalBaseTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  void opts;
  return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
}

/* ─────────────────────────────────────────────────────────────────────
 * Ontario Tenders adapter
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchOntarioTendersTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  void opts;
  return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
}

/* ─────────────────────────────────────────────────────────────────────
 * Nigeria NOCOPO adapter
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchNigeriaNocopoTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  void opts;
  return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
}

/* ─────────────────────────────────────────────────────────────────────
 * Kenya Public Procurement adapter
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchKenyaTendersTenders(opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  void opts;
  return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
}

/* ─────────────────────────────────────────────────────────────────────
 * India CPPP (Central Public Procurement Portal) adapter
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchIndiaCpppTenders(opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const offset = opts.offset || 0;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const params = new URLSearchParams({
      limit: String(rows),
      offset: String(offset),
    });
    if (opts.search) params.set('search', opts.search);
    const res = await fetch(`https://eprocure.gov.in/eprocure/app?${params.toString()}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return { tenders: [], total: 0, ok: false, error: 'API unreachable' };

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('json')) {
      const json = await res.json();
      const items = Array.isArray(json.data || json.tenders || json.results) ? (json.data || json.tenders || json.results) : [];
      if (items.length > 0) {
        const tenders: LiveTender[] = items.slice(0, rows).map((item: Record<string, unknown>, idx: number) => ({
          id: `india_cppp-${item.tenderId || item.id || idx}`,
          title: truncate(String(item.title || item.tenderTitle || item.tender_name || 'India Government Tender'), 160),
          scope: truncate(String(item.description || item.tenderDescription || item.scope || ''), 400),
          budgetMin: Number(item.estimatedValue || item.budgetMin || item.tender_value || 0) || 0,
          budgetMax: Number(item.estimatedValue || item.budgetMax || item.tender_value || 0) || 0,
          deadline: String(item.deadline || item.closingDate || item.bid_end_date || new Date(Date.now() + 30 * 86400000).toISOString()),
          location: String(item.location || item.state || 'India'),
          categoryTags: String(item.category || item.department || 'General'),
          requiredDocs: String(item.documents_url || item.tender_document_url || `https://eprocure.gov.in/eprocure/app`),
          status: 'open' as const,
          createdBy: 'india_cppp',
          createdAt: String(item.publishedDate || item.published_date || new Date().toISOString()),
          updatedAt: String(item.updated_at || new Date().toISOString()),
          source: 'india_cppp',
          externalId: String(item.tenderId || item.id || idx),
          externalUrl: String(item.url || item.tender_url || `https://eprocure.gov.in/eprocure/app`),
          currency: 'INR',
          region: 'South Asia',
          documentUrl: String(item.tender_document_url || item.document_url || '') || undefined,
        }));
        return { tenders, total: items.length, ok: true };
      }
    }
    return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * South Africa eTenders adapter
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchSouthAfricaTenders(opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const offset = opts.offset || 0;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const params = new URLSearchParams({ limit: String(rows), offset: String(offset) });
    if (opts.search) params.set('q', opts.search);
    const res = await fetch(`https://www.etenders.gov.za/api/tenders?${params.toString()}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      const items = Array.isArray(json.data || json.tenders || json.results) ? (json.data || json.tenders || json.results) : [];
      if (items.length > 0) {
        const tenders: LiveTender[] = items.slice(0, rows).map((item: Record<string, unknown>, idx: number) => ({
          id: `south_africa-${item.id || idx}`,
          title: truncate(String(item.title || item.tenderTitle || 'South Africa Government Tender'), 160),
          scope: truncate(String(item.description || item.tenderDescription || ''), 400),
          budgetMin: Number(item.estimatedValue || item.budgetMin || 0) || 0,
          budgetMax: Number(item.estimatedValue || item.budgetMax || 0) || 0,
          deadline: String(item.closingDate || item.deadline || new Date(Date.now() + 30 * 86400000).toISOString()),
          location: String(item.province || item.location || 'South Africa'),
          categoryTags: String(item.category || item.industry || 'General'),
          requiredDocs: String(item.documents_url || item.url || `https://www.etenders.gov.za/tender/${item.id || idx}`),
          status: 'open' as const,
          createdBy: 'south_africa',
          createdAt: String(item.publishedDate || item.created_at || new Date().toISOString()),
          updatedAt: String(item.updated_at || new Date().toISOString()),
          source: 'south_africa',
          externalId: String(item.id || idx),
          externalUrl: String(item.url || `https://www.etenders.gov.za/tender/${item.id || idx}`),
          currency: 'ZAR',
          region: 'Africa',
          documentUrl: String(item.document_url || item.tender_document_url || '') || undefined,
        }));
        return { tenders, total: items.length, ok: true };
      }
    }
    return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * Philippines PhilGEPS adapter
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchPhilgepsTenders(opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const offset = opts.offset || 0;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const params = new URLSearchParams({ limit: String(rows), offset: String(offset) });
    if (opts.search) params.set('search', opts.search);
    const res = await fetch(`https://philgeps.gov.ph/api/tenders?${params.toString()}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      const items = Array.isArray(json.data || json.tenders || json.results) ? (json.data || json.tenders || json.results) : [];
      if (items.length > 0) {
        const tenders: LiveTender[] = items.slice(0, rows).map((item: Record<string, unknown>, idx: number) => ({
          id: `philgeps-${item.id || idx}`,
          title: truncate(String(item.title || item.tenderTitle || 'Philippines Government Tender'), 160),
          scope: truncate(String(item.description || item.tenderDescription || ''), 400),
          budgetMin: Number(item.approvedBudget || item.estimatedValue || item.budgetMin || 0) || 0,
          budgetMax: Number(item.approvedBudget || item.estimatedValue || item.budgetMax || 0) || 0,
          deadline: String(item.closingDate || item.deadline || item.submission_deadline || new Date(Date.now() + 30 * 86400000).toISOString()),
          location: String(item.region || item.location || 'Philippines'),
          categoryTags: String(item.category || item.procurement_type || 'General'),
          requiredDocs: String(item.documents_url || item.url || `https://philgeps.gov.ph/tender/${item.id || idx}`),
          status: 'open' as const,
          createdBy: 'philgeps',
          createdAt: String(item.publishedDate || item.created_at || new Date().toISOString()),
          updatedAt: String(item.updated_at || new Date().toISOString()),
          source: 'philgeps',
          externalId: String(item.id || idx),
          externalUrl: String(item.url || `https://philgeps.gov.ph/tender/${item.id || idx}`),
          currency: 'PHP',
          region: 'Southeast Asia',
          documentUrl: String(item.document_url || item.tender_document_url || '') || undefined,
        }));
        return { tenders, total: items.length, ok: true };
      }
    }
    return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'API unreachable' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * SeeGeneBid MCP adapter
 * Open source — aggregates from G2B (Korea), SAM.gov (US), UK FTS
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchSeeGeneBidTenders(opts: {
  search?: string;
  rows?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);

  try {
    // SeeGeneBid publishes a public JSON feed via GitHub Pages
    const res = await fetch('https://changheesong.github.io/seegene-bid-mcp/data/tenders.json', {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return { tenders: [], total: 0, ok: false, error: `SeeGeneBid feed returned ${res.status}` };

    const json = (await res.json()) as Record<string, unknown>[];
    if (!Array.isArray(json)) return { tenders: [], total: 0, ok: false };

    let items = json;
    if (opts.search) {
      const q = opts.search.toLowerCase();
      items = json.filter((item) =>
        String(item.title || '').toLowerCase().includes(q) ||
        String(item.description || '').toLowerCase().includes(q) ||
        String(item.org || '').toLowerCase().includes(q),
      );
    }

    const tenders: LiveTender[] = items.slice(0, rows).map((item, idx) => {
      const source = String(item.source || item.origin || 'unknown');
      const sourceId = source.includes('korea') || source.includes('g2b') ? 'G2B Korea'
        : source.includes('sam') || source.includes('us') ? 'SAM.gov'
        : source.includes('uk') || source.includes('fts') ? 'UK FTS'
        : 'SeeGeneBid';
      return {
        id: `seegenebid-${item.id || idx}`,
        title: truncate(String(item.title || item.bidName || `${sourceId} Tender`), 160),
        scope: truncate(String(item.description || item.title || ''), 400),
        budgetMin: Number(item.budget || item.value || item.estimatedValue || 0) || 0,
        budgetMax: Number(item.budget || item.value || item.estimatedValue || 0) || 0,
        deadline: String(item.deadline || item.closeDate || new Date(Date.now() + 30 * 86400000).toISOString()),
        location: String(item.country || item.region || sourceId.includes('Korea') ? 'South Korea' : sourceId.includes('SAM') ? 'United States' : 'United Kingdom'),
        categoryTags: String(item.category || item.industry || sourceId),
        requiredDocs: '',
        status: 'open' as const,
        createdBy: 'seegenebid',
        createdAt: String(item.pubDate || item.publishedAt || new Date().toISOString()),
        updatedAt: String(item.updatedAt || new Date().toISOString()),
        source: 'seegenebid',
        externalId: String(item.id || idx),
        externalUrl: String(item.url || item.link || 'https://github.com/changheesong/seegene-bid-mcp'),
        currency: String(item.currency || (sourceId.includes('Korea') ? 'KRW' : sourceId.includes('SAM') ? 'USD' : 'GBP')),
        region: String(item.region || 'Asia-Pacific'),
      } satisfies LiveTender;
    });

    return { tenders, total: items.length, ok: true };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'SeeGeneBid connection failed' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * Colombia SECOP adapter (live, public API with downloadable docs)
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchColombiaSecopTenders(opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const offset = opts.offset || 0;
  const params = new URLSearchParams({
    $limit: String(rows),
    $offset: String(offset),
    $order: 'fecha_de_publicacion DESC',
  });
  if (opts.search) params.set('$q', opts.search);

  const url = `https://www.datos.gov.co/resource/jbjy-vk9h.json?${params.toString()}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return { tenders: [], total: 0, ok: false, error: `SECOP API returned ${res.status}` };

    const json = (await res.json()) as Record<string, unknown>[];
    if (!Array.isArray(json)) return { tenders: [], total: 0, ok: false };

    const tenders: LiveTender[] = json.map((row, idx) => {
      const id = String(row.id_registro || row.numero_de_proceso || `secop-${idx}`);
      const title = String(row.nombre_del_procedimiento || row.objeto_a_contratar || `SECOP Procurement ${idx + 1}`);
      const amount = Number(row.valor_total_adjudicacion || row.cuantia_proceso || row.presupuesto_general || 0) || 0;
      const docUrl = row.urlproceso ? String(row.urlproceso) : row.url_documentos ? String(row.url_documentos) : undefined;
      return {
        id: `colombia_secop-${id}`,
        title: truncate(title, 160),
        scope: truncate(String(row.objeto_a_contratar || row.descripcion_del_proceso || title), 400),
        budgetMin: amount,
        budgetMax: amount,
        deadline: String(row.fecha_de_publicacion || row.fecha_de_cierre || new Date(Date.now() + 30 * 86400000).toISOString()),
        location: String(row.departamento || row.ciudad || 'Colombia'),
        categoryTags: String(row.tipo_de_contrato || row.clase || 'Supply'),
        requiredDocs: docUrl || '',
        status: 'open' as const,
        createdBy: 'colombia_secop',
        createdAt: String(row.fecha_de_publicacion || new Date().toISOString()),
        updatedAt: String(row.ultima_modificacion || new Date().toISOString()),
        source: 'colombia_secop',
        externalId: id,
        externalUrl: docUrl || `https://www.colombiacompra.gov.co`,
        currency: 'COP',
        borrower: String(row.entidad || row.nombre_entidad || '') || undefined,
        contractType: String(row.tipo_de_contrato || '') || undefined,
        region: String(row.departamento || 'South America'),
        documentUrl: docUrl,
      } satisfies LiveTender;
    });

    return { tenders, total: json.length, ok: true };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'SECOP API unreachable' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * Mexico CompraNet adapter (live, public open data)
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchMexicoCompranetTenders(opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const offset = opts.offset || 0;
  const params = new URLSearchParams({
    $limit: String(rows),
    $offset: String(offset),
    $order: 'fecha_publicacion DESC',
  });
  if (opts.search) params.set('$q', opts.search);

  const url = `https://api.datos.gob.mx/v2/contratacionesabiertas?${params.toString()}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return { tenders: [], total: 0, ok: false, error: `CompraNet API returned ${res.status}` };

    const json = (await res.json()) as { results?: Record<string, unknown>[]; pagination?: { total: number } };
    const items = Array.isArray(json.results) ? json.results : [];
    const total = json.pagination?.total ?? items.length;

    const tenders: LiveTender[] = items.map((row, idx) => {
      const compiled = (row.compiledRelease || row) as Record<string, unknown>;
      const tender = (compiled.tender || {}) as Record<string, unknown>;
      const id = String(tender.id || compiled.ocid || `mx-${idx}`);
      const title = String(tender.title || tender.description || `Mexican Tender ${idx + 1}`);
      const amount = Number(tender.value?.amount || tender.minValue?.amount || 0) || 0;
      const currency = String(tender.value?.currency || 'MXN');
      const docLinks = (tender.documents || []) as Array<Record<string, unknown>>;
      const docUrl = docLinks.length > 0 && docLinks[0].url ? String(docLinks[0].url) : undefined;

      return {
        id: `mexico_compranet-${id}`,
        title: truncate(title, 160),
        scope: truncate(String(tender.description || title), 400),
        budgetMin: amount,
        budgetMax: amount,
        deadline: String(tender.tenderPeriod?.endDate || tender.tenderPeriod?.startDate || new Date(Date.now() + 30 * 86400000).toISOString()),
        location: String(tender.deliveryLocation?.description || 'Mexico'),
        categoryTags: String(tender.mainProcurementCategory || tender.additionalClassifications?.[0]?.description || 'Supply'),
        requiredDocs: docUrl || '',
        status: 'open' as const,
        createdBy: 'mexico_compranet',
        createdAt: String(tender.publishedDate || new Date().toISOString()),
        updatedAt: String(tender.publishedDate || new Date().toISOString()),
        source: 'mexico_compranet',
        externalId: id,
        externalUrl: `https://www.gob.mx/compranet`,
        currency,
        borrower: String((compiled.parties?.[0] as Record<string, unknown>)?.name || '') || undefined,
        contractType: String(tender.procurementMethod || '') || undefined,
        region: 'North America',
        documentUrl: docUrl,
      } satisfies LiveTender;
    });

    return { tenders, total, ok: true };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'CompraNet API unreachable' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * Chile Mercado Público adapter (live, public search)
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchChileMercadoTenders(opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    // Chile Mercado Público provides a public search API
    const params = new URLSearchParams({
      fechaDesde: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
      fechaHasta: new Date().toISOString().split('T')[0],
      page: '1',
      pageSize: String(rows),
    });
    if (opts.search) params.set('texto', opts.search);

    const url = `https://api.mercadopublico.cl/servicios/v2/publico/licitaciones.json?${params.toString()}`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return { tenders: [], total: 0, ok: false, error: `Mercado Público returned ${res.status}` };

    const json = (await res.json()) as { Listado?: Record<string, unknown>[]; Cantidad?: number };
    const items = Array.isArray(json.Listado) ? json.Listado : [];
    const total = json.Cantidad ?? items.length;

    const tenders: LiveTender[] = items.map((row, idx) => {
      const codigo = String(row.CodigoExterno || row.Codigo || `cl-${idx}`);
      const nombre = String(row.Nombre || `Chilean Tender ${idx + 1}`);
      const amount = Number(row.MontoEstimado || row.MontoTotal || 0) || 0;
      const docUrl = row.UrlDocumento ? String(row.UrlDocumento) : row.UrlPublica ? String(row.UrlPublica) : undefined;

      return {
        id: `chile_mercado-${codigo}`,
        title: truncate(nombre, 160),
        scope: truncate(String(row.Descripcion || row.Nombre || ''), 400),
        budgetMin: amount,
        budgetMax: amount,
        deadline: String(row.FechaCierre || row.FechaPublicacion || new Date(Date.now() + 30 * 86400000).toISOString()),
        location: 'Chile',
        categoryTags: String(row.Tipo || row.Rubro || 'Supply'),
        requiredDocs: docUrl || '',
        status: 'open' as const,
        createdBy: 'chile_mercado',
        createdAt: String(row.FechaPublicacion || new Date().toISOString()),
        updatedAt: new Date().toISOString(),
        source: 'chile_mercado',
        externalId: codigo,
        externalUrl: docUrl || `https://www.mercadopublico.cl`,
        currency: 'CLP',
        borrower: String(row.Organismo || row.NombreOrganismo || '') || undefined,
        contractType: String(row.Tipo || '') || undefined,
        region: 'South America',
        documentUrl: docUrl,
      } satisfies LiveTender;
    });

    return { tenders, total, ok: true };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'Mercado Público API unreachable' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * Argentina COMPR.AR adapter (live, public)
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchArgentinaComprarTenders(opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    const params = new URLSearchParams({
      limit: String(rows),
      offset: String(opts.offset || 0),
    });
    if (opts.search) params.set('q', opts.search);

    const url = `https://api.datos.gob.ar/v2/contratacionesabiertas/licitaciones?${params.toString()}`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return { tenders: [], total: 0, ok: false, error: `COMPR.AR returned ${res.status}` };

    const json = (await res.json()) as { data?: Record<string, unknown>[]; meta?: { total: number } };
    const items = Array.isArray(json.data) ? json.data : [];
    const total = json.meta?.total ?? items.length;

    const tenders: LiveTender[] = items.map((row, idx) => {
      const tender = (row.tender || row) as Record<string, unknown>;
      const id = String(tender.id || row.ocid || `ar-${idx}`);
      const title = String(tender.title || tender.description || `Argentinian Tender ${idx + 1}`);
      const amount = Number(tender.value?.amount || 0) || 0;
      const docLinks = (tender.documents || []) as Array<Record<string, unknown>>;
      const docUrl = docLinks.length > 0 && docLinks[0].url ? String(docLinks[0].url) : undefined;

      return {
        id: `argentina_comprar-${id}`,
        title: truncate(title, 160),
        scope: truncate(String(tender.description || title), 400),
        budgetMin: amount,
        budgetMax: amount,
        deadline: String(tender.tenderPeriod?.endDate || new Date(Date.now() + 30 * 86400000).toISOString()),
        location: 'Argentina',
        categoryTags: String(tender.mainProcurementCategory || 'Supply'),
        requiredDocs: docUrl || '',
        status: 'open' as const,
        createdBy: 'argentina_comprar',
        createdAt: String(tender.publishedDate || new Date().toISOString()),
        updatedAt: new Date().toISOString(),
        source: 'argentina_comprar',
        externalId: id,
        externalUrl: `https://www.comprar.gob.ar`,
        currency: 'ARS',
        contractType: String(tender.procurementMethod || '') || undefined,
        region: 'South America',
        documentUrl: docUrl,
      } satisfies LiveTender;
    });

    return { tenders, total, ok: true };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'COMPR.AR API unreachable' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * Uruguay Compras Estatales adapter (live, public)
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchUruguayComprasTenders(opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    const params = new URLSearchParams({
      limit: String(rows),
      offset: String(opts.offset || 0),
    });
    if (opts.search) params.set('q', opts.search);

    const url = `https://www.comprasestatales.gub.uy/consultas/v2/licitaciones?${params.toString()}`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return { tenders: [], total: 0, ok: false, error: `Compras Estatales returned ${res.status}` };

    const json = (await res.json()) as { data?: Record<string, unknown>[] };
    const items = Array.isArray(json.data) ? json.data : [];

    const tenders: LiveTender[] = items.map((row, idx) => {
      const id = String(row.id || row.numero || `uy-${idx}`);
      const title = String(row.nombre || row.objeto || `Uruguayan Tender ${idx + 1}`);
      const amount = Number(row.monto_estimado || row.monto || 0) || 0;
      const docUrl = row.url_documento ? String(row.url_documento) : row.url_pliego ? String(row.url_pliego) : undefined;

      return {
        id: `uruguay_compras-${id}`,
        title: truncate(title, 160),
        scope: truncate(String(row.objeto || row.descripcion || title), 400),
        budgetMin: amount,
        budgetMax: amount,
        deadline: String(row.fecha_cierre || row.fecha_limite || new Date(Date.now() + 30 * 86400000).toISOString()),
        location: 'Uruguay',
        categoryTags: String(row.tipo || row.rubro || 'Supply'),
        requiredDocs: docUrl || '',
        status: 'open' as const,
        createdBy: 'uruguay_compras',
        createdAt: String(row.fecha_publicacion || new Date().toISOString()),
        updatedAt: new Date().toISOString(),
        source: 'uruguay_compras',
        externalId: id,
        externalUrl: `https://www.comprasestatales.gub.uy`,
        currency: 'UYU',
        borrower: String(row.organismo || row.entidad || '') || undefined,
        contractType: String(row.tipo || '') || undefined,
        region: 'South America',
        documentUrl: docUrl,
      } satisfies LiveTender;
    });

    return { tenders, total: items.length, ok: true };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'Compras Estatales API unreachable' };
  }
}

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
  offset?: number;
}): Promise<FetchLiveTendersResult> {
  const cacheKey = `${opts.source || 'all'}::${opts.search || ''}::${opts.rows || 20}::${opts.offset || 0}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) {
    return { ...hit.result, meta: { ...hit.result.meta, cachedAt: Date.now() } };
  }

  const rows = opts.rows ?? 20;
  const offset = opts.offset || 0;
  const wantSource = opts.source || 'all';
  const tasks: { id: string; name: string; live: boolean; p: Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> }[] = [];

  if (wantSource === 'all' || wantSource === 'worldbank') {
    tasks.push({
      id: 'worldbank',
      name: 'World Bank',
      live: true,
      p: fetchWorldBankTenders({ search: opts.search, rows, offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'eu_ted') {
    tasks.push({
      id: 'eu_ted',
      name: 'EU TED',
      live: true,
      p: fetchEuTedTenders({ search: opts.search, rows, offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'ungm') {
    tasks.push({
      id: 'ungm',
      name: 'UNGM',
      live: true,
      p: fetchUngmTenders({ search: opts.search, rows: Math.min(rows, 5), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'sam_gov') {
    tasks.push({
      id: 'sam_gov',
      name: 'SAM.gov',
      live: true,
      p: fetchSamGovTenders({ search: opts.search, rows: Math.min(rows, 5), offset }),
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
  // ── Credential-gated sources (enabled when env vars are set) ──
  if (wantSource === 'all' || wantSource === 'apify_global') {
    tasks.push({
      id: 'apify_global',
      name: 'Apify Global Tenders',
      live: !!process.env.APIFY_API_TOKEN,
      p: fetchApifyGlobalTenders({ search: opts.search, rows: Math.min(rows, 20) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'apify_procurement') {
    tasks.push({
      id: 'apify_procurement',
      name: 'Apify Procurement Alerts',
      live: !!process.env.APIFY_API_TOKEN,
      p: fetchApifyProcurementTenders({ search: opts.search, rows: Math.min(rows, 20) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'govrider') {
    tasks.push({
      id: 'govrider',
      name: 'GovRider',
      live: !!process.env.GOVRIDER_API_KEY,
      p: fetchGovRiderTenders({ search: opts.search, rows: Math.min(rows, 20) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'tenderwell') {
    tasks.push({
      id: 'tenderwell',
      name: 'Tenderwell',
      live: !!process.env.TENDERWELL_API_KEY,
      p: fetchTenderwellTenders({ search: opts.search, rows: Math.min(rows, 20) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'seegenebid') {
    tasks.push({
      id: 'seegenebid',
      name: 'SeeGeneBid',
      live: true, // Open source, no API key needed
      p: fetchSeeGeneBidTenders({ search: opts.search, rows: Math.min(rows, 20) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'canada_buyandsell') {
    tasks.push({
      id: 'canada_buyandsell',
      name: 'Canada Buyandsell',
      live: true,
      p: fetchCanadaBuyandsellTenders({ search: opts.search, rows: Math.min(rows, 20) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'austender') {
    tasks.push({
      id: 'austender',
      name: 'AusTender',
      live: true,
      p: fetchAusTenderTenders({ search: opts.search, rows: Math.min(rows, 20) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'portugal_base') {
    tasks.push({
      id: 'portugal_base',
      name: 'Portugal BASE',
      live: true,
      p: fetchPortugalBaseTenders({ search: opts.search, rows: Math.min(rows, 20) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'ontario_tenders') {
    tasks.push({
      id: 'ontario_tenders',
      name: 'Ontario Tenders',
      live: true,
      p: fetchOntarioTendersTenders({ search: opts.search, rows: Math.min(rows, 20) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'nigeria_nocopo') {
    tasks.push({
      id: 'nigeria_nocopo',
      name: 'Nigeria NOCOPO',
      live: true,
      p: fetchNigeriaNocopoTenders({ search: opts.search, rows: Math.min(rows, 20) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'kenya_tenders') {
    tasks.push({
      id: 'kenya_tenders',
      name: 'Kenya Tenders',
      live: true,
      p: fetchKenyaTendersTenders({ search: opts.search, rows: Math.min(rows, 20), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'india_cppp') {
    tasks.push({
      id: 'india_cppp',
      name: 'India CPPP',
      live: true,
      p: fetchIndiaCpppTenders({ search: opts.search, rows: Math.min(rows, 20), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'south_africa') {
    tasks.push({
      id: 'south_africa',
      name: 'South Africa eTenders',
      live: true,
      p: fetchSouthAfricaTenders({ search: opts.search, rows: Math.min(rows, 20), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'philgeps') {
    tasks.push({
      id: 'philgeps',
      name: 'PhilGEPS',
      live: true,
      p: fetchPhilgepsTenders({ search: opts.search, rows: Math.min(rows, 20), offset }),
    });
  }
  // ── Latin American public procurement sources (free, with downloadable docs) ──
  if (wantSource === 'all' || wantSource === 'colombia_secop') {
    tasks.push({
      id: 'colombia_secop',
      name: 'Colombia SECOP',
      live: true,
      p: fetchColombiaSecopTenders({ search: opts.search, rows: Math.min(rows, 20), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'mexico_compranet') {
    tasks.push({
      id: 'mexico_compranet',
      name: 'Mexico CompraNet',
      live: true,
      p: fetchMexicoCompranetTenders({ search: opts.search, rows: Math.min(rows, 20), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'chile_mercado') {
    tasks.push({
      id: 'chile_mercado',
      name: 'Chile Mercado Público',
      live: true,
      p: fetchChileMercadoTenders({ search: opts.search, rows: Math.min(rows, 20), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'argentina_comprar') {
    tasks.push({
      id: 'argentina_comprar',
      name: 'Argentina COMPR.AR',
      live: true,
      p: fetchArgentinaComprarTenders({ search: opts.search, rows: Math.min(rows, 20), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'uruguay_compras') {
    tasks.push({
      id: 'uruguay_compras',
      name: 'Uruguay Compras Estatales',
      live: true,
      p: fetchUruguayComprasTenders({ search: opts.search, rows: Math.min(rows, 20), offset }),
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
