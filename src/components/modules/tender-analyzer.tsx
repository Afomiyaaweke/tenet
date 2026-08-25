'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api, Tender, Bid } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { toast } from 'sonner';
import {
  FileSearch, ChartColumn, DollarSign, Clock, TrendingUp,
  Calendar, ArrowDownToLine, Loader2, AlertTriangle,
  CheckCircle2, XCircle, Ban, Gavel, Users, Target,
  Download, ChevronRight, Briefcase, Flame, Snowflake,
} from 'lucide-react';

// ─── Color Constants ────────────────────────────────────────────────
const CHART_COLORS = {
  emerald: '#10b981',
  amber: '#f59e0b',
  teal: '#14b8a6',
  rose: '#f43f5e',
  purple: '#8b5cf6',
  sky: '#0ea5e9',
  orange: '#f97316',
  lime: '#84cc16',
  pink: '#ec4899',
  indigo: '#6366f1',
  cyan: '#06b6d4',
  fuchsia: '#d946ef',
  yellow: '#eab308',
  red: '#ef4444',
  green: '#22c55e',
};

const CATEGORY_BAR_COLORS = [
  CHART_COLORS.emerald, CHART_COLORS.teal, CHART_COLORS.amber,
  CHART_COLORS.sky, CHART_COLORS.purple, CHART_COLORS.rose,
  CHART_COLORS.orange, CHART_COLORS.lime, CHART_COLORS.pink,
  CHART_COLORS.indigo, CHART_COLORS.cyan, CHART_COLORS.fuchsia,
  CHART_COLORS.yellow, CHART_COLORS.red, CHART_COLORS.green,
];

const BUDGET_COLORS: Record<string, string> = {
  '<500K': CHART_COLORS.emerald,
  '500K-1M': CHART_COLORS.teal,
  '1M-5M': CHART_COLORS.amber,
  '5M-10M': CHART_COLORS.orange,
  '>10M': CHART_COLORS.rose,
};

// ─── Chart Configs ──────────────────────────────────────────────────
const categoryChartConfig: ChartConfig = {
  count: { label: 'Tenders', color: CHART_COLORS.emerald },
};

const budgetChartConfig: ChartConfig = {
  count: { label: 'Tenders', color: CHART_COLORS.teal },
};

const timelineChartConfig: ChartConfig = {
  count: { label: 'Tenders', color: CHART_COLORS.amber },
};

