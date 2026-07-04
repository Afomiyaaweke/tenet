'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, LiveTender, DataSource } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Globe2, Search, MapPin, Calendar, DollarSign,
  RefreshCw, Radio, Building2, FileText, ShieldCheck, Lock,
  Database, ServerCrash, Sparkles, ArrowUpRight,
  ChevronDown, ChevronUp, BookOpen, Download, Copy,
  Loader2, Clock, Landmark, Plane, Flag, Cpu,
  CheckCircle2, ExternalLink, TrendingUp,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────────────────────────────── */

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' as const } },
};

const SOURCE_LABELS: Record<string, string> = {
  worldbank: 'World Bank',
  eu_ted: 'EU TED',
  ungm: 'UNGM',
  sam_gov: 'SAM.gov',
  afdb: 'AfDB',
  eu_opentenders: 'OpenTenders EU',
  jica: 'JICA',
  adb: 'ADB',
  uk_contracts: 'UK Contracts',
  dgmarket: 'DgMarket',
  sector_feed: 'Sector Feed',
};

const SOURCE_ACCENT: Record<string, { dot: string; badge: string; ring: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  worldbank: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    ring: 'hover:border-emerald-400/60',
    bg: 'from-emerald-500/10 to-teal-500/5',
    icon: Landmark,
  },
  eu_ted: {
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    ring: 'hover:border-blue-400/60',
    bg: 'from-blue-500/10 to-indigo-500/5',
    icon: Flag,
  },
  ungm: {
    dot: 'bg-sky-500',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    ring: 'hover:border-sky-400/60',
    bg: 'from-sky-500/10 to-cyan-500/5',
    icon: Plane,
  },
  sam_gov: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    ring: 'hover:border-amber-400/60',
    bg: 'from-amber-500/10 to-orange-500/5',
    icon: Landmark,
  },
  afdb: {
    dot: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    ring: 'hover:border-orange-400/60',
    bg: 'from-orange-500/10 to-red-500/5',
    icon: Globe2,
  },
  eu_opentenders: {
    dot: 'bg-violet-500',
    badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
    ring: 'hover:border-violet-400/60',
    bg: 'from-violet-500/10 to-purple-500/5',
    icon: Cpu,
  },
  jica: {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    ring: 'hover:border-red-400/60',
    bg: 'from-red-500/10 to-rose-500/5',
    icon: Flag,
  },
  adb: {
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
    ring: 'hover:border-cyan-400/60',
    bg: 'from-cyan-500/10 to-teal-500/5',
    icon: Landmark,
  },
  uk_contracts: {
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    ring: 'hover:border-rose-400/60',
    bg: 'from-rose-500/10 to-pink-500/5',
    icon: Flag,
  },
  dgmarket: {
    dot: 'bg-lime-500',
    badge: 'bg-lime-50 text-lime-700 dark:bg-lime-950/40 dark:text-lime-300',
    ring: 'hover:border-lime-400/60',
    bg: 'from-lime-500/10 to-green-500/5',
    icon: Globe2,
  },
  sector_feed: {
    dot: 'bg-primary',
    badge: 'bg-primary/10 text-primary',
    ring: 'hover:border-primary/40',
    bg: 'from-primary/10 to-primary/5',
    icon: TrendingUp,
  },
  default: {
    dot: 'bg-muted-foreground',
    badge: 'bg-muted text-muted-foreground',
    ring: 'hover:border-border',
    bg: 'from-muted/50 to-muted/20',
    icon: Globe2,
  },
};

const ACCENT_DOT: Record<string, string> = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  sky: 'bg-sky-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  violet: 'bg-violet-500',
  teal: 'bg-teal-500',
  rose: 'bg-rose-500',
  red: 'bg-red-500',
  cyan: 'bg-cyan-500',
  lime: 'bg-lime-500',
};

/* ─────────────────────────────────────────────────────────────────────
 * Sector definitions for quick-filter
 * ───────────────────────────────────────────────────────────────────── */

