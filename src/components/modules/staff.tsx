'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  Users, Shield, UserCheck, Clock, MoreHorizontal,
  Search, Mail, ArrowUpRight, ArrowDownRight, Ban,
  CheckCircle2, UserPlus, Loader2, UserX, ShieldCheck,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────

interface StaffProfile {
  fullName: string;
  jobTitle: string | null;
  verified: boolean;
  profilePhoto: string | null;
}

interface StaffMember {
  id: string;
  email: string;
  role: 'super_admin' | 'team_admin' | 'user';
  status: string;
  emailVerified: boolean;
  createdAt: string;
  profile: StaffProfile | null;
}

// ─── Helpers ──────────────────────────────────────────────────────

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  return email[0].toUpperCase();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  super_admin: {
    label: 'Super Admin',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  },
  team_admin: {
    label: 'Team Admin',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
  user: {
    label: 'User',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  },
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  },
  suspended: {
    label: 'Suspended',
    className: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  },
};

// ─── Stat Card ────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  subtitle,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  subtitle?: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground/70 truncate">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export function StaffView() {
  const { user: currentUser } = useAuthStore();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });

  const currentRole = currentUser?.role || 'user';
  const isSuperAdmin = currentRole === 'super_admin';
  const isTeamAdmin = currentRole === 'team_admin';

  // ── Fetch staff ──
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (roleFilter && roleFilter !== 'all') params.role = roleFilter;

      const res = await api.get('/staff', params);
      if (res.success) {
        setStaff(res.data);
      } else {
        toast.error(res.error || 'Failed to fetch staff');
      }
    } catch {
      toast.error('Failed to fetch staff');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // ── Stats ──
  const stats = useMemo(() => {
    const total = staff.length;
    const admins = staff.filter((s) => s.role === 'team_admin' || s.role === 'super_admin').length;
    const active = staff.filter((s) => s.status === 'active').length;
    const pendingVerification = staff.filter((s) => s.profile && !s.profile.verified).length;
    return { total, admins, active, pendingVerification };
  }, [staff]);

  // ── Role change ──
  const handleRoleChange = (targetId: string, targetName: string, newRole: string) => {
    const roleLabel = ROLE_BADGE[newRole]?.label || newRole;
    setConfirmDialog({
      open: true,
      title: `Change Role to ${roleLabel}`,
      description: `Are you sure you want to change ${targetName}'s role to ${roleLabel}? This will affect their permissions.`,
      onConfirm: async () => {
        setActionLoading(targetId);
        try {
          const res = await api.patch(`/staff/${targetId}`, { role: newRole });
          if (res.success) {
            toast.success(`Role updated to ${roleLabel}`);
            fetchStaff();
          } else {
            toast.error(res.error || 'Failed to update role');
          }
        } catch {
          toast.error('Failed to update role');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  // ── Status change ──
  const handleStatusToggle = (targetId: string, targetName: string, currentStatus: string) => {
    const isSuspending = currentStatus === 'active';
    const action = isSuspending ? 'Suspend' : 'Activate';
    setConfirmDialog({
      open: true,
      title: `${action} User`,
      description: isSuspending
        ? `Are you sure you want to suspend ${targetName}? They will lose access to the platform.`
        : `Are you sure you want to reactivate ${targetName}? They will regain access to the platform.`,
      onConfirm: async () => {
        setActionLoading(targetId);
        try {
          const newStatus = isSuspending ? 'suspended' : 'active';
          const res = await api.patch(`/staff/${targetId}`, { status: newStatus });
          if (res.success) {
            toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
            fetchStaff();
          } else {
            toast.error(res.error || 'Failed to update status');
          }
        } catch {
          toast.error('Failed to update status');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  // ── Get available role options for a target user ──
  const getRoleOptions = (targetUser: StaffMember) => {
    const options: { value: string; label: string; icon: React.ElementType }[] = [];

    if (isSuperAdmin) {
      // super_admin can assign any role
      options.push({ value: 'super_admin', label: 'Super Admin', icon: ShieldCheck });
    }

    // Both team_admin and super_admin can assign these
    if (targetUser.role !== 'team_admin') {
      options.push({ value: 'team_admin', label: 'Team Admin', icon: Shield });
    }
    if (targetUser.role !== 'user') {
      options.push({ value: 'user', label: 'User', icon: Users });
    }

    return options;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Staff Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your team members, roles, and access
          </p>
        </div>
        <Button
          className="bg-orange-600 hover:bg-orange-700 text-white gap-2 self-start"
          onClick={() => toast.info('Invite feature coming soon!')}
        >
          <UserPlus className="h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Members"
          value={stats.total}
          icon={Users}
          iconBg="bg-orange-50 dark:bg-orange-950/30"
          iconColor="text-orange-600 dark:text-orange-400"
        />
        <StatCard
          title="Admins"
          value={stats.admins}
          icon={Shield}
          iconBg="bg-slate-100 dark:bg-slate-800/50"
          iconColor="text-slate-600 dark:text-slate-400"
        />
        <StatCard
          title="Active"
          value={stats.active}
          icon={UserCheck}
          iconBg="bg-emerald-50 dark:bg-emerald-950/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          title="Pending Verification"
          value={stats.pendingVerification}
          icon={Clock}
          iconBg="bg-amber-50 dark:bg-amber-950/30"
          iconColor="text-amber-600 dark:text-amber-400"
          subtitle="Profiles not yet verified"
        />
      </div>

      {/* ── Filters ── */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-background">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="team_admin">Team Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Member List ── */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-orange-500" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-sm text-muted-foreground">Loading team members...</p>
              </div>
            </div>
          ) : staff.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3 text-center">
                <UserX className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No team members found</p>
                {(search || roleFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setRoleFilter('all');
                    }}
                    className="text-orange-600 hover:text-orange-700"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="text-xs font-semibold text-muted-foreground">Member</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Job Title</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Role</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground hidden lg:table-cell">Joined</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[50px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => {
                    const isSelf = member.id === currentUser?.id;
                    const isTargetSuperAdmin = member.role === 'super_admin';
                    const canManage = !isSelf && (isSuperAdmin || (isTeamAdmin && !isTargetSuperAdmin));
                    const roleBadge = ROLE_BADGE[member.role] || ROLE_BADGE.user;
                    const statusBadge = STATUS_BADGE[member.status] || STATUS_BADGE.active;
                    const memberName = member.profile?.fullName || member.email;
                    const initials = getInitials(member.profile?.fullName, member.email);
                    const roleOptions = getRoleOptions(member);

                    return (
                      <TableRow
                        key={member.id}
                        className="hover:bg-muted/50 border-border/30 transition-colors"
                      >
                        {/* Avatar + Name + Email */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border/50">
                              {member.profile?.profilePhoto && (
                                <AvatarImage src={member.profile.profilePhoto} alt={memberName} />
                              )}
                              <AvatarFallback className="bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 text-xs font-semibold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {memberName}
                                </p>
                                {member.profile?.verified && (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                )}
                                {isSelf && (
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                <Mail className="h-3 w-3 flex-shrink-0" />
                                {member.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Job Title */}
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {member.profile?.jobTitle || '—'}
                          </span>
                        </TableCell>

                        {/* Role */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold px-2 py-0.5 ${roleBadge.className}`}
                          >
                            {roleBadge.label}
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-medium px-2 py-0.5 ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </Badge>
                        </TableCell>

                        {/* Joined Date */}
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(member.createdAt)}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          {canManage ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-muted/80"
                                  disabled={actionLoading === member.id}
                                >
                                  {actionLoading === member.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                  Change Role
                                </DropdownMenuLabel>
                                {roleOptions.map((opt) => (
                                  <DropdownMenuItem
                                    key={opt.value}
                                    onClick={() =>
                                      handleRoleChange(member.id, memberName, opt.value)
                                    }
                                    className="gap-2 text-sm"
                                  >
                                    {opt.value === 'super_admin' || opt.value === 'team_admin' ? (
                                      <ArrowUpRight className="h-3.5 w-3.5 text-orange-500" />
                                    ) : (
                                      <ArrowDownRight className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    {opt.label}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                  Account
                                </DropdownMenuLabel>
                                {member.status === 'active' ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusToggle(member.id, memberName, member.status)
                                    }
                                    className="gap-2 text-sm text-red-600 focus:text-red-600"
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                    Suspend User
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusToggle(member.id, memberName, member.status)
                                    }
                                    className="gap-2 text-sm text-emerald-600 focus:text-emerald-600"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Activate User
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Confirmation Dialog ── */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog((prev) => ({ ...prev, open: false }));
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
