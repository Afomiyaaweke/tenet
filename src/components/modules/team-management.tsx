'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Users, UserPlus, Shield, ClipboardList, MoreHorizontal,
  Crown, Settings, Trash2, Edit3, Check, X, Search,
  Plus, Clock, AlertTriangle, ChevronDown, Eye,
  Lock, Unlock, Briefcase, FileSearch, Gavel,
  FolderKanban, MessageSquare, FileText, GraduationCap,
  Bot, LayoutDashboard, Globe2, ClipboardList as PublishedTenders,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

interface TeamMemberUser {
  id: string;
  email: string;
  role: string;
  status?: string;
  profile: {
    fullName: string | null;
    jobTitle: string | null;
    profilePhoto: string | null;
    verified?: boolean;
  } | null;
}

interface TeamMember {
  id: string;
  companyId: string;
  userId: string;
  role: string;
  permissions: string;
  status: string;
  joinedAt: string;
  user: TeamMemberUser;
}

interface TaskAssignee {
  id: string;
  email: string;
  profile: {
    fullName: string | null;
    profilePhoto: string | null;
  } | null;
}

interface TeamTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  assignee: TaskAssignee | null;
}

// ─── Constants ──────────────────────────────────────────────────

const ROLES = ['owner', 'admin', 'manager', 'member', 'viewer'] as const;
const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
};
const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  admin: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  manager: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  member: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  viewer: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const STATUSES = ['todo', 'in_progress', 'in_review', 'done'] as const;
const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};
const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  in_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
const PRIORITY_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
};

// All available permission keys
const ALL_PERMISSIONS = [
  { key: 'view_dashboard', label: 'View Dashboard', icon: LayoutDashboard, desc: 'Access the main dashboard' },
  { key: 'view_tenders', label: 'View Tenders', icon: FileSearch, desc: 'Browse and read tenders' },
  { key: 'manage_tenders', label: 'Manage Tenders', icon: FileSearch, desc: 'Create, edit, delete tenders' },
  { key: 'view_live_tenders', label: 'View Live Tenders', icon: Globe2, desc: 'Browse international tenders' },
  { key: 'view_bids', label: 'View Bids', icon: Gavel, desc: 'Read bid submissions' },
  { key: 'manage_bids', label: 'Manage Bids', icon: Gavel, desc: 'Create, edit, withdraw bids' },
  { key: 'view_projects', label: 'View Projects', icon: FolderKanban, desc: 'Read project details' },
  { key: 'manage_projects', label: 'Manage Projects', icon: FolderKanban, desc: 'Create, edit projects' },
  { key: 'view_documents', label: 'View Documents', icon: FileText, desc: 'Read company documents' },
  { key: 'manage_documents', label: 'Manage Documents', icon: FileText, desc: 'Upload, edit, delete documents' },
  { key: 'view_chat', label: 'View Messages', icon: MessageSquare, desc: 'Read chat messages' },
  { key: 'send_chat', label: 'Send Messages', icon: MessageSquare, desc: 'Send chat messages' },
  { key: 'view_events', label: 'View Workshops', icon: GraduationCap, desc: 'Browse workshops & training' },
  { key: 'manage_events', label: 'Manage Workshops', icon: GraduationCap, desc: 'Create, edit workshops' },
  { key: 'use_ai', label: 'Use AI Tools', icon: Bot, desc: 'Access AI document studio & analyzer' },
  { key: 'manage_team', label: 'Manage Team', icon: Users, desc: 'Add/remove team members' },
];

// ─── Helper ─────────────────────────────────────────────────────

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.split(' ').filter(Boolean);
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name[0].toUpperCase();
  }
  return email[0].toUpperCase();
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function parsePerms(str: string): Set<string> {
  return new Set(str.split(',').map((s) => s.trim()).filter(Boolean));
}

function permsToString(set: Set<string>): string {
  return Array.from(set).join(',');
}

// ─── Component ──────────────────────────────────────────────────

