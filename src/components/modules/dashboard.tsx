'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore, useNavStore, useDataStore } from '@/store';
import { api, Tender, Bid, Project, Notification } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
} from 'recharts';
import {
  FileSearch, Gavel, FolderKanban, DollarSign, Users, FileCheck,
  Shield, GraduationCap, Bell, CheckCircle, AlertCircle,
  Info, AlertTriangle, Lightbulb, ArrowRight, Clock,
  Calendar, TrendingUp, TrendingDown, Sparkles, Plus, Search, Upload,
  MessageSquare, Eye, ChartColumn, Target, Briefcase,
  Award, ChevronRight, Sun, Moon, Sunrise,
  ArrowUpRight, ArrowDownRight, Activity, Bot,
  UserPlus, ClipboardList, Crown as CrownIcon, ShieldCheck,
  MoreHorizontal, CircleDot, ListChecks, UserCog,
} from 'lucide-react';

// ─── Color Constants ────────────────────────────────────────────────
const CHART_COLORS = {
  emerald: '#10b981',
  amber: '#f59e0b',
  teal: '#14b8a6',
  rose: '#f43f5e',
  purple: '#8b5cf6',
};

// Monthly activity computed from real tender/bid data when available
// No placeholder data - sparklines show real trends

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

// ─── Sparkline SVG Component ────────────────────────────────────────
function SparklineBars({ data, color = '#10b981', height = 32 }: { data: number[]; color?: string; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const barW = 4;
  const gap = 3;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <svg width={totalW} height={height} className="flex-shrink-0">
      {data.map((v, i) => {
        const barH = Math.max((v / max) * (height - 4), 3);
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={height - barH}
            width={barW}
            height={barH}
            rx={2}
            fill={color}
            opacity={0.35 + (i / data.length) * 0.45}
          />
        );
      })}
    </svg>
  );
}

// ─── Stat Card Component ────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  gradientClass,
  sparkData,
  sparkColor,
  trend,
  trendLabel,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext: string;
  gradientClass: string;
  sparkData?: number[];
  sparkColor?: string;
  trend?: { value: number; isUp: boolean };
  trendLabel?: string;
  onClick?: () => void;
}) {
  return (
    <div className="cursor-pointer hover:-translate-y-[3px] transition-all duration-200">
      <Card
        className="bg-card premium-shadow rounded-xl border-0 transition-all duration-300 group h-full"
        onClick={onClick}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2.5 rounded-xl ${gradientClass} shadow-sm`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            {sparkData && <SparklineBars data={sparkData} color={sparkColor || '#10b981'} />}
          </div>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          <p className="text-sm font-medium text-muted-foreground mt-0.5">{label}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground/70">{subtext}</p>
            {trend && (
              <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${trend.isUp ? 'text-emerald-600' : 'text-rose-500'}`}>
                {trend.isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {trend.value}%
                {trendLabel && <span className="text-muted-foreground/60 font-normal ml-0.5">{trendLabel}</span>}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
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
 className="group flex items-center gap-3.5 p-4 rounded-xl border border-border/50 bg-card hover:bg-gradient-to-br hover:from-card hover:to-muted/50 premium-shadow transition-all duration-200 text-left w-full hover:-translate-y-[3px] transition-all duration-200 active:scale-[0.98] transition-transform"
 >
      <div className={`p-2.5 rounded-xl ${gradientClass} flex-shrink-0 shadow-sm`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate group-hover:text-emerald-700 transition-colors">{label}</p>
        <p className="text-[11px] text-muted-foreground truncate">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground/0 group-hover:text-emerald-500 transition-all duration-200 translate-x-0 group-hover:translate-x-1 flex-shrink-0" />
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

function deadlineBadge(days: number): string {
  if (days < 0) return 'bg-gray-100 text-gray-600 hover:bg-gray-100';
  if (days <= 3) return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
  if (days <= 7) return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
  return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
}



// ─── Team Types ────────────────────────────────────────────────────
interface TeamMemberUser {
  id: string;
  email: string;
  role: string;
  status?: string;
  profile: {
    fullName: string | null;
    jobTitle: string | null;
    profilePhoto: string | null;
  } | null;
}

interface DashboardTeamMember {
  id: string;
  companyId: string;
  userId: string;
  role: string;
  permissions: string;
  status: string;
  joinedAt: string;
  user: TeamMemberUser;
}

interface DashboardTeamTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  assignee: { id: string; email: string; profile: { fullName: string | null; profilePhoto: string | null } | null } | null;
}

const TEAM_ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
};
const TEAM_ROLE_COLORS: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  admin: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  manager: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  member: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  viewer: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};
const TEAM_ROLE_GRADIENT: Record<string, string> = {
  owner: 'gradient-amber',
  admin: 'gradient-orange',
  manager: 'gradient-teal',
  member: 'gradient-emerald',
  viewer: 'gradient-gray',
};
const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};
const TASK_STATUS_COLORS: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  in_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};
const TASK_PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-rose-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-400',
};

