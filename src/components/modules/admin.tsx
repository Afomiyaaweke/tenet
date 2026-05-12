'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { api, User, Document } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Shield, Users, FileCheck, CheckCircle2, XCircle, Clock, UserCheck,
  UserX, AlertCircle, ChevronDown, ChevronUp, Briefcase, Award,
} from 'lucide-react';

export function AdminView() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

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

  const pendingDocs = docs.filter(d => d.status === 'pending');
  const verifiedUsers = users.filter((u: any) => u.verified).length;
  const unverifiedUsers = users.length - verifiedUsers;
  const approvedDocs = docs.filter(d => d.status === 'approved').length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto view-enter">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl gradient-rose shadow-md flex-shrink-0">
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
        <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 flex-shrink-0">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 flex-shrink-0">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingDocs.length}</p>
              <p className="text-xs text-muted-foreground">Pending Docs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-50 flex-shrink-0">
              <UserCheck className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{verifiedUsers}</p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
          </CardContent>
        </Card>
        <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 flex-shrink-0">
              <FileCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{approvedDocs}</p>
              <p className="text-xs text-muted-foreground">Docs Approved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="bg-white premium-shadow rounded-xl border-0 h-auto p-1">
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
          <Card className="premium-shadow rounded-xl border-0 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg gradient-emerald">
                  <Users className="h-3.5 w-3.5 text-white" />
                </div>
                All Users
                <Badge className="bg-emerald-50 text-emerald-700 border-0 rounded-lg text-[10px] ml-1 hover:bg-emerald-50">
                  {users.length} total · {unverifiedUsers} unverified
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {users.length === 0 ? (
                <div className="text-center py-8">
                  <div className="p-3 rounded-2xl gradient-emerald w-fit mx-auto mb-4">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-sm font-medium">No users found</p>
                </div>
              ) : users.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-emerald flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm">{(u.fullName || 'U')[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.fullName || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{u.location || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.skillTags && u.skillTags.split(',').filter(Boolean).slice(0, 2).map((tag: string) => (
                      <Badge key={tag} className="text-[10px] bg-emerald-50 text-emerald-700 border-0 rounded-lg hover:bg-emerald-50">{tag.trim()}</Badge>
                    ))}
                    {u.verified ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 rounded-lg hover:bg-emerald-100">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 border-0 rounded-lg hover:bg-amber-100">
                        <AlertCircle className="h-3 w-3 mr-1" /> Unverified
                      </Badge>
                    )}
                    {!u.verified && (
                      <Button size="sm"
                        className="text-xs h-8 gradient-emerald text-white rounded-xl premium-shadow hover:opacity-90 transition-all hover:-translate-y-0.5"
                        onClick={() => handleVerifyProfile(u.id)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Verify
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4">
          <Card className="premium-shadow rounded-xl border-0 bg-white">
            <CardHeader className="pb-3">
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
            </CardHeader>
            <CardContent className="space-y-3">
              {docs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="p-3 rounded-2xl gradient-amber w-fit mx-auto mb-4">
                    <FileCheck className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-sm font-medium">No documents submitted</p>
                </div>
              ) : docs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      doc.status === 'pending' ? 'bg-amber-50' :
                      doc.status === 'approved' ? 'bg-emerald-50' :
                      'bg-rose-50'
                    }`}>
                      {doc.status === 'pending' ? <Clock className="h-4 w-4 text-amber-600" /> :
                       doc.status === 'approved' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                       <XCircle className="h-4 w-4 text-rose-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{doc.docType.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">{doc.fileName} &middot; User: {doc.userId.slice(0, 8)}...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs px-2.5 py-0.5 border-0 rounded-lg ${
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
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
