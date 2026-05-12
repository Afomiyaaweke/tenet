'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore, useNavStore, useDataStore } from '@/store';
import { api, Tender, Bid, Project, Notification } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer,
} from 'recharts';
import {
  FileSearch, Gavel, FolderKanban, DollarSign, Users, FileCheck,
  Shield, GraduationCap, Bell, CheckCircle, AlertCircle,
  Info, AlertTriangle, Lightbulb, ArrowRight, Clock,
  Calendar, TrendingUp, Sparkles, Plus, Search, Upload,
  MessageSquare, Eye, BarChart3, Target, Briefcase,
  Award, Zap, ChevronRight, Sun, Moon, Sunrise,
} from 'lucide-react';

// ─── Color Constants ────────────────────────────────────────────────
const CHART_COLORS = {
  emerald: '#10b981',
  amber: '#f59e0b',
  teal: '#14b8a6',
  rose: '#f43f5e',
  purple: '#8b5cf6',
};

// ─── Mock Monthly Data ──────────────────────────────────────────────
const MONTHLY_ACTIVITY = [
  { month: 'Oct', tenders: 3, bids: 8 },
  { month: 'Nov', tenders: 5, bids: 12 },
  { month: 'Dec', tenders: 2, bids: 6 },
  { month: 'Jan', tenders: 7, bids: 15 },
  { month: 'Feb', tenders: 4, bids: 10 },
  { month: 'Mar', tenders: 6, bids: 14 },
];

// ─── Chart Configs ──────────────────────────────────────────────────
const bidStatusChartConfig: ChartConfig = {
  awarded: { label: 'Awarded', color: CHART_COLORS.emerald },
  pending: { label: 'Pending', color: CHART_COLORS.amber },
  shortlisted: { label: 'Shortlisted', color: CHART_COLORS.teal },
  rejected: { label: 'Rejected', color: CHART_COLORS.rose },
};

const monthlyChartConfig: ChartConfig = {
  tenders: { label: 'Tenders Published', color: CHART_COLORS.emerald },
  bids: { label: 'Bids Submitted', color: CHART_COLORS.amber },
};

// ─── Notification Helpers ───────────────────────────────────────────
const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  success: CheckCircle,
  warning: AlertTriangle,
  alert: AlertCircle,
  info: Info,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  alert: 'text-rose-500',
  info: 'text-teal-500',
};

// ─── Time Greeting ──────────────────────────────────────────────────
function getGreeting(): { text: string; icon: React.ElementType } {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', icon: Sunrise };
  if (h < 17) return { text: 'Good afternoon', icon: Sun };
  return { text: 'Good evening', icon: Moon };
}