export function TeamManagementView() {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');

  const fetchMembers = useCallback(async () => {
    try {
      const res = await api.get('/team/members');
      if (res.success) setMembers(res.data);
    } catch (err) {
      console.error('Fetch members error:', err);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/team/tasks');
      if (res.success) setTasks(res.data);
    } catch (err) {
      console.error('Fetch tasks error:', err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchMembers(), fetchTasks()]);
      setLoading(false);
    })();
  }, [fetchMembers, fetchTasks]);

  // ── Derived ──
  const activeMembers = members.filter((m) => m.status === 'active');
  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const inReviewTasks = tasks.filter((t) => t.status === 'in_review');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-muted/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Team Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage members, tasks, and permissions</p>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeMembers.length}</p>
              <p className="text-xs text-muted-foreground">Active Members</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeMembers.filter((m) => ['owner', 'admin'].includes(m.role)).length}</p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-teal-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{tasks.length}</p>
              <p className="text-xs text-muted-foreground">Total Tasks</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Check className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{doneTasks.length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="members" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Members
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Permissions
          </TabsTrigger>
        </TabsList>

        {/* ─── Members Tab ─── */}
        <TabsContent value="members" className="mt-4">
          <MembersTab
            members={members}
            activeMembers={activeMembers}
            onRefresh={fetchMembers}
            currentUserId={user?.id || ''}
          />
        </TabsContent>

        {/* ─── Tasks Tab ─── */}
        <TabsContent value="tasks" className="mt-4">
          <TasksTab
            tasks={tasks}
            members={activeMembers}
            todoTasks={todoTasks}
            inProgressTasks={inProgressTasks}
            inReviewTasks={inReviewTasks}
            doneTasks={doneTasks}
            onRefresh={fetchTasks}
          />
        </TabsContent>

        {/* ─── Permissions Tab ─── */}
        <TabsContent value="permissions" className="mt-4">
          <PermissionsTab
            members={activeMembers}
            onRefresh={fetchMembers}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Members Tab ────────────────────────────────────────────────

function MembersTab({
  members,
  activeMembers,
  onRefresh,
  currentUserId,
}: {
  members: TeamMember[];
  activeMembers: TeamMember[];
  onRefresh: () => Promise<void>;
  currentUserId: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState('');

  const filtered = activeMembers.filter((m) => {
    if (!searchQ) return true;
    const name = m.user.profile?.fullName || '';
    return name.toLowerCase().includes(searchQ.toLowerCase()) || m.user.email.toLowerCase().includes(searchQ.toLowerCase());
  });

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this team member?')) return;
    const res = await api.delete(`/team/members/${id}`);
    if (res.success) onRefresh();
  };

  const handleRoleChange = async () => {
    if (!editingMember) return;
    const res = await api.patch(`/team/members/${editingMember.id}`, { role: editRole });
    if (res.success) {
      setEditingMember(null);
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-1.5">
          <UserPlus className="h-4 w-4" /> Add Member
        </Button>
      </div>

      {/* ── Member List ── */}
      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No team members found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Add members to get started</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((member) => (
            <Card key={member.id} className="border border-border/50 hover:border-border transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {getInitials(member.user.profile?.fullName, member.user.email)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate text-foreground">
                      {member.user.profile?.fullName || member.user.email}
                    </p>
                    {member.userId === currentUserId && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-0">You</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                  {member.user.profile?.jobTitle && (
                    <p className="text-[11px] text-muted-foreground/70 truncate">{member.user.profile.jobTitle}</p>
                  )}
                </div>

                {/* Role Badge */}
                <Badge className={`text-[10px] px-2 py-0.5 font-semibold border-0 ${ROLE_COLORS[member.role] || ROLE_COLORS.member}`}>
                  {member.role === 'owner' && <Crown className="h-3 w-3 mr-1" />}
                  {ROLE_LABELS[member.role] || member.role}
                </Badge>

                {/* Joined Date */}
                <span className="text-[11px] text-muted-foreground/60 hidden lg:block">
                  Joined {formatDate(member.joinedAt)}
                </span>

                {/* Actions */}
                {member.role !== 'owner' && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-primary/10"
                      onClick={() => {
                        setEditingMember(member);
                        setEditRole(member.role);
                      }}
                    >
                      <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => handleRemove(member.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ── Add Member Dialog ── */}
      <AddMemberDialog open={showAdd} onOpenChange={setShowAdd} onAdded={onRefresh} />

      {/* ── Edit Role Dialog ── */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Change role for <span className="font-semibold text-foreground">{editingMember?.user.profile?.fullName || editingMember?.user.email}</span>
            </p>
            <Select value={editRole} onValueChange={setEditRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.filter((r) => r !== 'owner').map((role) => (
                  <SelectItem key={role} value={role}>
                    <span className="flex items-center gap-2">
                      {ROLE_LABELS[role]}
                      <span className="text-[10px] text-muted-foreground">({role})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
            <Button onClick={handleRoleChange}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Add Member Dialog ──────────────────────────────────────────

function AddMemberDialog({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (open: boolean) => void; onAdded: () => Promise<void> }) {
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<TeamMemberUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<TeamMemberUser | null>(null);
  const [role, setRole] = useState('member');
  const [adding, setAdding] = useState(false);
  const [step, setStep] = useState<'search' | 'configure'>('search');

  const doSearch = async () => {
    if (!searchQ.trim()) return;
    const res = await api.get('/team/search-users', { q: searchQ });
    if (res.success) setSearchResults(res.data);
  };

  const handleAdd = async () => {
    if (!selectedUser) return;
    setAdding(true);
    const res = await api.post('/team/members', {
      userId: selectedUser.id,
      role,
      permissions: getDefaultPerms(role),
    });
    if (res.success) {
      onOpenChange(false);
      setSearchQ('');
      setSelectedUser(null);
      setStep('search');
      onAdded();
    }
    setAdding(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> Add Team Member
          </DialogTitle>
        </DialogHeader>

        {step === 'search' ? (
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={doSearch} variant="secondary">Search</Button>
            </div>
            <ScrollArea className="max-h-64">
              {searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {searchQ ? 'No users found' : 'Type a name or email to search'}
                </p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => { setSelectedUser(u); setStep('configure'); }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{getInitials(u.profile?.fullName, u.email)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.profile?.fullName || u.email}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{getInitials(selectedUser?.profile?.fullName, selectedUser?.email || '')}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedUser?.profile?.fullName || selectedUser?.email}</p>
                <p className="text-xs text-muted-foreground">{selectedUser?.email}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Role</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.filter((r) => r !== 'owner').map((r) => (
                    <SelectItem key={r} value={r}>
                      <span className="flex items-center gap-2">
                        {ROLE_LABELS[r]}
                        <Badge className={`text-[9px] px-1.5 py-0 border-0 ${ROLE_COLORS[r]}`}>{r}</Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Default permissions for {ROLE_LABELS[role]}:</p>
              <p>{getDefaultPerms(role).split(',').map((p) => ALL_PERMISSIONS.find((perm) => perm.key === p)?.label || p).join(', ')}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'configure' && (
            <Button variant="outline" onClick={() => setStep('search')}>Back</Button>
          )}
          {step === 'configure' ? (
            <Button onClick={handleAdd} disabled={adding}>
              {adding ? 'Adding...' : 'Add to Team'}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getDefaultPerms(role: string): string {
  switch (role) {
    case 'admin':
      return ALL_PERMISSIONS.map((p) => p.key).join(',');
    case 'manager':
      return 'view_dashboard,view_tenders,manage_tenders,view_live_tenders,view_bids,manage_bids,view_projects,view_documents,manage_documents,view_chat,send_chat,view_events,use_ai';
    case 'member':
      return 'view_dashboard,view_tenders,view_live_tenders,view_bids,view_projects,view_documents,view_chat,send_chat,view_events,use_ai';
    case 'viewer':
      return 'view_dashboard,view_tenders,view_live_tenders,view_bids,view_projects,view_documents,view_chat,view_events';
    default:
      return 'view_tenders,view_bids';
  }
}

// ─── Tasks Tab ──────────────────────────────────────────────────

function TasksTab({
  tasks,
  members,
  todoTasks,
  inProgressTasks,
  inReviewTasks,
  doneTasks,
  onRefresh,
}: {
  tasks: TeamTask[];
  members: TeamMember[];
  todoTasks: TeamTask[];
  inProgressTasks: TeamTask[];
  inReviewTasks: TeamTask[];
  doneTasks: TeamTask[];
  onRefresh: () => Promise<void>;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<TeamTask | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  return (
    <div className="space-y-4">
      {/* ── Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            Kanban
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Task
        </Button>
      </div>

      {viewMode === 'kanban' ? (
        /* ── Kanban Board ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <TaskColumn title="To Do" tasks={todoTasks} color="bg-slate-500" members={members} onRefresh={onRefresh} onEdit={setEditingTask} />
          <TaskColumn title="In Progress" tasks={inProgressTasks} color="bg-blue-500" members={members} onRefresh={onRefresh} onEdit={setEditingTask} />
          <TaskColumn title="In Review" tasks={inReviewTasks} color="bg-amber-500" members={members} onRefresh={onRefresh} onEdit={setEditingTask} />
          <TaskColumn title="Done" tasks={doneTasks} color="bg-emerald-500" members={members} onRefresh={onRefresh} onEdit={setEditingTask} />
        </div>
      ) : (
        /* ── List View ── */
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No tasks yet</p>
              </CardContent>
            </Card>
          ) : (
            tasks.map((task) => (
              <TaskRow key={task.id} task={task} members={members} onRefresh={onRefresh} onEdit={setEditingTask} />
            ))
          )}
        </div>
      )}

      {/* ── Create Task Dialog ── */}
      <CreateTaskDialog open={showCreate} onOpenChange={setShowCreate} members={members} onCreated={onRefresh} />

      {/* ── Edit Task Dialog ── */}
      {editingTask && (
        <EditTaskDialog task={editingTask} open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)} members={members} onSaved={onRefresh} />
      )}
    </div>
  );
}

function TaskColumn({ title, tasks, color, members, onRefresh, onEdit }: {
  title: string; tasks: TeamTask[]; color: string; members: TeamMember[]; onRefresh: () => Promise<void>; onEdit: (t: TeamTask) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{tasks.length}</Badge>
      </div>
      <ScrollArea className="max-h-[500px]">
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} members={members} onRefresh={onRefresh} onEdit={onEdit} />
          ))}
          {tasks.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground/50 border border-dashed rounded-lg">
              No tasks
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function TaskCard({ task, members, onRefresh, onEdit }: { task: TeamTask; members: TeamMember[]; onRefresh: () => Promise<void>; onEdit: (t: TeamTask) => void; }) {
  const handleStatusMove = async (newStatus: string) => {
    await api.patch(`/team/tasks/${task.id}`, { status: newStatus });
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    await api.delete(`/team/tasks/${task.id}`);
    onRefresh();
  };

  return (
    <Card className="border border-border/50 hover:border-border hover:shadow-sm transition-all cursor-pointer" onClick={() => onEdit(task)}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-medium text-foreground leading-snug">{task.title}</p>
          <Badge className={`text-[9px] px-1.5 py-0 border-0 flex-shrink-0 ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
            {PRIORITY_LABELS[task.priority] || task.priority}
          </Badge>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center justify-between">
          {task.assignee ? (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-[8px] font-bold text-primary">{getInitials(task.assignee.profile?.fullName, task.assignee.email)}</span>
              </div>
              <span className="text-[11px] text-muted-foreground truncate">{task.assignee.profile?.fullName || task.assignee.email}</span>
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground/50">Unassigned</span>
          )}
          {task.dueDate && (
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
              <Clock className="h-3 w-3" /> {formatDate(task.dueDate)}
            </span>
          )}
        </div>
        {/* Quick status buttons */}
        <div className="flex gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
          {task.status !== 'todo' && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleStatusMove(task.status === 'in_progress' ? 'todo' : task.status === 'in_review' ? 'in_progress' : 'in_review')}>
              ←
            </Button>
          )}
          {task.status !== 'done' && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleStatusMove(task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'in_review' : 'done')}>
              →
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 ml-auto hover:text-red-500" onClick={handleDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskRow({ task, members, onRefresh, onEdit }: { task: TeamTask; members: TeamMember[]; onRefresh: () => Promise<void>; onEdit: (t: TeamTask) => void; }) {
  return (
    <Card className="border border-border/50 hover:border-border transition-colors cursor-pointer" onClick={() => onEdit(task)}>
      <CardContent className="p-3 flex items-center gap-3">
        <Badge className={`text-[10px] px-2 py-0.5 border-0 ${STATUS_COLORS[task.status] || STATUS_COLORS.todo}`}>
          {STATUS_LABELS[task.status] || task.status}
        </Badge>
        <p className="text-sm font-medium text-foreground flex-1 truncate">{task.title}</p>
        <Badge className={`text-[9px] px-1.5 py-0 border-0 ${PRIORITY_COLORS[task.priority]}`}>
          {PRIORITY_LABELS[task.priority]}
        </Badge>
        {task.assignee && (
          <span className="text-xs text-muted-foreground hidden sm:inline">{task.assignee.profile?.fullName || task.assignee.email}</span>
        )}
        {task.dueDate && (
          <span className="text-[11px] text-muted-foreground/60 hidden md:inline">{formatDate(task.dueDate)}</span>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Create Task Dialog ─────────────────────────────────────────

function CreateTaskDialog({ open, onOpenChange, members, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; members: TeamMember[]; onCreated: () => Promise<void>; }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    const res = await api.post('/team/tasks', {
      title,
      description,
      priority,
      assigneeId: assigneeId || null,
      dueDate: dueDate || null,
    });
    if (res.success) {
      onOpenChange(false);
      setTitle(''); setDescription(''); setPriority('medium'); setAssigneeId(''); setDueDate('');
      onCreated();
    }
    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> New Team Task
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Due Date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Assignee</label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.user.profile?.fullName || m.user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!title.trim() || creating}>
            {creating ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Task Dialog ───────────────────────────────────────────

function EditTaskDialog({ task, open, onOpenChange, members, onSaved }: { task: TeamTask; open: boolean; onOpenChange: (o: boolean) => void; members: TeamMember[]; onSaved: () => Promise<void>; }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || '');
  const [dueDate, setDueDate] = useState(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
  const [saving, setSaving] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setStatus(task.status);
    setPriority(task.priority);
    setAssigneeId(task.assigneeId || '');
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
  }, [task]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSave = async () => {
    setSaving(true);
    const res = await api.patch(`/team/tasks/${task.id}`, {
      title,
      description,
      status,
      priority,
      assigneeId: assigneeId || null,
      dueDate: dueDate || null,
    });
    if (res.success) {
      onOpenChange(false);
      onSaved();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Assignee</label>
              <Select value={assigneeId || 'none'} onValueChange={(v) => setAssigneeId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.user.profile?.fullName || m.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Due Date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Permissions Tab ────────────────────────────────────────────

function PermissionsTab({ members, onRefresh }: { members: TeamMember[]; onRefresh: () => Promise<void>; }) {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const selectMember = (member: TeamMember) => {
    setSelectedMember(member);
    setPermissions(parsePerms(member.permissions));
  };

  const togglePerm = (key: string) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedMember) return;
    setSaving(true);
    const res = await api.patch(`/team/members/${selectedMember.id}`, {
      permissions: permsToString(permissions),
    });
    if (res.success) {
      onRefresh();
    }
    setSaving(false);
  };

  // Role-based preset
  const applyPreset = (role: string) => {
    setPermissions(parsePerms(getDefaultPerms(role)));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Member List ── */}
      <div className="lg:col-span-1 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Select Member
        </h3>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-2">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => selectMember(member)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                  selectedMember?.id === member.id
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-muted/60 border border-transparent'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">{getInitials(member.user.profile?.fullName, member.user.email)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{member.user.profile?.fullName || member.user.email}</p>
                  <Badge className={`text-[9px] px-1.5 py-0 border-0 ${ROLE_COLORS[member.role]}`}>
                    {ROLE_LABELS[member.role]}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* ── Permission Matrix ── */}
      <div className="lg:col-span-2">
        {!selectedMember ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Shield className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Select a member to manage permissions</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Choose a member from the list to view and edit their access</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Permissions for {selectedMember.user.profile?.fullName || selectedMember.user.email}
                </CardTitle>
                <Badge className={`text-[10px] px-2 py-0.5 border-0 ${ROLE_COLORS[selectedMember.role]}`}>
                  {ROLE_LABELS[selectedMember.role]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ── Preset Buttons ── */}
              <div className="flex flex-wrap gap-2">
                <p className="w-full text-xs font-medium text-muted-foreground mb-1">Apply role preset:</p>
                {ROLES.filter((r) => r !== 'owner').map((role) => (
                  <Button
                    key={role}
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => applyPreset(role)}
                  >
                    {ROLE_LABELS[role]}
                  </Button>
                ))}
              </div>

              <Separator />

              {/* ── Permission Toggles ── */}
              <div className="space-y-3">
                {ALL_PERMISSIONS.map((perm) => {
                  const Icon = perm.icon;
                  const isOn = permissions.has(perm.key);
                  return (
                    <div key={perm.key} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isOn ? 'bg-primary/10' : 'bg-muted/40'}`}>
                        <Icon className={`h-4 w-4 ${isOn ? 'text-primary' : 'text-muted-foreground/40'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isOn ? 'text-foreground' : 'text-muted-foreground'}`}>{perm.label}</p>
                        <p className="text-[11px] text-muted-foreground/60">{perm.desc}</p>
                      </div>
                      <Switch
                        checked={isOn}
                        onCheckedChange={() => togglePerm(perm.key)}
                      />
                    </div>
                  );
                })}
              </div>

              <Separator />

              {/* ── Save ── */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {permissions.size} of {ALL_PERMISSIONS.length} permissions enabled
                </p>
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? 'Saving...' : 'Save Permissions'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
