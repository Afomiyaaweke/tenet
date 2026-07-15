'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users, Building2, FileSearch, Gavel, FolderKanban, FileText,
  Activity, TrendingUp, Clock, Shield, BarChart3, Eye,
  UserPlus, Calendar, ArrowUpRight, AlertCircle, RefreshCw,
  Monitor, Globe2, ChevronRight,
} from 'lucide-react';

interface AuditStats {
  overview: {
    totalUsers: number;
    totalCompanies: number;
    totalTenders: number;
    totalBids: number;
    totalProjects: number;
    totalDocuments: number;
    activeUsers24h: number;
    activeUsers7d: number;
  };
  activityTimeline: { date: string; count: number }[];
  userGrowth: { date: string; count: number }[];
  companyGrowth: { date: string; count: number }[];
  tendersByStatus: { status: string; count: number }[];
  bidsByStatus: { status: string; count: number }[];
  actionsByType: { action: string; count: number }[];
  topCompanies: {
    id: string;
    name: string;
    industry: string;
    verified: boolean;
    users: number;
    tenders: number;
    bids: number;
    createdAt: string;
  }[];
  recentActivity: {
    id: string;
    action: string;
    resource?: string;
    resourceId?: string;
    metadata?: string;
    ipAddress?: string;
    createdAt: string;
    user: { email: string; name: string } | null;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  awarded: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  pending_review: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  shortlisted: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  login: Users,
  register: UserPlus,
  tender_create: FileSearch,
  bid_submit: Gavel,
  project_create: FolderKanban,
  document_upload: FileText,
  profile_update: Activity,
  ai_analysis: BarChart3,
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function MiniBarChart({ data, color = '#F97316' }: { data: { date: string; count: number }[]; color?: string }) {
  if (!data.length) return <div className="text-xs text-muted-foreground">No data yet</div>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-[2px] h-16 w-full">
      {data.slice(-30).map((d, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all hover:opacity-80"
          style={{
            height: `${(d.count / max) * 100}%`,
            minHeight: d.count > 0 ? '3px' : '1px',
            backgroundColor: d.count > 0 ? color : 'hsl(var(--muted))',
          }}
          title={`${d.date}: ${d.count}`}
        />
      ))}
    </div>
  );
}

export function AuditView() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/audit/stats');
      if (res.success) {
        setStats(res.data);
      } else {
        setError(res.error || 'Failed to load audit data');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchStats();
  }, [fetchStats]);

  if (initialLoad || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading site analytics…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-orange-500" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => { setLoading(true); fetchStats(); }} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { overview, activityTimeline, userGrowth, companyGrowth, tendersByStatus, bidsByStatus, actionsByType, topCompanies, recentActivity } = stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-orange-500" /> Site Audit
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Platform engagement & activity overview — visible to owners only
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchStats(); }} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: overview.totalUsers, icon: Users, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20' },
          { label: 'Companies', value: overview.totalCompanies, icon: Building2, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800/50' },
          { label: 'Tenders', value: overview.totalTenders, icon: FileSearch, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20' },
          { label: 'Bids', value: overview.totalBids, icon: Gavel, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800/50' },
          { label: 'Projects', value: overview.totalProjects, icon: FolderKanban, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20' },
          { label: 'Documents', value: overview.totalDocuments, icon: FileText, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800/50' },
          { label: 'Active (24h)', value: overview.activeUsers24h, icon: Activity, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/20' },
          { label: 'Active (7d)', value: overview.activeUsers7d, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20' },
        ].map((card) => (
          <Card key={card.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{formatNumber(card.value)}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Activity Timeline */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" /> Activity (30d)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <MiniBarChart data={activityTimeline} color="#F97316" />
            <p className="text-[10px] text-muted-foreground mt-2">
              {activityTimeline.reduce((s, d) => s + d.count, 0)} events in last 30 days
            </p>
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-green-500" /> User Growth (30d)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <MiniBarChart data={userGrowth} color="#22C55E" />
            <p className="text-[10px] text-muted-foreground mt-2">
              {userGrowth.reduce((s, d) => s + d.count, 0)} new users in last 30 days
            </p>
          </CardContent>
        </Card>

        {/* Company Growth */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500" /> Company Growth (30d)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <MiniBarChart data={companyGrowth} color="#64748B" />
            <p className="text-[10px] text-muted-foreground mt-2">
              {companyGrowth.reduce((s, d) => s + d.count, 0)} new companies in last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Breakdowns */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Tender Status */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-orange-500" /> Tender Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {tendersByStatus.length > 0 ? tendersByStatus.map((t) => (
                <div key={t.status} className="flex items-center justify-between">
                  <Badge variant="outline" className={`text-[10px] font-medium ${STATUS_COLORS[t.status] || ''}`}>
                    {t.status.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-sm font-semibold text-foreground">{t.count}</span>
                </div>
              )) : <p className="text-xs text-muted-foreground">No tenders yet</p>}
            </div>
          </CardContent>
        </Card>

        {/* Bid Status */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gavel className="w-4 h-4 text-slate-500" /> Bid Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {bidsByStatus.length > 0 ? bidsByStatus.map((b) => (
                <div key={b.status} className="flex items-center justify-between">
                  <Badge variant="outline" className={`text-[10px] font-medium ${STATUS_COLORS[b.status] || ''}`}>
                    {b.status.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-sm font-semibold text-foreground">{b.count}</span>
                </div>
              )) : <p className="text-xs text-muted-foreground">No bids yet</p>}
            </div>
          </CardContent>
        </Card>

        {/* Action Types */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" /> Top Actions (30d)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {actionsByType.length > 0 ? actionsByType.slice(0, 8).map((a) => {
                const Icon = ACTION_ICONS[a.action] || Activity;
                return (
                  <div key={a.action} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-foreground">{a.action.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{a.count}</span>
                  </div>
                );
              }) : <p className="text-xs text-muted-foreground">No activity recorded yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Top Companies + Recent Activity */}
      <div className="grid md:grid-cols-5 gap-4">
        {/* Top Companies */}
        <Card className="md:col-span-2 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-500" /> Top Companies
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="max-h-72">
              <div className="space-y-2">
                {topCompanies.length > 0 ? topCompanies.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        {c.verified && <Shield className="w-3 h-3 text-green-500 flex-shrink-0" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{c.industry} · {c.users} users</p>
                    </div>
                    <div className="flex gap-2 text-[10px] text-muted-foreground flex-shrink-0">
                      <span>{c.tenders}T</span>
                      <span>{c.bids}B</span>
                    </div>
                  </div>
                )) : <p className="text-xs text-muted-foreground">No companies yet</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Activity Log */}
        <Card className="md:col-span-3 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="max-h-72">
              <div className="space-y-1">
                {recentActivity.length > 0 ? recentActivity.map((a) => {
                  const Icon = ACTION_ICONS[a.action] || Activity;
                  return (
                    <div key={a.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-7 h-7 rounded-md bg-muted/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-foreground">
                            {a.user?.name || 'System'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {a.action.replace(/_/g, ' ')}
                          </span>
                          {a.resource && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 py-0">
                              {a.resource}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{a.user?.email}</span>
                          {a.ipAddress && a.ipAddress !== 'unknown' && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Globe2 className="w-2.5 h-2.5" /> {a.ipAddress}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
                        {relativeTime(a.createdAt)}
                      </span>
                    </div>
                  );
                }) : (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Monitor className="w-8 h-8 text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">No activity recorded yet</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Activity will appear as users interact with the platform</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
