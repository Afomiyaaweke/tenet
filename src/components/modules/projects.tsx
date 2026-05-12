'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api, Project } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  FolderKanban, DollarSign, CheckCircle2, Clock,
  AlertTriangle, Plus, ArrowRight, Sparkles,
  Calendar, Target, TrendingUp, BarChart3,
} from 'lucide-react';

// ─── Animation Variants ─────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const cardHover = {
  y: -4,
  transition: { duration: 0.2, ease: 'easeOut' },
};

// ─── Helpers ────────────────────────────────────────────────────────
function formatETB(amount: number): string {
  if (amount >= 1_000_000) return `ETB ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `ETB ${(amount / 1_000).toFixed(0)}K`;
  return `ETB ${amount.toLocaleString()}`;
}

function daysAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function ProjectsView() {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/projects');
    if (res.success) setProjects(res.data);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadProjects(); }, [loadProjects]);

  const statusConfig = (status: string) => {
    switch (status) {
      case 'active': return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', gradient: 'gradient-emerald', icon: Target };
      case 'completed': return { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500', gradient: 'gradient-teal', icon: CheckCircle2 };
      case 'on_hold': return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', gradient: 'gradient-amber', icon: Clock };
      case 'cancelled': return { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', gradient: 'gradient-rose', icon: AlertTriangle };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500', gradient: 'gradient-emerald', icon: FolderKanban };
    }
  };

  const computeProgress = (project: Project) => {
    const tasks = project.tasks || [];
    if (tasks.length === 0) return 0;
    const done = tasks.filter(t => t.status === 'done').length;
    return Math.round((done / tasks.length) * 100);
  };

  // ── Computed Stats ──
  const totalContractValue = projects.reduce((sum, p) => sum + (p.contractValue || 0), 0);
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const avgCompletion = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + computeProgress(p), 0) / projects.length)
    : 0;

  return (
    <motion.div
      className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl gradient-emerald flex-shrink-0 shadow-md shadow-emerald-200/50">
            <FolderKanban className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              <span className="text-gradient-emerald">Projects</span>
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">Track and manage your active projects</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-3 py-1 border-emerald-200 text-emerald-700 bg-emerald-50/50">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="premium-shadow rounded-xl border-0 animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="premium-shadow rounded-xl border-0 bg-white overflow-hidden">
            <CardContent className="p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl gradient-emerald flex items-center justify-center shadow-lg shadow-emerald-200/40">
                <FolderKanban className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">No projects yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
                Projects are automatically created when bids are awarded. Browse tenders and submit bids to get started.
              </p>
              <Button
                className="gradient-emerald hover:opacity-90 text-white rounded-xl px-6 premium-shadow transition-all hover:-translate-y-0.5"
                onClick={() => setView('tenders')}
              >
                <Sparkles className="h-4 w-4 mr-2" /> Browse Tenders
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
          {/* Stats Summary Row */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 flex-shrink-0">
                  <FolderKanban className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{activeProjects}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Active</p>
                </div>
              </CardContent>
            </Card>
            <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-50 flex-shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{completedProjects}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Completed</p>
                </div>
              </CardContent>
            </Card>
            <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 flex-shrink-0">
                  <DollarSign className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{formatETB(totalContractValue)}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Total Value</p>
                </div>
              </CardContent>
            </Card>
            <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-50 flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-rose-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{avgCompletion}%</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Avg Completion</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Project Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project, idx) => {
              const sc = statusConfig(project.status);
              const StatusIcon = sc.icon;
              const progress = computeProgress(project);
              const totalTasks = project.tasks?.length || 0;
              const doneTasks = project.tasks?.filter(t => t.status === 'done').length || 0;
              const inProgressTasks = project.tasks?.filter(t => t.status === 'in_progress').length || 0;
              const milestoneTotal = project.milestones?.length || 0;
              const milestoneDone = project.milestones?.filter(m => m.completed).length || 0;
              const nextMilestone = project.milestones?.filter(m => !m.completed).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

              return (
                <motion.div
                  key={project.id}
                  variants={itemVariants}
                  custom={idx}
                  whileHover={cardHover}
                  className="cursor-pointer"
                  onClick={() => setView('project-detail', { id: project.id })}
                >
                  <Card className="premium-shadow rounded-xl border-0 bg-white transition-all duration-300 group h-full">
                    <CardContent className="p-6">
                      {/* Top row: icon + name + status */}
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`w-11 h-11 rounded-xl ${sc.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <StatusIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate group-hover:text-emerald-700 transition-colors">
                            {project.tender?.title || 'Project'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {project.bid?.user?.profile?.fullName || project.bid?.user?.profile?.companyName || 'Assigned'}
                          </p>
                        </div>
                        <Badge className={`text-[10px] px-1.5 py-0 border-0 font-semibold ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} mr-1 inline-block`} />
                          {project.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      {/* Contract Value */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <DollarSign className="h-3.5 w-3.5" />
                          Contract Value
                        </div>
                        <p className="text-sm font-bold text-foreground">
                          ETB {project.contractValue.toLocaleString()}
                        </p>
                      </div>

                      {/* Task completion progress bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[11px] font-medium text-muted-foreground">Task Progress</p>
                          <p className="text-[11px] font-bold text-emerald-600">{doneTasks}/{totalTasks} done</p>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Milestone progress bar */}
                      {milestoneTotal > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[11px] font-medium text-muted-foreground">Milestones</p>
                            <p className="text-[11px] font-bold text-teal-600">{milestoneDone}/{milestoneTotal} complete</p>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all duration-500"
                              style={{ width: `${milestoneTotal > 0 ? (milestoneDone / milestoneTotal) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Next milestone indicator */}
                      {nextMilestone && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50/50 mb-3">
                          <Calendar className="h-3 w-3 text-amber-600 flex-shrink-0" />
                          <p className="text-[10px] text-amber-700 font-medium truncate">
                            Next: {nextMilestone.title} — {new Date(nextMilestone.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      )}

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
                        <div className="text-center">
                          <p className="text-lg font-bold text-emerald-600">{doneTasks}<span className="text-muted-foreground/40 font-normal">/{totalTasks}</span></p>
                          <p className="text-[10px] text-muted-foreground font-medium">Tasks</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-amber-600">{milestoneDone}<span className="text-muted-foreground/40 font-normal">/{milestoneTotal}</span></p>
                          <p className="text-[10px] text-muted-foreground font-medium">Milestones</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-teal-600">{project._count?.payments || 0}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">Payments</p>
                        </div>
                      </div>

                      {/* Hover arrow */}
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground/50">{daysAgo(project.createdAt)}</p>
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