const SECTOR_PILLS: { id: string; label: string; icon: string; color: string }[] = [
  { id: 'medical', label: 'Medical', icon: '🏥', color: 'rose' },
  { id: 'construction', label: 'Construction', icon: '🏗️', color: 'amber' },
  { id: 'retail', label: 'Retail', icon: '🛒', color: 'pink' },
  { id: 'it', label: 'IT', icon: '💻', color: 'violet' },
  { id: 'energy', label: 'Energy', icon: '⚡', color: 'yellow' },
  { id: 'agriculture', label: 'Agriculture', icon: '🌾', color: 'green' },
  { id: 'education', label: 'Education', icon: '📚', color: 'blue' },
  { id: 'transport', label: 'Transport', icon: '🚛', color: 'cyan' },
  { id: 'finance', label: 'Finance', icon: '🏦', color: 'emerald' },
  { id: 'telecom', label: 'Telecom', icon: '📡', color: 'sky' },
];

/* ─────────────────────────────────────────────────────────────────────
 * Inline document data type
 * ───────────────────────────────────────────────────────────────────── */

interface InlineDocument {
  title: string;
  metaDescription?: string;
  content: string;
  sections?: { heading: string; content: string }[];
  deadlines?: string[];
  budgets?: string[];
  url: string;
  contentType?: string;
  fetchedAt: string;
}

/* ─────────────────────────────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────────────────────────────── */

