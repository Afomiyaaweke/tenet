'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api, Project, Task, Milestone, Payment } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, FolderKanban, Plus, Clock, CheckCircle2,
  Circle, DollarSign, AlertTriangle, Calendar, MessageSquare,
  CreditCard, Flag, GripVertical, Trash2, Edit3,
  LayoutGrid, GanttChart, Receipt, MessageCircle,
  ChevronRight, X, Save,
} from 'lucide-react';

// ─── Animation Variants ─────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// ─── Helpers ────────────────────────────────────────────────────────
function formatETB(amount: number): string {
  if (amount >= 1_000_000) return `ETB ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `ETB ${(amount / 1_000).toFixed(0)}K`;
  return `ETB ${amount.toLocaleString()}`;
}

function statusColorMap(status: string) {
  switch (status) {
    case 'active': return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', bar: '#10b981', label: 'Active' };
    case 'completed': return { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', dot: 'bg-teal-500', bar: '#14b8a6', label: 'Completed' };
    case 'on_hold': return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', bar: '#f59e0b', label: 'On Hold' };
    case 'cancelled': return { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500', bar: '#f43f5e', label: 'Cancelled' };
    default: return { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground/50', bar: '#94a3b8', label: status };
  }
}

// ─── Timeline (Gantt) helpers ────────────────────────────────────────
function getTimelineRange(project: Project) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 8, 0);
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

// ─── Task Column Config ─────────────────────────────────────────────
const TASK_COLUMNS = [
  { key: 'todo' as const, label: 'To Do', icon: Circle, color: 'slate' },
  { key: 'in_progress' as const, label: 'In Progress', icon: Clock, color: 'amber' },
  { key: 'done' as const, label: 'Done', icon: CheckCircle2, color: 'emerald' },
];

// ─── Task Card Component ─────────────────────────────────────────────
function TaskCard({
  task,
  onStatusChange,
  onDelete,
  onEdit,
}: {
  task: Task;
  onStatusChange: (taskId: string, status: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
}) {
  const isOverdue = task.dueDate && new Date(task.dueDate).getTime() < Date.now() && task.status !== 'done';
  const col = TASK_COLUMNS.find(c => c.key === task.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="group"
    >
      <Card className="rounded-lg border border-border/50 bg-card shadow-sm hover:shadow-md hover:border-border transition-all">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start gap-2">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 mt-0.5 flex-shrink-0 cursor-grab" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">{task.title}</p>
              {task.description && (
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
              )}
            </div>
          </div>

          {task.dueDate && (
            <div className={`flex items-center gap-1.5 text-[10px] ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
              <Calendar className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {isOverdue && <span className="font-semibold ml-1">Overdue</span>}
            </div>
          )}

          {/* Action buttons on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {task.status !== 'todo' && (
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => onStatusChange(task.id, task.status === 'in_progress' ? 'todo' : 'in_progress')}>
                ← Move
              </Button>
            )}
            {task.status !== 'in_progress' && task.status !== 'done' && (
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => onStatusChange(task.id, 'in_progress')}>
                Start →
              </Button>
            )}
            {task.status !== 'done' && (
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-emerald-600" onClick={() => onStatusChange(task.id, 'done')}>
                ✓ Done
              </Button>
            )}
            {task.status === 'done' && (
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => onStatusChange(task.id, 'in_progress')}>
                Reopen
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] ml-auto" onClick={() => onEdit(task)}>
              <Edit3 className="h-3 w-3" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-rose-500 hover:text-rose-600">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Task</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{task.title}&quot;? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => onDelete(task.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export function ProjectDetailView({ projectId }: { projectId?: string }) {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('board');

  // Dialogs
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskColumn, setAddTaskColumn] = useState<string>('todo');
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', status: 'todo' });

  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskForm, setEditTaskForm] = useState({ title: '', description: '', dueDate: '', status: 'todo' });

  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: '' });

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: '', paymentMethod: 'bank_transfer', referenceNumber: '', notes: '', paymentDate: '' });

  const loadProject = useCallback(async () => {
    setLoading(true);
    const res = await api.get(`/projects/${projectId}`);
    if (res.success) setProject(res.data);
    setLoading(false);
  }, [projectId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (projectId) loadProject();
  }, [projectId, loadProject]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Task Handlers ──
  const handleAddTask = async () => {
    if (!newTask.title.trim()) { toast.error('Task title is required'); return; }
    const res = await api.post(`/projects/${projectId}/tasks`, { ...newTask, status: addTaskColumn });
    if (res.success) {
      toast.success('Task added');
      setShowAddTask(false);
      setNewTask({ title: '', description: '', dueDate: '', status: 'todo' });
      loadProject();
    } else toast.error(res.error || 'Failed to add task');
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    const res = await api.patch(`/projects/${projectId}/tasks/${taskId}/status`, { status });
    if (res.success) {
      toast.success('Task updated');
      loadProject();
    } else toast.error(res.error || 'Failed to update task');
  };

  const handleDeleteTask = async (taskId: string) => {
    const res = await api.delete(`/projects/${projectId}/tasks/${taskId}`);
    if (res.success) {
      toast.success('Task deleted');
      loadProject();
    } else toast.error(res.error || 'Failed to delete task');
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTaskForm({ title: task.title, description: task.description || '', dueDate: task.dueDate || '', status: task.status });
    setShowEditTask(true);
  };

  const handleSaveEditTask = async () => {
    if (!editingTask || !editTaskForm.title.trim()) return;
    const res = await api.patch(`/projects/${projectId}/tasks/${editingTask.id}`, editTaskForm);
    if (res.success) {
      toast.success('Task updated');
      setShowEditTask(false);
      setEditingTask(null);
      loadProject();
    } else toast.error(res.error || 'Failed to update task');
  };

  // ── Milestone Handlers ──
  const handleAddMilestone = async () => {
    if (!newMilestone.title.trim()) { toast.error('Milestone title is required'); return; }
    const res = await api.post(`/projects/${projectId}/milestones`, newMilestone);
    if (res.success) {
      toast.success('Milestone added');
      setShowAddMilestone(false);
      setNewMilestone({ title: '', dueDate: '' });
      loadProject();
    } else toast.error(res.error || 'Failed to add milestone');
  };

  const handleToggleMilestone = async (milestoneId: string, completed: boolean) => {
    const res = await api.patch(`/projects/${projectId}/milestones/${milestoneId}`, { completed: !completed });
    if (res.success) {
      toast.success(completed ? 'Milestone reopened' : 'Milestone completed');
      loadProject();
    }
  };

  // ── Payment Handlers ──
  const handleAddPayment = async () => {
    const res = await api.post(`/projects/${projectId}/payments`, {
      ...newPayment, amount: parseFloat(newPayment.amount),
    });
    if (res.success) {
      toast.success('Payment logged');
      setShowAddPayment(false);
      setNewPayment({ amount: '', paymentMethod: 'bank_transfer', referenceNumber: '', notes: '', paymentDate: '' });
      loadProject();
    } else toast.error(res.error || 'Failed to log payment');
  };

  // ── Computed ──
  const totalPaid = project?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const paymentProgress = project?.contractValue ? Math.min((totalPaid / project.contractValue) * 100, 100) : 0;
  const sc = project ? statusColorMap(project.status) : statusColorMap('active');

  // ── Loading ──
  if (loading) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto p-4 md:p-6">
        <div className="h-32 sm:h-40 bg-muted rounded-xl animate-pulse -mx-4 md:-mx-6 -mt-4 md:-mt-6" />
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">Project not found</h3>
        <p className="text-muted-foreground text-sm mb-4">This project does not exist or you do not have access.</p>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5" onClick={() => setView('projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
        </Button>
      </div>
    );
  }

  const tasks = project.tasks || [];
  const milestones = project.milestones || [];
  const payments = project.payments || [];
  const doneTasks = tasks.filter(t => t.status === 'done');
  const taskProgress = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  return (
    <motion.div
      className="space-y-0 max-w-6xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Cover Gradient */}
      <motion.div variants={itemVariants} className="relative h-28 sm:h-36 -mx-4 md:-mx-6 -mt-4 md:-mt-6 overflow-hidden">
        <div className={`absolute inset-0 ${project.status === 'active' ? 'bg-gradient-to-br from-emerald-600 via-teal-500 to-emerald-700' : project.status === 'completed' ? 'bg-gradient-to-br from-teal-600 via-teal-400 to-teal-600' : project.status === 'on_hold' ? 'bg-gradient-to-br from-amber-500 via-amber-400 to-amber-600' : 'bg-gradient-to-br from-rose-500 via-rose-400 to-rose-600'}`} />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.2) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.15) 0%, transparent 40%)',
        }} />
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants} className="px-4 md:px-6 -mt-6 relative z-10">
        <div className="flex items-end gap-4">
          {/* Back button overlaying cover */}
          <Button
            variant="ghost"
            onClick={() => setView('projects')}
            className="absolute top-2 left-4 md:left-6 text-white/80 hover:text-white hover:bg-white/10 -mt-20 z-20"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>

          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-card shadow-lg flex items-center justify-center border-4 border-white dark:border-card">
            <FolderKanban className="h-7 w-7 text-emerald-600" />
          </div>
          <div className="pb-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                {project.tender?.title || 'Project'}
              </h1>
              <Badge className={`text-[10px] px-2 py-0 border-0 font-semibold ${sc.bg} ${sc.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} mr-1 inline-block`} />
                {sc.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Properties row */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Flag className="h-3 w-3" /> {project.tender?.title || 'Tender'}
          </span>
          <span className="flex items-center gap-1.5">
            <FolderKanban className="h-3 w-3" /> {project.bid?.user?.profile?.fullName || 'Assigned Contractor'}
          </span>
          <span className="flex items-center gap-1.5">
            <DollarSign className="h-3 w-3" /> {formatETB(project.contractValue)}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" /> Created {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-4 mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground">Overall Progress</span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{taskProgress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${taskProgress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      </motion.div>

      {/* Main Tabs */}
      <motion.div variants={itemVariants} className="px-4 md:px-6 mt-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 h-9 p-0.5 mb-5">
            <TabsTrigger value="board" className="text-xs px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md">
              <LayoutGrid className="h-3.5 w-3.5 mr-1.5" /> Board
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md">
              <GanttChart className="h-3.5 w-3.5 mr-1.5" /> Timeline
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md">
              <Receipt className="h-3.5 w-3.5 mr-1.5" /> Payments
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-xs px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-md">
              <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Chat
            </TabsTrigger>
          </TabsList>

          {/* ═══ BOARD TAB ═══ */}
          <TabsContent value="board" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {TASK_COLUMNS.map(col => {
                const ColIcon = col.icon;
                const columnTasks = tasks.filter(t => t.status === col.key);
                return (
                  <div key={col.key} className="flex flex-col">
                    {/* Column header */}
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <ColIcon className={`h-4 w-4 ${col.color === 'emerald' ? 'text-emerald-500' : col.color === 'amber' ? 'text-amber-500' : 'text-slate-400'}`} />
                      <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                      <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                        {columnTasks.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 ml-1"
                        onClick={() => { setAddTaskColumn(col.key); setNewTask(prev => ({ ...prev, status: col.key })); setShowAddTask(true); }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Task cards */}
                    <div className="flex flex-col gap-2 min-h-[100px] p-1 rounded-lg bg-muted/20">
                      <AnimatePresence mode="popLayout">
                        {columnTasks.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDeleteTask}
                            onEdit={handleEditTask}
                          />
                        ))}
                      </AnimatePresence>
                      {columnTasks.length === 0 && (
                        <div className="flex-1 flex items-center justify-center py-6">
                          <p className="text-xs text-muted-foreground/50">No tasks</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ═══ TIMELINE TAB ═══ */}
          <TabsContent value="timeline" className="mt-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Project Timeline</h3>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowAddMilestone(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Add Milestone
                </Button>
              </div>
              <ProjectTimeline
                project={project}
                onToggleMilestone={handleToggleMilestone}
              />
            </div>
          </TabsContent>

          {/* ═══ PAYMENTS TAB ═══ */}
          <TabsContent value="payments" className="mt-0">
            <div className="space-y-4">
              {/* Payment summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="rounded-xl border border-border/60 bg-card">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                      <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{formatETB(project.contractValue)}</p>
                      <p className="text-[10px] text-muted-foreground">Contract Value</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border border-border/60 bg-card">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/30">
                      <CreditCard className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{formatETB(totalPaid)}</p>
                      <p className="text-[10px] text-muted-foreground">Paid</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border border-border/60 bg-card">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                      <Receipt className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{formatETB(project.contractValue - totalPaid)}</p>
                      <p className="text-[10px] text-muted-foreground">Remaining</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment progress bar */}
              <div className="flex items-center gap-3 px-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Payment Progress</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-teal-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${paymentProgress}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400">{paymentProgress.toFixed(0)}%</span>
              </div>

              {/* Add payment button */}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowAddPayment(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Log Payment
                </Button>
              </div>

              {/* Payments table */}
              <Card className="rounded-xl border border-border/60 bg-card overflow-hidden">
                {payments.length === 0 ? (
                  <CardContent className="p-8 text-center">
                    <CreditCard className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No payments recorded yet</p>
                  </CardContent>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Amount</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Method</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">Reference</TableHead>
                        <TableHead className="text-xs hidden lg:table-cell">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map(p => (
                        <TableRow key={p.id} className="hover:bg-muted/30">
                          <TableCell className="text-xs">
                            {new Date(p.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{formatETB(p.amount)}</TableCell>
                          <TableCell className="text-xs hidden sm:table-cell text-muted-foreground">
                            {p.paymentMethod.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell className="text-xs hidden md:table-cell text-muted-foreground">
                            {p.referenceNumber || '-'}
                          </TableCell>
                          <TableCell className="text-xs hidden lg:table-cell text-muted-foreground max-w-[200px] truncate">
                            {p.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* ═══ CHAT TAB ═══ */}
          <TabsContent value="chat" className="mt-0">
            <Card className="rounded-xl border border-border/60 bg-card">
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-foreground mb-1">Project Chat</h3>
                <p className="text-xs text-muted-foreground mb-4">Communicate with the project team in real-time</p>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5"
                  onClick={() => {
                    if (project.chat?.id) {
                      setView('chat', { id: project.chat.id });
                    } else {
                      setView('chat');
                    }
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" /> Open Chat
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ═══ ADD TASK DIALOG ═══ */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-500" /> Add Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input
                value={newTask.title}
                onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Task title"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={newTask.description}
                onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the task..."
                rows={2}
                className="text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={e => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={addTaskColumn} onValueChange={v => setAddTaskColumn(v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="h-8">Cancel</Button>
            </DialogClose>
            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAddTask}>
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ EDIT TASK DIALOG ═══ */}
      <Dialog open={showEditTask} onOpenChange={setShowEditTask}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-amber-500" /> Edit Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input
                value={editTaskForm.title}
                onChange={e => setEditTaskForm(prev => ({ ...prev, title: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={editTaskForm.description}
                onChange={e => setEditTaskForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={editTaskForm.dueDate}
                  onChange={e => setEditTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={editTaskForm.status} onValueChange={v => setEditTaskForm(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="h-8">Cancel</Button>
            </DialogClose>
            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveEditTask}>
              <Save className="h-3 w-3 mr-1" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ ADD MILESTONE DIALOG ═══ */}
      <Dialog open={showAddMilestone} onOpenChange={setShowAddMilestone}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-amber-500" /> Add Milestone
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input
                value={newMilestone.title}
                onChange={e => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Milestone title"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Due Date</Label>
              <Input
                type="date"
                value={newMilestone.dueDate}
                onChange={e => setNewMilestone(prev => ({ ...prev, dueDate: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="h-8">Cancel</Button>
            </DialogClose>
            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAddMilestone}>
              Add Milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ ADD PAYMENT DIALOG ═══ */}
      <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-teal-500" /> Log Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Amount (ETB) *</Label>
                <Input
                  type="number"
                  value={newPayment.amount}
                  onChange={e => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Payment Date</Label>
                <Input
                  type="date"
                  value={newPayment.paymentDate}
                  onChange={e => setNewPayment(prev => ({ ...prev, paymentDate: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Payment Method</Label>
              <Select value={newPayment.paymentMethod} onValueChange={v => setNewPayment(prev => ({ ...prev, paymentMethod: v }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Reference Number</Label>
              <Input
                value={newPayment.referenceNumber}
                onChange={e => setNewPayment(prev => ({ ...prev, referenceNumber: e.target.value }))}
                placeholder="Reference number"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={newPayment.notes}
                onChange={e => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Payment notes..."
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="h-8">Cancel</Button>
            </DialogClose>
            <Button size="sm" className="h-8 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleAddPayment}>
              Log Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ─── Project Timeline Sub-Component ──────────────────────────────────
function ProjectTimeline({
  project,
  onToggleMilestone,
}: {
  project: Project;
  onToggleMilestone: (id: string, completed: boolean) => void;
}) {
  const timelineWidth = 800;
  const headerHeight = 36;
  const milestones = project.milestones || [];
  const rowHeight = 44;

  const { start, end } = useMemo(() => getTimelineRange(project), [project]);
  const months = useMemo(() => monthRange(start, end), [start, end]);

  const createdAt = new Date(project.createdAt);
  const lastMilestone = milestones.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())[0];
  const projectEnd = lastMilestone ? new Date(lastMilestone.dueDate) : new Date(createdAt.getTime() + 90 * 86400000);

  const sc = statusColorMap(project.status);
  const taskProgress = (project.tasks || []).length > 0
    ? Math.round((project.tasks!.filter(t => t.status === 'done').length / project.tasks!.length) * 100)
    : 0;

  const nowX = dateToX(new Date(), start, end, timelineWidth);

  const milestoneData = milestones.map(m => ({
    ...m,
    x: dateToX(new Date(m.dueDate), start, end, timelineWidth),
  }));

  const svgHeight = headerHeight + rowHeight + 20;

  return (
    <div className="space-y-3">
      <Card className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <svg width={timelineWidth + 180} height={svgHeight} className="min-w-full">
            {/* Month columns */}
            {months.map((m, i) => {
              const x = dateToX(m, start, end, timelineWidth) + 180;
              const nextM = new Date(m);
              nextM.setMonth(nextM.getMonth() + 1);
              const x2 = dateToX(nextM, start, end, timelineWidth) + 180;
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
            <line x1={nowX + 180} y1={0} x2={nowX + 180} y2={svgHeight} stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={nowX + 180} y={12} textAnchor="middle" className="text-[9px] fill-rose-500 font-semibold">TODAY</text>

            {/* Project bar */}
            {(() => {
              const x1 = dateToX(createdAt, start, end, timelineWidth) + 180;
              const x2 = dateToX(projectEnd, start, end, timelineWidth) + 180;
              const y = headerHeight + 12;
              const barH = 20;
              const barW = Math.max(x2 - x1, 8);
              return (
                <g>
                  <rect x={x1} y={y} width={barW} height={barH} rx={4} fill={sc.bar} fillOpacity={0.2} />
                  <rect x={x1} y={y} width={barW * (taskProgress / 100)} height={barH} rx={4} fill={sc.bar} />
                </g>
              );
            })()}

            {/* Milestone diamonds */}
            {milestoneData.map((m, i) => {
              const y = headerHeight + rowHeight / 2;
              return (
                <g key={m.id} className="cursor-pointer" onClick={() => onToggleMilestone(m.id, m.completed)}>
                  <polygon
                    points={`${m.x + 180},${y - 6} ${m.x + 186},${y} ${m.x + 180},${y + 6} ${m.x + 174},${y}`}
                    fill={m.completed ? '#10b981' : sc.bar}
                    stroke="white"
                    strokeWidth={1.5}
                  />
                  <text x={m.x + 180} y={y + 18} textAnchor="middle" className={`text-[9px] ${m.completed ? 'fill-emerald-500' : 'fill-muted-foreground'} font-medium`}>
                    {m.title.slice(0, 12)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </Card>

      {/* Milestones list */}
      <Card className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Milestone</TableHead>
              <TableHead className="text-xs">Due Date</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Flag className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No milestones defined</p>
                </TableCell>
              </TableRow>
            ) : (
              milestones
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .map(m => {
                  const isOverdue = !m.completed && new Date(m.dueDate).getTime() < Date.now();
                  return (
                    <TableRow key={m.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => onToggleMilestone(m.id, m.completed)}>
                      <TableCell className="text-sm font-medium">{m.title}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(m.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        {m.completed ? (
                          <Badge className="text-[10px] px-2 py-0 border-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                          </Badge>
                        ) : isOverdue ? (
                          <Badge className="text-[10px] px-2 py-0 border-0 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] px-2 py-0 border-0 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                            <Clock className="h-3 w-3 mr-1" /> Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                      </TableCell>
                    </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