function formatETB(amount: number): string {
  if (amount >= 1_000_000) return `ETB ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `ETB ${(amount / 1_000).toFixed(0)}K`;
  return `ETB ${amount.toLocaleString()}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

// ─── Stat Card Component ────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  gradientClass,
  miniBars,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext: string;
  gradientClass: string;
  miniBars?: number[];
  onClick?: () => void;
}) {
  return (
    <Card
      className="cursor-pointer bg-white premium-shadow rounded-xl border-0 hover:-translate-y-1 transition-all duration-300 group"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`p-2.5 rounded-xl ${gradientClass}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          {miniBars && (
            <div className="flex items-end gap-0.5 h-8">
              {miniBars.map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full bg-emerald-200 group-hover:bg-emerald-300 transition-colors"
                  style={{ height: `${Math.max(h, 10)}%` }}
                />
              ))}
            </div>
          )}
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

// ─── Quick Action Button ────────────────────────────────────────────
function QuickAction({
  icon: Icon,
  label,
  description,
  gradientClass,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  gradientClass: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-white hover:bg-gray-50/80 premium-shadow transition-all duration-200 hover:-translate-y-0.5 text-left w-full"
    >
      <div className={`p-2 rounded-lg ${gradientClass} flex-shrink-0`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{label}</p>
        <p className="text-[11px] text-muted-foreground truncate">{description}</p>
      </div>
    </button>
  );
}

// ─── Deadline Color ─────────────────────────────────────────────────
function deadlineColor(days: number): string {
  if (days < 0) return 'text-gray-400';
  if (days <= 3) return 'text-rose-500';
  if (days <= 7) return 'text-amber-500';
  return 'text-emerald-500';
}

function deadlineBg(days: number): string {
  if (days < 0) return 'bg-gray-100';
  if (days <= 3) return 'bg-rose-50';
  if (days <= 7) return 'bg-amber-50';
  return 'bg-emerald-50';
}

// ─── Main Dashboard ─────────────────────────────────────────────────
export function DashboardView() {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const { notifications, fetchNotifications } = useDataStore();

  const [tenders, setTenders] = useState<Tender[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const role = user?.role || 'contractor';
  const greeting = getGreeting();
  const userName = user?.profile?.fullName || user?.email?.split('@')[0] || 'User';

  // ── Data Loading ──
  const loadDashboard = useCallback(async () => {
    const [tendersRes, bidsRes, projectsRes] = await Promise.all([
      api.get('/tenders'),
      api.get('/bids'),
      api.get('/projects'),
    ]);
    if (tendersRes.success) setTenders(tendersRes.data);
    if (bidsRes.success) setBids(bidsRes.data);
    if (projectsRes.success) setProjects(projectsRes.data);
  }, []);

  useEffect(() => {
    loadDashboard();
    fetchNotifications();
  }, [loadDashboard, fetchNotifications]);

  // ── Computed Stats ──
  const stats = useMemo(() => {
    const openTenders = tenders.filter(t => t.status === 'open');
    const closedTenders = tenders.filter(t => t.status === 'closed' || t.status === 'awarded');
    const activeBids = bids.filter(b => b.status === 'pending_review' || b.status === 'shortlisted');
    const pendingBids = bids.filter(b => b.status === 'pending_review');
    const shortlistedBids = bids.filter(b => b.status === 'shortlisted');
    const activeProjects = projects.filter(p => p.status === 'active');
    const totalContractValue = projects.reduce((sum, p) => sum + (p.contractValue || 0), 0);
    const completedTasks = projects.reduce((sum, p) => sum + (p.tasks?.filter(t => t.status === 'done').length || 0), 0);
    const totalTasks = projects.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
    const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      openTenders: openTenders.length,
      closedThisWeek: closedTenders.length,
      activeBids: activeBids.length,
      pendingBids: pendingBids.length,
      shortlistedBids: shortlistedBids.length,
      activeProjects: activeProjects.length,
      completionPct,
      totalContractValue,
      projectCount: projects.length,
    };
  }, [tenders, bids, projects]);

  // ── Bid Status Pie Data ──
  const bidStatusData = useMemo(() => {
    const awarded = bids.filter(b => b.status === 'awarded').length;
    const pending = bids.filter(b => b.status === 'pending_review').length;
    const shortlisted = bids.filter(b => b.status === 'shortlisted').length;
    const rejected = bids.filter(b => b.status === 'rejected').length;
    return [
      { name: 'awarded', value: awarded, fill: CHART_COLORS.emerald },
      { name: 'pending', value: pending, fill: CHART_COLORS.amber },
      { name: 'shortlisted', value: shortlisted, fill: CHART_COLORS.teal },
      { name: 'rejected', value: rejected, fill: CHART_COLORS.rose },
    ].filter(d => d.value > 0);
  }, [bids]);

  const totalBids = bids.length;

  // ── Top Tenders ──
  const topTenders = useMemo(() => {
    if (role === 'contractor') {
      return [...tenders]
        .filter(t => t.status === 'open')
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
        .slice(0, 5);
    }
    return [...tenders]
      .sort((a, b) => (b._count?.bids || 0) - (a._count?.bids || 0))
      .slice(0, 5);
  }, [tenders, role]);

  // ── Upcoming Deadlines ──
  const upcomingDeadlines = useMemo(() => {
    return tenders
      .filter(t => t.status === 'open' && new Date(t.deadline).getTime() > Date.now())
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5);
  }, [tenders]);

  // ── Activity Timeline Items ──
  const timelineItems = useMemo(() => {
    const items: Array<{
      id: string;
      icon: React.ElementType;
      iconColor: string;
      title: string;
      description: string;
      time: string;
    }> = [];

    // Recent notifications
    notifications.slice(0, 4).forEach(n => {
      const Icon = NOTIFICATION_ICONS[n.type] || Info;
      const color = NOTIFICATION_COLORS[n.type] || 'text-gray-500';
      items.push({
        id: n.id,
        icon: Icon,
        iconColor: color,
        title: n.title,
        description: n.message,
        time: n.createdAt,
      });
    });

    // Recent bids
    bids.slice(0, 3).forEach(b => {
      const statusMap: Record<string, { icon: React.ElementType; color: string }> = {
        pending_review: { icon: Clock, color: 'text-amber-500' },
        shortlisted: { icon: Award, color: 'text-teal-500' },
        awarded: { icon: CheckCircle, color: 'text-emerald-500' },
        rejected: { icon: AlertCircle, color: 'text-rose-500' },
      };
      const info = statusMap[b.status] || { icon: Info, color: 'text-gray-500' };
      items.push({
        id: `bid-${b.id}`,
        icon: info.icon,
        iconColor: info.color,
        title: `Bid ${b.status.replace('_', ' ')}`,
        description: b.tender?.title || 'Tender bid',
        time: b.createdAt,
      });
    });

    // Recent tender updates
    tenders.filter(t => t.status === 'open').slice(0, 2).forEach(t => {
      items.push({
        id: `tender-${t.id}`,
        icon: FileSearch,
        iconColor: 'text-emerald-500',
        title: 'Tender published',
        description: t.title,
        time: t.createdAt,
      });
    });

    // Sort by time descending and take top 8
    return items
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8);
  }, [notifications, bids, tenders]);

  // ── Mini bars for stat cards ──
  const tenderMiniBars = useMemo(() => {
    const last6 = MONTHLY_ACTIVITY.map(m => m.tenders);
    const max = Math.max(...last6, 1);
    return last6.map(v => Math.round((v / max) * 100));
  }, []);

  // ── CTA config per role ──
  const ctaConfig: Record<string, { label: string; view: string; icon: React.ElementType }> = {
    admin: { label: 'Create Tender', view: 'tenders', icon: Plus },
    contractor: { label: 'Browse Tenders', view: 'tenders', icon: Search },
    tender_owner: { label: 'Post a Tender', view: 'tenders', icon: Plus },
  };

  const cta = ctaConfig[role] || ctaConfig.contractor;

  // ── Quick actions per role ──
  const quickActions: Record<string, Array<{
    icon: React.ElementType; label: string; description: string; gradient: string; view: string;
  }>> = {
    contractor: [
      { icon: Search, label: 'Browse Tenders', description: 'Find matching opportunities', gradient: 'gradient-emerald', view: 'tenders' },
      { icon: Gavel, label: 'Submit Bid', description: 'Apply to open tenders', gradient: 'gradient-amber', view: 'tenders' },
      { icon: Upload, label: 'Upload Docs', description: 'Verify your credentials', gradient: 'gradient-teal', view: 'documents' },
      { icon: MessageSquare, label: 'AI Assistant', description: 'Get smart recommendations', gradient: 'gradient-rose', view: 'agent' },
    ],
    admin: [
      { icon: Plus, label: 'Create Tender', description: 'Publish new opportunities', gradient: 'gradient-emerald', view: 'tenders' },
      { icon: Eye, label: 'Review Bids', description: 'Evaluate submissions', gradient: 'gradient-amber', view: 'bids' },
      { icon: Shield, label: 'Verify Users', description: 'Manage verifications', gradient: 'gradient-teal', view: 'admin' },
      { icon: GraduationCap, label: 'Create Workshop', description: 'Plan training events', gradient: 'gradient-rose', view: 'events' },
    ],
    tender_owner: [
      { icon: Plus, label: 'Post Tender', description: 'Create new opportunity', gradient: 'gradient-emerald', view: 'tenders' },
      { icon: Eye, label: 'Review Bids', description: 'Evaluate submissions', gradient: 'gradient-amber', view: 'bids' },
      { icon: BarChart3, label: 'Track Projects', description: 'Monitor progress', gradient: 'gradient-teal', view: 'projects' },
      { icon: MessageSquare, label: 'AI Assistant', description: 'Get smart help', gradient: 'gradient-rose', view: 'agent' },
    ],
  };

  const actions = quickActions[role] || quickActions.contractor;

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto view-enter">
      {/* ── 1. Welcome Hero ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl gradient-emerald flex-shrink-0">
            {(() => {
              const GIcon = greeting.icon;
              return <GIcon className="h-6 w-6 text-white" />;
            })()}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {greeting.text}, <span className="text-gradient-emerald">{userName}</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {role === 'admin' && 'Manage your tender ecosystem and keep everything running smoothly.'}
              {role === 'contractor' && 'Discover opportunities, submit bids, and grow your business.'}
              {role === 'tender_owner' && 'Post tenders, review bids, and manage your projects.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{dateStr}</p>
            <p className="text-xs text-muted-foreground">
              {today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <Button
            className="gradient-emerald hover:opacity-90 text-white rounded-xl px-5 premium-shadow transition-all hover:-translate-y-0.5"
            onClick={() => setView(cta.view as 'tenders')}
          >
            <cta.icon className="h-4 w-4 mr-2" />
            {cta.label}
          </Button>
        </div>
      </div>

      {/* ── 2. Stats Cards Row ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileSearch}
          label="Open Tenders"
          value={stats.openTenders}
          subtext={`+${stats.closedThisWeek} closed this week`}
          gradientClass="gradient-emerald"
          miniBars={tenderMiniBars}
          onClick={() => setView('tenders')}
        />
        <StatCard
          icon={Gavel}
          label="Active Bids"
          value={stats.activeBids}
          subtext={`${stats.pendingBids} pending · ${stats.shortlistedBids} shortlisted`}
          gradientClass="gradient-amber"
          onClick={() => setView('bids')}
        />
        <StatCard
          icon={FolderKanban}
          label="Active Projects"
          value={stats.activeProjects}
          subtext={`${stats.completionPct}% average completion`}
          gradientClass="gradient-teal"
          onClick={() => setView('projects')}
        />
        <StatCard
          icon={DollarSign}
          label="Contract Value"
          value={formatETB(stats.totalContractValue)}
          subtext={`Across ${stats.projectCount} project${stats.projectCount !== 1 ? 's' : ''}`}
          gradientClass="gradient-rose"
          onClick={() => setView('projects')}
        />
      </div>

      {/* ── 3. Charts Row ───────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Bid Status Donut */}
        <Card className="premium-shadow rounded-xl border-0 bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              Bid Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bidStatusData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Gavel className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">No bid data yet</p>
              </div>
            ) : (
              <div className="relative">
                <ChartContainer config={bidStatusChartConfig} className="mx-auto aspect-square max-h-[240px]">
                  <PieChart>
                    <Pie
                      data={bidStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {bidStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-3xl font-bold">{totalBids}</p>
                  <p className="text-[11px] text-muted-foreground">Total Bids</p>
                </div>
                <ChartLegend content={<ChartLegendContent nameKey="name" />} className="mt-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Activity Bar Chart */}
        <Card className="premium-shadow rounded-xl border-0 bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-500" />
              Monthly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={monthlyChartConfig} className="aspect-[4/3] max-h-[280px]">
              <BarChart data={MONTHLY_ACTIVITY} barGap={4} barCategoryGap="20%">
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'oklch(0.5 0.01 265)' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 265)' }}
                  width={28}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="tenders" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="bids" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ChartContainer>
            <ChartLegend content={<ChartLegendContent />} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* ── 4. Timeline + Top Tenders ───────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <Card className="premium-shadow rounded-xl border-0 bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Recent Activity
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setView('dashboard')}>
                View all <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {timelineItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[340px]">
                <div className="relative pl-6">
                  {/* Vertical line */}
                  <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
                  <div className="space-y-4">
                    {timelineItems.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.id} className="relative flex items-start gap-3">
                          {/* Dot on line */}
                          <div className="absolute -left-6 top-0.5 flex items-center justify-center">
                            <div className="h-[18px] w-[18px] rounded-full bg-white border-2 border-border flex items-center justify-center z-10">
                              <Icon className={`h-2.5 w-2.5 ${item.iconColor}`} />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1 pb-1">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{timeAgo(item.time)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Top Tenders */}
        <Card className="premium-shadow rounded-xl border-0 bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-teal-500" />
                {role === 'contractor' ? 'Best Matches' : 'Top Tenders'}
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setView('tenders')}>
                View all <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {topTenders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FileSearch className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No tenders available</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[340px]">
                <div className="space-y-2.5">
                  {topTenders.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setView('tender-detail', { id: t.id })}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all duration-200 text-left group"
                    >
                      <div className="p-2 rounded-lg bg-emerald-50 flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                        <FileSearch className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          ETB {t.budgetMin.toLocaleString()} – {t.budgetMax.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {t.matchScore !== undefined && role === 'contractor' && (
                          <Badge
                            className={`text-[10px] px-1.5 py-0 ${
                              t.matchScore >= 70
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                : t.matchScore >= 40
                                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
                            } border-0`}
                          >
                            {t.matchScore}%
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 capitalize ${
                            t.status === 'open'
                              ? 'border-emerald-300 text-emerald-600'
                              : t.status === 'awarded'
                                ? 'border-teal-300 text-teal-600'
                                : 'border-gray-300 text-gray-500'
                          }`}
                        >
                          {t.status}
                        </Badge>
                        {t._count?.bids !== undefined && (
                          <span className="text-[10px] text-muted-foreground">
                            {t._count.bids} bid{t._count.bids !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 5. Quick Actions Grid ───────────────────────────────── */}
      <Card className="premium-shadow rounded-xl border-0 bg-white overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {actions.map((action) => (
              <QuickAction
                key={action.label}
                icon={action.icon}
                label={action.label}
                description={action.description}
                gradientClass={action.gradient}
                onClick={() => setView(action.view as 'tenders')}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 6. Upcoming Deadlines ───────────────────────────────── */}
      {upcomingDeadlines.length > 0 && (
        <Card className="premium-shadow rounded-xl border-0 bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-rose-500" />
                Upcoming Deadlines
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setView('tenders')}>
                View all <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[240px]">
              <div className="space-y-2">
                {upcomingDeadlines.map(t => {
                  const days = daysUntil(t.deadline);
                  return (
                    <button
                      key={t.id}
                      onClick={() => setView('tender-detail', { id: t.id })}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:bg-gray-50/80 transition-all duration-200 text-left group"
                    >
                      <div className={`p-2 rounded-lg flex-shrink-0 ${deadlineBg(days)}`}>
                        <Calendar className={`h-4 w-4 ${deadlineColor(days)}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Deadline: {new Date(t.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <Badge
                        className={`text-[10px] px-2 py-0.5 border-0 ${
                          days <= 3
                            ? 'bg-rose-100 text-rose-700 hover:bg-rose-100'
                            : days <= 7
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {days} day{days !== 1 ? 's' : ''} left
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
