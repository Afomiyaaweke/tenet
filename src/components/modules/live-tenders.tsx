'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
  Globe2, Search, MapPin, Calendar, DollarSign, ExternalLink,
  RefreshCw, Radio, Building2, FileText, ShieldCheck, Lock,
  TrendingUp, Database, ServerCrash, Sparkles, ArrowUpRight,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' as const } },
};

const SOURCE_LABELS: Record<string, string> = {
  worldbank: 'World Bank',
  eu_ted: 'EU TED',
};

const SOURCE_ACCENT: Record<string, { dot: string; badge: string; ring: string }> = {
  worldbank: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    ring: 'hover:border-emerald-400/60',
  },
  eu_ted: {
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    ring: 'hover:border-blue-400/60',
  },
  default: {
    dot: 'bg-muted-foreground',
    badge: 'bg-muted text-muted-foreground',
    ring: 'hover:border-border',
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
};

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
  return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const day = 86400000;
  if (diff < day) return 'today';
  if (diff < 2 * day) return 'yesterday';
  if (diff < 30 * day) return `${Math.floor(diff / day)} days ago`;
  return new Date(dateStr).toLocaleDateString();
}

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

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const params: Record<string, string> = { rows: '20' };
      if (search) params.search = search;
      if (sourceFilter && sourceFilter !== 'all') params.source = sourceFilter;
      const res = await api.get('/tenders/live', params);
      if (res.success) {
        setTenders(res.data as LiveTender[]);
        setSourceMeta(res.meta?.sources || []);
        setFallback(Boolean(res.meta?.fallback));
        if (Array.isArray(res.meta?.dataSources)) setDataSources(res.meta.dataSources);
      } else {
        toast.error(res.error || 'Failed to load live tenders');
      }
      setLoading(false);
      setRefreshing(false);
    },
    [search, sourceFilter],
  );

  useEffect(() => {
    const t = setTimeout(() => load(), 250); // debounce search
    return () => clearTimeout(t);
  }, [load]);

  const liveSourcesCount = useMemo(
    () => sourceMeta.filter((s) => s.live && s.ok).length,
    [sourceMeta],
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto view-enter">
      {/* ───────────────── Header ───────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Globe2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Global Live Tenders</h1>
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                LIVE
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Real-time procurement opportunities aggregated from international public APIs —
              World Bank, EU TED, and more. Information sourced live from external data feeds.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => load(true)}
          disabled={refreshing}
          className="gap-2 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh feed'}
        </Button>
      </motion.div>

      {/* ───────────────── Stat strip ───────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Live Tenders</span>
              <Database className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{tenders.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sources Online</span>
              <Radio className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{liveSourcesCount}/{sourceMeta.length || 2}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data Sources</span>
              <Globe2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{dataSources.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Feed Status</span>
              {fallback ? (
                <ServerCrash className="h-4 w-4 text-amber-500" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              )}
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">
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
              One or more upstream APIs are currently unreachable from this environment.
              The records below are representative samples drawn from the same sources.
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
                placeholder="Search live tenders — title, country, category…"
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
                <SelectItem value="worldbank">World Bank</SelectItem>
                <SelectItem value="eu_ted">EU TED</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Source status pills */}
          {sourceMeta.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
              <span className="text-xs font-medium text-muted-foreground mr-1">Feed status:</span>
              {sourceMeta.map((s) => {
                const accent = SOURCE_ACCENT[s.id] || SOURCE_ACCENT.default;
                return (
                  <span
                    key={s.id}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${accent.badge}`}
                    title={s.ok ? 'Connected' : 'Unavailable — using fallback'}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${s.ok ? accent.dot : 'bg-muted-foreground/40'}`} />
                    {s.name}
                    <span className="opacity-70">· {s.count}</span>
                  </span>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ───────────────── Tender cards ───────────────── */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-5 space-y-3">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-3 w-full bg-muted rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                <div className="flex gap-2 pt-2">
                  <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-24 bg-muted rounded animate-pulse" />
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
          className="grid gap-4 md:grid-cols-2"
        >
          <AnimatePresence mode="popLayout">
            {tenders.map((t) => {
              const accent = SOURCE_ACCENT[t.source] || SOURCE_ACCENT.default;
              const days = daysUntil(t.deadline);
              return (
                <motion.div key={t.id} variants={itemVariants} layout>
                  <Card className={`bg-card border-border transition-colors ${accent.ring} h-full`}>
                    <CardContent className="p-5 flex flex-col h-full">
                      {/* Source row */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${accent.badge}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />
                          {SOURCE_LABELS[t.source] || t.source}
                        </span>
                        {t.status === 'awarded' ? (
                          <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                            Contract Award
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                            Open Notice
                          </Badge>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-2">
                        {t.title}
                      </h3>

                      {/* Scope */}
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-3 flex-1">
                        {t.scope}
                      </p>

                      {/* Meta grid */}
                      <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <DollarSign className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-medium text-foreground">
                            {fmtMoney(t.budgetMax, t.currency)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{t.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span className={`px-1.5 py-0.5 rounded ${deadlineBadge(days)}`}>
                            {days <= 0 ? 'Closed' : `${days}d left`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{t.borrower || t.supplier || '—'}</span>
                        </div>
                      </div>

                      {/* Category tags */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {t.categoryTags
                          .split(',')
                          .filter(Boolean)
                          .slice(0, 3)
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

                      {/* Footer */}
                      <Separator className="my-3 bg-border" />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {t.signingDate
                            ? `Signed ${relativeTime(t.signingDate)}`
                            : `Published ${relativeTime(t.createdAt)}`}
                        </span>
                        <a
                          href={t.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          View source
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ───────────────── Data Sources panel (from the PDF) ───────────────── */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <Database className="h-4 w-4 text-emerald-500" />
          <h2 className="text-lg font-semibold text-foreground">Connected Data Sources</h2>
          <Badge variant="outline" className="text-xs border-border text-muted-foreground">
            {dataSources.filter((s) => s.live).length} live · {dataSources.length} total
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Tenets aggregates procurement opportunities from the following international data feeds.
          Sources marked <span className="font-medium text-emerald-600 dark:text-emerald-400">Live</span> are
          fetched in real time; others are listed for reference and can be enabled with the required credentials.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          {dataSources.map((s) => (
            <Card
              key={s.id}
              className="bg-card border-border hover:border-primary/40 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${s.live ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-muted'}`}>
                      {s.live ? (
                        <Radio className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-foreground text-sm">{s.name}</h4>
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${ACCENT_DOT[s.accent] || 'bg-muted-foreground'}`}
                          title={s.accent}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{s.coverage}</p>
                    </div>
                  </div>
                  {s.live ? (
                    <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 shrink-0">
                      Live
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-border text-muted-foreground shrink-0">
                      Reference
                    </Badge>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{s.access}</span>
                  </div>
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
                  >
                    Open
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Want more sources?</span>{' '}
            Enable UNGM, Apify, GovRider, Tenderwell, or SeeGeneBid by providing the required
            API credentials in your environment. Each adapter follows the same normalized{' '}
            <code className="px-1 py-0.5 rounded bg-muted text-foreground">LiveTender</code> shape,
            so new sources plug directly into this view.
          </p>
        </div>
      </div>
    </div>
  );
}
