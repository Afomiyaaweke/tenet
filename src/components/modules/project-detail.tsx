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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft, FolderKanban, Plus, GripVertical, Clock, CheckCircle2,
  Circle, DollarSign, TrendingUp, AlertTriangle, Calendar, MessageSquare
} from 'lucide-react';

export function ProjectDetailView({ projectId }: { projectId?: string }) {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('kanban');

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

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-6xl mx-auto">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
        <div className="h-40 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="outline" onClick={() => setView('projects')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
        </Button>
      </div>
    );
  }

  const tasks = project.tasks || [];
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Back */}
      <Button variant="ghost" onClick={() => setView('projects')} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
      </Button>

      {/* Project Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">{project.tender?.title || 'Project'}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Contractor: {project.bid?.user?.profile?.fullName || 'Assigned'} &middot; Timeline: {project.bid?.timeline || 'N/A'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="text-sm bg-emerald-100 text-emerald-700">ETB {project.contractValue.toLocaleString()}</Badge>
              <Badge className={`text-xs ${project.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                {project.status.replace('_', ' ')}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setView('chat', { id: project.chat?.id || '' })}>
                <MessageSquare className="h-4 w-4 mr-1" /> Chat
              </Button>
            </div>
          </div>

          {/* Payment Progress */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Payment Progress</p>
              <p className="text-sm text-muted-foreground">
                ETB {totalPaid.toLocaleString()} / ETB {project.contractValue.toLocaleString()} ({paymentProgress.toFixed(0)}%)
              </p>
            </div>
            <Progress value={paymentProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="finance">Financial Tracking</TabsTrigger>
        </TabsList>

        {/* Kanban Board */}
        <TabsContent value="kanban" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Tasks</h3>
            {isAdmin && (
              <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4 mr-1" /> Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Task</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input value={newTask.title} onChange={e => setNewTask(d => ({ ...d, title: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={newTask.description} onChange={e => setNewTask(d => ({ ...d, description: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input type="date" value={newTask.dueDate} onChange={e => setNewTask(d => ({ ...d, dueDate: e.target.value }))} />
                    </div>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleAddTask}>Add Task</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* To Do Column */}
            <KanbanColumn title="To Do" icon={<Circle className="h-4 w-4 text-gray-400" />} tasks={todoTasks}
              color="border-t-gray-400" onMoveTask={(id) => handleUpdateTaskStatus(id, 'in_progress')} moveLabel="Start" />
            <KanbanColumn title="In Progress" icon={<Clock className="h-4 w-4 text-amber-500" />} tasks={inProgressTasks}
              color="border-t-amber-400" onMoveTask={(id) => handleUpdateTaskStatus(id, 'done')} moveLabel="Complete" />
            <KanbanColumn title="Done" icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} tasks={doneTasks}
              color="border-t-emerald-400" onMoveTask={(id) => handleUpdateTaskStatus(id, 'todo')} moveLabel="Reopen" />
          </div>
        </TabsContent>

        {/* Milestones */}
        <TabsContent value="milestones" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Milestones</h3>
            {isAdmin && (
              <Dialog open={showAddMilestone} onOpenChange={setShowAddMilestone}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4 mr-1" /> Add Milestone
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Milestone</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input value={newMilestone.title} onChange={e => setNewMilestone(d => ({ ...d, title: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date *</Label>
                      <Input type="date" value={newMilestone.dueDate} onChange={e => setNewMilestone(d => ({ ...d, dueDate: e.target.value }))} />
                    </div>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleAddMilestone}>Add Milestone</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="space-y-3">
            {(project.milestones || []).length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No milestones defined</CardContent></Card>
            ) : (project.milestones || []).map(ms => {
              const isOverdue = !ms.completed && new Date(ms.dueDate) < new Date();
              const isSoon = !ms.completed && !isOverdue && (new Date(ms.dueDate).getTime() - Date.now()) < 48 * 60 * 60 * 1000;
              return (
                <Card key={ms.id} className={`border-l-4 ${ms.completed ? 'border-l-emerald-400' : isOverdue ? 'border-l-red-400' : isSoon ? 'border-l-amber-400' : 'border-l-gray-300'}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleToggleMilestone(ms.id, ms.completed)}
                        className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer hover:border-emerald-400 transition-colors">
                        {ms.completed ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : null}
                      </button>
                      <div>
                        <p className={`text-sm font-medium ${ms.completed ? 'line-through text-muted-foreground' : ''}`}>{ms.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {new Date(ms.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOverdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                      {isSoon && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Due Soon</Badge>}
                      {ms.completed && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Complete</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Financial Tracking */}
        <TabsContent value="finance" className="mt-4">
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100"><DollarSign className="h-5 w-5 text-emerald-600" /></div>
                <div>
                  <p className="text-2xl font-bold">ETB {totalPaid.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100"><TrendingUp className="h-5 w-5 text-amber-600" /></div>
                <div>
                  <p className="text-2xl font-bold">ETB {(project.contractValue - totalPaid).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-100"><CheckCircle2 className="h-5 w-5 text-teal-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{paymentProgress.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Progress</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Log */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Payment Log</h3>
            {(isAdmin || user?.role === 'tender_owner') && (
              <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4 mr-1" /> Log Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Log Payment</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Amount (ETB) *</Label>
                      <Input type="number" value={newPayment.amount} onChange={e => setNewPayment(d => ({ ...d, amount: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select value={newPayment.paymentMethod} onValueChange={v => setNewPayment(d => ({ ...d, paymentMethod: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="cbe_birr">CBE Birr</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Reference Number</Label>
                      <Input value={newPayment.referenceNumber} onChange={e => setNewPayment(d => ({ ...d, referenceNumber: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Date *</Label>
                      <Input type="date" value={newPayment.paymentDate} onChange={e => setNewPayment(d => ({ ...d, paymentDate: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea value={newPayment.notes} onChange={e => setNewPayment(d => ({ ...d, notes: e.target.value }))} />
                    </div>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleAddPayment}>Log Payment</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {(project.payments || []).length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No payments logged yet</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {project.payments.map(payment => (
                <Card key={payment.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">ETB {payment.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.paymentMethod.replace('_', ' ')} &middot; {new Date(payment.paymentDate).toLocaleDateString()}
                        {payment.referenceNumber && ` &middot; Ref: ${payment.referenceNumber}`}
                      </p>
                      {payment.notes && <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>}
                    </div>
                    <Badge variant="outline" className="text-xs">{payment.paymentMethod.replace('_', ' ')}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KanbanColumn({ title, icon, tasks, color, onMoveTask, moveLabel }: {
  title: string; icon: React.ReactNode; tasks: Task[]; color: string;
  onMoveTask: (id: string) => void; moveLabel: string;
}) {
  return (
    <Card className={`border-t-4 ${color}`}>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon} {title} ({tasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-2 max-h-96 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No tasks</p>
        ) : tasks.map(task => (
          <div key={task.id} className="bg-gray-50 rounded-lg p-3 space-y-2 hover:bg-gray-100 transition-colors">
            <p className="text-sm font-medium">{task.title}</p>
            {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
            {task.dueDate && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {new Date(task.dueDate).toLocaleDateString()}
              </p>
            )}
            <Button size="sm" variant="outline" className="w-full text-xs h-7"
              onClick={() => onMoveTask(task.id)}>
              {moveLabel}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