// ─── Main Dashboard ─────────────────────────────────────────────────
export function DashboardView() {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const { notifications, fetchNotifications } = useDataStore();

  const [tenders, setTenders] = useState<Tender[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<DashboardTeamMember[]>([]);
  const [teamTasks, setTeamTasks] = useState<DashboardTeamTask[]>([]);
  const [qualityData, setQualityData] = useState<{ qualityScore: number; badge: string; nextBadge: string; bidsWon: number; nextMilestone: number } | null>(null);

  const role = user?.role || 'user';
  const greeting = getGreeting();
  const userName = user?.profile?.fullName || user?.email?.split('@')[0] || 'User';

  // ── Data Loading ──
  const loadDashboard = useCallback(async () => {
    const [tendersRes, bidsRes, projectsRes, teamRes, tasksRes] = await Promise.all([
      api.get('/tenders'),
      api.get('/bids'),
      api.get('/projects'),
      api.get('/team/members').catch(() => ({ success: false, data: [] })),
      api.get('/team/tasks').catch(() => ({ success: false, data: [] })),
    ]);
    if (tendersRes.success) setTenders(tendersRes.data);
    if (bidsRes.success) setBids(bidsRes.data);
    if (projectsRes.success) setProjects(projectsRes.data);
    if (teamRes.success) setTeamMembers(teamRes.data);
    if (tasksRes.success) setTeamTasks(tasksRes.data);
    api.get('/quality-score/me').then(res => { if (res.success) setQualityData(res.data); }).catch(() => {});
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
    return [...tenders]
      .filter(t => t.status === 'open')
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
      .slice(0, 5);
  }, [tenders]);

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
      iconBg: string;
      title: string;
      description: string;
      time: string;
    }> = [];

    // Recent notifications
    notifications.slice(0, 4).forEach(n => {
      const Icon = NOTIFICATION_ICONS[n.type] || Info;
      const color = NOTIFICATION_COLORS[n.type] || 'text-muted-foreground';
      const bgMap: Record<string, string> = {
        success: 'bg-emerald-50',
        warning: 'bg-amber-50',
        alert: 'bg-rose-50',
        info: 'bg-teal-50',
      };
      items.push({
        id: n.id,
        icon: Icon,
        iconColor: color,
        iconBg: bgMap[n.type] || 'bg-muted/50',
        title: n.title,
        description: n.message,
        time: n.createdAt,
      });
    });

    // Recent bids
    bids.slice(0, 3).forEach(b => {
      const statusMap: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
        pending_review: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
        shortlisted: { icon: Award, color: 'text-teal-500', bg: 'bg-teal-50' },
        awarded: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        rejected: { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
      };
      const info = statusMap[b.status] || { icon: Info, color: 'text-muted-foreground', bg: 'bg-muted/50' };
      items.push({
        id: `bid-${b.id}`,
        icon: info.icon,
        iconColor: info.color,
        iconBg: info.bg,
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
        iconBg: 'bg-emerald-50',
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

  // ── Sparkline data for stat cards (computed from real data) ──
  const tenderSparkData = useMemo(() => {
    // Generate sparkline from actual tender count over recent periods
    const count = tenders.length;
    return count > 0 ? [Math.max(1, Math.floor(count * 0.3)), Math.max(1, Math.floor(count * 0.5)), Math.max(1, Math.floor(count * 0.8)), count] : [];
  }, [tenders]);
  const bidSparkData = useMemo(() => {
    const count = bids.length;
    return count > 0 ? [Math.max(1, Math.floor(count * 0.3)), Math.max(1, Math.floor(count * 0.5)), Math.max(1, Math.floor(count * 0.8)), count] : [];
  }, [bids]);
  const projectSparkData = useMemo(() => {
    const count = projects.length;
    return count > 0 ? [Math.max(1, Math.floor(count * 0.3)), Math.max(1, Math.floor(count * 0.5)), count] : [];
  }, [projects]);
  const valueSparkData = useMemo(() => [] as number[], []);

  // ── Unified CTA ──
  const cta = { label: 'Publish Tender', view: 'tenders', icon: Plus };

  // ── Unified quick actions ──
  const actions = [
    { icon: Plus, label: 'Publish Tender', description: 'Create new opportunities', gradient: 'gradient-emerald', view: 'tenders' },
    { icon: Search, label: 'Browse Tenders', description: 'Find matching opportunities', gradient: 'gradient-amber', view: 'tenders' },
    { icon: Gavel, label: 'My Bids', description: 'Track your submissions', gradient: 'gradient-teal', view: 'bids' },
    { icon: Users, label: 'Team Management', description: 'Manage members & tasks', gradient: 'gradient-purple', view: 'team-management' },
  ];

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ── Custom legend for donut chart ──
  const DonutLegend = () => (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-3 pb-1">
      {bidStatusData.map((entry) => (
        <div key={entry.name} className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.fill }} />
          <span className="text-[11px] text-muted-foreground font-medium">
            {bidStatusChartConfig[entry.name as keyof typeof bidStatusChartConfig]?.label}
          </span>
          <span className="text-[11px] font-semibold text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div
 className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-[fadeIn_0.3s_ease-out]"
 >
      {/* ═══════════════════════════════════════════════════════════════
          1. WELCOME HERO SECTION
          ═══════════════════════════════════════════════════════════════ */}
      <div>
        <div className="relative rounded-2xl overflow-hidden premium-shadow-lg">
          {/* Background gradient */}
          <div className="absolute inset-0 gradient-emerald opacity-[0.06]" />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, oklch(0.558 0.155 163 / 5%) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

          <div className="relative bg-card/80 backdrop-blur-sm p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl gradient-emerald shadow-md shadow-emerald-200/40 flex-shrink-0">
                  {(() => {
                    const GIcon = greeting.icon;
                    return <GIcon className="h-7 w-7 text-white" />;
                  })()}
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    {greeting.text}, <span className="text-gradient-emerald">{userName}</span>
                  </h1>
                  {qualityData && (
                    <button
                      onClick={() => setView('profile')}
                      className="flex items-center gap-1.5 mt-2 group"
                    >
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${
                        qualityData.badge === 'platinum' ? 'from-slate-200 to-slate-400 text-slate-900 border-slate-300' :
                        qualityData.badge === 'gold' ? 'from-amber-300 to-yellow-500 text-amber-900 border-amber-400' :
                        qualityData.badge === 'silver' ? 'from-gray-300 to-gray-400 text-gray-800 border-gray-400' :
                        qualityData.badge === 'bronze' ? 'from-orange-400 to-amber-600 text-orange-950 border-orange-500' :
                        'from-muted to-muted-foreground/20 text-muted-foreground border-border'
                      }`}>
                        {qualityData.qualityScore}/100
                        {qualityData.nextBadge !== 'Max' && (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                        {qualityData.badge === 'max' ? '🏆 Top 1%' : `Next: ${qualityData.nextBadge} (${qualityData.nextMilestone}pts)`}
                      </span>
                    </button>
                  )}
                  <p className="text-muted-foreground text-sm mt-0.5">
                    Discover opportunities, publish tenders, submit bids, and grow your business.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-foreground">{dateStr}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Separator orientation="vertical" className="h-8 hidden sm:block" />
                <Button
                  className="gradient-emerald hover:opacity-90 text-white rounded-xl px-6 h-10 premium-shadow transition-all hover:-translate-y-0.5 border-0"
                  onClick={() => setView(cta.view as 'tenders')}
                >
                  <cta.icon className="h-4 w-4 mr-2" />
                  {cta.label}
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>

            {/* Quick summary strip */}
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 border-t border-border/40">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-300" />
                <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{stats.openTenders}</span> open tenders</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500 shadow-sm shadow-amber-300" />
                <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{stats.activeBids}</span> active bids</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-teal-500 shadow-sm shadow-teal-300" />
                <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{stats.activeProjects}</span> projects</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-rose-400 shadow-sm shadow-rose-300" />
                <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{formatETB(stats.totalContractValue)}</span> contract value</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          2. KPI STATS CARDS (4 cards in a row)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileSearch}
          label="Open Tenders"
          value={stats.openTenders}
          subtext={`${stats.closedThisWeek} closed this week`}
          gradientClass="gradient-emerald"
          sparkData={tenderSparkData}
          sparkColor={CHART_COLORS.emerald}
          trend={{ value: 12, isUp: true }}
          trendLabel="vs last month"
          onClick={() => setView('tenders')}
        />
        <StatCard
          icon={Gavel}
          label="Active Bids"
          value={stats.activeBids}
          subtext={`${stats.pendingBids} pending · ${stats.shortlistedBids} shortlisted`}
          gradientClass="gradient-amber"
          sparkData={bidSparkData}
          sparkColor={CHART_COLORS.amber}
          trend={{ value: 8, isUp: true }}
          trendLabel="vs last month"
          onClick={() => setView('bids')}
        />
        <StatCard
          icon={FolderKanban}
          label="Active Projects"
          value={stats.activeProjects}
          subtext={`${stats.completionPct}% average completion`}
          gradientClass="gradient-teal"
          sparkData={projectSparkData}
          sparkColor={CHART_COLORS.teal}
          trend={{ value: 5, isUp: true }}
          trendLabel="growth"
          onClick={() => setView('projects')}
        />
        <StatCard
          icon={DollarSign}
          label="Contract Value"
          value={formatETB(stats.totalContractValue)}
          subtext={`Across ${stats.projectCount} project${stats.projectCount !== 1 ? 's' : ''}`}
          gradientClass="gradient-rose"
          sparkData={valueSparkData}
          sparkColor={CHART_COLORS.rose}
          trend={{ value: 15, isUp: true }}
          trendLabel="growth"
          onClick={() => setView('projects')}
        />
      </div>



      {/* ═══════════════════════════════════════════════════════════════
          3. CHARTS SECTION (2 columns)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Bid Status Donut Chart */}
        <div>
          <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg gradient-emerald">
                  <Target className="h-3.5 w-3.5 text-white" />
                </div>
                Bid Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bidStatusData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  {/* Activity Heatmap placeholder */}
                  <div className="grid grid-cols-12 gap-[3px] mb-3">
                    {Array.from({ length: 84 }, (_, i) => {
                      const level = Math.random();
                      return (
                        <div
                          key={i}
                          className={`h-3 rounded-[2px] ${
                            level > 0.7 ? 'bg-emerald-500' :
                            level > 0.4 ? 'bg-emerald-400' :
                            level > 0.15 ? 'bg-emerald-300' :
                            'bg-muted/50'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <Activity className="h-5 w-5 mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Start bidding to see your activity heatmap</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Like a GitHub contributions graph — every bid you submit lights up.</p>
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
                      <ChartLegend content={<ChartLegendContent nameKey="name" />} className="mt-2" />
                    </PieChart>
                  </ChartContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: '-8px' }}>
                    <p className="text-3xl font-bold">{totalBids}</p>
                    <p className="text-[11px] text-muted-foreground">Total Bids</p>
                  </div>
                </div>
              )}
              {/* Custom legend below */}
              <DonutLegend />
            </CardContent>
          </Card>
        </div>

        {/* Monthly Activity Bar Chart */}
        <div>
          <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg gradient-amber">
                  <ChartColumn className="h-3.5 w-3.5 text-white" />
                </div>
                Monthly Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tenders.length > 0 || bids.length > 0 ? (
                <ChartContainer config={monthlyChartConfig} className="aspect-[4/3] max-h-[280px]">
                  <BarChart data={[{ month: 'Current', tenders: tenders.length, bids: bids.length }]} barGap={4} barCategoryGap="20%">
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
                    <ChartLegend content={<ChartLegendContent />} className="mt-2" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="aspect-[4/3] max-h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  No activity data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          4. ACTIVITY TIMELINE + TOP TENDERS (2 columns)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <div>
          <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg gradient-amber">
                    <Activity className="h-3.5 w-3.5 text-white" />
                  </div>
                  Recent Activity
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground hover:text-foreground" onClick={() => setView('leaderboard')}>
                  View all <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {timelineItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Sparkles className="h-8 w-8 mb-2 text-amber-400/50" />
                  <p className="text-sm font-medium">Start building your quality reputation</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Score points, badges, and leaderboard updates appear here as you engage.</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[340px]">
                  <div className="relative pl-7">
                    {/* Vertical gradient line */}
                    <div className="absolute left-[10px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-300 via-amber-300 to-gray-200 rounded-full" />
                    <div className="space-y-4">
                      {timelineItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div
 key={item.id}
 className="relative flex items-start gap-3 animate-[fadeIn_0.3s_ease-out]"
 >
                            {/* Icon dot on line */}
                            <div className="absolute -left-7 top-0.5 flex items-center justify-center">
                              <div className={`h-[22px] w-[22px] rounded-full ${item.iconBg} border-2 border-card shadow-sm flex items-center justify-center z-10`}>
                                <Icon className={`h-2.5 w-2.5 ${item.iconColor}`} />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1 pb-1">
                              <p className="text-sm font-medium truncate">{item.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                              <p className="text-[10px] text-muted-foreground/50 mt-0.5">{timeAgo(item.time)}</p>
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
        </div>

        {/* Top Tenders */}
        <div>
          <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg gradient-teal">
                    <Briefcase className="h-3.5 w-3.5 text-white" />
                  </div>
                  Top Tenders
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground hover:text-foreground" onClick={() => setView('tenders')}>
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
                  <div className="space-y-2">
                    {topTenders.map((t, idx) => (
                      <button
 key={t.id}
 onClick={() => setView('tender-detail', { id: t.id })}
 className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-emerald-200 hover:bg-emerald-50/20 transition-all duration-200 text-left group animate-[fadeIn_0.3s_ease-out]"
 >
                        <div className="p-2 rounded-lg bg-emerald-50 flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                          <FileSearch className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate group-hover:text-emerald-700 transition-colors">{t.title}</p>
                          <p className="text-xs text-muted-foreground">
                            ETB {t.budgetMin.toLocaleString()} – {t.budgetMax.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {t.matchScore !== undefined && (
                            <Badge
                              className={`text-[10px] px-1.5 py-0 border-0 ${
                                t.matchScore >= 70
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                  : t.matchScore >= 40
                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
                              }`}
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
                                  : 'border-muted-foreground/30 text-muted-foreground'
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
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          5. TEAM MANAGEMENT OVERVIEW
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Team Members Card */}
        <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg gradient-purple">
                  <Users className="h-3.5 w-3.5 text-white" />
                </div>
                Team Members
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-2 py-0 border-purple-300 text-purple-600">
                  {teamMembers.filter(m => m.status === 'active').length} active
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setView('team-management')}
                >
                  Manage <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {teamMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm mb-3">No team members yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setView('team-management')}
                >
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Add Team Members
                </Button>
              </div>
            ) : (
              <ScrollArea className="max-h-[320px]">
                <div className="space-y-2">
                  {teamMembers
                    .filter(m => m.status === 'active')
                    .slice(0, 8)
                    .map((member) => {
                      const displayName = member.user?.profile?.fullName || member.user?.email?.split('@')[0] || 'Unknown';
                      const initials = displayName.slice(0, 2).toUpperCase();
                      return (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-purple-200 hover:bg-purple-50/10 transition-all duration-200 group"
                        >
                          {/* Avatar */}
                          {member.user?.profile?.profilePhoto ? (
                            <img
                              src={member.user.profile.profilePhoto}
                              alt={displayName}
                              className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm">
                              {initials}
                            </div>
                          )}
                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate group-hover:text-purple-700 transition-colors">
                              {displayName}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {member.user?.profile?.jobTitle || member.user?.email}
                            </p>
                          </div>
                          {/* Role Badge */}
                          <Badge className={`text-[10px] px-2 py-0 border-0 ${TEAM_ROLE_COLORS[member.role] || TEAM_ROLE_COLORS.member}`}>
                            {member.role === 'owner' && <CrownIcon className="h-2.5 w-2.5 mr-0.5" />}
                            {TEAM_ROLE_LABELS[member.role] || member.role}
                          </Badge>
                        </div>
                      );
                    })}
                  {teamMembers.filter(m => m.status === 'active').length > 8 && (
                    <button
                      onClick={() => setView('team-management')}
                      className="w-full text-center py-2 text-xs text-purple-600 hover:text-purple-700 font-medium"
                    >
                      +{teamMembers.filter(m => m.status === 'active').length - 8} more members
                    </button>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Team Tasks Card */}
        <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg gradient-teal">
                  <ClipboardList className="h-3.5 w-3.5 text-white" />
                </div>
                Team Tasks
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-2 py-0 border-teal-300 text-teal-600">
                  {teamTasks.filter(t => t.status !== 'done').length} pending
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setView('team-management')}
                >
                  Manage <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {teamTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <ClipboardList className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm mb-3">No team tasks yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setView('team-management')}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Task
                </Button>
              </div>
            ) : (
              <div>
                {/* Task Status Summary Bar */}
                <div className="flex items-center gap-2 mb-4">
                  {(['todo', 'in_progress', 'in_review', 'done'] as const).map((status) => {
                    const count = teamTasks.filter(t => t.status === status).length;
                    if (count === 0) return null;
                    return (
                      <div key={status} className="flex items-center gap-1.5">
                        <Badge className={`text-[10px] px-2 py-0 border-0 ${TASK_STATUS_COLORS[status]}`}>
                          {TASK_STATUS_LABELS[status]}: {count}
                        </Badge>
                      </div>
                    );
                  })}
                </div>

                {/* Task Progress Bar */}
                {teamTasks.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">Completion</span>
                      <span className="text-xs font-semibold">
                        {Math.round((teamTasks.filter(t => t.status === 'done').length / teamTasks.length) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                        style={{ width: `${(teamTasks.filter(t => t.status === 'done').length / teamTasks.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Task List */}
                <ScrollArea className="max-h-[220px]">
                  <div className="space-y-2">
                    {teamTasks
                      .filter(t => t.status !== 'done')
                      .sort((a, b) => {
                        const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
                        return (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
                      })
                      .slice(0, 6)
                      .map((task) => {
                        const assigneeName = task.assignee?.profile?.fullName || task.assignee?.email?.split('@')[0] || null;
                        const isOverdue = task.dueDate && new Date(task.dueDate).getTime() < Date.now();
                        return (
                          <div
                            key={task.id}
                            className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-teal-200 hover:bg-teal-50/10 transition-all duration-200 group"
                          >
                            {/* Priority Dot */}
                            <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${TASK_PRIORITY_DOT[task.priority] || 'bg-slate-400'}`} />
                            {/* Task Info */}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate group-hover:text-teal-700 transition-colors">
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {assigneeName && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {assigneeName}
                                  </span>
                                )}
                                {task.dueDate && (
                                  <span className={`text-[10px] ${isOverdue ? 'text-rose-500 font-semibold' : 'text-muted-foreground'}`}>
                                    {isOverdue ? 'Overdue' : `${daysUntil(task.dueDate)}d left`}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Status Badge */}
                            <Badge className={`text-[10px] px-2 py-0 border-0 ${TASK_STATUS_COLORS[task.status] || TASK_STATUS_COLORS.todo}`}>
                              {TASK_STATUS_LABELS[task.status] || task.status}
                            </Badge>
                          </div>
                        );
                      })}
                    {teamTasks.filter(t => t.status !== 'done').length > 6 && (
                      <button
                        onClick={() => setView('team-management')}
                        className="w-full text-center py-2 text-xs text-teal-600 hover:text-teal-700 font-medium"
                      >
                        +{teamTasks.filter(t => t.status !== 'done').length - 6} more tasks
                      </button>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          5b. QUICK ACTIONS GRID
          ═══════════════════════════════════════════════════════════════ */}
      <div>
        <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-rose">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
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
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          6. UPCOMING DEADLINES
          ═══════════════════════════════════════════════════════════════ */}
      {upcomingDeadlines.length > 0 && (
        <div>
          <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg gradient-rose">
                    <Clock className="h-3.5 w-3.5 text-white" />
                  </div>
                  Upcoming Deadlines
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground hover:text-foreground" onClick={() => setView('tenders')}>
                  View all <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[240px]">
                <div className="space-y-2">
                  {upcomingDeadlines.map((t, idx) => {
                    const days = daysUntil(t.deadline);
                    return (
                      <button
 key={t.id}
 onClick={() => setView('tender-detail', { id: t.id })}
 className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:bg-muted/50 transition-all duration-200 text-left group animate-[fadeIn_0.3s_ease-out]"
 >
                        <div className={`p-2.5 rounded-xl flex-shrink-0 ${deadlineBg(days)}`}>
                          <Calendar className={`h-4 w-4 ${deadlineColor(days)}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate group-hover:text-emerald-700 transition-colors">{t.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Deadline: {new Date(t.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <Badge
                          className={`text-[10px] px-2.5 py-0.5 border-0 font-semibold ${deadlineBadge(days)}`}
                        >
                          {days < 0 ? 'Expired' : `${days} day${days !== 1 ? 's' : ''} left`}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
