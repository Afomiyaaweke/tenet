'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Flame, TrendingUp, Gavel, FolderKanban, FileText, FileSearch,
  ShieldCheck, Sparkles, ArrowUpRight, Award, Calendar, Store,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

/* ───────────────────────── Types ───────────────────────── */

interface DayActivity {
  date: string;
  count: number;
  byType: { bid: number; tender: number; project: number; document: number; listing: number };
}

interface ActivityData {
  days: DayActivity[];
  total: number;
  byType: { bid: number; tender: number; project: number; document: number; listing: number };
  streak: number;
  longestStreak: number;
}

interface QualityData {
  qualityScore: number;
  badge: 'platinum' | 'gold' | 'silver' | 'bronze' | 'new';
  scoreBreakdown: {
    verified: number; profileCompleteness: number; documents: number;
    tenders: number; bids: number; projects: number; endorsements: number; listings: number;
  };
  nextMilestone: number;
  nextBadge: string;
  bidsWon: number;
  completedProjects: number;
  hasCompany?: boolean;
}

/* ───────────────────────── Constants ───────────────────────── */

// Orange 4-level scale (GitHub-style contributions, but orange instead of green)
const HEATMAP_LEVELS = [
  { min: 0,  className: 'bg-muted/60',                 label: 'No activity' },
  { min: 1,  className: 'bg-orange-200 dark:bg-orange-900/40',  label: 'Low' },
  { min: 3,  className: 'bg-orange-400 dark:bg-orange-700',     label: 'Medium' },
  { min: 6,  className: 'bg-orange-500 dark:bg-orange-600',     label: 'High' },
  { min: 10, className: 'bg-orange-600 dark:bg-orange-500',     label: 'Very high' },
];

function levelForCount(count: number) {
  let level = HEATMAP_LEVELS[0];
  for (const l of HEATMAP_LEVELS) {
    if (count >= l.min) level = l;
  }
  return level;
}