function fmtMoney(amount: number, currency: string): string {
  if (!amount) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function deadlineBadge(days: number): string {
  if (days <= 0) return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
  if (days <= 7) return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  if (days <= 21) return 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300';
  return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const day = 86400000;
  if (diff < day) return 'today';
  if (diff < 2 * day) return 'yesterday';
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/* ─────────────────────────────────────────────────────────────────────
 * Inline Document Viewer Component
 * ───────────────────────────────────────────────────────────────────── */

function InlineDocumentViewer({ doc, onClose }: { doc: InlineDocument; onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const copyContent = () => {
    const text = doc.sections
      ? doc.sections.map((s) => `${s.heading}\n${s.content}`).join('\n\n')
      : doc.content;
    navigator.clipboard.writeText(text);
    toast.success('Content copied to clipboard');
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="border-t border-border bg-gradient-to-b from-muted/30 to-background">
        <div className="p-4 md:p-6 space-y-4">
          {/* Document header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Document loaded from {new URL(doc.url).hostname}</span>
                <span>·</span>
                <span>{new Date(doc.fetchedAt).toLocaleTimeString()}</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground leading-snug">
                {doc.title || 'Tender Document'}
              </h3>
              {doc.metaDescription && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {doc.metaDescription}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={copyContent}>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open original
              </a>
              <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5 text-xs text-muted-foreground">
                <ChevronUp className="h-3.5 w-3.5" />
                Collapse
              </Button>
            </div>
          </div>

          {/* Extracted metadata pills */}
          {(doc.deadlines && doc.deadlines.length > 0) || (doc.budgets && doc.budgets.length > 0) ? (
            <div className="flex flex-wrap gap-2">
              {doc.deadlines?.map((d, i) => (
                <Badge key={`dl-${i}`} variant="outline" className="gap-1.5 text-xs border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300">
                  <Calendar className="h-3 w-3" />
                  {d}
                </Badge>
              ))}
              {doc.budgets?.map((b, i) => (
                <Badge key={`bg-${i}`} variant="outline" className="gap-1.5 text-xs border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                  <DollarSign className="h-3 w-3" />
                  {b}
                </Badge>
              ))}
            </div>
          ) : null}

          {/* Sections view */}
          {doc.sections && doc.sections.length > 0 ? (
            <div ref={scrollRef} className="max-h-80 overflow-y-auto rounded-lg border border-border bg-background p-4 space-y-4 scrollbar-thin">
              {doc.sections.map((section, i) => (
                <div key={i}>
                  <h4 className="text-sm font-semibold text-foreground mb-1.5">{section.heading}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                  {i < doc.sections!.length - 1 && <Separator className="mt-4 bg-border" />}
                </div>
              ))}
            </div>
          ) : (
            <div ref={scrollRef} className="max-h-80 overflow-y-auto rounded-lg border border-border bg-background p-4 scrollbar-thin">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {doc.content || 'No content could be extracted from this page.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Main LiveTendersView component — Notion-style
 * ───────────────────────────────────────────────────────────────────── */

export function LiveTendersView() {
  const [tenders, setTenders] = useState<LiveTender[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [sourceMeta, setSourceMeta] = useState<
    { id: string; name: string; live: boolean; ok: boolean; count: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sectorFilter, setSectorFilter] = useState('');
  const [sectorCounts, setSectorCounts] = useState<{ id: string; label: string; count: number }[]>([]);

  // Inline document state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState<string | null>(null);
  const [docData, setDocData] = useState<Record<string, InlineDocument>>({});
  const [docError, setDocError] = useState<Record<string, string>>({});

  // Import state
  const [importing, setImporting] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const params: Record<string, string> = { rows: '50' };
      if (search) params.search = search;
      if (sourceFilter && sourceFilter !== 'all') params.source = sourceFilter;
      if (sectorFilter) params.sector = sectorFilter;
      const res = await api.get('/tenders/live', params);
      if (res.success) {
        setTenders(res.data as LiveTender[]);
        setSourceMeta(res.meta?.sources || []);
        setFallback(Boolean(res.meta?.fallback));
        if (Array.isArray(res.meta?.dataSources)) setDataSources(res.meta.dataSources);
        if (Array.isArray(res.meta?.sectors)) setSectorCounts(res.meta.sectors);
      } else {
        toast.error(res.error || 'Failed to load live tenders');
      }
      setLoading(false);
      setRefreshing(false);
    },
    [search, sourceFilter, sectorFilter],
  );

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  const liveSourcesCount = useMemo(
    () => sourceMeta.filter((s) => s.live && s.ok).length,
    [sourceMeta],
  );

  const totalTenderValue = useMemo(() => {
    return tenders.reduce((sum, t) => sum + (t.budgetMax || 0), 0);
  }, [tenders]);

  /* ────── Inline document loading ────── */
  const loadDocument = useCallback(async (tender: LiveTender) => {
    const id = tender.id;
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    // Already fetched?
    if (docData[id]) {
      setExpandedId(id);
      return;
    }

    setExpandedId(id);
    setDocLoading(id);
    setDocError((prev) => { const n = { ...prev }; delete n[id]; return n; });

    try {
      const res = await api.get(`/tenders/${encodeURIComponent(id)}/documents`, { url: tender.externalUrl });
      if (res.success && res.data) {
        setDocData((prev) => ({ ...prev, [id]: res.data as InlineDocument }));
      } else {
        setDocError((prev) => ({ ...prev, [id]: res.error || 'Failed to load document' }));
      }
    } catch {
      setDocError((prev) => ({ ...prev, [id]: 'Network error' }));
    }
    setDocLoading(null);
  }, [expandedId, docData]);

  /* ────── Import to local tenders ────── */
  const importTender = useCallback(async (tender: LiveTender) => {
    setImporting(tender.id);
    try {
      const res = await api.post('/tenders', {
        title: tender.title,
        scope: tender.scope,
        budgetMin: tender.budgetMin,
        budgetMax: tender.budgetMax,
        deadline: tender.deadline,
        location: tender.location,
        categoryTags: tender.categoryTags,
        requiredDocs: `Source: ${SOURCE_LABELS[tender.source] || tender.source} | External ID: ${tender.externalId} | URL: ${tender.externalUrl}`,
        status: 'open',
        currency: tender.currency,
      });
      if (res.success) {
        toast.success('Tender imported successfully', {
          description: `"${tender.title}" is now in your tenders list.`,
        });
      } else {
        toast.error(res.error || 'Failed to import tender');
      }
    } catch {
      toast.error('Failed to import tender');
    }
    setImporting(null);
  }, []);

  /* ────── Render ────── */
  return (
    <div className="view-enter">
      {/* ───────────────── Notion-style Cover ───────────────── */}
      <div className="relative h-32 md:h-40 bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-60" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute top-4 right-4 md:right-6">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => load(true)}
            disabled={refreshing}
            className="gap-1.5 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="px-4 md:px-6 max-w-5xl mx-auto -mt-8 relative z-10 space-y-6">
        {/* ───────────────── Notion-style Icon + Title ───────────────── */}
        <div className="flex items-end gap-4">
          <div className="h-14 w-14 md:h-16 md:w-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 border-4 border-background shrink-0">
            <Globe2 className="h-7 w-7 md:h-8 md:w-8 text-white" />
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Global Live Tenders</h1>
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 gap-1 text-xs">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                LIVE
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Real-time procurement from international public APIs — {tenders.length} opportunities from {sourceMeta.length || 10} sources
              {sectorFilter && <span className="ml-1 text-primary font-medium">· filtered by {SECTOR_PILLS.find(s => s.id === sectorFilter)?.label || sectorFilter}</span>}
            </p>
          </div>
        </div>

        {/* ───────────────── Breadcrumb ───────────────── */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <span className="hover:text-foreground cursor-default">Dashboard</span>
          <span>/</span>
          <span className="hover:text-foreground cursor-default">Tenders</span>
          <span>/</span>
          <span className="text-foreground font-medium">Live Feed</span>
        </nav>

        {/* ───────────────── Stats bar (compact) ───────────────── */}
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">Tenders</span>
                <Database className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <p className="text-lg md:text-2xl font-bold text-foreground mt-1">{tenders.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">Online</span>
                <Radio className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <p className="text-lg md:text-2xl font-bold text-foreground mt-1">{liveSourcesCount}/{sourceMeta.length || 6}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">Value</span>
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <p className="text-sm md:text-base font-bold text-foreground mt-1">
                {totalTenderValue > 0 ? fmtMoney(totalTenderValue, 'USD').replace('USD', '').trim() : '—'}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
                {fallback ? (
                  <ServerCrash className="h-3.5 w-3.5 text-amber-500" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                )}
              </div>
              <p className="text-lg md:text-2xl font-bold text-foreground mt-1">
                {fallback ? 'Cached' : 'Live'}
              </p>
            </CardContent>
          </Card>
        </div>

        {fallback && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 flex items-start gap-3">
            <ServerCrash className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-200">
                Showing curated sample data
              </p>
              <p className="text-amber-700 dark:text-amber-300/80 mt-0.5">
                Upstream APIs are currently unreachable from this environment. The records below are representative samples.
              </p>
            </div>
          </div>
        )}

        {/* ───────────────── Filters ───────────────── */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tenders — title, country, category…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-muted/50 border-border"
                />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full md:w-56 bg-muted/50 border-border">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All live sources</SelectItem>
                  <SelectItem value="worldbank">🏦 World Bank</SelectItem>
                  <SelectItem value="eu_ted">🇪🇺 EU TED</SelectItem>
                  <SelectItem value="ungm">🇺🇳 UNGM</SelectItem>
                  <SelectItem value="sam_gov">🇺🇸 SAM.gov</SelectItem>
                  <SelectItem value="afdb">🌍 AfDB</SelectItem>
                  <SelectItem value="eu_opentenders">🔎 OpenTenders EU</SelectItem>
                  <SelectItem value="jica">🇯🇵 JICA</SelectItem>
                  <SelectItem value="adb">🌏 ADB</SelectItem>
                  <SelectItem value="uk_contracts">🇬🇧 UK Contracts Finder</SelectItem>
                  <SelectItem value="dgmarket">🌐 DgMarket</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sector quick-filter pills */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2 md:mt-0">
              <span className="text-xs font-medium text-muted-foreground mr-1">Sectors:</span>
              <button
                onClick={() => setSectorFilter('')}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                  !sectorFilter
                    ? 'ring-2 ring-primary/50 bg-primary/10 text-primary font-medium'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                All
              </button>
              {SECTOR_PILLS.map((s) => {
                const count = sectorCounts.find(c => c.id === s.id)?.count || 0;
                const isActive = sectorFilter === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSectorFilter(isActive ? '' : s.id)}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                      isActive
                        ? 'ring-2 ring-primary/50 bg-primary/10 text-primary font-medium'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <span>{s.icon}</span>
                    {s.label}
                    {count > 0 && <span className="opacity-70">· {count}</span>}
                  </button>
                );
              })}
            </div>

            {/* Source status pills */}
            {sourceMeta.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
                <span className="text-xs font-medium text-muted-foreground mr-1">Feed status:</span>
                {sourceMeta.map((s) => {
                  const accent = SOURCE_ACCENT[s.id] || SOURCE_ACCENT.default;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSourceFilter(s.id === sourceFilter ? 'all' : s.id)}
                      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                        sourceFilter === s.id
                          ? 'ring-2 ring-primary/50 ' + accent.badge
                          : accent.badge
                      }`}
                      title={s.ok ? 'Connected' : 'Unavailable — using fallback'}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${s.ok ? accent.dot : 'bg-muted-foreground/40'}`} />
                      {s.name}
                      <span className="opacity-70">· {s.count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ───────────────── Feed-style Tender Cards ───────────────── */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-full bg-muted rounded animate-pulse" />
                  <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                  <div className="flex gap-3 pt-1">
                    <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tenders.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-foreground font-medium">No live tenders found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try a different search term or source filter.
              </p>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            <AnimatePresence mode="popLayout">
              {tenders.map((t) => {
                const accent = SOURCE_ACCENT[t.source] || SOURCE_ACCENT.default;
                const days = daysUntil(t.deadline);
                const isExpanded = expandedId === t.id;
                const isLoadingDoc = docLoading === t.id;
                const doc = docData[t.id];
                const docErr = docError[t.id];
                const SourceIcon = accent.icon;

                return (
                  <motion.div key={t.id} variants={itemVariants} layout>
                    <Card className={`bg-card border-border transition-all ${accent.ring} ${isExpanded ? 'ring-1 ring-primary/20' : ''}`}>
                      <CardContent className="p-0">
                        {/* Main card content */}
                        <div className="p-4 md:p-5">
                          {/* Top row: source + status */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${accent.badge}`}
                              >
                                <SourceIcon className="h-3 w-3" />
                                {SOURCE_LABELS[t.source] || t.source}
                              </span>
                              {t.status === 'awarded' ? (
                                <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                                  Contract Award
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                                  Open Notice
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground hidden md:inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {t.signingDate
                                ? `Signed ${relativeTime(t.signingDate)}`
                                : `Published ${relativeTime(t.createdAt)}`}
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className="text-base md:text-lg font-semibold text-foreground leading-snug line-clamp-2">
                            {t.title}
                          </h3>

                          {/* Sector badge for sector_feed items */}
                          {t.source === 'sector_feed' && (
                            <div className="mt-1.5">
                              <Badge className="bg-primary/10 text-primary border-0 text-[10px] gap-1">
                                <TrendingUp className="h-3 w-3" />
                                Sector
                              </Badge>
                            </div>
                          )}

                          {/* Scope preview */}
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {t.scope}
                          </p>

                          {/* Meta row */}
                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <DollarSign className="h-3.5 w-3.5 shrink-0" />
                              <span className="font-medium text-foreground">
                                {fmtMoney(t.budgetMax, t.currency)}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate max-w-[120px]">{t.location}</span>
                            </span>
                            <span className={`inline-flex items-center gap-1.5 text-xs px-1.5 py-0.5 rounded ${deadlineBadge(days)}`}>
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              {days <= 0 ? 'Closed' : `${days}d left`}
                            </span>
                            {t.borrower && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hidden md:inline-flex">
                                <Building2 className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate max-w-[140px]">{t.borrower}</span>
                              </span>
                            )}
                          </div>

                          {/* Category tags + actions */}
                          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
                            <div className="flex flex-wrap gap-1.5">
                              {t.categoryTags
                                .split(',')
                                .filter(Boolean)
                                .slice(0, 4)
                                .map((c) => (
                                  <span
                                    key={c}
                                    className="text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                                  >
                                    {c.trim()}
                                  </span>
                                ))}
                              {t.contractType && (
                                <span className="text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                  {t.contractType}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 text-xs h-7"
                                onClick={() => loadDocument(t)}
                                disabled={isLoadingDoc}
                              >
                                {isLoadingDoc ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <BookOpen className="h-3.5 w-3.5" />
                                )}
                                {isLoadingDoc ? 'Loading…' : isExpanded ? 'Collapse' : 'Read More'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 text-xs h-7 text-primary"
                                onClick={() => importTender(t)}
                                disabled={importing === t.id}
                              >
                                {importing === t.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Download className="h-3.5 w-3.5" />
                                )}
                                Import
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Inline document viewer */}
                        <AnimatePresence>
                          {isExpanded && (
                            <>
                              {isLoadingDoc && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="border-t border-border p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"
                                >
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Fetching document content…
                                </motion.div>
                              )}
                              {docErr && !isLoadingDoc && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="border-t border-border p-6"
                                >
                                  <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 flex items-start gap-3">
                                    <ServerCrash className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                                        Could not load document content
                                      </p>
                                      <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
                                        {docErr} — you can still{' '}
                                        <a
                                          href={t.externalUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="underline font-medium"
                                        >
                                          view the original page
                                        </a>
                                        .
                                      </p>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                              {doc && !isLoadingDoc && (
                                <InlineDocumentViewer
                                  doc={doc}
                                  onClose={() => setExpandedId(null)}
                                />
                              )}
                            </>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ───────────────── Data Sources panel ───────────────── */}
        <div className="pt-4 pb-8">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-4 w-4 text-emerald-500" />
            <h2 className="text-lg font-semibold text-foreground">Connected Data Sources</h2>
            <Badge variant="outline" className="text-xs border-border text-muted-foreground">
              {dataSources.filter((s) => s.live).length} live · {dataSources.length} total
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Aggregated procurement from international data feeds.
            Sources marked <span className="font-medium text-emerald-600 dark:text-emerald-400">Live</span> are
            fetched in real time; others require credentials.
          </p>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {dataSources.map((s) => {
              const accent = SOURCE_ACCENT[s.id] || SOURCE_ACCENT.default;
              const SourceIcon = accent.icon;
              return (
                <Card
                  key={s.id}
                  className={`bg-card border-border hover:border-primary/40 transition-colors ${s.live ? 'cursor-pointer' : 'opacity-70'}`}
                  onClick={s.live ? () => setSourceFilter(s.id === sourceFilter ? 'all' : s.id) : undefined}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${s.live ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-muted'}`}>
                          {s.live ? (
                            <SourceIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-semibold text-foreground text-sm truncate">{s.name}</h4>
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${ACCENT_DOT[s.accent] || 'bg-muted-foreground'}`}
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{s.coverage}</p>
                        </div>
                      </div>
                      {s.live ? (
                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 shrink-0 text-[10px]">
                          Live
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-border text-muted-foreground shrink-0 text-[10px]">
                          Reference
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground min-w-0">
                        <ShieldCheck className="h-3 w-3 shrink-0" />
                        <span className="truncate">{s.access}</span>
                      </div>
                      <a
                        href={s.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open
                        <ArrowUpRight className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">More sources available</span>{' '}
              Enable Apify, GovRider, Tenderwell, or SeeGeneBid by providing the required
              API credentials. Each adapter follows the same{' '}
              <code className="px-1 py-0.5 rounded bg-muted text-foreground">LiveTender</code> shape
              and integrates directly into this feed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
