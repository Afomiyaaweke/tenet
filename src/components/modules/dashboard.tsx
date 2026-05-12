'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, useNavStore, useDataStore } from '@/store';
import { api, Tender, Bid, Project, Notification } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  FileSearch, Gavel, FolderKanban, TrendingUp, Users, FileCheck,
  DollarSign, Shield, GraduationCap, Bell, CheckCircle, AlertCircle,
  Info, AlertTriangle, Lightbulb
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, onClick }: {
  icon: React.ElementType; label: string; value: string | number; color: string; onClick?: () => void;
}) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  success: CheckCircle,
  warning: AlertTriangle,
  alert: AlertCircle,
  info: Info,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  alert: 'text-red-500',
  info: 'text-blue-500',
};

const ROLE_TIPS: Record<string, string[]> = {
  contractor: [
    'Keep your profile and documents verified to unlock bidding on all tenders',
    'Set your skill tags to get better tender match scores',
    'Check the AI Assistant for help writing compelling bid proposals',
    'Attend workshops to improve your procurement skills',
  ],
  admin: [
    'Review pending verifications to keep the platform trustworthy',
    'Monitor flagged messages for platform safety',
    'Use the AI Assistant to quickly summarize bid comparisons',
    'Create workshops and events to engage the community',
  ],
  tender_owner: [
    'Write clear tender scopes to attract quality bids',
    'Use the AI Assistant to help draft tender specifications',
    'Review bids promptly to keep contractors engaged',
    'Track project milestones to ensure timely delivery',
  ],
};

