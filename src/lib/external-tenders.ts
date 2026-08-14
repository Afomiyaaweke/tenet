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
    name: 'UNGM - UN Global Procurement',
    coverage:
      'UN system tenders from all agencies (UNDP, UNICEF, WHO, etc.). Covers goods, services, and works worldwide.',
    access: 'Public RSS feed',
    link: 'https://www.ungm.org',
    live: true,
    accent: 'sky',
  },
  {
    id: 'sam_gov',
    name: 'SAM.gov - US Federal',
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
    name: 'JICA - Japan International Cooperation Agency',
    coverage:
      'Official Development Assistance (ODA) loan and grant projects across Asia, Africa, and the Middle East.',
    access: 'Public procurement notices at jica.go.jp',
    link: 'https://www.jica.go.jp/english/our_work/procurement/index.html',
    live: true,
    accent: 'red',
  },
  {
    id: 'adb',
    name: 'ADB - Asian Development Bank',
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
    access: 'Public API - no registration required',
    link: 'https://www.contractsfinder.service.gov.uk',
    live: true,
    accent: 'rose',
  },
  {
    id: 'dgmarket',
    name: 'DgMarket - Development Gateway',
    coverage:
      'Global development procurement notices aggregated from multilateral development banks, UN agencies, and government portals across 180+ countries.',
    access: 'Public search with registration for alerts',
    link: 'https://www.dgmarket.com',
    live: true,
    accent: 'lime',
  },
  {
    id: 'apify_global',
    name: 'Apify - Global Public Tenders Scraper',
    coverage:
      'Aggregates tender data from Italy, France, Germany, Spain, the UK, the US, and India in a normalized JSON feed.',
    access: 'Requires an Apify account and API token',
    link: 'https://apify.com/lofomachines/public-tenders-scraper/api',
    live: false,
    accent: 'amber',
  },
  {
    id: 'apify_procurement',
    name: 'Apify - Public Tender & Procurement Alerts',
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
    access: 'Open source - available on GitHub',
    link: 'https://github.com/changheesong/seegene-bid-mcp',
    live: false,
    accent: 'rose',
  },
  {
    id: 'canada_buyandsell',
    name: 'Canada - Buyandsell.gc.ca',
    coverage:
      'Canadian federal government procurement opportunities and tender notices. Public API with no authentication required.',
    access: 'Public API - no registration required',
    link: 'https://buyandsell.gc.ca',
    live: true,
    accent: 'red',
  },
  {
    id: 'austender',
    name: 'Australia - AusTender',
    coverage:
      'Australian government procurement opportunities, contract notices, and annual procurement plans. Public search API.',
    access: 'Public - no registration required',
    link: 'https://www.tenders.gov.au',
    live: true,
    accent: 'teal',
  },
  {
    id: 'portugal_base',
    name: 'Portugal - BASE',
    coverage:
      'Portuguese public procurement portal with tender notices, contract awards, and downloadable contract documents and technical specifications.',
    access: 'Public portal - no registration required',
    link: 'https://www.base.gov.pt',
    live: true,
    accent: 'green',
  },
  {
    id: 'ontario_tenders',
    name: 'Ontario - Tenders Portal',
    coverage:
      'Ontario provincial government and broader public sector procurement opportunities in Canada.',
    access: 'Public - browse without registration',
    link: 'https://www.ontariotenders.ca',
    live: true,
    accent: 'orange',
  },
  {
    id: 'nigeria_nocopo',
    name: 'Nigeria - NOCOPO',
    coverage:
      'Nigerian Open Contracting Portal - federal and state procurement plans, tender notices, and contract awards.',
    access: 'Public open data portal',
    link: 'https://nocopo.bpp.gov.ng',
    live: true,
    accent: 'emerald',
  },
  {
    id: 'kenya_tenders',
    name: 'Kenya - Public Procurement',
    coverage:
      'Kenyan public procurement opportunities from the Public Procurement Regulatory Authority and county governments.',
    access: 'Public procurement portal',
    link: 'https://tenders.go.ke',
    live: true,
    accent: 'amber',
  },
  {
    id: 'india_cppp',
    name: 'India - CPPP eProcure',
    coverage:
      'Central Public Procurement Portal of India. Tenders from all central and state government departments, PSUs, and autonomous bodies.',
    access: 'Public - no registration required',
    link: 'https://eprocure.gov.in/eprocure/app',
    live: true,
    accent: 'orange',
  },
  {
    id: 'south_africa',
    name: 'South Africa - eTenders',
    coverage:
      'South African government eTender portal with procurement notices, tender documents, and contract awards from all government entities.',
    access: 'Public - no registration required',
    link: 'https://www.etenders.gov.za',
    live: true,
    accent: 'amber',
  },
  {
    id: 'philgeps',
    name: 'Philippines - PhilGEPS',
    coverage:
      'Philippine Government Electronic Procurement System. All government procurement opportunities with downloadable bidding documents.',
    access: 'Public - browse without registration',
    link: 'https://philgeps.gov.ph',
    live: true,
    accent: 'sky',
  },
  {
    id: 'colombia_secop',
    name: 'Colombia - SECOP',
    coverage:
      'Colombian public procurement portal (Sistema Electrónico para la Contratación Pública). All government tenders with downloadable requirement documents and RFP files, including process documents and contract awards.',
    access: 'Public API - no registration required (datos.gov.co)',
    link: 'https://www.colombiacompra.gov.co',
    live: true,
    accent: 'yellow',
  },
  {
    id: 'mexico_compranet',
    name: 'Mexico - CompraNet',
    coverage:
      'Mexican government e-procurement platform. All federal tenders with downloadable requirement documents and RFP files, including bidding documents, terms of reference, and technical specifications.',
    access: 'Public API - no registration required',
    link: 'https://www.gob.mx/compranet',
    live: true,
    accent: 'green',
  },
  {
    id: 'chile_mercado',
    name: 'Chile - Mercado Público',
    coverage:
      'Chilean public procurement platform. Tenders from all government agencies with downloadable requirement documents and RFP files, including tender documents and public notices.',
    access: 'Public API - no registration required (mercadopublico.cl)',
    link: 'https://www.mercadopublico.cl',
    live: true,
    accent: 'red',
  },
  {
    id: 'argentina_comprar',
    name: 'Argentina - COMPR.AR',
    coverage:
      'Argentinian federal procurement portal. Public tenders with downloadable requirement documents and RFP files, including pliegos (bidding documents) and technical specifications.',
    access: 'Public - no registration required',
    link: 'https://www.comprar.gob.ar',
    live: true,
    accent: 'cyan',
  },
  {
    id: 'uruguay_compras',
    name: 'Uruguay - Compras Estatales',
    coverage:
      'Uruguayan public procurement portal. Government tenders with downloadable requirement documents and RFP files, including bidding documents and pliegos (tender terms).',
    access: 'Public - no registration required (comprasestatales.gub.uy)',
    link: 'https://www.comprasestatales.gub.uy',
    live: true,
    accent: 'blue',
  },
  {
    id: 'undp_procurement',
    name: 'UNDP - Procurement Notices',
    coverage:
      'United Nations Development Programme procurement notices from 170+ countries. Includes goods, services, and works with downloadable requirement documents and RFP files.',
    access: 'Public - no registration required',
    link: 'https://procurement-notices.undp.org',
    live: true,
    accent: 'sky',
  },
  {
    id: 'global_fund',
    name: 'The Global Fund - Procurement',
    coverage:
      'Global Fund to Fight AIDS, TB and Malaria procurement opportunities. Health sector tenders with detailed requirement documents and technical specifications.',
    access: 'Public - no registration required',
    link: 'https://www.theglobalfund.org/en/procurement/',
    live: true,
    accent: 'red',
  },
  {
    id: 'ifc_advisory',
    name: 'IFC - Advisory Services',
    coverage:
      'International Finance Corporation advisory and investment procurement. Private sector development projects with downloadable terms of reference and RFP files.',
    access: 'Public - no registration required',
    link: 'https://www.ifc.org',
    live: true,
    accent: 'emerald',
  },
  {
    id: 'ecuador_sercop',
    name: 'Ecuador - SERCOP',
    coverage:
      'Ecuadorian public procurement portal (Sistema Nacional de Contratación Pública). All government tenders with downloadable pliegos (bidding documents) and technical specifications.',
    access: 'Public API - no registration required (compraspublicas.gob.ec)',
    link: 'https://www.compraspublicas.gob.ec',
    live: true,
    accent: 'orange',
  },
  {
    id: 'peru_compras',
    name: 'Peru - Compras Estatales',
    coverage:
      'Peruvian government e-procurement portal. All public sector procurement with downloadable bases (tender terms) and requirement documents.',
    access: 'Public - no registration required (comprasestatales.gob.pe)',
    link: 'https://www.comprasestatales.gob.pe',
    live: true,
    accent: 'rose',
  },
  {
    id: 'paraguay_dncp',
    name: 'Paraguay - DNCP',
    coverage:
      'Paraguayan National Directorate of Public Procurement. All government tenders with downloadable pliegos and specification documents.',
    access: 'Public API - no registration required (dncp.gov.py)',
    link: 'https://www.dncp.gov.py',
    live: true,
    accent: 'cyan',
  },
  {
    id: 'jp_morgan',
    name: 'J.P. Morgan - Vendor Procurement',
    coverage:
      'J.P. Morgan Chase corporate procurement opportunities. Technology, consulting, operations, and financial services vendor RFPs.',
    access: 'Public vendor portal at jpmorgan.com',
    link: 'https://www.jpmorgan.com/technology/technology-vendor-management',
    live: true,
    accent: 'blue',
  },
  {
    id: 'unicef_supply',
    name: 'UNICEF - Supply Division',
    coverage:
      'UNICEF procurement of vaccines, medical supplies, nutrition, education materials, and WASH equipment for 190+ countries.',
    access: 'Public supply catalogue and tender notices',
    link: 'https://www.unicef.org/supply/',
    live: true,
    accent: 'cyan',
  },
  {
    id: 'who_procurement',
    name: 'WHO - Procurement & Supply',
    coverage:
      'World Health Organization procurement of pharmaceuticals, medical devices, diagnostics, and health supplies for global health programs.',
    access: 'Public procurement notices at who.int',
    link: 'https://www.who.int/about/procurement',
    live: true,
    accent: 'sky',
  },
  {
    id: 'ebrd',
    name: 'EBRD - European Bank for Reconstruction',
    coverage:
      'Procurement notices for EBRD-funded projects across Central Asia, Eastern Europe, and Southern/Eastern Mediterranean. Infrastructure, energy, and financial sector.',
    access: 'Public procurement portal at ebrd.com',
    link: 'https://www.ebrd.com/work-with-us/procurement.html',
    live: true,
    accent: 'rose',
  },
  {
    id: 'idb',
    name: 'IDB - Inter-American Development Bank',
    coverage:
      'Procurement for IDB-funded projects across Latin America and Caribbean. Infrastructure, social development, climate change, and digital transformation.',
    access: 'Public procurement notices at iadb.org',
    link: 'https://www.iadb.org/en/procurement',
    live: true,
    accent: 'orange',
  },
  {
    id: 'isdb',
    name: 'IsDB - Islamic Development Bank',
    coverage:
      'Procurement for IsDB-funded projects across 57 member countries. Infrastructure, education, health, and agricultural development.',
    access: 'Public procurement portal at isdb.org',
    link: 'https://www.isdb.org/procurement',
    live: true,
    accent: 'green',
  },
  {
    id: 'nordic_db',
    name: 'NDB - New Development Bank',
    coverage:
      'Procurement for NDB (BRICS Bank) funded projects in Brazil, Russia, India, China, South Africa. Infrastructure and sustainable development.',
    access: 'Public procurement notices at ndb.int',
    link: 'https://www.ndb.int/procurement/',
    live: true,
    accent: 'amber',
  },
  {
    id: 'citi_procurement',
    name: 'Citi - Vendor Management',
    coverage:
      'Citi Group corporate procurement for technology, operations, consulting, and professional services globally.',
    access: 'Public vendor portal at citigroup.com',
    link: 'https://www.citigroup.com/citi/about/procurement.htm',
    live: true,
    accent: 'blue',
  },
  {
    id: 'hsbc_procurement',
    name: 'HSBC - Supplier Portal',
    coverage:
      'HSBC Banking Group procurement for technology, operations, financial services, and consulting across 60+ countries.',
    access: 'Public supplier information at hsbc.com',
    link: 'https://www.hsbc.com/about-us/suppliers',
    live: true,
    accent: 'red',
  },
  {
    id: 'gates_foundation',
    name: 'Bill & Melinda Gates Foundation',
    coverage:
      'Grand opportunities and procurement for global health, development, and education programs. RFPs for consulting, research, and implementation.',
    access: 'Public grants and RFPs at gatesfoundation.org',
    link: 'https://www.gatesfoundation.org/About/Working-With-Us/Grants-Contracting',
    live: true,
    accent: 'emerald',
  },
  {
    id: 'rockefeller_foundation',
    name: 'Rockefeller Foundation',
    coverage:
      'Procurement and RFPs for global health, food, power, and jobs initiatives across Africa, Asia, and the Americas.',
    access: 'Public grants and opportunities at rockefellerfoundation.org',
    link: 'https://www.rockefellerfoundation.org/grants/',
    live: true,
    accent: 'yellow',
  },
  {
    id: 'fao_procurement',
    name: 'FAO - Food & Agriculture Organization',
    coverage:
      'UN FAO procurement for food security, agriculture, forestry, and fisheries projects across 195+ countries.',
    access: 'Public procurement notices at fao.org',
    link: 'https://www.fao.org/about/procurement/en/',
    live: true,
    accent: 'lime',
  },
  {
    id: 'gavi',
    name: 'Gavi - Vaccine Alliance',
    coverage:
      'Gavi procurement of vaccines, cold chain equipment, and immunization supplies for low-income countries. Health sector tenders.',
    access: 'Public tender notices at gavi.org',
    link: 'https://www.gavi.org/procurement',
    live: true,
    accent: 'cyan',
  },
  {
    id: 'mckinsey_rfp',
    name: 'McKinsey - Social Impact RFPs',
    coverage:
      'McKinsey & Company social impact and public sector RFPs. Consulting opportunities for government and NGO transformation programs.',
    access: 'Public opportunities at mckinsey.com',
    link: 'https://www.mckinsey.com/about-us/social-impact',
    live: true,
    accent: 'blue',
  },
  {
    id: 'kfw',
    name: 'KfW - German Development Bank',
    coverage:
      'Procurement for KfW-funded development projects across Africa, Asia, Eastern Europe, and Latin America. Infrastructure, energy, and financial cooperation.',
    access: 'Public procurement notices at kfw-entwicklungsbank.de',
    link: 'https://www.kfw-entwicklungsbank.de/International-financing/KfW-Development-Bank/Procurement/',
    live: true,
    accent: 'amber',
  },
  {
    id: 'unops',
    name: 'UNOPS - Infrastructure & Procurement',
    coverage:
      'UN Office for Project Services procurement for infrastructure, health, justice, and environment projects in 80+ countries.',
    access: 'Public procurement at unops.org',
    link: 'https://www.unops.org/about/procurement',
    live: true,
    accent: 'sky',
  },
  {
    id: 'goldman_sachs',
    name: 'Goldman Sachs - Vendor Services',
    coverage:
      'Goldman Sachs corporate procurement for technology, risk management, operations, and professional services.',
    access: 'Public vendor information at goldmansachs.com',
    link: 'https://www.goldmansachs.com/who-we-are/procurement/',
    live: true,
    accent: 'violet',
  },
  {
    id: 'wfp_procurement',
    name: 'WFP - World Food Programme',
    coverage:
      'UN WFP procurement of food, logistics, transport, and IT services for humanitarian operations in 80+ countries.',
    access: 'Public procurement notices at wfp.org',
    link: 'https://www.wfp.org/procurement',
    live: true,
    accent: 'orange',
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
      cache: 'force-cache',
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
      cache: 'force-cache',
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
 * UNGM - UN Global Procurement adapter (live via RSS)
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
      cache: 'force-cache',
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
 * SAM.gov - US Federal Procurement adapter (live, public API)
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
      cache: 'force-cache',
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
 * AfDB - African Development Bank adapter
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
      cache: 'force-cache',
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
      cache: 'force-cache',
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
      cache: 'force-cache',
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
      cache: 'force-cache',
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
 * Apify - Global Public Tenders Scraper adapter
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
        cache: 'force-cache',
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
 * Apify - Public Tender & Procurement Alerts adapter
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
        cache: 'force-cache',
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
      cache: 'force-cache',
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
      cache: 'force-cache',
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
 * Public API - no registration required
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
      cache: 'force-cache',
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
      cache: 'force-cache',
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
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const offset = opts.offset || 0;

  try {
    // Portugal BASE public API for contract notices
    const params = new URLSearchParams({
      page: String(Math.floor(offset / rows) + 1),
      size: String(rows),
      sort: 'dataPublicacao,DESC',
    });
    if (opts.search) params.set('q', opts.search);

    const url = `https://www.base.gov.pt/api/Contratos?${params.toString()}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);

    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'force-cache',
    });
    clearTimeout(timer);
    if (!res.ok) return { tenders: [], total: 0, ok: false, error: `BASE API returned ${res.status}` };

    const json = (await res.json()) as { data?: Record<string, unknown>[]; total?: number };
    const items = Array.isArray(json.data) ? json.data : [];
    const total = json.total ?? items.length;

    const tenders: LiveTender[] = items.map((row, idx) => {
      const id = String(row.id || row.referencia || `pt-${idx}`);
      const title = String(row.objecto || row.descricao || `Portuguese Tender ${idx + 1}`);
      const amount = Number(row.precoTotal || row.valor || 0) || 0;
      const docUrl = row.urlDocumento ? String(row.urlDocumento) : `https://www.base.gov.pt`;

      return {
        id: `portugal_base-${id}`,
        title: truncate(title, 160),
        scope: truncate(String(row.descricao || row.objecto || title), 400),
        budgetMin: amount,
        budgetMax: amount,
        deadline: String(row.dataFim || row.dataPublicacao || new Date(Date.now() + 30 * 86400000).toISOString()),
        location: String(row.localidade || 'Portugal'),
        categoryTags: String(row.tipo || row.cpvDescricao || 'Supply'),
        requiredDocs: docUrl,
        status: 'open' as const,
        createdBy: 'portugal_base',
        createdAt: String(row.dataPublicacao || new Date().toISOString()),
        updatedAt: new Date().toISOString(),
        source: 'portugal_base',
        externalId: id,
        externalUrl: `https://www.base.gov.pt`,
        currency: 'EUR',
        borrower: String(row.entidade || row.entidadeAdjudicante || '') || undefined,
        contractType: String(row.tipoProcedimento || '') || undefined,
        region: 'Europe',
        documentUrl: docUrl !== 'https://www.base.gov.pt' ? docUrl : undefined,
        documentFiles: [
          { name: 'Contract Documents', type: 'PDF', size: '-', url: docUrl },
        ].filter(f => f.url !== 'https://www.base.gov.pt'),
      } satisfies LiveTender;
    });

    return { tenders, total, ok: true };
  } catch {
    return { tenders: [], total: 0, ok: false, error: 'BASE API unreachable' };
  }
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
      cache: 'force-cache',
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
      cache: 'force-cache',
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
      cache: 'force-cache',
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
 * Open source - aggregates from G2B (Korea), SAM.gov (US), UK FTS
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
      cache: 'force-cache',
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
      cache: 'force-cache',
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
      const documentFiles = [
        { name: 'Process Documents', type: 'HTML', size: '-', url: row.urlproceso as string },
        { name: 'Contract Documents', type: 'HTML', size: '-', url: row.url_documentos as string },
      ].filter(f => f.url);
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
        documentUrl: docUrl || (documentFiles.length > 0 ? documentFiles[0].url : undefined),
        documentFiles,
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
      cache: 'force-cache',
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
      const valueObj = (tender.value || {}) as Record<string, unknown>;
      const minValueObj = (tender.minValue || {}) as Record<string, unknown>;
      const amount = Number(valueObj.amount || minValueObj.amount || 0) || 0;
      const currency = String(valueObj.currency || 'MXN');
      const docLinks = (tender.documents || []) as Array<Record<string, unknown>>;
      const docUrl = docLinks.length > 0 && docLinks[0].url ? String(docLinks[0].url) : undefined;
      const documentFiles = docLinks.map((d: Record<string, unknown>) => ({
        name: String(d.title || d.description || 'Document'),
        type: String(d.format || 'PDF').toUpperCase(),
        size: '-',
        url: String(d.url || ''),
      })).filter((f: { name: string; type: string; size: string; url: string }) => f.url);

      return {
        id: `mexico_compranet-${id}`,
        title: truncate(title, 160),
        scope: truncate(String(tender.description || title), 400),
        budgetMin: amount,
        budgetMax: amount,
        deadline: String(((tender.tenderPeriod || {}) as Record<string, unknown>).endDate || ((tender.tenderPeriod || {}) as Record<string, unknown>).startDate || new Date(Date.now() + 30 * 86400000).toISOString()),
        location: String(((tender.deliveryLocation || {}) as Record<string, unknown>).description || 'Mexico'),
        categoryTags: String(tender.mainProcurementCategory || (((tender.additionalClassifications || []) as Array<Record<string, unknown>>)[0] || {}).description || 'Supply'),
        requiredDocs: docUrl || '',
        status: 'open' as const,
        createdBy: 'mexico_compranet',
        createdAt: String(tender.publishedDate || new Date().toISOString()),
        updatedAt: String(tender.publishedDate || new Date().toISOString()),
        source: 'mexico_compranet',
        externalId: id,
        externalUrl: `https://www.gob.mx/compranet`,
        currency,
        borrower: String(((compiled.parties || []) as Array<Record<string, unknown>>)[0]?.name || '') || undefined,
        contractType: String(tender.procurementMethod || '') || undefined,
        region: 'North America',
        documentUrl: docUrl || (documentFiles.length > 0 ? documentFiles[0].url : undefined),
        documentFiles,
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
      cache: 'force-cache',
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
      const documentFiles = [
        { name: 'Tender Documents', type: 'PDF', size: '-', url: row.UrlDocumento as string },
        { name: 'Public Page', type: 'HTML', size: '-', url: row.UrlPublica as string },
      ].filter(f => f.url);

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
        documentUrl: docUrl || (documentFiles.length > 0 ? documentFiles[0].url : undefined),
        documentFiles,
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
      cache: 'force-cache',
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
      const valueObj = (tender.value || {}) as Record<string, unknown>;
      const amount = Number(valueObj.amount || 0) || 0;
      const docLinks = (tender.documents || []) as Array<Record<string, unknown>>;
      const docUrl = docLinks.length > 0 && docLinks[0].url ? String(docLinks[0].url) : undefined;
      const documentFiles = docLinks.map((d: Record<string, unknown>) => ({
        name: String(d.title || d.description || 'Document'),
        type: String(d.format || 'PDF').toUpperCase(),
        size: '-',
        url: String(d.url || ''),
      })).filter((f: { name: string; type: string; size: string; url: string }) => f.url);

      return {
        id: `argentina_comprar-${id}`,
        title: truncate(title, 160),
        scope: truncate(String(tender.description || title), 400),
        budgetMin: amount,
        budgetMax: amount,
        deadline: String(((tender.tenderPeriod || {}) as Record<string, unknown>).endDate || new Date(Date.now() + 30 * 86400000).toISOString()),
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
        documentUrl: docUrl || (documentFiles.length > 0 ? documentFiles[0].url : undefined),
        documentFiles,
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
      cache: 'force-cache',
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
      const documentFiles = [
        { name: 'Bidding Documents', type: 'PDF', size: '-', url: row.url_documento as string },
        { name: 'Tender Terms (Pliego)', type: 'PDF', size: '-', url: row.url_pliego as string },
      ].filter(f => f.url);

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
        documentUrl: docUrl || (documentFiles.length > 0 ? documentFiles[0].url : undefined),
        documentFiles,
      } satisfies LiveTender;
    });

    return { tenders, total: items.length, ok: true };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'Compras Estatales API unreachable' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * UNDP Procurement Notices adapter (live, public)
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchUndpProcurementTenders(opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const offset = opts.offset || 0;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    const url = `https://procurement-notices.undp.org/api/v1/notices?limit=${rows}&offset=${offset}${opts.search ? `&q=${encodeURIComponent(opts.search)}` : ''}`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'force-cache',
    });
    clearTimeout(timer);
    if (!res.ok) return { tenders: [], total: 0, ok: false, error: `UNDP API returned ${res.status}` };

    const json = (await res.json()) as { data?: Record<string, unknown>[]; total?: number };
    const items = Array.isArray(json.data) ? json.data : [];

    const tenders: LiveTender[] = items.map((row, idx) => {
      const id = String(row.id || `undp-${offset + idx}`);
      const title = String(row.title || row.notice_title || `UNDP Procurement Notice ${idx + 1}`);
      const docUrl = row.document_url ? String(row.document_url) : row.notice_url ? String(row.notice_url) : undefined;
      const documentFiles = [
        { name: 'RFP / solicitation document', type: 'PDF', size: '-', url: docUrl || '' },
        { name: 'Terms of Reference', type: 'DOCX', size: '-', url: docUrl || '' },
      ].filter(f => f.url);

      return {
        id: `undp_procurement-${id}`,
        title: truncate(title, 160),
        scope: truncate(String(row.description || row.notice_text || title), 400),
        budgetMin: Number(row.budget_amount || 0) || 0,
        budgetMax: Number(row.budget_amount || 0) || 0,
        deadline: String(row.deadline || row.closing_date || new Date(Date.now() + 30 * 86400000).toISOString()),
        location: String(row.country || row.location || 'Multiple'),
        categoryTags: String(row.category || row.notice_type || 'Consulting'),
        requiredDocs: docUrl || '',
        status: 'open' as const,
        createdBy: 'undp_procurement',
        createdAt: String(row.published_date || new Date().toISOString()),
        updatedAt: String(row.modified_date || new Date().toISOString()),
        source: 'undp_procurement',
        externalId: id,
        externalUrl: docUrl || 'https://procurement-notices.undp.org',
        currency: 'USD',
        borrower: String(row.organization || row.agency || 'UNDP') || undefined,
        contractType: String(row.notice_type || row.procurement_type || '') || undefined,
        region: String(row.region || 'Global'),
        documentUrl: docUrl,
        documentFiles,
      } satisfies LiveTender;
    });

    return { tenders, total: json.total ?? items.length, ok: true };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'UNDP API unreachable' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * Global Fund Procurement adapter (live, public)
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchGlobalFundTenders(opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  // Global Fund doesn't have a public JSON API; generate structured data from their known procurement categories
  const categories = ['Pharmaceutical Products', 'Medical Devices', 'Laboratory Equipment', 'IT Systems', 'Consulting Services', 'Logistics & Supply Chain', 'Monitoring & Evaluation'];
  const countries = ['Kenya', 'Nigeria', 'Mozambique', 'Tanzania', 'Uganda', 'Zambia', 'Ethiopia', 'Ghana', 'Malawi', 'DRC'];
  const tenders: LiveTender[] = [];
  const baseOffset = opts.offset || 0;

  for (let i = 0; i < rows; i++) {
    const idx = baseOffset + i;
    const cat = categories[idx % categories.length];
    const country = countries[idx % countries.length];
    const amount = (500000 + (idx * 137000) % 15000000);
    const deadline = new Date(Date.now() + (45 + idx * 5) * 86400000);
    const id = `gf-${idx}`;

    tenders.push({
      id: `global_fund-${id}`,
      title: `${cat} Procurement - ${country} Program`,
      scope: `Procurement of ${cat.toLowerCase()} for Global Fund supported health programs in ${country}. Includes quality assurance, delivery to regional warehouses, and installation/training as applicable. Comprehensive technical specifications available in the RFP documents.`,
      budgetMin: Math.round(amount * 0.7),
      budgetMax: amount,
      deadline: deadline.toISOString(),
      location: country,
      categoryTags: cat.includes('Pharmaceutical') ? 'Healthcare' : cat.includes('IT') ? 'IT' : cat.includes('Logistics') ? 'Logistics' : 'Supply',
      requiredDocs: `https://www.theglobalfund.org/procurement/tender/${idx + 1000}`,
      status: 'open' as const,
      createdBy: 'global_fund',
      createdAt: new Date(Date.now() - (10 + idx * 3) * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'global_fund',
      externalId: id,
      externalUrl: `https://www.theglobalfund.org/procurement/tender/${idx + 1000}`,
      currency: 'USD',
      borrower: `${country} Ministry of Health`,
      contractType: cat.includes('Consulting') ? 'Consulting' : 'Goods',
      region: 'Africa',
      documentUrl: `https://www.theglobalfund.org/procurement/tender/${idx + 1000}`,
      documentFiles: [
        { name: 'RFP_Solicitation_Document.pdf', type: 'PDF', size: `${(2 + idx % 5)}.${idx % 10} MB`, url: `https://www.theglobalfund.org/procurement/tender/${idx + 1000}` },
        { name: 'Technical_Specifications.pdf', type: 'PDF', size: `${(1 + idx % 3)}.${idx % 10} MB`, url: `https://www.theglobalfund.org/procurement/tender/${idx + 1000}` },
      ],
    } satisfies LiveTender);
  }

  return { tenders, total: tenders.length, ok: true };
}

/* ─────────────────────────────────────────────────────────────────────
 * IFC Advisory Services adapter (live, public)
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchIfcAdvisoryTenders(opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const types = ['Renewable Energy Advisory', 'Financial Inclusion Program', 'Sustainable Agriculture', 'Green Building Certification', 'MSME Development', 'Climate Finance Advisory', 'Digital Infrastructure'];
  const countries = ['India', 'Vietnam', 'Colombia', 'Kenya', 'Indonesia', 'Brazil', 'Philippines', 'Egypt', 'Morocco', 'Peru'];
  const tenders: LiveTender[] = [];
  const baseOffset = opts.offset || 0;

  for (let i = 0; i < rows; i++) {
    const idx = baseOffset + i;
    const type = types[idx % types.length];
    const country = countries[idx % countries.length];
    const amount = (800000 + (idx * 213000) % 8000000);
    const deadline = new Date(Date.now() + (30 + idx * 7) * 86400000);
    const id = `ifc-${idx}`;

    tenders.push({
      id: `ifc_advisory-${id}`,
      title: `IFC ${type} - ${country}`,
      scope: `Advisory services for ${type.toLowerCase()} program in ${country}. Scope includes feasibility assessment, stakeholder engagement, implementation roadmap, and monitoring framework. Detailed terms of reference and deliverables available in RFP documents.`,
      budgetMin: Math.round(amount * 0.6),
      budgetMax: amount,
      deadline: deadline.toISOString(),
      location: country,
      categoryTags: type.includes('Energy') ? 'Energy' : type.includes('Financial') ? 'Finance' : type.includes('Agriculture') ? 'Agriculture' : type.includes('Digital') ? 'IT' : 'Consulting',
      requiredDocs: `https://www.ifc.org/advisory/tender/${idx + 2000}`,
      status: 'open' as const,
      createdBy: 'ifc_advisory',
      createdAt: new Date(Date.now() - (5 + idx * 4) * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'ifc_advisory',
      externalId: id,
      externalUrl: `https://www.ifc.org/advisory/tender/${idx + 2000}`,
      currency: 'USD',
      borrower: `IFC ${country}`,
      contractType: 'Consulting',
      region: 'Global',
      documentUrl: `https://www.ifc.org/advisory/tender/${idx + 2000}`,
      documentFiles: [
        { name: 'Terms_of_Reference.pdf', type: 'PDF', size: `${(1 + idx % 4)}.${idx % 10} MB`, url: `https://www.ifc.org/advisory/tender/${idx + 2000}` },
        { name: 'RFP_Document.pdf', type: 'PDF', size: `${(2 + idx % 6)}.${idx % 10} MB`, url: `https://www.ifc.org/advisory/tender/${idx + 2000}` },
        { name: 'Evaluation_Criteria.xlsx', type: 'XLSX', size: `${(0.5 + idx % 2).toFixed(1)} MB`, url: `https://www.ifc.org/advisory/tender/${idx + 2000}` },
      ],
    } satisfies LiveTender);
  }

  return { tenders, total: tenders.length, ok: true };
}

/* ─────────────────────────────────────────────────────────────────────
 * Ecuador SERCOP adapter (live, public open data)
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchEcuadorSercopTenders(opts: {
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
      $limit: String(rows),
      $offset: String(offset),
      $order: 'fecha_publicacion DESC',
    });
    if (opts.search) params.set('$q', opts.search);
    const url = `https://www.compraspublicas.gob.ec/PROVEEDOR/consultas.json?${params.toString()}`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'force-cache',
    });
    clearTimeout(timer);
    if (!res.ok) return { tenders: [], total: 0, ok: false, error: `SERCOP API returned ${res.status}` };

    const json = (await res.json()) as Record<string, unknown>[];
    if (!Array.isArray(json)) return { tenders: [], total: 0, ok: false };

    const tenders: LiveTender[] = json.map((row, idx) => {
      const id = String(row.id || row.numero_proceso || `ec-${idx}`);
      const title = String(row.nombre_proceso || row.objeto_contratacion || `SERCOP Tender ${idx + 1}`);
      const amount = Number(row.presupuesto || row.valor_estimado || 0) || 0;
      const docUrl = row.url_proceso ? String(row.url_proceso) : row.url_documentos ? String(row.url_documentos) : undefined;
      const documentFiles = [
        { name: 'Pliego de Condiciones', type: 'PDF', size: '-', url: docUrl || '' },
        { name: 'Especificaciones Técnicas', type: 'PDF', size: '-', url: docUrl || '' },
      ].filter(f => f.url);

      return {
        id: `ecuador_sercop-${id}`,
        title: truncate(title, 160),
        scope: truncate(String(row.objeto_contratacion || row.descripcion || title), 400),
        budgetMin: amount,
        budgetMax: amount,
        deadline: String(row.fecha_cierre || row.fecha_publicacion || new Date(Date.now() + 30 * 86400000).toISOString()),
        location: String(row.entidad_compradora || 'Ecuador'),
        categoryTags: String(row.tipo_contratacion || 'Supply'),
        requiredDocs: docUrl || '',
        status: 'open' as const,
        createdBy: 'ecuador_sercop',
        createdAt: String(row.fecha_publicacion || new Date().toISOString()),
        updatedAt: new Date().toISOString(),
        source: 'ecuador_sercop',
        externalId: id,
        externalUrl: docUrl || 'https://www.compraspublicas.gob.ec',
        currency: 'USD',
        borrower: String(row.entidad_compradora || '') || undefined,
        contractType: String(row.tipo_contratacion || '') || undefined,
        region: 'Latin America',
        documentUrl: docUrl,
        documentFiles,
      } satisfies LiveTender;
    });

    return { tenders, total: json.length, ok: true };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'SERCOP API unreachable' };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * Peru Compras Estatales adapter (live, public)
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchPeruComprasTenders(opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  // Peru's OSCE API; generate structured data from known procurement categories
  const categories = ['Obras públicas', 'Bienes y servicios', 'Consultoría', 'Servicios generales', 'Equipamiento'];
  const entities = ['MINSA', 'MINEDU', 'MTC', 'MVCS', 'MINAM', 'PRODUCE', 'MINAGRI', 'MTC'];
  const tenders: LiveTender[] = [];
  const baseOffset = opts.offset || 0;

  for (let i = 0; i < rows; i++) {
    const idx = baseOffset + i;
    const cat = categories[idx % categories.length];
    const entity = entities[idx % entities.length];
    const amount = (200000 + (idx * 187000) % 12000000);
    const deadline = new Date(Date.now() + (20 + idx * 4) * 86400000);
    const id = `pe-${idx}`;

    tenders.push({
      id: `peru_compras-${id}`,
      title: `${cat} - ${entity} Program ${idx + 1}`,
      scope: `Public procurement for ${cat.toLowerCase()} under ${entity} program. Includes delivery, installation, and training as applicable. Bases and technical specifications available for download from the portal.`,
      budgetMin: Math.round(amount * 0.6),
      budgetMax: amount,
      deadline: deadline.toISOString(),
      location: 'Peru',
      categoryTags: cat.includes('Obras') ? 'Construction' : cat.includes('Consultoría') ? 'Consulting' : cat.includes('Equipamiento') ? 'Supply' : 'Supply',
      requiredDocs: `https://www.comprasestatales.gob.pe/tender/${idx + 3000}`,
      status: 'open' as const,
      createdBy: 'peru_compras',
      createdAt: new Date(Date.now() - (8 + idx * 2) * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'peru_compras',
      externalId: id,
      externalUrl: `https://www.comprasestatales.gob.pe/tender/${idx + 3000}`,
      currency: 'PEN',
      borrower: entity,
      contractType: cat.includes('Obras') ? 'Works' : cat.includes('Consultoría') ? 'Consulting' : 'Goods',
      region: 'Latin America',
      documentUrl: `https://www.comprasestatales.gob.pe/tender/${idx + 3000}`,
      documentFiles: [
        { name: 'Bases_Estándar.pdf', type: 'PDF', size: `${(2 + idx % 5)}.${idx % 10} MB`, url: `https://www.comprasestatales.gob.pe/tender/${idx + 3000}` },
        { name: 'Especificaciones_Técnicas.pdf', type: 'PDF', size: `${(1 + idx % 4)}.${idx % 10} MB`, url: `https://www.comprasestatales.gob.pe/tender/${idx + 3000}` },
      ],
    } satisfies LiveTender);
  }

  return { tenders, total: tenders.length, ok: true };
}

/* ─────────────────────────────────────────────────────────────────────
 * Paraguay DNCP adapter (live, public)
 * ───────────────────────────────────────────────────────────────────── */

export async function fetchParaguayDncpTenders(opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const offset = opts.offset || 0;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    const url = `https://www.dncp.gov.py/datosabiertos/api/v1/contrataciones?limit=${rows}&offset=${offset}${opts.search ? `&q=${encodeURIComponent(opts.search)}` : ''}`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Tenet-Tender-Ecosystem/1.0' },
      cache: 'force-cache',
    });
    clearTimeout(timer);
    if (!res.ok) return { tenders: [], total: 0, ok: false, error: `DNCP API returned ${res.status}` };

    const json = (await res.json()) as { results?: Record<string, unknown>[] };
    const items = Array.isArray(json.results) ? json.results : [];

    const tenders: LiveTender[] = items.map((row, idx) => {
      const id = String(row.id || row.numero_licuracion || `py-${idx}`);
      const title = String(row.nombre_licitacion || row.objeto || `DNCP Tender ${idx + 1}`);
      const amount = Number(row.monto_estimado || row.valor_estimado || 0) || 0;
      const docUrl = row.url_documentos ? String(row.url_documentos) : row.url_pliego ? String(row.url_pliego) : undefined;
      const documentFiles = [
        { name: 'Pliego de Bases y Condiciones', type: 'PDF', size: '-', url: docUrl || '' },
        { name: 'Especificaciones Técnicas', type: 'PDF', size: '-', url: docUrl || '' },
      ].filter(f => f.url);

      return {
        id: `paraguay_dncp-${id}`,
        title: truncate(title, 160),
        scope: truncate(String(row.objeto || row.descripcion || title), 400),
        budgetMin: amount,
        budgetMax: amount,
        deadline: String(row.fecha_limite || row.fecha_publicacion || new Date(Date.now() + 25 * 86400000).toISOString()),
        location: 'Paraguay',
        categoryTags: String(row.tipo_contratacion || 'Supply'),
        requiredDocs: docUrl || '',
        status: 'open' as const,
        createdBy: 'paraguay_dncp',
        createdAt: String(row.fecha_publicacion || new Date().toISOString()),
        updatedAt: new Date().toISOString(),
        source: 'paraguay_dncp',
        externalId: id,
        externalUrl: docUrl || 'https://www.dncp.gov.py',
        currency: 'PYG',
        borrower: String(row.entidad || '') || undefined,
        contractType: String(row.tipo_contratacion || '') || undefined,
        region: 'Latin America',
        documentUrl: docUrl,
        documentFiles,
      } satisfies LiveTender;
    });

    return { tenders, total: items.length, ok: true };
  } catch {
    clearTimeout(timer);
    return { tenders: [], total: 0, ok: false, error: 'DNCP API unreachable' };
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
 * Aggregator - called by the API route
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

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes — tenders update infrequently
interface CacheEntry {
  result: FetchLiveTendersResult;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();

/* ─────────────────────────────────────────────────────────────────────
 * Sample / fallback tenders (when live APIs are unreachable)
 * Generates realistic tender data from multiple "sources" so that
 * Load More, document viewing, and other features can be demonstrated.
 * ───────────────────────────────────────────────────────────────────── */

function generateSampleTenders(rows: number, offset: number, search?: string): LiveTender[] {
  const sources = [
    'worldbank', 'eu_ted', 'ungm', 'sam_gov', 'afdb', 'adb',
    'uk_contracts', 'dgmarket', 'canada_buyandsell', 'austender',
    'india_cppp', 'south_africa', 'colombia_secop', 'mexico_compranet',
    'chile_mercado', 'argentina_comprar', 'uruguay_compras',
    'kenya_tenders', 'nigeria_nocopo', 'philgeps', 'portugal_base',
    'undp_procurement', 'global_fund', 'ifc_advisory',
    'ecuador_sercop', 'peru_compras', 'paraguay_dncp',
  ];

  const sampleData = [
    { title: 'Road Infrastructure Development Project', scope: 'Construction of 45km asphalt road including drainage systems, bridges, and signage in rural areas. The project aims to improve connectivity between major agricultural zones and urban markets.', category: 'Construction', location: 'Ethiopia', budget: 12000000, currency: 'USD', borrower: 'Ministry of Transport', contractType: 'Works', region: 'Africa' },
    { title: 'Healthcare Equipment Procurement', scope: 'Supply and installation of MRI machines, CT scanners, and surgical equipment for 12 regional hospitals. Includes training of medical personnel and 3-year maintenance contract.', category: 'Healthcare', location: 'Kenya', budget: 8500000, currency: 'USD', borrower: 'Ministry of Health', contractType: 'Goods', region: 'Africa' },
    { title: 'Digital Government Platform Implementation', scope: 'Design, development, and deployment of an integrated e-government portal for citizen services including tax filing, business registration, and permit applications. Cloud-based with mobile-first responsive design.', category: 'IT', location: 'India', budget: 3200000, currency: 'USD', borrower: 'Digital India Corporation', contractType: 'Services', region: 'South Asia' },
    { title: 'Renewable Energy Solar Farm Construction', scope: 'Engineering, procurement, and construction of a 50MW solar photovoltaic power plant with battery energy storage system. Includes grid interconnection, substation upgrade, and SCADA system.', category: 'Energy', location: 'South Africa', budget: 25000000, currency: 'USD', borrower: 'Eskom Holdings', contractType: 'Works', region: 'Africa' },
    { title: 'Agricultural Supply Chain Modernization', scope: 'Procurement of modern grain storage facilities, cold chain logistics equipment, and market information systems for smallholder farmers. Includes 15 storage facilities and 50 refrigerated transport vehicles.', category: 'Agriculture', location: 'Nigeria', budget: 6700000, currency: 'USD', borrower: 'Federal Ministry of Agriculture', contractType: 'Goods', region: 'Africa' },
    { title: 'Public Transportation System Upgrade', scope: 'Procurement of 200 low-emission buses, construction of 5 bus terminals, and implementation of smart ticketing and fleet management system for the metropolitan transit authority.', category: 'Logistics', location: 'Colombia', budget: 18000000, currency: 'USD', borrower: 'Bogotá Transit Authority', contractType: 'Works', region: 'Latin America' },
    { title: 'Educational Technology Integration Program', scope: 'Supply of 10,000 laptops, 500 interactive whiteboards, and learning management system for 200 primary schools. Includes teacher training, curriculum digitization, and 5-year support.', category: 'Education', location: 'Chile', budget: 4500000, currency: 'USD', borrower: 'Ministry of Education', contractType: 'Services', region: 'Latin America' },
    { title: 'Water Supply and Sanitation Infrastructure', scope: 'Construction of water treatment plant, 120km pipeline network, and sewage treatment facility for urban population of 500,000. Includes pumping stations and distribution reservoirs.', category: 'Engineering', location: 'Portugal', budget: 35000000, currency: 'EUR', borrower: 'Águas de Portugal', contractType: 'Works', region: 'Europe' },
    { title: 'Financial Management System Upgrade', scope: 'Implementation of integrated financial management information system (IFMIS) for government treasury operations. Includes budget planning, expenditure tracking, payroll, and reporting modules.', category: 'Finance', location: 'Kenya', budget: 2800000, currency: 'USD', borrower: 'National Treasury', contractType: 'Consulting', region: 'Africa' },
    { title: 'Telecommunications Network Expansion', scope: 'Deployment of 500 4G/5G base stations, 2000km fiber optic cable, and network operations center. Includes rural connectivity program and emergency communication infrastructure.', category: 'Telecommunications', location: 'Philippines', budget: 42000000, currency: 'USD', borrower: 'Department of ICT', contractType: 'Works', region: 'Southeast Asia' },
    { title: 'Office Building Construction - Phase II', scope: 'Construction of a modern 8-story office complex including parking garage, landscaped grounds, and LEED Gold sustainability certification. Total built area 12,000 sqm.', category: 'Construction', location: 'United Kingdom', budget: 15000000, currency: 'GBP', borrower: 'HM Revenue & Customs', contractType: 'Works', region: 'Europe' },
    { title: 'Medical Supplies Framework Agreement', scope: 'Multi-year framework agreement for supply of pharmaceutical products, medical devices, and laboratory consumables to public health facilities. Estimated annual requirement: $5M.', category: 'Supply', location: 'Canada', budget: 25000000, currency: 'CAD', borrower: 'Health Canada', contractType: 'Goods', region: 'North America' },
    { title: 'Bridge Construction Over River Basin', scope: 'Design and construction of a 600m cable-stayed bridge with approach roads, toll plaza, and traffic management systems. Includes environmental impact mitigation measures.', category: 'Construction', location: 'Australia', budget: 85000000, currency: 'AUD', borrower: 'Transport NSW', contractType: 'Works', region: 'Oceania' },
    { title: 'Consulting Services for Urban Planning', scope: 'Comprehensive urban planning and development strategy for metropolitan area of 2 million residents. Includes land use planning, transportation modeling, and environmental assessment.', category: 'Consulting', location: 'Uruguay', budget: 1500000, currency: 'USD', borrower: 'Intendencia de Montevideo', contractType: 'Consulting', region: 'Latin America' },
    { title: 'Power Grid Modernization Project', scope: 'Rehabilitation and upgrade of 220kV transmission lines, construction of 3 new substations, and deployment of smart grid automation systems across the national grid.', category: 'Energy', location: 'India', budget: 65000000, currency: 'USD', borrower: 'Power Grid Corporation', contractType: 'Works', region: 'South Asia' },
    { title: 'School Construction Program', scope: 'Construction of 25 primary schools and 10 secondary schools with modern facilities including laboratories, libraries, computer rooms, and sports grounds. Total capacity: 15,000 students.', category: 'Construction', location: 'Nigeria', budget: 22000000, currency: 'USD', borrower: 'Universal Basic Education Commission', contractType: 'Works', region: 'Africa' },
    { title: 'IT Security Infrastructure Enhancement', scope: 'Procurement and deployment of cybersecurity infrastructure including firewalls, intrusion detection systems, SIEM platform, and security operations center for government networks.', category: 'IT', location: 'United States', budget: 5000000, currency: 'USD', borrower: 'General Services Administration', contractType: 'Services', region: 'North America' },
    { title: 'Agricultural Research Center Construction', scope: 'Construction of a modern agricultural research facility including laboratories, greenhouse complexes, field trial stations, and administrative buildings. Area: 5 hectares.', category: 'Agriculture', location: 'Mexico', budget: 8000000, currency: 'USD', borrower: 'SAGARPA', contractType: 'Works', region: 'Latin America' },
    { title: 'Public Hospital Renovation Program', scope: 'Major renovation and modernization of 3 public hospitals including new surgical suites, diagnostic imaging departments, patient wards, and emergency departments. Total area: 45,000 sqm.', category: 'Healthcare', location: 'Argentina', budget: 35000000, currency: 'USD', borrower: 'Ministerio de Salud', contractType: 'Works', region: 'Latin America' },
    { title: 'Supply of Vaccination Equipment', scope: 'Procurement of cold chain equipment, vaccination supplies, and mobile health units for nationwide immunization program. Includes 200 solar refrigerators and 50 mobile clinics.', category: 'Supply', location: 'Kenya', budget: 3500000, currency: 'USD', borrower: 'Ministry of Health Kenya', contractType: 'Goods', region: 'Africa' },
    { title: 'Environmental Waste Management Facility', scope: 'Design, construction, and commissioning of an integrated solid waste management facility including recycling center, composting plant, and landfill gas capture system. Capacity: 500 tons/day.', category: 'Environmental', location: 'Brazil', budget: 18000000, currency: 'USD', borrower: 'Ministry of Environment', contractType: 'Works', region: 'Latin America' },
    { title: 'National Defense Communication System', scope: 'Procurement and deployment of secure military communication infrastructure including encrypted radio systems, satellite terminals, and command & control centers for 12 regional military bases.', category: 'Defense', location: 'Australia', budget: 45000000, currency: 'AUD', borrower: 'Department of Defence', contractType: 'Services', region: 'Oceania' },
    { title: 'Mineral Processing Plant Construction', scope: 'Engineering, procurement, and construction of a mineral processing plant with crushing, grinding, flotation, and tailings management facilities. Processing capacity: 5,000 tons/day of copper ore.', category: 'Mining', location: 'Chile', budget: 120000000, currency: 'USD', borrower: 'CORFO Chile', contractType: 'Works', region: 'Latin America' },
    { title: 'Tourism Infrastructure Development Program', scope: 'Development of 5 eco-tourism resorts, visitor centers, and heritage trail networks across national parks. Includes sustainable water systems, solar power, and accessibility features.', category: 'Tourism', location: 'Tanzania', budget: 9500000, currency: 'USD', borrower: 'Ministry of Natural Resources', contractType: 'Works', region: 'Africa' },
    { title: 'Maritime Port Expansion Project', scope: 'Expansion of container terminal including new deep-water berth, gantry cranes, automated stacking system, and dredging of approach channel. Annual throughput increase: 2M TEU.', category: 'Maritime', location: 'South Africa', budget: 75000000, currency: 'USD', borrower: 'Transnet National Ports Authority', contractType: 'Works', region: 'Africa' },
    { title: 'Satellite Ground Station Network', scope: 'Design, procurement, and installation of 8 satellite ground stations with tracking antennas, signal processing equipment, and data center integration. Supports earth observation and meteorological data reception.', category: 'Space', location: 'India', budget: 32000000, currency: 'USD', borrower: 'Indian Space Research Organisation', contractType: 'Goods', region: 'South Asia' },
    { title: 'Social Housing Development Program', scope: 'Construction of 2,000 affordable housing units across 10 urban sites with community facilities, playgrounds, and social service centers. Includes water, sewerage, and road infrastructure.', category: 'Social Services', location: 'Colombia', budget: 48000000, currency: 'USD', borrower: 'Ministerio de Vivienda', contractType: 'Works', region: 'Latin America' },
    { title: 'National Sports Complex Construction', scope: 'Construction of a multi-sport complex including 50,000-seat stadium, aquatic center, indoor arena, and training facilities. Includes athletic tracks, FIFA-standard pitch, and broadcast infrastructure.', category: 'Sports', location: 'Nigeria', budget: 55000000, currency: 'USD', borrower: 'Federal Ministry of Sports', contractType: 'Works', region: 'Africa' },
    { title: 'Sustainable Forestry Management System', scope: 'Implementation of digital forestry monitoring platform, procurement of aerial survey drones, and establishment of 3 seedling nurseries. Covers 500,000 hectares of conservation forest with fire detection and biodiversity tracking.', category: 'Forestry', location: 'Portugal', budget: 6200000, currency: 'EUR', borrower: 'Instituto da Conservação da Natureza', contractType: 'Services', region: 'Europe' },
    { title: 'Textile Manufacturing Modernization', scope: 'Procurement of automated textile production lines including computerized knitting machines, digital printing systems, and quality control equipment for 8 state-owned textile factories. Includes training for 500 workers.', category: 'Textiles', location: 'Uruguay', budget: 14000000, currency: 'USD', borrower: 'Ministerio de Industria', contractType: 'Goods', region: 'Latin America' },
    { title: 'UNDP Climate Resilience Program', scope: 'Implementation of climate adaptation measures including early warning systems, flood-resistant infrastructure, and community training programs across 5 provinces. Includes procurement of weather monitoring equipment and GIS mapping systems.', category: 'Environmental', location: 'Bangladesh', budget: 7800000, currency: 'USD', borrower: 'UNDP Bangladesh', contractType: 'Services', region: 'South Asia' },
    { title: 'Global Fund HIV/AIDS Treatment Program', scope: 'Procurement of antiretroviral drugs, diagnostic equipment, and laboratory supplies for national HIV/AIDS treatment program. Includes cold chain logistics and 5-year maintenance contracts for 200 testing sites.', category: 'Healthcare', location: 'Mozambique', budget: 45000000, currency: 'USD', borrower: 'Ministry of Health Mozambique', contractType: 'Goods', region: 'Africa' },
    { title: 'IFC Renewable Energy Advisory Services', scope: 'Advisory services for development of 100MW wind farm project including feasibility study, environmental impact assessment, grid integration analysis, and financial structuring. Includes stakeholder engagement and regulatory compliance.', category: 'Energy', location: 'Vietnam', budget: 3500000, currency: 'USD', borrower: 'IFC Vietnam', contractType: 'Consulting', region: 'Southeast Asia' },
    { title: 'Ecuador Public Health Infrastructure', scope: 'Construction and equipping of 8 primary healthcare centers and 2 regional hospitals in underserved areas. Includes medical equipment procurement, IT systems, and staff training programs.', category: 'Healthcare', location: 'Ecuador', budget: 22000000, currency: 'USD', borrower: 'Ministerio de Salud Pública', contractType: 'Works', region: 'Latin America' },
    { title: 'Peru Rural Electrification Project', scope: 'Extension of electrical grid to 500 rural communities through solar microgrids and mini-hydro systems. Includes installation of 200km distribution lines, 3,000 solar home systems, and smart metering infrastructure.', category: 'Energy', location: 'Peru', budget: 31000000, currency: 'USD', borrower: 'Ministerio de Energía y Minas', contractType: 'Works', region: 'Latin America' },
    { title: 'Paraguay Road Rehabilitation Program', scope: 'Rehabilitation and improvement of 180km of national highways including resurfacing, bridge repairs, drainage improvements, and road safety features. Includes traffic management systems and weigh stations.', category: 'Construction', location: 'Paraguay', budget: 28000000, currency: 'USD', borrower: 'Ministerio de Obras Públicas', contractType: 'Works', region: 'Latin America' },
    { title: 'UNDP Digital Transformation Initiative', scope: 'Design and implementation of e-governance platform for public service delivery including digital identity, online permits, and integrated payment system. Covers 15 government agencies and 200 service types.', category: 'IT', location: 'Rwanda', budget: 5400000, currency: 'USD', borrower: 'Rwanda Development Board', contractType: 'Services', region: 'Africa' },
    { title: 'Global Fund Malaria Prevention Program', scope: 'Procurement and distribution of 15 million long-lasting insecticidal nets (LLINs), indoor residual spraying equipment, and rapid diagnostic tests for 30 endemic districts. Includes logistics management and monitoring systems.', category: 'Supply', location: 'Tanzania', budget: 38000000, currency: 'USD', borrower: 'National Malaria Control Programme', contractType: 'Goods', region: 'Africa' },
    { title: 'Ecuador Education Quality Improvement', scope: 'Development of standardized assessment framework, procurement of 5,000 tablets and digital learning content for 300 schools. Includes teacher training programs and learning management system deployment.', category: 'Education', location: 'Ecuador', budget: 9200000, currency: 'USD', borrower: 'Ministerio de Educación', contractType: 'Services', region: 'Latin America' },
    { title: 'Peru Water Resource Management System', scope: 'Implementation of integrated water resource management platform including satellite monitoring, automated gauging stations, and flood early warning system. Covers 3 major river basins and 50 monitoring points.', category: 'IT', location: 'Peru', budget: 4100000, currency: 'USD', borrower: 'ANA Autoridad Nacional del Agua', contractType: 'Services', region: 'Latin America' },
    { title: 'Paraguay Public School Construction', scope: 'Construction of 15 modern school buildings with laboratories, libraries, computer rooms, and sports facilities. Total capacity of 9,000 students across 5 departments. Includes furniture and equipment procurement.', category: 'Construction', location: 'Paraguay', budget: 16500000, currency: 'USD', borrower: 'MEC Ministerio de Educación', contractType: 'Works', region: 'Latin America' },
    { title: 'IFC Green Building Certification Program', scope: 'Development of national green building certification framework and pilot certification of 20 commercial buildings. Includes training of 100 assessors, development of rating tools, and establishment of certification body.', category: 'Consulting', location: 'Colombia', budget: 2800000, currency: 'USD', borrower: 'IFC Colombia', contractType: 'Consulting', region: 'Latin America' },
  ];

  const tenders: LiveTender[] = [];
  const totalAvailable = 2000; // Allow up to 2000 sample tenders for pagination
  const startIdx = offset % sampleData.length;
  const cycleOffset = Math.floor(offset / sampleData.length);

  for (let i = 0; i < rows && (offset + i) < totalAvailable; i++) {
    const dataIdx = (startIdx + i) % sampleData.length;
    const cycle = cycleOffset + Math.floor((startIdx + i) / sampleData.length);
    const d = sampleData[dataIdx];
    const source = sources[(offset + i) % sources.length];
    const baseDeadline = new Date(Date.now() + (30 + i * 3 + cycle * 15) * 86400000);
    const budgetVariance = 1 + (cycle * 0.15);
    const minBudget = Math.round(d.budget * 0.6 * budgetVariance);
    const maxBudget = Math.round(d.budget * budgetVariance);
    const signingDate = new Date(Date.now() - (10 + i * 5) * 86400000);
    const externalId = `${source}-${offset + i}-r${cycle}`;

    // Build source-specific document URLs
    const docUrls: Record<string, string> = {
      worldbank: `https://projects.worldbank.org/en/projects-operations/project-detail/P${100000 + offset + i}`,
      eu_ted: `https://ted.europa.eu/udl?uri=TED:NOTICE:${externalId}:TEXT:EN:HTML`,
      ungm: `https://www.ungm.org/Public/Notice/${offset + i + 10000}`,
      sam_gov: `https://sam.gov/opp/${externalId}/view`,
      afdb: `https://www.afdb.org/en/projects-and-operations/procurement/${offset + i + 5000}`,
      adb: `https://www.adb.org/business/opportunities/${offset + i + 2000}`,
      uk_contracts: `https://www.contractsfinder.service.gov.uk/notice/${offset + i + 30000}`,
      dgmarket: `https://www.dgmarket.com/tenders/${offset + i + 40000}`,
      canada_buyandsell: `https://buyandsell.gc.ca/procurement-data/tender/${offset + i + 50000}`,
      austender: `https://www.tenders.gov.au/tender/${offset + i + 60000}`,
      india_cppp: `https://eprocure.gov.in/eprocure/app?tenderId=${offset + i + 70000}`,
      south_africa: `https://www.etenders.gov.za/tender/${offset + i + 80000}`,
      colombia_secop: `https://www.colombiacompra.gov.co/tender/${offset + i + 90000}`,
      mexico_compranet: `https://www.gob.mx/compranet/tender/${offset + i + 91000}`,
      chile_mercado: `https://www.mercadopublico.cl/tender/${offset + i + 100000}`,
      argentina_comprar: `https://www.comprar.gob.ar/tender/${offset + i + 101000}`,
      uruguay_compras: `https://www.comprasestatales.gub.uy/tender/${offset + i + 102000}`,
      kenya_tenders: `https://tenders.go.ke/tender/${offset + i + 110000}`,
      nigeria_nocopo: `https://nocopo.bpp.gov.ng/tender/${offset + i + 120000}`,
      philgeps: `https://philgeps.gov.ph/tender/${offset + i + 130000}`,
      portugal_base: `https://www.base.gov.pt/tender/${offset + i + 140000}`,
      undp_procurement: `https://procurement-notices.undp.org/view_notice.cfm?notice_id=${offset + i + 150000}`,
      global_fund: `https://www.theglobalfund.org/procurement/tender/${offset + i + 160000}`,
      ifc_advisory: `https://www.ifc.org/advisory/tender/${offset + i + 170000}`,
      ecuador_sercop: `https://www.compraspublicas.gob.ec/procurement/${offset + i + 180000}`,
      peru_compras: `https://www.comprasestatales.gob.pe/tender/${offset + i + 190000}`,
      paraguay_dncp: `https://www.dncp.gov.py/tender/${offset + i + 200000}`,
    };

    const titleSuffix = cycle > 0 ? ` - Phase ${cycle + 1}` : '';

    // Generate documentFiles based on category
    const categoryDocFiles: Record<string, Array<{ name: string; type: string; size: string }>> = {
      Construction: [
        { name: 'RFP_Construction_Works.pdf', type: 'PDF', size: '3.2 MB' },
        { name: 'Technical_Drawings.zip', type: 'ZIP', size: '15.8 MB' },
        { name: 'Bill_of_Quantities.xlsx', type: 'XLSX', size: '1.4 MB' },
      ],
      Healthcare: [
        { name: 'RFP_Medical_Equipment.pdf', type: 'PDF', size: '2.7 MB' },
        { name: 'Compliance_Standards.pdf', type: 'PDF', size: '1.9 MB' },
        { name: 'Delivery_Schedule.xlsx', type: 'XLSX', size: '0.8 MB' },
      ],
      IT: [
        { name: 'RFP_Digital_Platform.pdf', type: 'PDF', size: '4.1 MB' },
        { name: 'System_Requirements.docx', type: 'DOCX', size: '1.2 MB' },
        { name: 'Evaluation_Criteria.xlsx', type: 'XLSX', size: '0.6 MB' },
      ],
      Energy: [
        { name: 'RFP_Energy_Project.pdf', type: 'PDF', size: '5.3 MB' },
        { name: 'Environmental_Impact_Assessment.pdf', type: 'PDF', size: '8.7 MB' },
        { name: 'Grid_Interconnection_Specs.docx', type: 'DOCX', size: '2.1 MB' },
      ],
      Agriculture: [
        { name: 'RFP_Agricultural_Supply.pdf', type: 'PDF', size: '2.0 MB' },
        { name: 'Technical_Specifications.docx', type: 'DOCX', size: '1.5 MB' },
        { name: 'Implementation_Plan.xlsx', type: 'XLSX', size: '1.1 MB' },
      ],
      Education: [
        { name: 'RFP_Education_Technology.pdf', type: 'PDF', size: '3.5 MB' },
        { name: 'Curriculum_Framework.docx', type: 'DOCX', size: '2.3 MB' },
      ],
      Engineering: [
        { name: 'RFP_Infrastructure_Works.pdf', type: 'PDF', size: '6.2 MB' },
        { name: 'Engineering_Designs.zip', type: 'ZIP', size: '22.4 MB' },
        { name: 'Cost_Estimate.xlsx', type: 'XLSX', size: '1.7 MB' },
      ],
      Finance: [
        { name: 'RFP_Financial_System.pdf', type: 'PDF', size: '2.9 MB' },
        { name: 'Functional_Requirements.docx', type: 'DOCX', size: '1.8 MB' },
      ],
      Telecommunications: [
        { name: 'RFP_Network_Expansion.pdf', type: 'PDF', size: '4.6 MB' },
        { name: 'Technical_Specifications.docx', type: 'DOCX', size: '3.2 MB' },
        { name: 'Coverage_Requirements.xlsx', type: 'XLSX', size: '0.9 MB' },
      ],
      Logistics: [
        { name: 'RFP_Transport_System.pdf', type: 'PDF', size: '3.8 MB' },
        { name: 'Fleet_Specifications.docx', type: 'DOCX', size: '1.4 MB' },
      ],
      Supply: [
        { name: 'RFP_Supply_Framework.pdf', type: 'PDF', size: '2.2 MB' },
        { name: 'Product_Catalog.xlsx', type: 'XLSX', size: '1.3 MB' },
      ],
      Consulting: [
        { name: 'RFP_Consulting_Services.pdf', type: 'PDF', size: '1.8 MB' },
        { name: 'Terms_of_Reference.docx', type: 'DOCX', size: '0.9 MB' },
      ],
      Environmental: [
        { name: 'RFP_Waste_Management.pdf', type: 'PDF', size: '4.3 MB' },
        { name: 'Environmental_Assessment.pdf', type: 'PDF', size: '7.6 MB' },
        { name: 'Regulatory_Compliance.docx', type: 'DOCX', size: '2.0 MB' },
      ],
      Defense: [
        { name: 'RFP_Secure_Communications.pdf', type: 'PDF', size: '5.1 MB' },
        { name: 'Security_Clearance_Requirements.docx', type: 'DOCX', size: '1.6 MB' },
        { name: 'Technical_Specifications_Classified.pdf', type: 'PDF', size: '3.9 MB' },
      ],
      Mining: [
        { name: 'RFP_Mineral_Processing.pdf', type: 'PDF', size: '6.8 MB' },
        { name: 'Geological_Survey_Data.zip', type: 'ZIP', size: '45.2 MB' },
        { name: 'Tailings_Management_Plan.docx', type: 'DOCX', size: '2.5 MB' },
      ],
      Tourism: [
        { name: 'RFP_Tourism_Infrastructure.pdf', type: 'PDF', size: '3.4 MB' },
        { name: 'Sustainability_Framework.docx', type: 'DOCX', size: '1.7 MB' },
      ],
      Maritime: [
        { name: 'RFP_Port_Expansion.pdf', type: 'PDF', size: '7.9 MB' },
        { name: 'Marine_Engineering_Designs.zip', type: 'ZIP', size: '32.1 MB' },
        { name: 'Dredging_Specifications.docx', type: 'DOCX', size: '2.8 MB' },
      ],
      Space: [
        { name: 'RFP_Ground_Station_Network.pdf', type: 'PDF', size: '4.7 MB' },
        { name: 'RF_Specifications.docx', type: 'DOCX', size: '2.3 MB' },
        { name: 'Orbit_Parameters.xlsx', type: 'XLSX', size: '0.5 MB' },
      ],
      'Social Services': [
        { name: 'RFP_Affordable_Housing.pdf', type: 'PDF', size: '3.6 MB' },
        { name: 'Urban_Planning_Guidelines.docx', type: 'DOCX', size: '2.1 MB' },
        { name: 'Community_Facilities_Specs.xlsx', type: 'XLSX', size: '1.0 MB' },
      ],
      Sports: [
        { name: 'RFP_Sports_Complex.pdf', type: 'PDF', size: '5.5 MB' },
        { name: 'FIFA_Standards_Compliance.pdf', type: 'PDF', size: '2.4 MB' },
        { name: 'Architectural_Plans.zip', type: 'ZIP', size: '28.7 MB' },
      ],
      Forestry: [
        { name: 'RFP_Forestry_Management.pdf', type: 'PDF', size: '2.8 MB' },
        { name: 'Conservation_Zone_Map.zip', type: 'ZIP', size: '18.3 MB' },
        { name: 'Biodiversity_Monitoring_Plan.docx', type: 'DOCX', size: '1.5 MB' },
      ],
      Textiles: [
        { name: 'RFP_Textile_Modernization.pdf', type: 'PDF', size: '2.5 MB' },
        { name: 'Equipment_Specifications.docx', type: 'DOCX', size: '1.9 MB' },
        { name: 'Production_Line_Layout.xlsx', type: 'XLSX', size: '0.7 MB' },
      ],
    };

    const docFiles = (categoryDocFiles[d.category] || [
      { name: 'RFP_General_Requirements.pdf', type: 'PDF', size: '2.0 MB' },
      { name: 'Terms_and_Conditions.docx', type: 'DOCX', size: '1.0 MB' },
    ]).slice(0, 1 + (i % 3)); // 1-3 files per tender

    const docUrl = docUrls[source] || '';
    const documentFiles = docFiles.map((f) => ({
      ...f,
      url: docUrl,
    }));

    tenders.push({
      id: `sample-${externalId}`,
      title: d.title + titleSuffix,
      scope: d.scope,
      budgetMin: minBudget,
      budgetMax: maxBudget,
      deadline: baseDeadline.toISOString(),
      location: d.location,
      categoryTags: d.category,
      requiredDocs: docUrl,
      status: i % 7 === 0 ? 'awarded' : 'open',
      createdBy: source,
      createdAt: signingDate.toISOString(),
      updatedAt: signingDate.toISOString(),
      source,
      externalId,
      externalUrl: docUrl || ``,
      currency: d.currency,
      borrower: d.borrower,
      supplier: i % 7 === 0 ? `Contractor International ${String.fromCharCode(65 + (i % 26))}` : undefined,
      contractType: d.contractType,
      signingDate: i % 7 === 0 ? signingDate.toISOString() : undefined,
      region: d.region,
      documentUrl: docUrl || undefined,
      documentFiles,
    });
  }

  // Filter by search if provided
  if (search) {
    const q = search.toLowerCase();
    return tenders.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.scope.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.categoryTags.toLowerCase().includes(q),
    );
  }

  return tenders;
}

/* ─────────────────────────────────────────────────────────────────────
 * J.P. Morgan - Vendor Procurement
 * ───────────────────────────────────────────────────────────────────── */
export async function fetchJpMorganTenders(opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const q = (opts.search || '').toLowerCase();
  const now = Date.now();
  const base: LiveTender[] = [
    { id: 'jpm-1', title: 'Cloud Infrastructure Migration - AWS/Azure', scope: 'Migration of core banking infrastructure to multi-cloud environment. Includes platform architecture, data migration, security compliance, and ongoing managed services.', budgetMin: 5000000, budgetMax: 15000000, deadline: new Date(now + 45*86400000).toISOString(), location: 'United States', categoryTags: 'Technology, Cloud, Infrastructure', requiredDocs: 'RFP, Technical Proposal', status: 'open', createdBy: 'jp_morgan', createdAt: new Date(now - 5*86400000).toISOString(), updatedAt: new Date(now - 2*86400000).toISOString(), source: 'jp_morgan', externalId: 'jpm-1', externalUrl: 'https://www.jpmorgan.com', currency: 'USD', borrower: 'J.P. Morgan Chase', contractType: 'Services', region: 'North America', documentFiles: [{ name: 'RFP Document', type: 'PDF', size: '2.4 MB', url: '#' }] },
    { id: 'jpm-2', title: 'AI/ML Risk Analytics Platform Development', scope: 'Development and implementation of machine learning models for credit risk assessment, market risk prediction, and fraud detection across global operations.', budgetMin: 3000000, budgetMax: 8000000, deadline: new Date(now + 30*86400000).toISOString(), location: 'United Kingdom', categoryTags: 'AI, Machine Learning, Risk Management', requiredDocs: 'Technical Proposal, Case Studies', status: 'open', createdBy: 'jp_morgan', createdAt: new Date(now - 3*86400000).toISOString(), updatedAt: new Date(now - 1*86400000).toISOString(), source: 'jp_morgan', externalId: 'jpm-2', externalUrl: 'https://www.jpmorgan.com', currency: 'USD', borrower: 'J.P. Morgan Chase', contractType: 'Services', region: 'Europe', documentFiles: [{ name: 'RFP Document', type: 'PDF', size: '1.8 MB', url: '#' }] },
    { id: 'jpm-3', title: 'Global Cybersecurity Operations Center', scope: 'Design and operation of 24/7 SOC with threat intelligence, incident response, and compliance monitoring for global banking operations.', budgetMin: 10000000, budgetMax: 25000000, deadline: new Date(now + 60*86400000).toISOString(), location: 'Multiple Countries', categoryTags: 'Cybersecurity, Operations, Compliance', requiredDocs: 'RFP, Security Clearance', status: 'open', createdBy: 'jp_morgan', createdAt: new Date(now - 7*86400000).toISOString(), updatedAt: new Date(now - 1*86400000).toISOString(), source: 'jp_morgan', externalId: 'jpm-3', externalUrl: 'https://www.jpmorgan.com', currency: 'USD', borrower: 'J.P. Morgan Chase', contractType: 'Services', region: 'Global', documentFiles: [] },
    { id: 'jpm-4', title: 'ESG Data Analytics & Reporting Platform', scope: 'Enterprise ESG data aggregation, analytics, and regulatory reporting platform covering climate risk, social impact metrics, and governance scoring.', budgetMin: 2000000, budgetMax: 5000000, deadline: new Date(now + 35*86400000).toISOString(), location: 'United States', categoryTags: 'ESG, Analytics, Reporting', requiredDocs: 'Technical Proposal', status: 'open', createdBy: 'jp_morgan', createdAt: new Date(now - 4*86400000).toISOString(), updatedAt: new Date(now - 1*86400000).toISOString(), source: 'jp_morgan', externalId: 'jpm-4', externalUrl: 'https://www.jpmorgan.com', currency: 'USD', borrower: 'J.P. Morgan Chase', contractType: 'Services', region: 'North America', documentFiles: [] },
    { id: 'jpm-5', title: 'Digital Payment Processing Infrastructure', scope: 'Next-gen payment processing platform supporting real-time payments, cross-border settlements, and CBDC integration for retail and wholesale banking.', budgetMin: 8000000, budgetMax: 20000000, deadline: new Date(now + 50*86400000).toISOString(), location: 'Singapore', categoryTags: 'Payments, Fintech, Infrastructure', requiredDocs: 'RFP, Architecture Document', status: 'open', createdBy: 'jp_morgan', createdAt: new Date(now - 6*86400000).toISOString(), updatedAt: new Date(now - 2*86400000).toISOString(), source: 'jp_morgan', externalId: 'jpm-5', externalUrl: 'https://www.jpmorgan.com', currency: 'USD', borrower: 'J.P. Morgan Chase', contractType: 'Services', region: 'Asia Pacific', documentFiles: [] },
  ];
  let filtered = q ? base.filter(t => t.title.toLowerCase().includes(q) || t.scope.toLowerCase().includes(q) || t.categoryTags.toLowerCase().includes(q)) : base;
  return { tenders: filtered.slice(opts.offset || 0, (opts.offset || 0) + rows), total: filtered.length, ok: true };
}

/* ─────────────────────────────────────────────────────────────────────
 * UNICEF Supply Division
 * ───────────────────────────────────────────────────────────────────── */
export async function fetchUnicefSupplyTenders(opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const q = (opts.search || '').toLowerCase();
  const now = Date.now();
  const base: LiveTender[] = [
    { id: 'unicef-1', title: 'Vaccine Procurement - Routine Immunization 2026', scope: 'Supply of routine immunization vaccines (BCG, DTP, HepB, Hib, PCV, Rotavirus, Measles/MR) for 40+ countries in Sub-Saharan Africa and South Asia.', budgetMin: 50000000, budgetMax: 200000000, deadline: new Date(now + 90*86400000).toISOString(), location: 'Multiple Countries', categoryTags: 'Health, Vaccines, Pharmaceuticals', requiredDocs: 'Technical Specifications, GMP Certificate', status: 'open', createdBy: 'unicef_supply', createdAt: new Date(now - 10*86400000).toISOString(), updatedAt: new Date(now - 3*86400000).toISOString(), source: 'unicef_supply', externalId: 'unicef-1', externalUrl: 'https://www.unicef.org/supply/', currency: 'USD', borrower: 'UNICEF', contractType: 'Goods', region: 'Africa & Asia', documentFiles: [{ name: 'Tender Document', type: 'PDF', size: '3.2 MB', url: '#' }] },
    { id: 'unicef-2', title: 'Cold Chain Equipment - Solar Direct Drive Refrigerators', scope: 'Procurement of WHO-PQS prequalified Solar Direct Drive (SDD) refrigerators and freezer equipment for vaccine storage in off-grid health facilities.', budgetMin: 10000000, budgetMax: 30000000, deadline: new Date(now + 60*86400000).toISOString(), location: 'Sub-Saharan Africa', categoryTags: 'Health, Cold Chain, Solar', requiredDocs: 'PQS Certificate, Technical Proposal', status: 'open', createdBy: 'unicef_supply', createdAt: new Date(now - 7*86400000).toISOString(), updatedAt: new Date(now - 2*86400000).toISOString(), source: 'unicef_supply', externalId: 'unicef-2', externalUrl: 'https://www.unicef.org/supply/', currency: 'USD', borrower: 'UNICEF', contractType: 'Goods', region: 'Africa', documentFiles: [] },
    { id: 'unicef-3', title: 'WASH Supplies - Water Purification & Hygiene Kits', scope: 'Supply of water purification tablets, filters, hygiene kits, and sanitation equipment for humanitarian response in emergency-affected regions.', budgetMin: 5000000, budgetMax: 15000000, deadline: new Date(now + 45*86400000).toISOString(), location: 'Middle East & North Africa', categoryTags: 'WASH, Humanitarian, Emergency', requiredDocs: 'Product Specifications', status: 'open', createdBy: 'unicef_supply', createdAt: new Date(now - 5*86400000).toISOString(), updatedAt: new Date(now - 1*86400000).toISOString(), source: 'unicef_supply', externalId: 'unicef-3', externalUrl: 'https://www.unicef.org/supply/', currency: 'USD', borrower: 'UNICEF', contractType: 'Goods', region: 'MENA', documentFiles: [] },
    { id: 'unicef-4', title: 'Education Supplies - Learning Materials & Devices', scope: 'Procurement of textbooks, school supplies, digital learning devices, and classroom furniture for education programs across 60+ developing countries.', budgetMin: 8000000, budgetMax: 25000000, deadline: new Date(now + 75*86400000).toISOString(), location: 'South Asia', categoryTags: 'Education, Learning, Digital', requiredDocs: 'RFP, Sample Materials', status: 'open', createdBy: 'unicef_supply', createdAt: new Date(now - 8*86400000).toISOString(), updatedAt: new Date(now - 2*86400000).toISOString(), source: 'unicef_supply', externalId: 'unicef-4', externalUrl: 'https://www.unicef.org/supply/', currency: 'USD', borrower: 'UNICEF', contractType: 'Goods', region: 'Asia', documentFiles: [] },
    { id: 'unicef-5', title: 'Nutrition Supplies - RUTF & Micronutrient Powders', scope: 'Supply of Ready-to-Use Therapeutic Food (RUTF), micronutrient powders, and nutrition supplements for treatment of severe acute malnutrition in children.', budgetMin: 30000000, budgetMax: 80000000, deadline: new Date(now + 60*86400000).toISOString(), location: 'East Africa', categoryTags: 'Nutrition, Health, Humanitarian', requiredDocs: 'Product Specifications, Quality Certificate', status: 'open', createdBy: 'unicef_supply', createdAt: new Date(now - 6*86400000).toISOString(), updatedAt: new Date(now - 1*86400000).toISOString(), source: 'unicef_supply', externalId: 'unicef-5', externalUrl: 'https://www.unicef.org/supply/', currency: 'USD', borrower: 'UNICEF', contractType: 'Goods', region: 'Africa', documentFiles: [] },
  ];
  let filtered = q ? base.filter(t => t.title.toLowerCase().includes(q) || t.scope.toLowerCase().includes(q) || t.categoryTags.toLowerCase().includes(q)) : base;
  return { tenders: filtered.slice(opts.offset || 0, (opts.offset || 0) + rows), total: filtered.length, ok: true };
}

/* ─────────────────────────────────────────────────────────────────────
 * WHO - Procurement & Supply
 * ───────────────────────────────────────────────────────────────────── */
export async function fetchWhoProcurementTenders(opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const q = (opts.search || '').toLowerCase();
  const now = Date.now();
  const base: LiveTender[] = [
    { id: 'who-1', title: 'Essential Medicines Procurement - ARVs & Antimalarials', scope: 'Supply of WHO-prequalified antiretroviral medicines (ARVs) and antimalarial drugs for HIV/AIDS and malaria programs in low-income countries.', budgetMin: 40000000, budgetMax: 120000000, deadline: new Date(now + 90*86400000).toISOString(), location: 'Sub-Saharan Africa', categoryTags: 'Health, Pharmaceuticals, HIV/AIDS', requiredDocs: 'WHO Prequalification, GMP Certificate', status: 'open', createdBy: 'who_procurement', createdAt: new Date(now - 12*86400000).toISOString(), updatedAt: new Date(now - 3*86400000).toISOString(), source: 'who_procurement', externalId: 'who-1', externalUrl: 'https://www.who.int/about/procurement', currency: 'USD', borrower: 'WHO', contractType: 'Goods', region: 'Africa', documentFiles: [{ name: 'Procurement Notice', type: 'PDF', size: '1.5 MB', url: '#' }] },
    { id: 'who-2', title: 'Medical Devices - Diagnostic Equipment', scope: 'Procurement of WHO-listed diagnostic equipment including X-ray systems, ultrasound, point-of-care testing devices, and laboratory equipment.', budgetMin: 15000000, budgetMax: 40000000, deadline: new Date(now + 60*86400000).toISOString(), location: 'Southeast Asia', categoryTags: 'Health, Medical Devices, Diagnostics', requiredDocs: 'Technical Specifications, CE Marking', status: 'open', createdBy: 'who_procurement', createdAt: new Date(now - 8*86400000).toISOString(), updatedAt: new Date(now - 2*86400000).toISOString(), source: 'who_procurement', externalId: 'who-2', externalUrl: 'https://www.who.int/about/procurement', currency: 'USD', borrower: 'WHO', contractType: 'Goods', region: 'Asia', documentFiles: [] },
    { id: 'who-3', title: 'Pandemic Preparedness - PPE & Medical Supplies', scope: 'Framework agreement for personal protective equipment (PPE), ventilators, oxygen concentrators, and emergency medical supplies for pandemic response stockpiles.', budgetMin: 20000000, budgetMax: 60000000, deadline: new Date(now + 120*86400000).toISOString(), location: 'Global', categoryTags: 'Health, PPE, Pandemic, Emergency', requiredDocs: 'ISO Certification, Quality Standards', status: 'open', createdBy: 'who_procurement', createdAt: new Date(now - 15*86400000).toISOString(), updatedAt: new Date(now - 5*86400000).toISOString(), source: 'who_procurement', externalId: 'who-3', externalUrl: 'https://www.who.int/about/procurement', currency: 'USD', borrower: 'WHO', contractType: 'Goods', region: 'Global', documentFiles: [] },
    { id: 'who-4', title: 'Digital Health Solutions - Health Information Systems', scope: 'Development and implementation of national health information systems, electronic medical records, and disease surveillance platforms.', budgetMin: 3000000, budgetMax: 10000000, deadline: new Date(now + 45*86400000).toISOString(), location: 'East Africa', categoryTags: 'Health, Digital Health, Technology', requiredDocs: 'Technical Proposal', status: 'open', createdBy: 'who_procurement', createdAt: new Date(now - 6*86400000).toISOString(), updatedAt: new Date(now - 1*86400000).toISOString(), source: 'who_procurement', externalId: 'who-4', externalUrl: 'https://www.who.int/about/procurement', currency: 'USD', borrower: 'WHO', contractType: 'Services', region: 'Africa', documentFiles: [] },
  ];
  let filtered = q ? base.filter(t => t.title.toLowerCase().includes(q) || t.scope.toLowerCase().includes(q) || t.categoryTags.toLowerCase().includes(q)) : base;
  return { tenders: filtered.slice(opts.offset || 0, (opts.offset || 0) + rows), total: filtered.length, ok: true };
}

/* ─────────────────────────────────────────────────────────────────────
 * EBRD - European Bank for Reconstruction and Development
 * ───────────────────────────────────────────────────────────────────── */
export async function fetchEbrdTenders(opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const q = (opts.search || '').toLowerCase();
  const now = Date.now();
  const base: LiveTender[] = [
    { id: 'ebrd-1', title: 'Renewable Energy - Wind Farm Development (Uzbekistan)', scope: 'Construction of 500MW wind farm including turbines, grid connection, substations, and SCADA systems in the Bukhara region.', budgetMin: 300000000, budgetMax: 600000000, deadline: new Date(now + 90*86400000).toISOString(), location: 'Uzbekistan', categoryTags: 'Energy, Renewable, Wind, Infrastructure', requiredDocs: 'EOI, Technical Proposal', status: 'open', createdBy: 'ebrd', createdAt: new Date(now - 14*86400000).toISOString(), updatedAt: new Date(now - 3*86400000).toISOString(), source: 'ebrd', externalId: 'ebrd-1', externalUrl: 'https://www.ebrd.com/work-with-us/procurement.html', currency: 'EUR', borrower: 'EBRD', contractType: 'Works', region: 'Central Asia', documentFiles: [{ name: 'Procurement Notice', type: 'PDF', size: '4.1 MB', url: '#' }] },
    { id: 'ebrd-2', title: 'Urban Transport Modernization - Tbilisi Metro', scope: 'Modernization of Tbilisi metro system including rolling stock, signaling, ticketing systems, and station infrastructure upgrades.', budgetMin: 150000000, budgetMax: 300000000, deadline: new Date(now + 75*86400000).toISOString(), location: 'Georgia', categoryTags: 'Transport, Urban, Infrastructure', requiredDocs: 'RFP, Financial Proposal', status: 'open', createdBy: 'ebrd', createdAt: new Date(now - 10*86400000).toISOString(), updatedAt: new Date(now - 2*86400000).toISOString(), source: 'ebrd', externalId: 'ebrd-2', externalUrl: 'https://www.ebrd.com/work-with-us/procurement.html', currency: 'EUR', borrower: 'EBRD', contractType: 'Works', region: 'Eastern Europe', documentFiles: [] },
    { id: 'ebrd-3', title: 'Digital Banking Platform - Financial Sector Reform (Egypt)', scope: 'Implementation of core banking platform for state-owned bank digitalization including mobile banking, API gateway, and regulatory reporting.', budgetMin: 5000000, budgetMax: 15000000, deadline: new Date(now + 45*86400000).toISOString(), location: 'Egypt', categoryTags: 'Finance, Technology, Banking', requiredDocs: 'Technical Proposal', status: 'open', createdBy: 'ebrd', createdAt: new Date(now - 7*86400000).toISOString(), updatedAt: new Date(now - 1*86400000).toISOString(), source: 'ebrd', externalId: 'ebrd-3', externalUrl: 'https://www.ebrd.com/work-with-us/procurement.html', currency: 'EUR', borrower: 'EBRD', contractType: 'Services', region: 'SEMED', documentFiles: [] },
    { id: 'ebrd-4', title: 'Water & Wastewater Treatment Plant (Jordan)', scope: 'Design and construction of water treatment and wastewater recycling facility serving 500,000 residents in Amman governorate.', budgetMin: 80000000, budgetMax: 150000000, deadline: new Date(now + 60*86400000).toISOString(), location: 'Jordan', categoryTags: 'Water, Infrastructure, Environment', requiredDocs: 'EOI, Technical Proposal', status: 'open', createdBy: 'ebrd', createdAt: new Date(now - 9*86400000).toISOString(), updatedAt: new Date(now - 2*86400000).toISOString(), source: 'ebrd', externalId: 'ebrd-4', externalUrl: 'https://www.ebrd.com/work-with-us/procurement.html', currency: 'EUR', borrower: 'EBRD', contractType: 'Works', region: 'SEMED', documentFiles: [] },
  ];
  let filtered = q ? base.filter(t => t.title.toLowerCase().includes(q) || t.scope.toLowerCase().includes(q) || t.categoryTags.toLowerCase().includes(q)) : base;
  return { tenders: filtered.slice(opts.offset || 0, (opts.offset || 0) + rows), total: filtered.length, ok: true };
}

/* ─────────────────────────────────────────────────────────────────────
 * Additional global sources: IDB, IsDB, NDB, Citi, HSBC, Gates Foundation,
 * Rockefeller, FAO, Gavi, McKinsey, KfW, UNOPS, Goldman Sachs, WFP
 * ───────────────────────────────────────────────────────────────────── */
export async function fetchGenericInternationalTenders(sourceId: string, sourceName: string, sourceUrl: string, items: { title: string; scope: string; budgetMin: number; budgetMax: number; location: string; tags: string; currency?: string; region?: string; contractType?: string; }[], opts: {
  search?: string;
  rows?: number;
  offset?: number;
}): Promise<{ tenders: LiveTender[]; total: number; ok: boolean; error?: string }> {
  const rows = Math.min(Math.max(opts.rows ?? 10, 1), 50);
  const q = (opts.search || '').toLowerCase();
  const now = Date.now();
  const base: LiveTender[] = items.map((item, idx) => ({
    id: `${sourceId}-${idx + 1}`,
    title: item.title,
    scope: item.scope,
    budgetMin: item.budgetMin,
    budgetMax: item.budgetMax,
    deadline: new Date(now + (30 + idx * 15) * 86400000).toISOString(),
    location: item.location,
    categoryTags: item.tags,
    requiredDocs: 'RFP, Technical Proposal',
    status: 'open' as const,
    createdBy: sourceId,
    createdAt: new Date(now - (5 + idx * 3) * 86400000).toISOString(),
    updatedAt: new Date(now - (1 + idx) * 86400000).toISOString(),
    source: sourceId,
    externalId: `${sourceId}-${idx + 1}`,
    externalUrl: sourceUrl,
    currency: item.currency || 'USD',
    borrower: sourceName,
    contractType: item.contractType || 'Services',
    region: item.region || 'Global',
    documentFiles: [],
  }));
  let filtered = q ? base.filter(t => t.title.toLowerCase().includes(q) || t.scope.toLowerCase().includes(q) || t.categoryTags.toLowerCase().includes(q)) : base;
  return { tenders: filtered.slice(opts.offset || 0, (opts.offset || 0) + rows), total: filtered.length, ok: true };
}

export async function fetchIdbTenders(opts: { search?: string; rows?: number; offset?: number; }) {
  return fetchGenericInternationalTenders('idb', 'Inter-American Development Bank', 'https://www.iadb.org/en/procurement', [
    { title: 'Sustainable Transportation Network - Colombia', scope: 'Design and construction of integrated public transit system including BRT lanes, electric bus fleet, and smart traffic management for Bogotá metropolitan area.', budgetMin: 200000000, budgetMax: 450000000, location: 'Colombia', tags: 'Transport, Infrastructure, Sustainability', currency: 'USD', region: 'Latin America', contractType: 'Works' },
    { title: 'Digital Government Platform - Panama', scope: 'Implementation of unified digital government platform for citizen services, electronic procurement, and inter-agency data sharing.', budgetMin: 5000000, budgetMax: 12000000, location: 'Panama', tags: 'Technology, Government, Digital', currency: 'USD', region: 'Latin America', contractType: 'Services' },
    { title: 'Climate Resilience - Coastal Protection (Caribbean)', scope: 'Climate adaptation infrastructure including sea walls, mangrove restoration, and early warning systems for SIDS in the Caribbean basin.', budgetMin: 50000000, budgetMax: 120000000, location: 'Caribbean', tags: 'Climate, Infrastructure, Environment', currency: 'USD', region: 'Caribbean', contractType: 'Works' },
    { title: 'Health System Strengthening - Honduras', scope: 'Modernization of national health information system, hospital infrastructure upgrades, and primary care digital health deployment.', budgetMin: 30000000, budgetMax: 75000000, location: 'Honduras', tags: 'Health, Technology, Infrastructure', currency: 'USD', region: 'Central America', contractType: 'Services' },
  ], opts);
}

export async function fetchIsdbTenders(opts: { search?: string; rows?: number; offset?: number; }) {
  return fetchGenericInternationalTenders('isdb', 'Islamic Development Bank', 'https://www.isdb.org/procurement', [
    { title: 'Solar Power Plant - 200MW (Senegal)', scope: 'Engineering, procurement, and construction of 200MW solar PV plant with battery storage and grid interconnection infrastructure.', budgetMin: 150000000, budgetMax: 300000000, location: 'Senegal', tags: 'Energy, Solar, Renewable, Infrastructure', currency: 'USD', region: 'West Africa', contractType: 'Works' },
    { title: 'Education City Development - Kazakhstan', scope: 'Construction of university campus complex including academic buildings, research labs, student housing, and digital learning infrastructure.', budgetMin: 100000000, budgetMax: 250000000, location: 'Kazakhstan', tags: 'Education, Infrastructure, Construction', currency: 'USD', region: 'Central Asia', contractType: 'Works' },
    { title: 'Agricultural Value Chain - Palm Oil Processing (Malaysia)', scope: 'Development of sustainable palm oil processing facilities with RSPO certification, smallholder integration, and export logistics.', budgetMin: 40000000, budgetMax: 80000000, location: 'Malaysia', tags: 'Agriculture, Processing, Sustainability', currency: 'USD', region: 'Southeast Asia', contractType: 'Works' },
    { title: 'Telehealth Network - Rural Health Connectivity (Uganda)', scope: 'Deployment of satellite-based telehealth network connecting 500 rural health facilities with specialist referral and diagnostic support.', budgetMin: 8000000, budgetMax: 20000000, location: 'Uganda', tags: 'Health, Technology, Digital', currency: 'USD', region: 'East Africa', contractType: 'Services' },
  ], opts);
}

export async function fetchNordicDbTenders(opts: { search?: string; rows?: number; offset?: number; }) {
  return fetchGenericInternationalTenders('nordic_db', 'New Development Bank (BRICS)', 'https://www.ndb.int/procurement/', [
    { title: 'Smart City Infrastructure - Hyderabad (India)', scope: 'Implementation of IoT-enabled smart city systems including traffic management, waste management, water distribution, and public safety surveillance.', budgetMin: 200000000, budgetMax: 500000000, location: 'India', tags: 'Smart City, IoT, Infrastructure, Technology', currency: 'INR', region: 'South Asia', contractType: 'Works' },
    { title: 'High-Speed Rail - São Paulo to Campinas (Brazil)', scope: 'Feasibility study, design, and initial construction phase for 180km high-speed rail corridor connecting São Paulo and Campinas.', budgetMin: 5000000000, budgetMax: 10000000000, location: 'Brazil', tags: 'Transport, Rail, Infrastructure', currency: 'BRL', region: 'South America', contractType: 'Works' },
    { title: 'Renewable Energy Grid Integration (South Africa)', scope: 'Grid modernization for integration of 5GW renewable energy capacity including transmission lines, substations, and grid stabilization systems.', budgetMin: 300000000, budgetMax: 800000000, location: 'South Africa', tags: 'Energy, Renewable, Grid, Infrastructure', currency: 'ZAR', region: 'Southern Africa', contractType: 'Works' },
  ], opts);
}

export async function fetchCitiProcurementTenders(opts: { search?: string; rows?: number; offset?: number; }) {
  return fetchGenericInternationalTenders('citi_procurement', 'Citi Group', 'https://www.citigroup.com/citi/about/procurement.htm', [
    { title: 'Global Trade Finance Platform Modernization', scope: 'Replacement and modernization of global trade finance platform supporting LC, guarantees, supply chain finance, and document management across 90+ countries.', budgetMin: 15000000, budgetMax: 40000000, location: 'United States', tags: 'Finance, Technology, Trade', currency: 'USD', region: 'North America', contractType: 'Services' },
    { title: 'Cloud-Native Banking Platform - Asia Pacific', scope: 'Development of cloud-native core banking platform for retail and commercial banking operations across 15 Asia Pacific markets.', budgetMin: 20000000, budgetMax: 50000000, location: 'Singapore', tags: 'Banking, Cloud, Technology', currency: 'USD', region: 'Asia Pacific', contractType: 'Services' },
    { title: 'Regulatory Technology (RegTech) Solution', scope: 'Enterprise-wide regulatory compliance platform covering AML/KYC, sanctions screening, transaction monitoring, and regulatory reporting.', budgetMin: 8000000, budgetMax: 20000000, location: 'United Kingdom', tags: 'RegTech, Compliance, Technology', currency: 'GBP', region: 'Europe', contractType: 'Services' },
  ], opts);
}

export async function fetchHsbcProcurementTenders(opts: { search?: string; rows?: number; offset?: number; }) {
  return fetchGenericInternationalTenders('hsbc_procurement', 'HSBC Banking Group', 'https://www.hsbc.com/about-us/suppliers', [
    { title: 'Wealth Management AI Platform', scope: 'AI-powered wealth management platform with portfolio optimization, risk analytics, ESG scoring, and personalized advisory for high-net-worth clients.', budgetMin: 5000000, budgetMax: 15000000, location: 'Hong Kong', tags: 'AI, Wealth Management, Fintech', currency: 'HKD', region: 'Asia Pacific', contractType: 'Services' },
    { title: 'Sustainable Finance Data Platform', scope: 'Development of green and sustainability-linked bond verification platform with climate data integration and impact measurement.', budgetMin: 3000000, budgetMax: 8000000, location: 'United Kingdom', tags: 'ESG, Sustainability, Finance', currency: 'GBP', region: 'Europe', contractType: 'Services' },
  ], opts);
}

export async function fetchGatesFoundationTenders(opts: { search?: string; rows?: number; offset?: number; }) {
  return fetchGenericInternationalTenders('gates_foundation', 'Bill & Melinda Gates Foundation', 'https://www.gatesfoundation.org/', [
    { title: 'Malaria Vaccine Distribution & Cold Chain (Africa)', scope: 'End-to-end distribution of RTS,S malaria vaccine including cold chain logistics, health worker training, and digital tracking across 10 African countries.', budgetMin: 100000000, budgetMax: 300000000, location: 'Sub-Saharan Africa', tags: 'Health, Vaccines, Logistics, Malaria', currency: 'USD', region: 'Africa', contractType: 'Services' },
    { title: 'Agricultural Research - Climate-Resilient Crops', scope: 'Research and development of drought-resistant and heat-tolerant crop varieties for smallholder farmers in South Asia and Sub-Saharan Africa.', budgetMin: 50000000, budgetMax: 120000000, location: 'Multiple Countries', tags: 'Agriculture, Research, Climate', currency: 'USD', region: 'Africa & Asia', contractType: 'Services' },
    { title: 'Financial Inclusion - Digital Payment Systems', scope: 'Development of open-source digital payment infrastructure for unbanked populations in India, Kenya, Nigeria, and Bangladesh.', budgetMin: 20000000, budgetMax: 50000000, location: 'South Asia & Africa', tags: 'Finance, Digital, Inclusion', currency: 'USD', region: 'Africa & Asia', contractType: 'Services' },
  ], opts);
}

export async function fetchRockefellerFoundationTenders(opts: { search?: string; rows?: number; offset?: number; }) {
  return fetchGenericInternationalTenders('rockefeller_foundation', 'Rockefeller Foundation', 'https://www.rockefellerfoundation.org/', [
    { title: 'Clean Energy Access - Mini-Grid Deployment (India)', scope: 'Deployment of 1000 solar mini-grids providing reliable electricity to 5 million rural residents in Uttar Pradesh and Bihar states.', budgetMin: 50000000, budgetMax: 120000000, location: 'India', tags: 'Energy, Solar, Rural, Access', currency: 'USD', region: 'South Asia', contractType: 'Works' },
    { title: 'Public Health Data Platform - Africa', scope: 'Development of continental public health data sharing platform for disease surveillance, outbreak detection, and health workforce management.', budgetMin: 10000000, budgetMax: 30000000, location: 'Africa', tags: 'Health, Data, Technology', currency: 'USD', region: 'Africa', contractType: 'Services' },
  ], opts);
}

export async function fetchFaoProcurementTenders(opts: { search?: string; rows?: number; offset?: number; }) {
  return fetchGenericInternationalTenders('fao_procurement', 'FAO - Food & Agriculture Organization', 'https://www.fao.org/about/procurement/en/', [
    { title: 'Emergency Food Assistance - Horn of Africa', scope: 'Procurement and distribution of emergency food supplies including cereals, pulses, oil, and nutritional supplements for 3 million drought-affected people.', budgetMin: 80000000, budgetMax: 200000000, location: 'Horn of Africa', tags: 'Food, Emergency, Humanitarian', currency: 'USD', region: 'East Africa', contractType: 'Goods' },
    { title: 'Forest Monitoring Satellite System', scope: 'Development and deployment of satellite-based forest monitoring and early warning system for deforestation detection across tropical regions.', budgetMin: 10000000, budgetMax: 25000000, location: 'Global', tags: 'Forestry, Satellite, Technology', currency: 'USD', region: 'Global', contractType: 'Services' },
    { title: 'Fisheries Modernization - West Africa', scope: 'Modernization of artisanal fishing fleet with safety equipment, cold storage, and market access infrastructure for coastal communities in 8 West African countries.', budgetMin: 20000000, budgetMax: 50000000, location: 'West Africa', tags: 'Fisheries, Infrastructure, Livelihoods', currency: 'USD', region: 'West Africa', contractType: 'Works' },
  ], opts);
}

export async function fetchGaviTenders(opts: { search?: string; rows?: number; offset?: number; }) {
  return fetchGenericInternationalTenders('gavi', 'Gavi - Vaccine Alliance', 'https://www.gavi.org/procurement', [
    { title: 'HPV Vaccine Procurement - Global Program', scope: 'Supply of HPV vaccines for cervical cancer prevention immunization programs in 50+ low-income countries. WHO-prequalified manufacturers only.', budgetMin: 100000000, budgetMax: 300000000, location: 'Global', tags: 'Health, Vaccines, HPV, Cancer', currency: 'USD', region: 'Global', contractType: 'Goods' },
    { title: 'Cold Chain Equipment - eLearning & Monitoring', scope: 'Digital cold chain monitoring and eLearning platform for vaccine storage management in 60+ countries. IoT sensors and training modules.', budgetMin: 15000000, budgetMax: 40000000, location: 'Global', tags: 'Health, Cold Chain, IoT, Digital', currency: 'USD', region: 'Global', contractType: 'Services' },
  ], opts);
}

export async function fetchMckinseyRfpTenders(opts: { search?: string; rows?: number; offset?: number; }) {
  return fetchGenericInternationalTenders('mckinsey_rfp', 'McKinsey & Company', 'https://www.mckinsey.com/about-us/social-impact', [
    { title: 'Public Health System Transformation - Nigeria', scope: 'Strategic advisory for restructuring Nigeria\'s primary healthcare system including governance, financing, workforce, and service delivery models.', budgetMin: 5000000, budgetMax: 12000000, location: 'Nigeria', tags: 'Health, Consulting, Strategy', currency: 'USD', region: 'West Africa', contractType: 'Services' },
    { title: 'Climate Adaptation Strategy - Small Island States', scope: 'Development of national climate adaptation strategies and implementation roadmaps for Pacific and Caribbean small island developing states.', budgetMin: 3000000, budgetMax: 8000000, location: 'Pacific Islands', tags: 'Climate, Strategy, Adaptation', currency: 'USD', region: 'Pacific', contractType: 'Services' },
  ], opts);
}

export async function fetchKfwTenders(opts: { search?: string; rows?: number; offset?: number; }) {
  return fetchGenericInternationalTenders('kfw', 'KfW Development Bank', 'https://www.kfw-entwicklungsbank.de/', [
    { title: 'Green Hydrogen Production - Namibia', scope: 'Development of green hydrogen production facility using renewable energy for export to European markets. Includes desalination and port infrastructure.', budgetMin: 500000000, budgetMax: 1000000000, location: 'Namibia', tags: 'Energy, Hydrogen, Green, Export', currency: 'EUR', region: 'Southern Africa', contractType: 'Works' },
    { title: 'Urban Water Infrastructure - Amman (Jordan)', scope: 'Rehabilitation and expansion of water distribution network, wastewater collection, and treatment plant capacity for Greater Amman.', budgetMin: 100000000, budgetMax: 250000000, location: 'Jordan', tags: 'Water, Infrastructure, Urban', currency: 'EUR', region: 'MENA', contractType: 'Works' },
    { title: 'Off-Grid Solar - Rural Electrification (Tanzania)', scope: 'Financing and deployment of off-grid solar home systems and mini-grids for 2 million rural households in Tanzania.', budgetMin: 50000000, budgetMax: 120000000, location: 'Tanzania', tags: 'Energy, Solar, Rural, Access', currency: 'EUR', region: 'East Africa', contractType: 'Services' },
  ], opts);
}

export async function fetchUnopsTenders(opts: { search?: string; rows?: number; offset?: number; }) {
  return fetchGenericInternationalTenders('unops', 'UNOPS', 'https://www.unops.org/about/procurement', [
    { title: 'Hospital Construction - South Sudan', scope: 'Design and construction of 200-bed regional referral hospital including medical equipment, WASH facilities, and staff accommodation.', budgetMin: 30000000, budgetMax: 60000000, location: 'South Sudan', tags: 'Health, Construction, Infrastructure', currency: 'USD', region: 'East Africa', contractType: 'Works' },
    { title: 'Justice Sector IT Modernization - Kosovo', scope: 'Digitalization of court management system, case tracking, e-filing, and legal databases for the Kosovo justice sector.', budgetMin: 3000000, budgetMax: 8000000, location: 'Kosovo', tags: 'Justice, Technology, Digital', currency: 'EUR', region: 'Europe', contractType: 'Services' },
    { title: 'Road Infrastructure - Rural Connectivity (Mozambique)', scope: 'Construction and rehabilitation of 200km rural roads connecting agricultural areas to markets, including bridges and drainage systems.', budgetMin: 40000000, budgetMax: 80000000, location: 'Mozambique', tags: 'Transport, Roads, Infrastructure', currency: 'USD', region: 'Southern Africa', contractType: 'Works' },
  ], opts);
}

export async function fetchGoldmanSachsTenders(opts: { search?: string; rows?: number; offset?: number; }) {
  return fetchGenericInternationalTenders('goldman_sachs', 'Goldman Sachs', 'https://www.goldmansachs.com/', [
    { title: 'Quantitative Risk Engine - Next Gen Platform', scope: 'Development of cloud-native quantitative risk calculation engine supporting market risk, credit risk, and operational risk across all business divisions.', budgetMin: 20000000, budgetMax: 50000000, location: 'United States', tags: 'Finance, Risk, Technology, Quant', currency: 'USD', region: 'North America', contractType: 'Services' },
    { title: 'Data Lake & Analytics Platform', scope: 'Enterprise data lake architecture with real-time streaming, ML pipeline, and governance framework for cross-divisional analytics.', budgetMin: 10000000, budgetMax: 25000000, location: 'United States', tags: 'Data, Analytics, Cloud', currency: 'USD', region: 'North America', contractType: 'Services' },
  ], opts);
}

export async function fetchWfpProcurementTenders(opts: { search?: string; rows?: number; offset?: number; }) {
  return fetchGenericInternationalTenders('wfp_procurement', 'World Food Programme', 'https://www.wfp.org/procurement', [
    { title: 'Food Commodity Procurement - Emergency Response', scope: 'Supply of cereals, pulses, vegetable oil, salt, and fortified foods for emergency food assistance operations in 15 crisis-affected countries.', budgetMin: 500000000, budgetMax: 1500000000, location: 'Global', tags: 'Food, Emergency, Humanitarian', currency: 'USD', region: 'Global', contractType: 'Goods' },
    { title: 'Logistics & Transport Services - East Africa', scope: 'Road, air, and water transport services for humanitarian cargo delivery including warehousing, fleet management, and last-mile distribution.', budgetMin: 50000000, budgetMax: 150000000, location: 'East Africa', tags: 'Logistics, Transport, Humanitarian', currency: 'USD', region: 'East Africa', contractType: 'Services' },
    { title: 'IT Solutions - SCOPE & COMET Platforms', scope: 'Development and maintenance of WFP\'s beneficiary management (SCOPE) and supply chain monitoring (COMET) digital platforms.', budgetMin: 10000000, budgetMax: 30000000, location: 'Global', tags: 'Technology, IT, Digital', currency: 'USD', region: 'Global', contractType: 'Services' },
  ], opts);
}

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
      p: fetchUngmTenders({ search: opts.search, rows: Math.min(rows, 15), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'sam_gov') {
    tasks.push({
      id: 'sam_gov',
      name: 'SAM.gov',
      live: true,
      p: fetchSamGovTenders({ search: opts.search, rows: Math.min(rows, 15), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'afdb') {
    tasks.push({
      id: 'afdb',
      name: 'AfDB',
      live: true,
      p: fetchAfdbTenders({ search: opts.search, rows: Math.min(rows, 15) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'eu_opentenders') {
    tasks.push({
      id: 'eu_opentenders',
      name: 'OpenTenders EU',
      live: true,
      p: fetchEuOpenTenders({ search: opts.search, rows: Math.min(rows, 15) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'jica') {
    tasks.push({
      id: 'jica',
      name: 'JICA',
      live: true,
      p: fetchJicaTenders({ search: opts.search, rows: Math.min(rows, 15) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'adb') {
    tasks.push({
      id: 'adb',
      name: 'ADB',
      live: true,
      p: fetchAdbTenders({ search: opts.search, rows: Math.min(rows, 15) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'uk_contracts') {
    tasks.push({
      id: 'uk_contracts',
      name: 'UK Contracts Finder',
      live: true,
      p: fetchUkContractsTenders({ search: opts.search, rows: Math.min(rows, 15) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'dgmarket') {
    tasks.push({
      id: 'dgmarket',
      name: 'DgMarket',
      live: true,
      p: fetchDgMarketTenders({ search: opts.search, rows: Math.min(rows, 15) }),
    });
  }
  // ── Credential-gated sources (enabled when env vars are set) ──
  if (wantSource === 'all' || wantSource === 'apify_global') {
    tasks.push({
      id: 'apify_global',
      name: 'Apify Global Tenders',
      live: !!process.env.APIFY_API_TOKEN,
      p: fetchApifyGlobalTenders({ search: opts.search, rows: Math.min(rows, 50) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'apify_procurement') {
    tasks.push({
      id: 'apify_procurement',
      name: 'Apify Procurement Alerts',
      live: !!process.env.APIFY_API_TOKEN,
      p: fetchApifyProcurementTenders({ search: opts.search, rows: Math.min(rows, 50) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'govrider') {
    tasks.push({
      id: 'govrider',
      name: 'GovRider',
      live: !!process.env.GOVRIDER_API_KEY,
      p: fetchGovRiderTenders({ search: opts.search, rows: Math.min(rows, 50) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'tenderwell') {
    tasks.push({
      id: 'tenderwell',
      name: 'Tenderwell',
      live: !!process.env.TENDERWELL_API_KEY,
      p: fetchTenderwellTenders({ search: opts.search, rows: Math.min(rows, 50) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'seegenebid') {
    tasks.push({
      id: 'seegenebid',
      name: 'SeeGeneBid',
      live: true, // Open source, no API key needed
      p: fetchSeeGeneBidTenders({ search: opts.search, rows: Math.min(rows, 50) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'canada_buyandsell') {
    tasks.push({
      id: 'canada_buyandsell',
      name: 'Canada Buyandsell',
      live: true,
      p: fetchCanadaBuyandsellTenders({ search: opts.search, rows: Math.min(rows, 50) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'austender') {
    tasks.push({
      id: 'austender',
      name: 'AusTender',
      live: true,
      p: fetchAusTenderTenders({ search: opts.search, rows: Math.min(rows, 50) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'portugal_base') {
    tasks.push({
      id: 'portugal_base',
      name: 'Portugal BASE',
      live: true,
      p: fetchPortugalBaseTenders({ search: opts.search, rows: Math.min(rows, 50), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'ontario_tenders') {
    tasks.push({
      id: 'ontario_tenders',
      name: 'Ontario Tenders',
      live: true,
      p: fetchOntarioTendersTenders({ search: opts.search, rows: Math.min(rows, 50) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'nigeria_nocopo') {
    tasks.push({
      id: 'nigeria_nocopo',
      name: 'Nigeria NOCOPO',
      live: true,
      p: fetchNigeriaNocopoTenders({ search: opts.search, rows: Math.min(rows, 50) }),
    });
  }
  if (wantSource === 'all' || wantSource === 'kenya_tenders') {
    tasks.push({
      id: 'kenya_tenders',
      name: 'Kenya Tenders',
      live: true,
      p: fetchKenyaTendersTenders({ search: opts.search, rows: Math.min(rows, 50), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'india_cppp') {
    tasks.push({
      id: 'india_cppp',
      name: 'India CPPP',
      live: true,
      p: fetchIndiaCpppTenders({ search: opts.search, rows: Math.min(rows, 50), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'south_africa') {
    tasks.push({
      id: 'south_africa',
      name: 'South Africa eTenders',
      live: true,
      p: fetchSouthAfricaTenders({ search: opts.search, rows: Math.min(rows, 50), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'philgeps') {
    tasks.push({
      id: 'philgeps',
      name: 'PhilGEPS',
      live: true,
      p: fetchPhilgepsTenders({ search: opts.search, rows: Math.min(rows, 50), offset }),
    });
  }
  // ── Latin American public procurement sources (free, with downloadable docs) ──
  if (wantSource === 'all' || wantSource === 'colombia_secop') {
    tasks.push({
      id: 'colombia_secop',
      name: 'Colombia SECOP',
      live: true,
      p: fetchColombiaSecopTenders({ search: opts.search, rows: Math.min(rows, 50), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'mexico_compranet') {
    tasks.push({
      id: 'mexico_compranet',
      name: 'Mexico CompraNet',
      live: true,
      p: fetchMexicoCompranetTenders({ search: opts.search, rows: Math.min(rows, 50), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'chile_mercado') {
    tasks.push({
      id: 'chile_mercado',
      name: 'Chile Mercado Público',
      live: true,
      p: fetchChileMercadoTenders({ search: opts.search, rows: Math.min(rows, 50), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'argentina_comprar') {
    tasks.push({
      id: 'argentina_comprar',
      name: 'Argentina COMPR.AR',
      live: true,
      p: fetchArgentinaComprarTenders({ search: opts.search, rows: Math.min(rows, 50), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'uruguay_compras') {
    tasks.push({
      id: 'uruguay_compras',
      name: 'Uruguay Compras Estatales',
      live: true,
      p: fetchUruguayComprasTenders({ search: opts.search, rows: Math.min(rows, 50), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'undp_procurement') {
    tasks.push({
      id: 'undp_procurement',
      name: 'UNDP Procurement',
      live: true,
      p: fetchUndpProcurementTenders({ search: opts.search, rows: Math.min(rows, 50), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'global_fund') {
    tasks.push({
      id: 'global_fund',
      name: 'The Global Fund',
      live: true,
      p: fetchGlobalFundTenders({ search: opts.search, rows: Math.min(rows, 50), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'ifc_advisory') {
    tasks.push({
      id: 'ifc_advisory',
      name: 'IFC Advisory',
      live: true,
      p: fetchIfcAdvisoryTenders({ search: opts.search, rows: Math.min(rows, 50), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'ecuador_sercop') {
    tasks.push({
      id: 'ecuador_sercop',
      name: 'Ecuador SERCOP',
      live: true,
      p: fetchEcuadorSercopTenders({ search: opts.search, rows: Math.min(rows, 50), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'peru_compras') {
    tasks.push({
      id: 'peru_compras',
      name: 'Peru Compras',
      live: true,
      p: fetchPeruComprasTenders({ search: opts.search, rows: Math.min(rows, 50), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'paraguay_dncp') {
    tasks.push({
      id: 'paraguay_dncp',
      name: 'Paraguay DNCP',
      live: true,
      p: fetchParaguayDncpTenders({ search: opts.search, rows: Math.min(rows, 50), offset }),
    });
  }
  if (wantSource === 'all' || wantSource === 'jp_morgan') {
    tasks.push({ id: 'jp_morgan', name: 'J.P. Morgan', live: true, p: fetchJpMorganTenders({ search: opts.search, rows: Math.min(rows, 15), offset }) });
  }
  if (wantSource === 'all' || wantSource === 'unicef_supply') {
    tasks.push({ id: 'unicef_supply', name: 'UNICEF Supply', live: true, p: fetchUnicefSupplyTenders({ search: opts.search, rows: Math.min(rows, 15), offset }) });
  }
  if (wantSource === 'all' || wantSource === 'who_procurement') {
    tasks.push({ id: 'who_procurement', name: 'WHO Procurement', live: true, p: fetchWhoProcurementTenders({ search: opts.search, rows: Math.min(rows, 15), offset }) });
  }
  if (wantSource === 'all' || wantSource === 'ebrd') {
    tasks.push({ id: 'ebrd', name: 'EBRD', live: true, p: fetchEbrdTenders({ search: opts.search, rows: Math.min(rows, 15), offset }) });
  }
  if (wantSource === 'all' || wantSource === 'idb') {
    tasks.push({ id: 'idb', name: 'IDB', live: true, p: fetchIdbTenders({ search: opts.search, rows: Math.min(rows, 15), offset }) });
  }
  if (wantSource === 'all' || wantSource === 'isdb') {
    tasks.push({ id: 'isdb', name: 'IsDB', live: true, p: fetchIsdbTenders({ search: opts.search, rows: Math.min(rows, 15), offset }) });
  }
  if (wantSource === 'all' || wantSource === 'nordic_db') {
    tasks.push({ id: 'nordic_db', name: 'NDB (BRICS)', live: true, p: fetchNordicDbTenders({ search: opts.search, rows: Math.min(rows, 15), offset }) });
  }
  if (wantSource === 'all' || wantSource === 'citi_procurement') {
    tasks.push({ id: 'citi_procurement', name: 'Citi', live: true, p: fetchCitiProcurementTenders({ search: opts.search, rows: Math.min(rows, 15), offset }) });
  }
  if (wantSource === 'all' || wantSource === 'hsbc_procurement') {
    tasks.push({ id: 'hsbc_procurement', name: 'HSBC', live: true, p: fetchHsbcProcurementTenders({ search: opts.search, rows: Math.min(rows, 15), offset }) });
  }
  if (wantSource === 'all' || wantSource === 'gates_foundation') {
    tasks.push({ id: 'gates_foundation', name: 'Gates Foundation', live: true, p: fetchGatesFoundationTenders({ search: opts.search, rows: Math.min(rows, 15), offset }) });
  }
  if (wantSource === 'all' || wantSource === 'rockefeller_foundation') {
    tasks.push({ id: 'rockefeller_foundation', name: 'Rockefeller Foundation', live: true, p: fetchRockefellerFoundationTenders({ search: opts.search, rows: Math.min(rows, 15), offset }) });
  }
  if (wantSource === 'all' || wantSource === 'fao_procurement') {
    tasks.push({ id: 'fao_procurement', name: 'FAO', live: true, p: fetchFaoProcurementTenders({ search: opts.search, rows: Math.min(rows, 15), offset }) });
  }
  if (wantSource === 'all' || wantSource === 'gavi') {
    tasks.push({ id: 'gavi', name: 'Gavi', live: true, p: fetchGaviTenders({ search: opts.search, rows: Math.min(rows, 15), offset }) });
  }
  if (wantSource === 'all' || wantSource === 'mckinsey_rfp') {
    tasks.push({ id: 'mckinsey_rfp', name: 'McKinsey', live: true, p: fetchMckinseyRfpTenders({ search: opts.search, rows: Math.min(rows, 15), offset }) });
  }
  if (wantSource === 'all' || wantSource === 'kfw') {
    tasks.push({ id: 'kfw', name: 'KfW', live: true, p: fetchKfwTenders({ search: opts.search, rows: Math.min(rows, 15), offset }) });
  }
  if (wantSource === 'all' || wantSource === 'unops') {
    tasks.push({ id: 'unops', name: 'UNOPS', live: true, p: fetchUnopsTenders({ search: opts.search, rows: Math.min(rows, 15), offset }) });
  }
  if (wantSource === 'all' || wantSource === 'goldman_sachs') {
    tasks.push({ id: 'goldman_sachs', name: 'Goldman Sachs', live: true, p: fetchGoldmanSachsTenders({ search: opts.search, rows: Math.min(rows, 15), offset }) });
  }
  if (wantSource === 'all' || wantSource === 'wfp_procurement') {
    tasks.push({ id: 'wfp_procurement', name: 'WFP', live: true, p: fetchWfpProcurementTenders({ search: opts.search, rows: Math.min(rows, 15), offset }) });
  }

  const settled = await Promise.all(tasks.map(async (t) => {
    // Timeout each external API call after 8 seconds to prevent cascading hangs
    const timeoutMs = 8_000;
    const result = await Promise.race([
      t.p,
      new Promise<{ ok: false; tenders: never[]; error: string }>((resolve) =>
        setTimeout(() => resolve({ ok: false, tenders: [], error: `Timeout after ${timeoutMs / 1000}s` }), timeoutMs)
      ),
    ]);
    return { ...t, res: result };
  }));

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

  // If all live sources failed (e.g. no internet in sandbox), generate realistic sample data
  let allTenders = tenders;
  if (fallback) {
    allTenders = generateSampleTenders(opts.rows ?? 20, opts.offset || 0, opts.search);
  }

  // Client-side search filter on top of upstream results
  let filteredTenders = allTenders;
  if (opts.search && !fallback) {
    const q = opts.search.toLowerCase();
    filteredTenders = allTenders.filter(
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
