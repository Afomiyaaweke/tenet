'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store';
import { api, User, Document } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Shield, Users, FileCheck, CheckCircle2, XCircle, Clock, UserCheck,
  UserX, AlertCircle, Briefcase, Award, Search, Activity,
  TrendingUp, Heart, Server, Eye, Mail, Building2, Zap,
} from 'lucide-react';
// ─── Activity Feed Data ─────────────────────────────────────────────
interface ActivityItem {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  time: string;
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

export function AdminView() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [docStatusFilter, setDocStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [profilesRes, docsRes] = await Promise.all([
      api.get('/profiles'),
      api.get('/documents'),
    ]);
    if (profilesRes.success) setUsers(profilesRes.data);
    if (docsRes.success) setDocs(docsRes.data);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, [loadData]);

  const handleVerifyProfile = async (profileId: string) => {
    const res = await api.patch(`/profiles/${profileId}/verify`, {});
    if (res.success) {
      toast.success('Profile verified');
      loadData();
    } else toast.error(res.error || 'Failed to verify');
  };

  const handleApproveDoc = async (docId: string) => {
    const res = await api.patch(`/documents/${docId}`, { status: 'approved', reviewNotes: 'Approved by admin' });
    if (res.success) {
      toast.success('Document approved');
      loadData();
    } else toast.error('Failed to approve');
  };

  const handleRejectDoc = async (docId: string) => {
    const res = await api.patch(`/documents/${docId}`, { status: 'rejected', reviewNotes: 'Rejected - please resubmit' });
    if (res.success) {
      toast.success('Document rejected');
      loadData();
    } else toast.error('Failed to reject');
  };

  // ── Computed Values (must be before any early return) ──
  const pendingDocs = docs.filter(d => d.status === 'pending');
  const verifiedUsers = users.filter((u: any) => u.verified).length;
  const unverifiedUsers = users.length - verifiedUsers;
  const approvedDocs = docs.filter(d => d.status === 'approved').length;
  const rejectedDocs = docs.filter(d => d.status === 'rejected').length;