const WEEKDAY_LABELS = ['Mon', 'Wed', 'Fri'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BADGE_STYLE: Record<string, string> = {
  platinum: 'from-slate-200 to-slate-400 text-slate-900 border-slate-300',
  gold:     'from-amber-300 to-yellow-500 text-amber-900 border-amber-400',
  silver:   'from-gray-300 to-gray-400 text-gray-800 border-gray-400',
  bronze:   'from-orange-400 to-amber-600 text-orange-950 border-orange-500',
  new:      'from-muted to-muted-foreground/20 text-muted-foreground border-border',
};

const SCORE_FACTORS = [
  { key: 'verified',            label: 'Verified',         max: 15, icon: ShieldCheck },
  { key: 'profileCompleteness', label: 'Profile',          max: 20, icon: Sparkles },
  { key: 'documents',           label: 'Documents',        max: 20, icon: FileText },
  { key: 'tenders',             label: 'Tenders',          max: 15, icon: FileSearch },
  { key: 'bids',                label: 'Bids',             max: 10, icon: Gavel },
  { key: 'projects',            label: 'Projects',         max: 10, icon: FolderKanban },
  { key: 'endorsements',        label: 'Endorsements',     max: 10, icon: Award },
  { key: 'listings',            label: 'Market Listings',  max: 10, icon: Store },
] as const;

/* ───────────────────────── Activity Heatmap ───────────────────────── */

function ActivityHeatmap({ days }: { days: DayActivity[] }) {
  // Group days into weeks (columns of 7). Each week starts on Sunday.
  const weeks = useMemo(() => {
    if (!days.length) return [];
    const weeks: DayActivity[][] = [];
    let currentWeek: DayActivity[] = [];

    // Pad start of first week so the first day lands on the correct weekday
    const firstDate = new Date(days[0].date + 'T00:00:00');
    const firstWeekday = firstDate.getDay(); // 0=Sun..6=Sat
    for (let i = 0; i < firstWeekday; i++) {
      currentWeek.push({ date: '', count: 0, byType: { bid: 0, tender: 0, project: 0, document: 0, listing: 0 } });
    }

    for (const day of days) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      // Pad the final week
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: 0, byType: { bid: 0, tender: 0, project: 0, document: 0, listing: 0 } });
      }
      weeks.push(currentWeek);
    }
    return weeks;
  }, [days]);

  // Compute month label positions (one per week where the month changes)
  const monthLabels = useMemo(() => {
    const labels: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const firstRealDay = week.find(d => d.date);
      if (!firstRealDay) return;
      const month = new Date(firstRealDay.date + 'T00:00:00').getMonth();
      if (month !== lastMonth) {
        labels.push({ weekIndex: wi, label: MONTH_LABELS[month] });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  const [hovered, setHovered] = useState<DayActivity | null>(null);

  if (!weeks.length) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4 mr-2" />
        Start your journey — submit a bid, publish a tender, upload a document, or post a marketplace listing.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto custom-scrollbar pb-1">
      <div className="inline-flex flex-col gap-1 min-w-full">
        {/* Month labels row */}
        <div className="flex pl-7 text-[10px] text-muted-foreground/70 mb-0.5 relative h-3">
          {weeks.map((_, wi) => {
            const label = monthLabels.find(m => m.weekIndex === wi);
            return (
              <div key={wi} className="w-[11px] flex-shrink-0 relative">
                {label && (
                  <span className="absolute left-0 top-0 whitespace-nowrap">{label.label}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Grid: weekday labels + weeks */}
        <div className="flex gap-1">
          {/* Weekday labels */}
          <div className="flex flex-col gap-[3px] text-[9px] text-muted-foreground/60 w-6 pt-0.5">
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-[11px] flex items-center">
                {i === 1 || i === 3 || i === 5 ? (
                  <span className="leading-none">{WEEKDAY_LABELS[(i - 1) / 2]}</span>
                ) : null}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => {
                if (!day.date) {
                  return <div key={di} className="w-[11px] h-[11px]" />;
                }
                const lvl = levelForCount(day.count);
                return (
                  <div
                    key={di}
                    className={`w-[11px] h-[11px] rounded-[2px] ${lvl.className} ${
                      day.count > 0 ? 'ring-0 hover:ring-1 hover:ring-orange-400 hover:ring-offset-0 cursor-pointer' : ''
                    } transition-all`}
                    onMouseEnter={() => setHovered(day)}
                    onMouseLeave={() => setHovered(null)}
                    title={`${day.date}: ${day.count} contribution${day.count === 1 ? '' : 's'}`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer: legend + hover detail */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pl-7">
          <div className="text-[10px] text-muted-foreground">
            {hovered && hovered.date ? (
              <span>
                <strong className="text-foreground">{hovered.count}</strong> contribution{hovered.count === 1 ? '' : 's'} on{' '}
                {new Date(hovered.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                {hovered.count > 0 && (
                  <span className="text-muted-foreground/70 ml-1">
                    ({hovered.byType.bid} bids, {hovered.byType.tender} tenders, {hovered.byType.project} projects, {hovered.byType.document} docs, {hovered.byType.listing || 0} listings)
                  </span>
                )}
              </span>
            ) : (
              <span>Hover any tile to see daily detail</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>Less</span>
            {HEATMAP_LEVELS.map((l, i) => (
              <div key={i} className={`w-[11px] h-[11px] rounded-[2px] ${l.className}`} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Score Breakdown Bars ───────────────────────── */

function ScoreBreakdown({ breakdown }: { breakdown: QualityData['scoreBreakdown'] }) {
  return (
    <div className="space-y-2">
      {SCORE_FACTORS.map(factor => {
        const value = breakdown[factor.key as keyof typeof breakdown] || 0;
        const pct = Math.round((value / factor.max) * 100);
        const Icon = factor.icon;
        return (
          <div key={factor.key} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-orange-500/10 flex items-center justify-center shrink-0">
              <Icon className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-medium text-muted-foreground">{factor.label}</span>
                <span className="text-[10px] font-bold text-foreground tabular-nums">{value}/{factor.max}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-[width] duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Journey Card ───────────────────────── */

export function JourneyCard() {
  const [quality, setQuality] = useState<QualityData | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/quality-score/me').catch(() => ({ success: false })),
      api.get('/activity/me', { days: '365' }).catch(() => ({ success: false })),
    ]).then(([q, a]) => {
      if (cancelled) return;
      if (q.success) setQuality(q.data);
      if (a.success) setActivity(a.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card className="rounded-2xl border-0 bg-card overflow-hidden">
        <div className="h-48 bg-muted/30 animate-pulse" />
      </Card>
    );
  }

  const score = quality?.qualityScore ?? 0;
  const badge = quality?.badge ?? 'new';
  const badgeStyle = BADGE_STYLE[badge] || BADGE_STYLE.new;
  const breakdown = quality?.scoreBreakdown;
  const streak = activity?.streak ?? 0;
  const longestStreak = activity?.longestStreak ?? 0;
  const totalActivity = activity?.total ?? 0;
  const byType = activity?.byType ?? { bid: 0, tender: 0, project: 0, document: 0, listing: 0 };

  // Personal accounts (no company) can still post marketplace listings —
  // show their activity journey; only hide the company Quality Score card.
  const hasCompany = quality?.hasCompany !== false;
  const hasActivity = (activity?.total ?? 0) > 0;

  if (!hasCompany && !hasActivity) {
    return (
      <Card className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-card via-card to-orange-500/5 overflow-hidden">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-orange-500" />
          </div>
          <h3 className="text-lg font-bold mb-1">Start your journey</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Complete your company profile to earn your first Quality Score, or post your first marketplace listing to start tracking your activity.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top row: Score + Streak (score card only for company accounts) */}
      <div className={`grid grid-cols-1 gap-4 ${hasCompany ? 'lg:grid-cols-3' : ''}`}>
        {/* Quality Score Card */}
        {hasCompany && (
        <Card className="lg:col-span-2 rounded-2xl border-0 bg-card overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-500/10">
                  <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
                </div>
                Your Quality Score
              </CardTitle>
              <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r ${badgeStyle} border text-[10px] font-bold capitalize`}>
                {badge}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Score gauge */}
            <div className="sm:col-span-1 flex flex-col items-center justify-center sm:border-r sm:border-border/50 sm:pr-4">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/40" />
                  <circle
                    cx="50" cy="50" r="44" fill="none" stroke="url(#scoreGradient)" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 2 * Math.PI * 44} ${2 * Math.PI * 44}`}
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fb923c" />
                      <stop offset="100%" stopColor="#ea580c" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="relative text-center">
                  <div className="text-3xl font-black tabular-nums">{score}</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">/ 100</div>
                </div>
              </div>
              {quality?.nextBadge && quality.nextBadge !== 'Max' && (
                <div className="mt-2 text-center">
                  <p className="text-[10px] text-muted-foreground">
                    Next: <span className="font-semibold text-foreground">{quality.nextBadge}</span>
                  </p>
                  <p className="text-[9px] text-muted-foreground/70">{quality.nextMilestone - score} pts to go</p>
                </div>
              )}
            </div>

            {/* Score breakdown bars */}
            <div className="sm:col-span-2">
              {breakdown ? <ScoreBreakdown breakdown={breakdown} /> : (
                <p className="text-sm text-muted-foreground">Score breakdown unavailable</p>
              )}
            </div>
          </CardContent>
        </Card>
        )}

        {/* Streak + Activity Totals Card */}
        <Card className="rounded-2xl border-0 bg-card overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/10">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
              </div>
              Your Streak
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tabular-nums bg-gradient-to-br from-orange-500 to-amber-600 bg-clip-text text-transparent">
                {streak}
              </span>
              <span className="text-xs text-muted-foreground">day{streak === 1 ? '' : 's'}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Best: <span className="font-semibold text-foreground">{longestStreak}</span> days
            </div>

            <div className="pt-3 border-t border-border/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5"><Gavel className="w-3 h-3 text-amber-500" /> Bids submitted</span>
                <span className="font-bold tabular-nums">{byType.bid}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5"><FileSearch className="w-3 h-3 text-sky-500" /> Tenders published</span>
                <span className="font-bold tabular-nums">{byType.tender}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5"><FolderKanban className="w-3 h-3 text-purple-500" /> Projects started</span>
                <span className="font-bold tabular-nums">{byType.project}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5"><FileText className="w-3 h-3 text-emerald-500" /> Documents uploaded</span>
                <span className="font-bold tabular-nums">{byType.document}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5"><Store className="w-3 h-3 text-orange-500" /> Listings posted</span>
                <span className="font-bold tabular-nums">{byType.listing}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total (1y)</span>
                <span className="text-lg font-black tabular-nums text-orange-600 dark:text-orange-400">{totalActivity}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Heatmap Card */}
      <Card className="rounded-2xl border-0 bg-card overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/10">
                <Calendar className="h-3.5 w-3.5 text-orange-500" />
              </div>
              Your Journey — Last 12 Months
            </CardTitle>
            <Badge variant="outline" className="text-[10px] gap-1">
              <ArrowUpRight className="w-3 h-3 text-orange-500" />
              {totalActivity} contribution{totalActivity === 1 ? '' : 's'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ActivityHeatmap days={activity?.days ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
