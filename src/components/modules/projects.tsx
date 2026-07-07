'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api, Project } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FolderKanban, DollarSign, CheckCircle2, Clock,
  AlertTriangle, Sparkles, Calendar, Target,
  TrendingUp, LayoutGrid, List, GanttChart, GripVertical,
  ArrowUp, ArrowDown, ArrowUpDown, ChevronRight,
} from 'lucide-react';
// ─── Helpers ────────────────────────────────────────────────────────
function formatETB(amount: number): string {
  if (amount >= 1_000_000) return `ETB ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `ETB ${(amount / 1_000).toFixed(0)}K`;
  return `ETB ${amount.toLocaleString()}`;
}

type SortKey = 'title' | 'contractValue' | 'status' | 'progress';
type SortDir = 'asc' | 'desc';

const STATUS_COLUMNS = [
  { key: 'active' as const, label: 'Active', emoji: '🟢', color: 'emerald' },
  { key: 'on_hold' as const, label: 'On Hold', emoji: '🟡', color: 'amber' },
  { key: 'completed' as const, label: 'Completed', emoji: '✅', color: 'teal' },
  { key: 'cancelled' as const, label: 'Cancelled', emoji: '❌', color: 'rose' },
];

function statusColorMap(status: string) {
  switch (status) {
    case 'active': return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', bar: '#10b981', barBg: 'bg-emerald-100 dark:bg-emerald-900/30' };
    case 'completed': return { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', dot: 'bg-teal-500', bar: '#14b8a6', barBg: 'bg-teal-100 dark:bg-teal-900/30' };
    case 'on_hold': return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', bar: '#f59e0b', barBg: 'bg-amber-100 dark:bg-amber-900/30' };
    case 'cancelled': return { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500', bar: '#f43f5e', barBg: 'bg-rose-100 dark:bg-rose-900/30' };
    default: return { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground/50', bar: '#94a3b8', barBg: 'bg-muted' };
  }
}

function computeProgress(project: Project) {
  const tasks = project.tasks || [];
  if (tasks.length === 0) return 0;
  const done = tasks.filter(t => t.status === 'done').length;
  return Math.round((done / tasks.length) * 100);
}

function getNextMilestone(project: Project) {
  return (project.milestones || [])
    .filter(m => !m.completed)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
}

// ─── Timeline (Gantt) Helpers ────────────────────────────────────────
function getTimelineRange(projects: Project[]) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 6, 0);
  return { start, end };
}

function monthRange(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  while (d <= end) {
    months.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  return months;
}

function dateToX(date: Date, start: Date, end: Date, width: number): number {
  const total = end.getTime() - start.getTime();
  if (total === 0) return 0;
  return ((date.getTime() - start.getTime()) / total) * width;
}

// ─── Board View ──────────────────────────────────────────────────────
function BoardView({ projects, onCardClick }: { projects: Project[]; onCardClick: (id: string) => void }) {
  const grouped = useMemo(() => {
    const map: Record<string, Project[]> = { active: [], on_hold: [], completed: [], cancelled: [] };
    projects.forEach(p => {
      const key = p.status === 'on_hold' ? 'on_hold' : p.status;
      if (map[key]) map[key].push(p);
      else map.active.push(p);
    });
    return map;
  }, [projects]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {STATUS_COLUMNS.map(col => {
        const items = grouped[col.key] || [];
        return (
          <div key={col.key} className="flex flex-col">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-sm">{col.emoji}</span>
              <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
              <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {items.length}
              </span>
            </div>
            {/* Cards */}
            <div className="flex flex-col gap-2 min-h-[120px]">
              {items.length === 0 ? (
                <div className="flex-1 rounded-xl border-2 border-dashed border-border/40 flex items-center justify-center py-8">
                  <p className="text-xs text-muted-foreground/60">No projects</p>
                </div>
              ) : (
                items.map(project => (
                  <ProjectCard key={project.id} project={project} onClick={() => onCardClick(project.id)} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const sc = statusColorMap(project.status);
  const progress = computeProgress(project);
  const totalTasks = project.tasks?.length || 0;
  const doneTasks = project.tasks?.filter(t => t.status === 'done').length || 0;
  const nextMilestone = getNextMilestone(project);

  return (
    <div className="cursor-pointer hover:-translate-y-[3px] transition-all duration-200" onClick={onClick}>
      <Card className="rounded-xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow group">
        <CardContent className="p-4 space-y-3">
          {/* Title row */}
          <div className="flex items-start gap-2">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight">
                {project.tender?.title || 'Project'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {String(project.bid?.user?.profile?.fullName || 'Assigned')}
              </p>
            </div>
          </div>

          {/* Value */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Value</span>
            <span className="text-xs font-bold text-foreground">{formatETB(project.contractValue)}</span>
          </div>

          {/* Task progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">Tasks</span>
              <span className="text-[10px] font-bold" style={{ color: sc.bar }}>{doneTasks}/{totalTasks}</span>
            </div>
            <div className={`h-1.5 ${sc.barBg} rounded-full overflow-hidden`}>
              <div
 className="h-full rounded-full transition-[width] duration-700"
 style={{ width: `${progress}%`, backgroundColor: sc.bar }}
 />
            </div>
          </div>

          {/* Next milestone */}
          {nextMilestone && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-md px-2 py-1">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{nextMilestone.title}</span>
              <span className="ml-auto flex-shrink-0 font-medium">
                {new Date(nextMilestone.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          )}

          {/* Chevron */}
          <div className="flex items-center justify-end">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-emerald-500 transition-colors" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sort Icon (top-level to avoid render-time component creation) ──
function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/40" />;
  return sortDir === 'asc'
    ? <ArrowUp className="h-3 w-3 ml-1 text-emerald-500" />
    : <ArrowDown className="h-3 w-3 ml-1 text-emerald-500" />;
}

// ─── List View ───────────────────────────────────────────────────────
function ListView({
  projects,
  onRowClick,
  sortKey,
  sortDir,
  onSort,
}: {
  projects: Project[];
  onRowClick: (id: string) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const sorted = useMemo(() => {
    const copy = [...projects];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'title':
          cmp = (a.tender?.title || '').localeCompare(b.tender?.title || '');
          break;
        case 'contractValue':
          cmp = a.contractValue - b.contractValue;
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'progress':
          cmp = computeProgress(a) - computeProgress(b);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [projects, sortKey, sortDir]);

  return (
    <Card className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="cursor-pointer select-none" onClick={() => onSort('title')}>
              <span className="flex items-center">Project <SortIcon col="title" sortKey={sortKey} sortDir={sortDir} /></span>
            </TableHead>
            <TableHead className="hidden md:table-cell">Tender</TableHead>
            <TableHead className="hidden sm:table-cell">Contractor</TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => onSort('contractValue')}>
              <span className="flex items-center">Value <SortIcon col="contractValue" sortKey={sortKey} sortDir={sortDir} /></span>
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => onSort('status')}>
              <span className="flex items-center">Status <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} /></span>
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => onSort('progress')}>
              <span className="flex items-center">Progress <SortIcon col="progress" sortKey={sortKey} sortDir={sortDir} /></span>
            </TableHead>
            <TableHead className="hidden lg:table-cell">Next Milestone</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(project => {
            const sc = statusColorMap(project.status);
            const progress = computeProgress(project);
            const totalTasks = project.tasks?.length || 0;
            const doneTasks = project.tasks?.filter(t => t.status === 'done').length || 0;
            const nextMilestone = getNextMilestone(project);

            return (
              <TableRow
                key={project.id}
                className="cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors"
                onClick={() => onRowClick(project.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span className="font-medium text-sm truncate max-w-[180px]">
                      {project.tender?.title || 'Project'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-[150px]">
                  {project.tender?.title || '-'}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground truncate max-w-[120px]">
                  {project.bid?.user?.profile?.fullName || '-'}
                </TableCell>
                <TableCell className="text-sm font-semibold">{formatETB(project.contractValue)}</TableCell>
                <TableCell>
                  <Badge className={`text-[10px] px-2 py-0 border-0 font-semibold ${sc.bg} ${sc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} mr-1 inline-block`} />
                    {project.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <div className={`h-1.5 flex-1 ${sc.barBg} rounded-full overflow-hidden`}>
                      <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: sc.bar }} />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                      {doneTasks}/{totalTasks}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {nextMilestone ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      <span className="truncate max-w-[120px]">{nextMilestone.title}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">-</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

// ─── Timeline View (SVG Gantt) ───────────────────────────────────────
function TimelineView({ projects, onBarClick }: { projects: Project[]; onBarClick: (id: string) => void }) {
  const timelineWidth = 900;
  const rowHeight = 44;
  const headerHeight = 36;
  const { start, end } = useMemo(() => getTimelineRange(projects), [projects]);
  const months = useMemo(() => monthRange(start, end), [start, end]);

  const barData = useMemo(() => {
    return projects.map(p => {
      const createdAt = new Date(p.createdAt);
      // Estimate end: use last milestone or +3 months
      const lastMilestone = (p.milestones || []).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())[0];
      const endDate = lastMilestone
        ? new Date(lastMilestone.dueDate)
        : new Date(createdAt.getTime() + 90 * 86400000);
      const sc = statusColorMap(p.status);
      return { project: p, start: createdAt, end: endDate, color: sc.bar };
    });
  }, [projects]);

  const milestoneMarkers = useMemo(() => {
    const markers: { x: number; y: number; color: string; completed: boolean; title: string; projectId: string }[] = [];
    barData.forEach((bd, rowIdx) => {
      (bd.project.milestones || []).forEach(m => {
        const mx = dateToX(new Date(m.dueDate), start, end, timelineWidth);
        markers.push({
          x: mx, y: headerHeight + rowIdx * rowHeight + rowHeight / 2,
          color: bd.color, completed: m.completed, title: m.title, projectId: bd.project.id,
        });
      });
    });
    return markers;
  }, [barData, start, end]);

  const nowX = dateToX(new Date(), start, end, timelineWidth);
  const svgHeight = headerHeight + barData.length * rowHeight + 20;

  return (
    <Card className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <svg width={timelineWidth + 200} height={svgHeight} className="min-w-full">
          {/* Month columns */}
          {months.map((m, i) => {
            const x = dateToX(m, start, end, timelineWidth) + 200;
            const nextM = new Date(m);
            nextM.setMonth(nextM.getMonth() + 1);
            const x2 = dateToX(nextM, start, end, timelineWidth) + 200;
            return (
              <g key={i}>
                <rect x={x} y={0} width={x2 - x} height={svgHeight} fill={i % 2 === 0 ? 'transparent' : 'rgba(128,128,128,0.03)'} />
                <text x={x + (x2 - x) / 2} y={22} textAnchor="middle" className="text-[10px] fill-muted-foreground font-medium">
                  {m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                </text>
                <line x1={x} y1={headerHeight} x2={x} y2={svgHeight} stroke="currentColor" strokeOpacity={0.06} />
              </g>
            );
          })}

          {/* Today line */}
          <line x1={nowX + 200} y1={0} x2={nowX + 200} y2={svgHeight} stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="4 3" />
          <text x={nowX + 200} y={12} textAnchor="middle" className="text-[9px] fill-rose-500 font-semibold">TODAY</text>

          {/* Project label column */}
          {barData.map((bd, i) => {
            const y = headerHeight + i * rowHeight + rowHeight / 2;
            return (
              <g key={bd.project.id}>
                <text x={8} y={y + 4} className="text-[10px] fill-foreground font-medium cursor-pointer" onClick={() => onBarClick(bd.project.id)}>
                  {(bd.project.tender?.title || 'Project').slice(0, 22)}
                </text>
              </g>
            );
          })}

          {/* Project bars */}
          {barData.map((bd, i) => {
            const x1 = dateToX(bd.start, start, end, timelineWidth) + 200;
            const x2 = dateToX(bd.end, start, end, timelineWidth) + 200;
            const y = headerHeight + i * rowHeight + 12;
            const barH = 20;
            const barW = Math.max(x2 - x1, 8);
            return (
              <g key={bd.project.id} className="cursor-pointer" onClick={() => onBarClick(bd.project.id)}>
                <rect x={x1} y={y} width={barW} height={barH} rx={4} fill={bd.color} fillOpacity={0.2} />
                <rect x={x1} y={y} width={barW} height={barH} rx={4} fill={bd.color} fillOpacity={0.7} />
                <rect x={x1} y={y} width={barW * (computeProgress(bd.project) / 100)} height={barH} rx={4} fill={bd.color} />
              </g>
            );
          })}

          {/* Milestone diamonds */}
          {milestoneMarkers.map((m, i) => (
            <g key={i}>
              <polygon
                points={`${m.x + 200},${m.y - 5} ${m.x + 205},${m.y} ${m.x + 200},${m.y + 5} ${m.x + 195},${m.y}`}
                fill={m.completed ? '#10b981' : m.color}
                stroke="white"
                strokeWidth={1}
              />
            </g>
          ))}
        </svg>
      </div>
    </Card>
  );
}

// ─── Main View ───────────────────────────────────────────────────────
export function ProjectsView() {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'board' | 'list' | 'timeline'>('board');
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/projects');
    if (res.success) setProjects(res.data);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }, [sortKey]);

  const handleNavigate = useCallback((id: string) => {
    setView('project-detail', { id });
  }, [setView]);

  // ── Computed Stats ──
  const totalContractValue = projects.reduce((sum, p) => sum + (p.contractValue || 0), 0);
  const activeCount = projects.filter(p => p.status === 'active').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;
  const onHoldCount = projects.filter(p => p.status === 'on_hold').length;

  return (
    <div
 className="space-y-0 max-w-6xl mx-auto animate-[fadeIn_0.3s_ease-out]"
 >
      {/* Notion-style Cover */}
      <div className="relative h-32 sm:h-40 rounded-t-none overflow-hidden -mx-4 md:-mx-6 -mt-4 md:-mt-6">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-500 to-emerald-700" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.1) 0%, transparent 40%)',
        }} />
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(255,255,255,0.02) 30px, rgba(255,255,255,0.02) 60px)',
        }} />
      </div>

      {/* Page Header */}
      <div className="px-4 md:px-6 -mt-8 relative z-10">
        <div className="flex items-end gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-card shadow-lg flex items-center justify-center border-4 border-white dark:border-card">
            <span className="text-3xl">📁</span>
          </div>
          <div className="pb-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track and manage your project portfolio</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 space-y-5 mt-5">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border/60 shadow-sm">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
              <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">{activeCount}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Active</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border/60 shadow-sm">
            <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/30">
              <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">{completedCount}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Completed</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border/60 shadow-sm">
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">{onHoldCount}</p>
              <p className="text-[10px] text-muted-foreground font-medium">On Hold</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border/60 shadow-sm">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">{formatETB(totalContractValue)}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Total Value</p>
            </div>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-3">
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'board' | 'list' | 'timeline')}>
            <TabsList className="bg-muted/50 h-9 p-0.5">
              <TabsTrigger value="board" className="text-xs px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md">
                <LayoutGrid className="h-3.5 w-3.5 mr-1.5" /> Board
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md">
                <List className="h-3.5 w-3.5 mr-1.5" /> List
              </TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md">
                <GanttChart className="h-3.5 w-3.5 mr-1.5" /> Timeline
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="ml-auto">
            <Badge variant="outline" className="text-[10px] px-2.5 py-0.5 border-border/60">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Card key={i} className="rounded-xl border border-border/60 animate-pulse">
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-2 bg-muted rounded-full" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div>
            <Card className="rounded-xl border border-border/60 bg-card">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <FolderKanban className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">No projects yet</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-5">
                  Projects are created when bids are awarded. Browse tenders and submit bids to get started.
                </p>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5"
                  onClick={() => setView('tenders')}
                >
                  <Sparkles className="h-4 w-4 mr-2" /> Browse Tenders
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : activeView === 'board' ? (
          <div>
            <BoardView projects={projects} onCardClick={handleNavigate} />
          </div>
        ) : activeView === 'list' ? (
          <div>
            <ListView projects={projects} onRowClick={handleNavigate} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
          </div>
        ) : (
          <div>
            <TimelineView projects={projects} onBarClick={handleNavigate} />
          </div>
        )}
      </div>
    </div>
  );
}
