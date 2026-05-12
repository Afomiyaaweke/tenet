'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { api, User, Document } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Shield, Users, FileCheck, CheckCircle2, XCircle, Clock, Ban, UserCheck } from 'lucide-react';

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
      <div className="p-6 text-center">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Admin Access Required</h3>
        <p className="text-muted-foreground">You need admin privileges to access this panel</p>
      </div>
    );
  }

  const pendingDocs = docs.filter(d => d.status === 'pending');

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Admin Panel</h2>
        <p className="text-muted-foreground text-sm">Manage users, verify documents, and monitor platform activity</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100"><Users className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100"><Clock className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold">{pendingDocs.length}</p>
              <p className="text-xs text-muted-foreground">Pending Docs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-100"><UserCheck className="h-5 w-5 text-teal-600" /></div>
            <div>
              <p className="text-2xl font-bold">{users.filter((u: any) => u.verified).length}</p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100"><FileCheck className="h-5 w-5 text-purple-600" /></div>
            <div>
              <p className="text-2xl font-bold">{docs.filter(d => d.status === 'approved').length}</p>
              <p className="text-xs text-muted-foreground">Docs Approved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="documents">Document Review ({pendingDocs.length})</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">All Users</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {users.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No users found</p>
              ) : users.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                      <span className="text-emerald-700 font-semibold text-sm">{(u.fullName || 'U')[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.fullName || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{u.location || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.skillTags && u.skillTags.split(',').filter(Boolean).slice(0, 2).map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">{tag.trim()}</Badge>
                    ))}
                    <Badge className={u.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                      {u.verified ? 'Verified' : 'Unverified'}
                    </Badge>
                    {!u.verified && (
                      <Button size="sm" variant="outline" className="text-xs h-7"
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
          <Card>
            <CardHeader><CardTitle className="text-base">Document Review Queue</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {docs.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No documents submitted</p>
              ) : docs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {doc.status === 'pending' ? <Clock className="h-5 w-5 text-amber-500" /> :
                     doc.status === 'approved' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> :
                     <XCircle className="h-5 w-5 text-red-500" />}
                    <div>
                      <p className="text-sm font-medium">{doc.docType.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">{doc.fileName} &middot; User: {doc.userId.slice(0, 8)}...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${
                      doc.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      doc.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>{doc.status}</Badge>
                    {doc.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" className="text-xs h-7"
                          onClick={() => handleApproveDoc(doc.id)}>Approve</Button>
                        <Button size="sm" variant="destructive" className="text-xs h-7"
                          onClick={() => handleRejectDoc(doc.id)}>Reject</Button>
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
