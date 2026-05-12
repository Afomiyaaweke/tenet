'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api, Project, Task, Milestone, Payment } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft, FolderKanban, Plus, GripVertical, Clock, CheckCircle2,
  Circle, DollarSign, TrendingUp, AlertTriangle, Calendar, MessageSquare,
  ChevronRight, Sparkles, CreditCard, Flag, ListChecks,
} from 'lucide-react';

export function ProjectDetailView({ projectId }: { projectId?: string }) {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');

  // Form states
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', status: 'todo' });
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

  useEffect(() => {
    if (projectId) loadProject();
  }, [projectId, loadProject]);

  const handleAddTask = async () => {
    const res = await api.post(`/projects/${projectId}/tasks`, newTask);
    if (res.success) {
      toast.success('Task added');
      setShowAddTask(false);
      setNewTask({ title: '', description: '', dueDate: '', status: 'todo' });
      loadProject();
    } else toast.error(res.error || 'Failed to add task');
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    const res = await api.patch(`/projects/${projectId}/tasks/${taskId}/status`, { status });
    if (res.success) {
      toast.success('Task updated');
      loadProject();
    } else toast.error(res.error || 'Failed to update task');
  };

  const handleAddMilestone = async () => {
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

  const handleAddPayment = async () => {
    const res = await api.post(`/projects/${projectId}/payments`, {
      ...newPayment,
      amount: parseFloat(newPayment.amount),
    });
    if (res.success) {
      toast.success('Payment logged');
      setShowAddPayment(false);
      setNewPayment({ amount: '', paymentMethod: 'bank_transfer', referenceNumber: '', notes: '', paymentDate: '' });
      loadProject();
    } else toast.error(res.error || 'Failed to log payment');
  };

  const totalPaid = project?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const paymentProgress = project?.contractValue ? Math.min((totalPaid / project.contractValue) * 100, 100) : 0;

  const statusConfig = (status: string) => {
    switch (status) {
      case 'active': return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', gradient: 'gradient-emerald', label: 'Active' };
      case 'completed': return { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500', gradient: 'gradient-teal', label: 'Completed' };
      case 'on_hold': return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', gradient: 'gradient-amber', label: 'On Hold' };
      case 'cancelled': return { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', gradient: 'gradient-rose', label: 'Cancelled' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500', gradient: 'gradient-emerald', label: status };
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-6xl mx-auto">
        <div className="h-8 bg-gray-200 rounded-xl w-1/3 animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse premium-shadow" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse premium-shadow" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center view-enter">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-rose flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">Project not found</h3>
        <p className="text-muted-foreground text-sm mb-4">The project you are looking for does not exist or you do not have access.</p>
        <Button
          className="gradient-emerald hover:opacity-90 text-white rounded-xl px-5 premium-shadow"
          onClick={() => setView('projects')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
        </Button>
      </div>
    );
  }

  const tasks = project.tasks || [];
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');
  const taskProgress = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  const sc = statusConfig(project.status);
  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto view-enter">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => setView('projects')}
        className="text-muted-foreground hover:text-emerald-700 hover:bg-emerald-50 -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Projects
      </Button>

      {/* Project Header Card */}
      <Card className="premium-shadow-lg rounded-xl border-0 bg-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl ${sc.gradient} flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-200/30`}>
                <FolderKanban className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{project.tender?.title || 'Project'}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Contractor: {project.bid?.user?.profile?.fullName || 'Assigned'} &middot; Timeline: {project.bid?.timeline || 'N/A'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={`text-xs px-2.5 py-0.5 border-0 font-semibold ${sc.bg} ${sc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} mr-1.5 inline-block`} />
                    {sc.label}
                  </Badge>
                  <Badge className="text-xs px-2.5 py-0.5 border-0 font-semibold bg-emerald-50 text-emerald-700">
                    <DollarSign className="h-3 w-3 mr-1" /> ETB {project.contractValue.toLocaleString()}
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              className="gradient-emerald hover:opacity-90 text-white rounded-xl px-4 premium-shadow transition-all hover:-translate-y-0.5"
              onClick={() => setView('chat', { id: project.chat?.id || '' })}
            >
              <MessageSquare className="h-4 w-4 mr-2" /> Chat
            </Button>
          </div>

          {/* Payment Progress */}
          <div className="mt-6 pt-5 border-t border-border/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">Payment Progress</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-emerald-600">ETB {totalPaid.toLocaleString()}</span>
                {' / '}ETB {project.contractValue.toLocaleString()} ({paymentProgress.toFixed(0)}%)
              </p>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                style={{ width: `${paymentProgress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white premium-shadow rounded-xl border-0 h-11 p-1 gap-1">
          <TabsTrigger
            value="tasks"
            className="rounded-lg data-[state=active]:gradient-emerald data-[state=active]:text-white data-[state=active]:premium-shadow text-xs font-semibold px-4"
          >
            <ListChecks className="h-3.5 w-3.5 mr-1.5" /> Tasks
          </TabsTrigger>
          <TabsTrigger
            value="milestones"
            className="rounded-lg data-[state=active]:gradient-emerald data-[state=active]:text-white data-[state=active]:premium-shadow text-xs font-semibold px-4"
          >
            <Flag className="h-3.5 w-3.5 mr-1.5" /> Milestones
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="rounded-lg data-[state=active]:gradient-emerald data-[state=active]:text-white data-[state=active]:premium-shadow text-xs font-semibold px-4"
          >
            <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Payments
          </TabsTrigger>
        </TabsList>

        {/* ─── Tasks Tab (Kanban) ──────────────────────────────── */}
        <TabsContent value="tasks" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-foreground">Task Board</h3>
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-emerald-200 text-emerald-700 bg-emerald-50/50">
                {taskProgress}% complete
              </Badge>
            </div>
            {isAdmin && (
              <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5">
                    <Plus className="h-4 w-4 mr-1" /> Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-xl">
                  <DialogHeader><DialogTitle className="text-lg font-bold">Add New Task</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Title *</Label>
                      <Input className="rounded-lg focus:ring-emerald-500 focus:border-emerald-500" value={newTask.title} onChange={e => setNewTask(d => ({ ...d, title: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Description</Label>
                      <Textarea className="rounded-lg focus:ring-emerald-500 focus:border-emerald-500" value={newTask.description} onChange={e => setNewTask(d => ({ ...d, description: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Due Date</Label>
                      <Input type="date" className="rounded-lg focus:ring-emerald-500 focus:border-emerald-500" value={newTask.dueDate} onChange={e => setNewTask(d => ({ ...d, dueDate: e.target.value }))} />
                    </div>
                    <Button className="w-full gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow" onClick={handleAddTask}>Add Task</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <KanbanColumn title="To Do" icon={<Circle className="h-4 w-4" />} tasks={todoTasks}
              colorTheme="slate" onMoveTask={(id) => handleUpdateTaskStatus(id, 'in_progress')} moveLabel="Start" moveIcon={<ChevronRight className="h-3 w-3" />} />
            <KanbanColumn title="In Progress" icon={<Clock className="h-4 w-4" />} tasks={inProgressTasks}
              colorTheme="amber" onMoveTask={(id) => handleUpdateTaskStatus(id, 'done')} moveLabel="Complete" moveIcon={<CheckCircle2 className="h-3 w-3" />} />
            <KanbanColumn title="Done" icon={<CheckCircle2 className="h-4 w-4" />} tasks={doneTasks}
              colorTheme="emerald" onMoveTask={(id) => handleUpdateTaskStatus(id, 'todo')} moveLabel="Reopen" moveIcon={<Circle className="h-3 w-3" />} />
          </div>
        </TabsContent>

        {/* ─── Milestones Tab (Timeline) ───────────────────────── */}
        <TabsContent value="milestones" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground">Milestones</h3>
            {isAdmin && (
              <Dialog open={showAddMilestone} onOpenChange={setShowAddMilestone}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5">
                    <Plus className="h-4 w-4 mr-1" /> Add Milestone
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-xl">
                  <DialogHeader><DialogTitle className="text-lg font-bold">Add Milestone</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Title *</Label>
                      <Input className="rounded-lg focus:ring-emerald-500 focus:border-emerald-500" value={newMilestone.title} onChange={e => setNewMilestone(d => ({ ...d, title: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Due Date *</Label>
                      <Input type="date" className="rounded-lg focus:ring-emerald-500 focus:border-emerald-500" value={newMilestone.dueDate} onChange={e => setNewMilestone(d => ({ ...d, dueDate: e.target.value }))} />
                    </div>
                    <Button className="w-full gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow" onClick={handleAddMilestone}>Add Milestone</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {(project.milestones || []).length === 0 ? (
            <Card className="premium-shadow rounded-xl border-0 bg-white">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-teal flex items-center justify-center">
                  <Flag className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-base font-bold text-foreground mb-1">No milestones defined</h4>
                <p className="text-sm text-muted-foreground">Add milestones to track key project deliverables.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative pl-8">
              {/* Vertical connecting line */}
              <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-emerald-300 via-amber-300 to-gray-200 rounded-full" />

              <div className="space-y-4">
                {(project.milestones || []).map(ms => {
                  const isOverdue = !ms.completed && new Date(ms.dueDate) < new Date();
                  const isSoon = !ms.completed && !isOverdue && (new Date(ms.dueDate).getTime() - Date.now()) < 48 * 60 * 60 * 1000;
                  const dotColor = ms.completed
                    ? 'bg-emerald-500 shadow-md shadow-emerald-200'
                    : isOverdue
                      ? 'bg-rose-500 shadow-md shadow-rose-200'
                      : isSoon
                        ? 'bg-amber-500 shadow-md shadow-amber-200'
                        : 'bg-gray-300';
                  const borderColor = ms.completed
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : isOverdue
                      ? 'border-rose-200 bg-rose-50/50'
                      : isSoon
                        ? 'border-amber-200 bg-amber-50/50'
                        : 'border-border/60 bg-white';

                  return (
                    <Card key={ms.id} className={`premium-shadow rounded-xl border-0 overflow-hidden`}>
                      <CardContent className={`p-4 border-l-4 ${borderColor} flex items-center justify-between`}>
                        <div className="flex items-center gap-4">
                          {/* Timeline dot */}
                          <div className="absolute left-[8px]">
                            <div className={`w-[15px] h-[15px] rounded-full border-2 border-white ${dotColor} z-10`} />
                          </div>
                          <button onClick={() => handleToggleMilestone(ms.id, ms.completed)}
                            className="w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer hover:border-emerald-400 transition-colors bg-white">
                            {ms.completed ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : null}
                          </button>
                          <div>
                            <p className={`text-sm font-semibold ${ms.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{ms.title}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3" /> {new Date(ms.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOverdue && <Badge className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 border-0 font-semibold">Overdue</Badge>}
                          {isSoon && <Badge className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 border-0 font-semibold">Due Soon</Badge>}
                          {ms.completed && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 border-0 font-semibold">Complete</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── Payments Tab ────────────────────────────────────── */}
        <TabsContent value="payments" className="mt-4">
          {/* Finance stat cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-300">
              <CardContent className="p-5 flex items-center gap-3">
                <div className="p-2.5 rounded-xl gradient-emerald flex-shrink-0 shadow-sm">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">ETB {totalPaid.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground font-medium">Total Paid</p>
                </div>
              </CardContent>
            </Card>
            <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-300">
              <CardContent className="p-5 flex items-center gap-3">
                <div className="p-2.5 rounded-xl gradient-amber flex-shrink-0 shadow-sm">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">ETB {(project.contractValue - totalPaid).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground font-medium">Remaining</p>
                </div>
              </CardContent>
            </Card>
            <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-300">
              <CardContent className="p-5 flex items-center gap-3">
                <div className="p-2.5 rounded-xl gradient-teal flex-shrink-0 shadow-sm">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">{paymentProgress.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground font-medium">Progress</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Log */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground">Payment Log</h3>
            {(isAdmin || user?.role === 'tender_owner') && (
              <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5">
                    <Plus className="h-4 w-4 mr-1" /> Log Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-xl">
                  <DialogHeader><DialogTitle className="text-lg font-bold">Log Payment</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Amount (ETB) *</Label>
                      <Input type="number" className="rounded-lg focus:ring-emerald-500 focus:border-emerald-500" value={newPayment.amount} onChange={e => setNewPayment(d => ({ ...d, amount: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Payment Method</Label>
                      <Select value={newPayment.paymentMethod} onValueChange={v => setNewPayment(d => ({ ...d, paymentMethod: v }))}>
                        <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="cbe_birr">CBE Birr</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Reference Number</Label>
                      <Input className="rounded-lg focus:ring-emerald-500 focus:border-emerald-500" value={newPayment.referenceNumber} onChange={e => setNewPayment(d => ({ ...d, referenceNumber: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Payment Date *</Label>
                      <Input type="date" className="rounded-lg focus:ring-emerald-500 focus:border-emerald-500" value={newPayment.paymentDate} onChange={e => setNewPayment(d => ({ ...d, paymentDate: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Notes</Label>
                      <Textarea className="rounded-lg focus:ring-emerald-500 focus:border-emerald-500" value={newPayment.notes} onChange={e => setNewPayment(d => ({ ...d, notes: e.target.value }))} />
                    </div>
                    <Button className="w-full gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow" onClick={handleAddPayment}>Log Payment</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {(project.payments || []).length === 0 ? (
            <Card className="premium-shadow rounded-xl border-0 bg-white">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-amber flex items-center justify-center">
                  <CreditCard className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-base font-bold text-foreground mb-1">No payments logged yet</h4>
                <p className="text-sm text-muted-foreground">Record payments as they are received.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(project.payments ?? []).map(payment => {
                const methodGradient: Record<string, string> = {
                  bank_transfer: 'gradient-teal',
                  cbe_birr: 'gradient-emerald',
                  cash: 'gradient-amber',
                  check: 'gradient-rose',
                };
                const g = methodGradient[payment.paymentMethod] || 'gradient-emerald';
                return (
                  <Card key={payment.id} className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-300">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${g} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <CreditCard className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">ETB {payment.amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {payment.paymentMethod.replace('_', ' ')} &middot; {new Date(payment.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          {payment.referenceNumber && (
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5">Ref: {payment.referenceNumber}</p>
                          )}
                          {payment.notes && <p className="text-xs text-muted-foreground mt-1 italic">{payment.notes}</p>}
                        </div>
                      </div>
                      <Badge className="text-[10px] px-2.5 py-0.5 border-0 font-semibold bg-emerald-50 text-emerald-700">
                        {payment.paymentMethod.replace('_', ' ')}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KanbanColumn({ title, icon, tasks, colorTheme, onMoveTask, moveLabel, moveIcon }: {
  title: string; icon: React.ReactNode; tasks: Task[]; colorTheme: string;
  onMoveTask: (id: string) => void; moveLabel: string; moveIcon?: React.ReactNode;
}) {
  const themeStyles: Record<string, { headerBg: string; headerText: string; cardBg: string; dotColor: string }> = {
    slate: { headerBg: 'bg-gray-50', headerText: 'text-gray-700', cardBg: 'bg-white hover:bg-gray-50/80', dotColor: 'bg-gray-400' },
    amber: { headerBg: 'bg-amber-50', headerText: 'text-amber-700', cardBg: 'bg-white hover:bg-amber-50/50', dotColor: 'bg-amber-500' },
    emerald: { headerBg: 'bg-emerald-50', headerText: 'text-emerald-700', cardBg: 'bg-white hover:bg-emerald-50/50', dotColor: 'bg-emerald-500' },
  };
  const theme = themeStyles[colorTheme] || themeStyles.slate;

  return (
    <Card className="premium-shadow rounded-xl border-0 bg-white/80 overflow-hidden">
      <div className={`px-4 py-3 ${theme.headerBg} border-b border-border/30`}>
        <div className="flex items-center gap-2">
          <span className={theme.headerText}>{icon}</span>
          <CardTitle className={`text-sm font-semibold ${theme.headerText}`}>{title}</CardTitle>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto border-0 bg-white/60 font-semibold">
            {tasks.length}
          </Badge>
        </div>
      </div>
      <CardContent className="p-3 space-y-2.5 max-h-96 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="py-8 text-center">
            <div className={`w-8 h-8 mx-auto mb-2 rounded-full ${theme.headerBg} flex items-center justify-center`}>
              <span className={`w-2 h-2 rounded-full ${theme.dotColor}`} />
            </div>
            <p className="text-xs text-muted-foreground">No tasks</p>
          </div>
        ) : tasks.map(task => (
          <div key={task.id} className={`${theme.cardBg} rounded-xl p-3.5 space-y-2.5 premium-shadow transition-all duration-200 border border-border/30`}>
            <div className="flex items-start gap-2">
              <span className={`w-2 h-2 rounded-full ${theme.dotColor} mt-1.5 flex-shrink-0`} />
              <p className="text-sm font-medium text-foreground">{task.title}</p>
            </div>
            {task.description && <p className="text-xs text-muted-foreground line-clamp-2 ml-4">{task.description}</p>}
            {task.dueDate && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 ml-4">
                <Calendar className="h-3 w-3" /> {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-xs h-7 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition-colors font-medium"
              onClick={() => onMoveTask(task.id)}
            >
              {moveIcon} <span className="ml-1">{moveLabel}</span>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