  // ── Filtered Users ──
  const filteredUsers = useMemo(() => {
    return users.filter((u: any) => {
      const matchesSearch = !userSearch ||
        (u.fullName || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.location || '').toLowerCase().includes(userSearch.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, roleFilter]);

  // ── Filtered Docs ──
  const filteredDocs = useMemo(() => {
    return docs.filter(d => {
      return docStatusFilter === 'all' || d.status === docStatusFilter;
    });
  }, [docs, docStatusFilter]);

  // ── Activity Feed ──
  const activityFeed: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    // Recent user verifications
    users.filter((u: any) => u.verified).slice(0, 2).forEach((u: any) => {
      items.push({
        id: `verify-${u.id}`,
        icon: CheckCircle2,
        iconColor: 'text-emerald-500',
        iconBg: 'bg-emerald-50',
        title: `${u.fullName || 'User'} verified`,
        description: 'Profile verification approved',
        time: u.updatedAt || new Date().toISOString(),
      });
    });

    // Pending documents
    pendingDocs.slice(0, 3).forEach(d => {
      items.push({
        id: `doc-${d.id}`,
        icon: FileCheck,
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-50',
        title: `Document pending review`,
        description: d.docType.replace('_', ' '),
        time: d.createdAt,
      });
    });

    // New users
    users.slice(0, 2).forEach((u: any) => {
      items.push({
        id: `user-${u.id}`,
        icon: Users,
        iconColor: 'text-teal-500',
        iconBg: 'bg-teal-50',
        title: `New user registered`,
        description: u.fullName || 'Unknown',
        time: u.createdAt || new Date().toISOString(),
      });
    });

    return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
  }, [users, pendingDocs]);

  if (user?.role !== 'admin') {
    return (
      <div className="p-6 text-center view-enter">
        <div className="p-3 rounded-2xl gradient-rose w-fit mx-auto mb-4">
          <Shield className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold">Admin Access Required</h3>
        <p className="text-muted-foreground text-sm mt-1">You need admin privileges to access this panel</p>
      </div>
    );
  }

  // ── Platform Health ──
  const healthMetrics = [
    { label: 'Server Status', value: 'Online', icon: Server, color: 'text-emerald-500', bg: 'bg-emerald-50', status: 'healthy' },
    { label: 'Verification Queue', value: `${pendingDocs.length} pending`, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', status: pendingDocs.length > 5 ? 'warning' : 'healthy' },
    { label: 'User Verification', value: `${verifiedUsers}/${users.length}`, icon: UserCheck, color: 'text-teal-500', bg: 'bg-teal-50', status: verifiedUsers / Math.max(users.length, 1) > 0.8 ? 'healthy' : 'warning' },
    { label: 'Doc Approval Rate', value: docs.length > 0 ? `${Math.round((approvedDocs / docs.length) * 100)}%` : 'N/A', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50', status: 'healthy' },
  ];

  return (
    <div
 className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto animate-[fadeIn_0.3s_ease-out]"
 >
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl gradient-rose shadow-md flex-shrink-0 shadow-rose-200/40">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            <span className="text-gradient-emerald">Admin</span> Panel
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">Manage users, verify documents, and monitor platform activity</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, value: users.length, label: 'Total Users', bg: 'bg-emerald-50', color: 'text-emerald-600', gradient: 'gradient-emerald' },
          { icon: Clock, value: pendingDocs.length, label: 'Pending Docs', bg: 'bg-amber-50', color: 'text-amber-600', gradient: 'gradient-amber' },
          { icon: UserCheck, value: verifiedUsers, label: 'Verified', bg: 'bg-teal-50', color: 'text-teal-600', gradient: 'gradient-teal' },
          { icon: FileCheck, value: approvedDocs, label: 'Docs Approved', bg: 'bg-emerald-50', color: 'text-emerald-600', gradient: 'gradient-emerald' },
        ].map((stat, idx) => (
          <div className="hover:-translate-y-[3px] transition-all duration-200" key={stat.label}>
            <Card className="premium-shadow rounded-xl border-0 bg-card transition-all duration-200 h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg} flex-shrink-0`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Activity Feed + Platform Health Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Recent Activity Feed */}
        <Card className="premium-shadow rounded-xl border-0 bg-card h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-amber">
                <Activity className="h-3.5 w-3.5 text-white" />
              </div>
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityFeed.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="relative pl-7 max-h-[300px] overflow-y-auto">
                <div className="absolute left-[10px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-300 via-amber-300 to-border rounded-full" />
                <div className="space-y-3">
                  {activityFeed.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.id} className="relative flex items-start gap-3">
                        <div className="absolute -left-7 top-0.5 flex items-center justify-center">
                          <div className={`h-[20px] w-[20px] rounded-full ${item.iconBg} border-2 border-white shadow-sm flex items-center justify-center z-10`}>
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
            )}
          </CardContent>
        </Card>

        {/* Platform Health */}
        <Card className="premium-shadow rounded-xl border-0 bg-card h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-teal">
                <Heart className="h-3.5 w-3.5 text-white" />
              </div>
              Platform Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {healthMetrics.map((metric) => (
              <div key={metric.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${metric.bg}`}>
                    <metric.icon className={`h-4 w-4 ${metric.color}`} />
                  </div>
                  <p className="text-sm font-medium">{metric.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{metric.value}</span>
                  <div className={`w-2 h-2 rounded-full ${metric.status === 'healthy' ? 'bg-emerald-500 shadow-sm shadow-emerald-300' : 'bg-amber-500 shadow-sm shadow-amber-300'}`} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div>
        <Tabs defaultValue="users">
          <TabsList className="bg-card premium-shadow rounded-xl border-0 h-auto p-1">
            <TabsTrigger
              value="users"
              className="rounded-lg data-[state=active]:gradient-emerald data-[state=active]:text-white data-[state=active]:premium-shadow px-4 py-2 transition-all">
              <Users className="h-4 w-4 mr-1.5" />
              User Management
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="rounded-lg data-[state=active]:gradient-emerald data-[state=active]:text-white data-[state=active]:premium-shadow px-4 py-2 transition-all">
              <FileCheck className="h-4 w-4 mr-1.5" />
              Document Review
              {pendingDocs.length > 0 && (
                <Badge className="ml-1.5 bg-amber-100 text-amber-700 border-0 rounded-md text-[10px] px-1.5 hover:bg-amber-100">
                  {pendingDocs.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-4">
            <Card className="premium-shadow rounded-xl border-0 bg-card">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg gradient-emerald">
                      <Users className="h-3.5 w-3.5 text-white" />
                    </div>
                    All Users
                    <Badge className="bg-emerald-50 text-emerald-700 border-0 rounded-lg text-[10px] ml-1 hover:bg-primary/10">
                      {filteredUsers.length} of {users.length}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        className="pl-8 h-8 text-xs rounded-lg bg-muted/50 border-border/60 focus:ring-primary w-48"
                      />
                    </div>
                    {/* Role Filter */}
                    <select
                      value={roleFilter}
                      onChange={e => setRoleFilter(e.target.value)}
                      className="h-8 text-xs rounded-lg bg-muted/50 border border-border/60 px-2 focus:ring-primary focus:outline-none"
                    >
                      <option value="all">All Roles</option>
                      <option value="admin">Admin</option>
                      <option value="contractor">Contractor</option>
                      <option value="tender_owner">Tender Owner</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-3 rounded-2xl gradient-emerald w-fit mx-auto mb-4">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-sm font-medium">{userSearch || roleFilter !== 'all' ? 'No users match your filters' : 'No users found'}</p>
                    {(userSearch || roleFilter !== 'all') && (
                      <Button variant="ghost" size="sm" className="text-xs mt-2 text-emerald-600 hover:text-emerald-700" onClick={() => { setUserSearch(''); setRoleFilter('all'); }}>
                        Clear filters
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredUsers.map((u: any, idx: number) => (
                      <div
 key={u.id}
 className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors animate-[fadeIn_0.3s_ease-out]"
 >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-xl gradient-emerald flex items-center justify-center flex-shrink-0 shadow-sm">
                            <span className="text-white font-semibold text-sm">{(u.fullName || 'U')[0].toUpperCase()}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{u.fullName || 'Unknown'}</p>
                              {u.verified ? (
                                <Badge className="bg-emerald-100 text-emerald-700 border-0 rounded-md text-[10px] px-1.5 py-0 hover:bg-emerald-100 flex-shrink-0">
                                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Verified
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700 border-0 rounded-md text-[10px] px-1.5 py-0 hover:bg-amber-100 flex-shrink-0">
                                  <AlertCircle className="h-2.5 w-2.5 mr-0.5" /> Unverified
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {u.email || 'N/A'}
                              </p>
                              {u.location && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Building2 className="h-3 w-3" /> {u.location}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Badge className="text-[10px] px-1.5 py-0 border-0 bg-teal-50 text-teal-700 font-medium hover:bg-teal-50">
                                {(u.role || 'user').replace('_', ' ')}
                              </Badge>
                              {u.skillTags && u.skillTags.split(',').filter(Boolean).slice(0, 2).map((tag: string) => (
                                <Badge key={tag} className="text-[10px] bg-emerald-50 text-emerald-700 border-0 rounded-md hover:bg-primary/10">{tag.trim()}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          {!u.verified && (
                            <Button size="sm"
                              className="text-xs h-8 gradient-emerald text-white rounded-xl premium-shadow hover:opacity-90 transition-all hover:-translate-y-0.5"
                              onClick={() => handleVerifyProfile(u.id)}>
                              <UserCheck className="h-3 w-3 mr-1" /> Verify
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-4">
            <Card className="premium-shadow rounded-xl border-0 bg-card">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg gradient-amber">
                      <FileCheck className="h-3.5 w-3.5 text-white" />
                    </div>
                    Document Review Queue
                    {pendingDocs.length > 0 && (
                      <Badge className="bg-amber-100 text-amber-700 border-0 rounded-lg text-[10px] ml-1 hover:bg-amber-100">
                        {pendingDocs.length} pending
                      </Badge>
                    )}
                  </CardTitle>
                  {/* Status Filter */}
                  <div className="flex items-center gap-2">
                    <select
                      value={docStatusFilter}
                      onChange={e => setDocStatusFilter(e.target.value)}
                      className="h-8 text-xs rounded-lg bg-muted/50 border border-border/60 px-2 focus:ring-primary focus:outline-none"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredDocs.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-3 rounded-2xl gradient-amber w-fit mx-auto mb-4">
                      <FileCheck className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-sm font-medium">{docStatusFilter !== 'all' ? 'No documents match this filter' : 'No documents submitted'}</p>
                    {docStatusFilter !== 'all' && (
                      <Button variant="ghost" size="sm" className="text-xs mt-2 text-emerald-600 hover:text-emerald-700" onClick={() => setDocStatusFilter('all')}>
                        Clear filter
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredDocs.map((doc, idx) => (
                      <div
 key={doc.id}
 className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors animate-[fadeIn_0.3s_ease-out]"
 >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${
                            doc.status === 'pending' ? 'bg-amber-50' :
                            doc.status === 'approved' ? 'bg-emerald-50' :
                            'bg-rose-50'
                          }`}>
                            {doc.status === 'pending' ? <Clock className="h-4 w-4 text-amber-600" /> :
                             doc.status === 'approved' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                             <XCircle className="h-4 w-4 text-rose-600" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{doc.docType.replace('_', ' ')}</p>
                            <p className="text-xs text-muted-foreground">{doc.fileName} &middot; User: {doc.userId.slice(0, 8)}...</p>
                            {doc.reviewNotes && (
                              <p className="text-xs text-muted-foreground mt-0.5 italic flex items-center gap-1">
                                <Eye className="h-3 w-3" /> {doc.reviewNotes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          <Badge className={`text-xs px-1.5 py-0 border-0 rounded-lg ${
                            doc.status === 'approved' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                            doc.status === 'rejected' ? 'bg-rose-100 text-rose-700 hover:bg-rose-100' :
                            'bg-amber-100 text-amber-700 hover:bg-amber-100'
                          }`}>{doc.status}</Badge>
                          {doc.status === 'pending' && (
                            <>
                              <Button size="sm"
                                className="text-xs h-8 gradient-emerald text-white rounded-xl premium-shadow hover:opacity-90 transition-all hover:-translate-y-0.5"
                                onClick={() => handleApproveDoc(doc.id)}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="outline"
                                className="text-xs h-8 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all"
                                onClick={() => handleRejectDoc(doc.id)}>
                                <XCircle className="h-3 w-3 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