// ─── Helpers ────────────────────────────────────────────────────────
function formatETB(amount: number): string {
  if (amount >= 1_000_000) return `ETB ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `ETB ${(amount / 1_000).toFixed(0)}K`;
  return `ETB ${amount.toLocaleString()}`;
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function getBudgetBucket(avgBudget: number): string {
  if (avgBudget < 500_000) return '<500K';
  if (avgBudget < 1_000_000) return '500K-1M';
  if (avgBudget < 5_000_000) return '1M-5M';
  if (avgBudget < 10_000_000) return '5M-10M';
  return '>10M';
}

// ─── Stat Card Component ────────────────────────────────────────────
function AnalyzerStatCard({
  icon: Icon,
  label,
  value,
  subtext,
  gradientClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext: string;
  gradientClass: string;
}) {
  return (
    <Card className="bg-white premium-shadow rounded-xl border-0 hover:-translate-y-1 transition-all duration-300 group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`p-2.5 rounded-xl ${gradientClass}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          <p className="text-sm font-medium text-muted-foreground mt-0.5">{label}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{subtext}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Timeline Urgency Card ─────────────────────────────────────────
function UrgencyItem({
  label,
  count,
  total,
  icon: Icon,
  colorClass,
  bgClass,
}: {
  label: string;
  count: number;
  total: number;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:bg-gray-50/80 transition-all duration-200">
      <div className={`p-2 rounded-lg flex-shrink-0 ${bgClass}`}>
        <Icon className={`h-4 w-4 ${colorClass}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{label}</p>
          <span className="text-sm font-bold">{count}</span>
        </div>
        <Progress value={pct} className="h-1.5 mt-1.5 bg-muted/50" />
        <p className="text-[10px] text-muted-foreground mt-0.5">{pct}% of open tenders</p>
      </div>
    </div>
  );
}

// ─── Competition Row ────────────────────────────────────────────────
function CompetitionRow({
  tender,
  maxBids,
  isHighest,
  isLowest,
  onClick,
}: {
  tender: Tender & { bidCount: number };
  maxBids: number;
  isHighest: boolean;
  isLowest: boolean;
  onClick: () => void;
}) {
  const pct = maxBids > 0 ? Math.round((tender.bidCount / maxBids) * 100) : 0;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all duration-200 text-left group"
    >
      <div className="p-2 rounded-lg bg-emerald-50 flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
        <Gavel className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{tender.title}</p>
          {isHighest && (
            <Badge className="text-[9px] px-1.5 py-0 border-0 bg-amber-100 text-amber-700 hover:bg-amber-100 shrink-0">
              <Flame className="h-2.5 w-2.5 mr-0.5" />Hot
            </Badge>
          )}
          {isLowest && (
            <Badge className="text-[9px] px-1.5 py-0 border-0 bg-sky-100 text-sky-700 hover:bg-sky-100 shrink-0">
              <Snowflake className="h-2.5 w-2.5 mr-0.5" />Low
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={pct} className="h-1.5 flex-1 bg-muted/50" />
          <span className="text-[10px] font-semibold text-muted-foreground shrink-0">{tender.bidCount} bid{tender.bidCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-emerald-500 transition-colors shrink-0" />
    </button>
  );
}

// ─── Skeleton Loader ────────────────────────────────────────────────
function AnalyzerSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto view-enter">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-48 rounded-xl" />
        </div>
      </div>
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="premium-shadow rounded-xl border-0 bg-white">
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-8 w-16 rounded-xl" />
              <Skeleton className="h-3 w-24 rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="grid md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="premium-shadow rounded-xl border-0 bg-white">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-40 rounded-xl" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[280px] w-full rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* More rows skeleton */}
      <div className="grid md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="premium-shadow rounded-xl border-0 bg-white">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-36 rounded-xl" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-14 w-full rounded-xl" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export function TenderAnalyzerView() {
  const { user } = useAuthStore();
  const { setView } = useNavStore();

  const [tenders, setTenders] = useState<Tender[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // ── Data Loading ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tendersRes, bidsRes] = await Promise.all([
        api.get('/tenders', { limit: '100' }),
        api.get('/bids'),
      ]);
      if (tendersRes.success) setTenders(tendersRes.data);
      if (bidsRes.success) setBids(bidsRes.data);
    } catch {
      toast.error('Failed to load analyzer data');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Computed Stats ──
  const stats = useMemo(() => {
    const total = tenders.length;
    const open = tenders.filter(t => t.status === 'open').length;
    const closed = tenders.filter(t => t.status === 'closed').length;
    const awarded = tenders.filter(t => t.status === 'awarded').length;
    const cancelled = tenders.filter(t => t.status === 'cancelled').length;

    const avgBudgetMin = total > 0 ? tenders.reduce((s, t) => s + t.budgetMin, 0) / total : 0;
    const avgBudgetMax = total > 0 ? tenders.reduce((s, t) => s + t.budgetMax, 0) / total : 0;

    const totalBidVolume = bids.length;

    return { total, open, closed, awarded, cancelled, avgBudgetMin, avgBudgetMax, totalBidVolume };
  }, [tenders, bids]);

  // ── Category Distribution Data ──
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    tenders.forEach(t => {
      if (!t.categoryTags) return;
      t.categoryTags.split(',').map(c => c.trim()).filter(Boolean).forEach(cat => {
        catMap[cat] = (catMap[cat] || 0) + 1;
      });
    });
    return Object.entries(catMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [tenders]);

  // ── Budget Distribution Data ──
  const budgetData = useMemo(() => {
    const buckets: Record<string, number> = {
      '<500K': 0,
      '500K-1M': 0,
      '1M-5M': 0,
      '5M-10M': 0,
      '>10M': 0,
    };
    tenders.forEach(t => {
      const avg = (t.budgetMin + t.budgetMax) / 2;
      const bucket = getBudgetBucket(avg);
      buckets[bucket]++;
    });
    const order = ['<500K', '500K-1M', '1M-5M', '5M-10M', '>10M'];
    return order.map(name => ({
      name,
      count: buckets[name],
      fill: BUDGET_COLORS[name],
    }));
  }, [tenders]);

  // ── Timeline Urgency Data ──
  const timelineData = useMemo(() => {
    const openTenders = tenders.filter(t => t.status === 'open');
    const now = Date.now();

    const within7 = openTenders.filter(t => {
      const d = daysUntil(t.deadline);
      return d >= 0 && d <= 7;
    }).length;

    const within14 = openTenders.filter(t => {
      const d = daysUntil(t.deadline);
      return d > 7 && d <= 14;
    }).length;

    const within30 = openTenders.filter(t => {
      const d = daysUntil(t.deadline);
      return d > 14 && d <= 30;
    }).length;

    const beyond30 = openTenders.filter(t => {
      const d = daysUntil(t.deadline);
      return d > 30;
    }).length;

    const overdue = openTenders.filter(t => new Date(t.deadline).getTime() < now).length;

    return {
      within7, within14, within30, beyond30, overdue,
      totalOpen: openTenders.length,
      chartData: [
        { name: '≤ 7 days', count: within7, fill: CHART_COLORS.rose },
        { name: '8-14 days', count: within14, fill: CHART_COLORS.amber },
        { name: '15-30 days', count: within30, fill: CHART_COLORS.teal },
        { name: '30+ days', count: beyond30, fill: CHART_COLORS.emerald },
      ],
    };
  }, [tenders]);

  // ── Bid Competition Data ──
  const competitionData = useMemo(() => {
    const tendersWithBids = tenders
      .map(t => ({
        ...t,
        bidCount: t._count?.bids ?? 0,
      }))
      .filter(t => t.bidCount > 0)
      .sort((a, b) => b.bidCount - a.bidCount);

    const maxBids = tendersWithBids.length > 0 ? tendersWithBids[0].bidCount : 0;

    return { tendersWithBids, maxBids };
  }, [tenders]);

  // ── XLSX Export ──
  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('tenet_token');
      const params = new URLSearchParams();
      if (user?.role === 'team_admin') params.set('ownerOnly', 'true');
      const res = await fetch(`/api/tenders/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tenet-tenders-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Excel report downloaded successfully!');
      } else {
        toast.error('Failed to export report');
      }
    } catch {
      toast.error('Export failed');
    }
    setExporting(false);
  };

  // ── Loading State ──
  if (loading) {
    return <AnalyzerSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto view-enter">
      {/* ── 1. Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl gradient-emerald flex-shrink-0">
            <ChartColumn className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-gradient-emerald">Tender</span> Analyzer
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">Insights, trends & competitive intelligence</p>
          </div>
        </div>
        <Button
          className="gradient-emerald hover:opacity-90 text-white rounded-xl px-5 premium-shadow transition-all hover:-translate-y-0.5"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {exporting ? 'Exporting...' : 'Export XLSX'}
        </Button>
      </div>

      {/* ── 2. Stats Cards Row ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <AnalyzerStatCard
          icon={FileSearch}
          label="Total Tenders"
          value={stats.total}
          subtext="All time"
          gradientClass="gradient-emerald"
        />
        <AnalyzerStatCard
          icon={CheckCircle2}
          label="Open"
          value={stats.open}
          subtext={`${stats.total > 0 ? Math.round((stats.open / stats.total) * 100) : 0}% of total`}
          gradientClass="gradient-teal"
        />
        <AnalyzerStatCard
          icon={XCircle}
          label="Closed"
          value={stats.closed}
          subtext="Submission ended"
          gradientClass="gradient-amber"
        />
        <AnalyzerStatCard
          icon={Target}
          label="Awarded"
          value={stats.awarded}
          subtext="Contract assigned"
          gradientClass="gradient-rose"
        />
        <AnalyzerStatCard
          icon={Ban}
          label="Cancelled"
          value={stats.cancelled}
          subtext="Withdrawn"
          gradientClass="bg-gradient-to-br from-gray-400 to-gray-500"
        />
      </div>

      {/* ── 3. Avg Budget + Total Bids Summary Cards ───────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="premium-shadow rounded-xl border-0 bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl gradient-emerald flex-shrink-0">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Average Budget Range</p>
              <p className="text-xl font-bold mt-0.5">
                {formatETB(stats.avgBudgetMin)} – {formatETB(stats.avgBudgetMax)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="premium-shadow rounded-xl border-0 bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl gradient-amber flex-shrink-0">
              <Gavel className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Bid Volume</p>
              <p className="text-xl font-bold mt-0.5">
                {stats.totalBidVolume} bid{stats.totalBidVolume !== 1 ? 's' : ''} across {stats.total} tender{stats.total !== 1 ? 's' : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 4. Category Distribution + Budget Analysis ──────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card className="premium-shadow rounded-xl border-0 bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-emerald-500" />
              Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <ChartColumn className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">No category data available</p>
              </div>
            ) : (
              <ChartContainer config={categoryChartConfig} className="aspect-[4/3] max-h-[320px]">
                <BarChart data={categoryData} barGap={4} barCategoryGap="20%" layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0.925 0.005 265)" />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 265)' }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 265)' }}
                    width={90}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {categoryData.map((_, index) => (
                      <Cell key={`cat-cell-${index}`} fill={CATEGORY_BAR_COLORS[index % CATEGORY_BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Budget Analysis */}
        <Card className="premium-shadow rounded-xl border-0 bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-teal-500" />
              Budget Distribution (ETB)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.total === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <DollarSign className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">No budget data available</p>
              </div>
            ) : (
              <ChartContainer config={budgetChartConfig} className="aspect-[4/3] max-h-[320px]">
                <BarChart data={budgetData} barGap={4} barCategoryGap="20%" layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0.925 0.005 265)" />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 265)' }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 265)' }}
                    width={80}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {budgetData.map((entry, index) => (
                      <Cell key={`budget-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 5. Timeline Analysis + Bid Competition ──────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Timeline / Deadline Urgency */}
        <Card className="premium-shadow rounded-xl border-0 bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Deadline Urgency
              </CardTitle>
              <Badge className="text-[10px] px-2 py-0.5 border-0 bg-amber-100 text-amber-700 hover:bg-amber-100">
                {timelineData.overdue > 0 ? `${timelineData.overdue} overdue` : `${timelineData.totalOpen} open`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Mini bar chart */}
            {timelineData.totalOpen === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Clock className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">No open tenders with deadlines</p>
              </div>
            ) : (
              <>
                <ChartContainer config={timelineChartConfig} className="aspect-[2/1] max-h-[160px] mb-4">
                  <BarChart data={timelineData.chartData} barGap={8} barCategoryGap="24%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.925 0.005 265)" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'oklch(0.5 0.01 265)' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'oklch(0.5 0.01 265)' }}
                      allowDecimals={false}
                      width={20}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {timelineData.chartData.map((entry, index) => (
                        <Cell key={`tl-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
                <div className="space-y-2">
                  <UrgencyItem
                    label="Closing within 7 days"
                    count={timelineData.within7}
                    total={timelineData.totalOpen}
                    icon={AlertTriangle}
                    colorClass="text-rose-500"
                    bgClass="bg-rose-50"
                  />
                  <UrgencyItem
                    label="Closing within 14 days"
                    count={timelineData.within14}
                    total={timelineData.totalOpen}
                    icon={Clock}
                    colorClass="text-amber-500"
                    bgClass="bg-amber-50"
                  />
                  <UrgencyItem
                    label="Closing within 30 days"
                    count={timelineData.within30}
                    total={timelineData.totalOpen}
                    icon={Calendar}
                    colorClass="text-teal-500"
                    bgClass="bg-teal-50"
                  />
                  <UrgencyItem
                    label="30+ days remaining"
                    count={timelineData.beyond30}
                    total={timelineData.totalOpen}
                    icon={TrendingUp}
                    colorClass="text-emerald-500"
                    bgClass="bg-emerald-50"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Bid Competition Analysis */}
        <Card className="premium-shadow rounded-xl border-0 bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-teal-500" />
                Bid Competition
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setView('bids')}
              >
                View all <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {competitionData.tendersWithBids.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Gavel className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">No bids submitted yet</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {competitionData.tendersWithBids.slice(0, 10).map((tender, idx) => (
                    <CompetitionRow
                      key={tender.id}
                      tender={tender}
                      maxBids={competitionData.maxBids}
                      isHighest={idx === 0}
                      isLowest={idx === competitionData.tendersWithBids.length - 1 && competitionData.tendersWithBids.length > 1}
                      onClick={() => setView('tender-detail', { id: tender.id })}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
            {/* Competition summary */}
            {competitionData.tendersWithBids.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border/40">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-emerald-600">{competitionData.maxBids}</p>
                    <p className="text-[10px] text-muted-foreground">Highest Bids</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-600">
                      {competitionData.tendersWithBids.length > 0
                        ? (competitionData.tendersWithBids.reduce((s, t) => s + t.bidCount, 0) / competitionData.tendersWithBids.length).toFixed(1)
                        : 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Avg Bids</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-teal-600">
                      {competitionData.tendersWithBids[competitionData.tendersWithBids.length - 1]?.bidCount ?? 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Lowest Bids</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 6. Tender Status Overview (full width) ──────────────── */}
      {stats.total > 0 && (
        <Card className="premium-shadow rounded-xl border-0 bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ChartColumn className="h-4 w-4 text-emerald-500" />
              Tender Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: 'Open', count: stats.open, color: 'bg-emerald-500', bgLight: 'bg-emerald-50', textColor: 'text-emerald-600' },
                { label: 'Closed', count: stats.closed, color: 'bg-rose-500', bgLight: 'bg-rose-50', textColor: 'text-rose-600' },
                { label: 'Awarded', count: stats.awarded, color: 'bg-teal-500', bgLight: 'bg-teal-50', textColor: 'text-teal-600' },
                { label: 'Cancelled', count: stats.cancelled, color: 'bg-gray-400', bgLight: 'bg-gray-50', textColor: 'text-gray-500' },
                { label: 'Draft', count: tenders.filter(t => t.status === 'draft').length, color: 'bg-amber-500', bgLight: 'bg-amber-50', textColor: 'text-amber-600' },
              ].map(item => {
                const pct = stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;
                return (
                  <div key={item.label} className={`${item.bgLight} rounded-xl p-4 text-center`}>
                    <p className={`text-2xl font-bold ${item.textColor}`}>{item.count}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-1">{item.label}</p>
                    <div className="mt-2 mx-auto w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
                      <div className={`${item.color} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