export function DashboardView() {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const { notifications, fetchNotifications } = useDataStore();
  const [stats, setStats] = useState({
    totalTenders: 0, openTenders: 0, totalBids: 0, activeBids: 0,
    activeProjects: 0, totalPayments: 0,
  });
  const [recentTenders, setRecentTenders] = useState<Tender[]>([]);
  const [recentBids, setRecentBids] = useState<Bid[]>([]);

  const loadDashboard = useCallback(async () => {
    const [tendersRes, bidsRes, projectsRes] = await Promise.all([
      api.get('/tenders'),
      api.get('/bids'),
      api.get('/projects'),
    ]);
    if (tendersRes.success) {
      setRecentTenders(tendersRes.data.slice(0, 5));
      setStats(s => ({
        ...s,
        totalTenders: tendersRes.meta?.total || tendersRes.data.length,
        openTenders: tendersRes.data.filter((t: Tender) => t.status === 'open').length,
      }));
    }
    if (bidsRes.success) {
      setRecentBids(bidsRes.data.slice(0, 5));
      setStats(s => ({
        ...s,
        totalBids: bidsRes.meta?.total || bidsRes.data.length,
        activeBids: bidsRes.data.filter((b: Bid) => b.status === 'pending_review' || b.status === 'shortlisted').length,
      }));
    }
    if (projectsRes.success) {
      setStats(s => ({
        ...s,
        activeProjects: projectsRes.data.filter((p: Project) => p.status === 'active').length,
        totalPayments: projectsRes.data.reduce((sum: number, p: Project) => sum + (p.contractValue || 0), 0),
      }));
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadDashboard();
    fetchNotifications();
  }, [loadDashboard, fetchNotifications]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleMarkAsRead = async (id: string) => {
    await api.patch(`/notifications/${id}`, { read: true });
    fetchNotifications();
  };

  const role = user?.role || 'contractor';
  const unreadNotifications = notifications.filter(n => !n.read).slice(0, 5);
  const tips = ROLE_TIPS[role] || ROLE_TIPS.contractor;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Welcome back, {user?.profile?.fullName || user?.email}!</h2>
          <p className="text-muted-foreground text-sm">Here&apos;s what&apos;s happening in your tender ecosystem.</p>
        </div>
        {role === 'admin' && (
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setView('tenders')}>
            <FileSearch className="h-4 w-4 mr-2" /> Create Tender
          </Button>
        )}
      </div>

      {/* Role-specific Tips */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">Tips for {role.replace('_', ' ')}s</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-amber-900/80">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">&#8226;</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileSearch} label="Open Tenders" value={stats.openTenders} color="bg-emerald-500"
          onClick={() => setView('tenders')} />
        <StatCard icon={Gavel} label={role === 'contractor' ? 'Active Bids' : 'Pending Bids'} value={stats.activeBids} color="bg-amber-500"
          onClick={() => setView('bids')} />
        <StatCard icon={FolderKanban} label="Active Projects" value={stats.activeProjects} color="bg-teal-500"
          onClick={() => setView('projects')} />
        <StatCard icon={DollarSign} label="Total Contract Value" value={`ETB ${stats.totalPayments.toLocaleString()}`} color="bg-purple-500"
          onClick={() => setView('projects')} />
      </div>

      {/* Recent Activity + Notifications */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Notifications Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
                {unreadNotifications.length > 0 && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-red-500 text-white">
                    {notifications.filter(n => !n.read).length}
                  </Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setView('dashboard')}>
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {unreadNotifications.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-300" />
                <p className="text-sm text-muted-foreground">All caught up! No unread notifications.</p>
              </div>
            ) : (
              <ScrollArea className="max-h-72">
                <div className="space-y-1">
                  {unreadNotifications.map(n => {
                    const Icon = NOTIFICATION_ICONS[n.type] || Info;
                    const colorClass = NOTIFICATION_COLORS[n.type] || 'text-gray-500';
                    return (
                      <button key={n.id}
                        onClick={() => handleMarkAsRead(n.id)}
                        className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group">
                        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${colorClass}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-emerald-600 flex-shrink-0 mt-1">
                          Mark read
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Tenders</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setView('tenders')}>View all</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTenders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tenders yet</p>
            ) : recentTenders.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => setView('tender-detail', { id: t.id })}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    ETB {t.budgetMin.toLocaleString()} - {t.budgetMax.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {t.matchScore !== undefined && (
                    <Badge variant={t.matchScore >= 50 ? 'default' : 'secondary'} className="text-xs">
                      {t.matchScore}% match
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs capitalize">{t.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Bids */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Bids</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setView('bids')}>View all</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentBids.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No bids yet</p>
          ) : recentBids.map(b => (
            <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{b.tender?.title || 'Tender'}</p>
                <p className="text-xs text-muted-foreground">ETB {b.financialProposal.toLocaleString()} &middot; {b.timeline}</p>
              </div>
              <Badge className="text-xs ml-2" variant={
                b.status === 'awarded' ? 'default' :
                b.status === 'rejected' ? 'destructive' :
                b.status === 'shortlisted' ? 'secondary' : 'outline'
              }>
                {b.status.replace('_', ' ')}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {role === 'contractor' && (
              <>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setView('tenders')}>
                  <FileSearch className="h-5 w-5" /> <span className="text-xs">Browse Tenders</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setView('documents')}>
                  <FileCheck className="h-5 w-5" /> <span className="text-xs">Upload Documents</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setView('profile')}>
                  <Users className="h-5 w-5" /> <span className="text-xs">Complete Profile</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setView('agent')}>
                  <TrendingUp className="h-5 w-5" /> <span className="text-xs">Get AI Help</span>
                </Button>
              </>
            )}
            {role === 'admin' && (
              <>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setView('tenders')}>
                  <FileSearch className="h-5 w-5" /> <span className="text-xs">Create Tender</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setView('bids')}>
                  <Gavel className="h-5 w-5" /> <span className="text-xs">Review Bids</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setView('admin')}>
                  <Shield className="h-5 w-5" /> <span className="text-xs">Verify Users</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setView('events')}>
                  <GraduationCap className="h-5 w-5" /> <span className="text-xs">Create Workshop</span>
                </Button>
              </>
            )}
            {role === 'tender_owner' && (
              <>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setView('tenders')}>
                  <FileSearch className="h-5 w-5" /> <span className="text-xs">My Tenders</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setView('bids')}>
                  <Gavel className="h-5 w-5" /> <span className="text-xs">Review Bids</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setView('projects')}>
                  <FolderKanban className="h-5 w-5" /> <span className="text-xs">Track Projects</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setView('agent')}>
                  <TrendingUp className="h-5 w-5" /> <span className="text-xs">Get AI Help</span>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
