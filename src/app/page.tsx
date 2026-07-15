'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import {
  LayoutDashboard, Search, FileText, Plus, LogOut,
  Building2, Loader2, TrendingUp, FolderOpen, Briefcase,
  Trash2, Eye, CheckCircle2, CalendarDays, MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User, Tender } from '@/components/portal/lib';
import { CATEGORIES, STATUS_COLORS, parseRequirements, formatDate, isDeadlinePast, isDeadlineSoon, apiFetch } from '@/components/portal/lib';

const AuthGate = dynamic(() => import('@/components/portal/auth-gate').then(m => ({ default: m.AuthGate })), { ssr: false });
const TenderReviewDialog = dynamic(() => import('@/components/portal/tender-review-dialog').then(m => ({ default: m.TenderReviewDialog })), { ssr: false });

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [reviewTender, setReviewTender] = useState<Tender | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{ user: User }>('/api/auth/me');
        setUser(data.user);
      } catch { /* not logged in */ }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (categoryFilter !== 'all') params.set('category', categoryFilter);
        const data = await apiFetch<{ tenders: Tender[] }>(`/api/tenders?${params}`);
        if (!cancelled) setTenders(data.tenders);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [user, search, categoryFilter]);

  const loadTenders = useCallback(async () => {
    try {
      const data = await apiFetch<{ tenders: Tender[] }>('/api/tenders');
      setTenders(data.tenders);
    } catch { toast.error('Failed to load tenders'); }
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    toast.success('Logged out');
  };

  const handleDeleteTender = async (id: string) => {
    if (!confirm('Delete this tender?')) return;
    try {
      await fetch(`/api/tenders/${id}`, { method: 'DELETE' });
      toast.success('Tender deleted');
      loadTenders();
    } catch { toast.error('Delete failed'); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="size-8 animate-spin text-emerald-600" /></div>;
  }

  if (!user) return <AuthGate onAuth={setUser} />;

  const myTenders = tenders.filter(t => t.userId === user.id);
  const openTenders = tenders.filter(t => t.status === 'open');
  const categories = [...new Set(tenders.map(t => t.category))];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="glass border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-emerald flex items-center justify-center"><Building2 className="size-4 text-white" /></div>
            <span className="font-bold text-lg">Tenets</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="size-7"><AvatarFallback className="text-xs gradient-emerald text-white">{user.name.charAt(0)}</AvatarFallback></Avatar>
                <span className="text-sm hidden sm:inline">{user.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLogout}><LogOut className="size-4 mr-2" />Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 flex flex-wrap">
            <TabsTrigger value="dashboard"><LayoutDashboard className="size-4 mr-1" />Dashboard</TabsTrigger>
            <TabsTrigger value="browse"><Search className="size-4 mr-1" />Browse</TabsTrigger>
            <TabsTrigger value="my-tenders"><FileText className="size-4 mr-1" />My Tenders</TabsTrigger>
            <TabsTrigger value="create"><Plus className="size-4 mr-1" />Create</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="view-enter space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Tenders', value: tenders.length, icon: FolderOpen, gradient: 'gradient-emerald' },
                { label: 'Open Tenders', value: openTenders.length, icon: TrendingUp, gradient: 'gradient-teal' },
                { label: 'My Tenders', value: myTenders.length, icon: FileText, gradient: 'gradient-amber' },
                { label: 'Categories', value: categories.length, icon: Briefcase, gradient: 'gradient-rose' },
              ].map(s => (
                <Card key={s.label} className="premium-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${s.gradient} flex items-center justify-center shrink-0`}>
                      <s.icon className="size-5 text-white" />
                    </div>
                    <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <h2 className="text-lg font-semibold">Recent Tenders</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tenders.slice(0, 6).map(t => <TenderCardInline key={t.id} tender={t} onView={() => { setReviewTender(t); setReviewOpen(true); }} />)}
              {tenders.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No tenders yet. Create one!</p>}
            </div>
          </TabsContent>

          <TabsContent value="browse" className="view-enter space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input placeholder="Search tenders..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tenders.map(t => <TenderCardInline key={t.id} tender={t} onView={() => { setReviewTender(t); setReviewOpen(true); }} />)}
              {tenders.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No tenders found.</p>}
            </div>
          </TabsContent>

          <TabsContent value="my-tenders" className="view-enter space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTenders.map(t => <TenderCardInline key={t.id} tender={t} onView={() => { setReviewTender(t); setReviewOpen(true); }} onDelete={handleDeleteTender} showDelete />)}
              {myTenders.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">You haven&apos;t created any tenders yet.</p>}
            </div>
          </TabsContent>

          <TabsContent value="create" className="view-enter">
            <CreateTenderForm onSuccess={() => { loadTenders(); setTab('my-tenders'); }} />
          </TabsContent>
        </Tabs>
      </main>

      <TenderReviewDialog tender={reviewTender} open={reviewOpen} onOpenChange={setReviewOpen} />

      <footer className="mt-auto border-t py-4 text-center text-sm text-muted-foreground">
        © 2026 Tenets — Transforming procurement through technology
      </footer>
    </div>
  );
}

// Inline tender card to avoid extra dynamic import
function TenderCardInline({ tender, onView, onDelete, showDelete }: { tender: Tender; onView: () => void; onDelete?: (id: string) => void; showDelete?: boolean }) {
  const requirements = parseRequirements(tender.requirements);
  return (
    <Card className="group hover:shadow-lg transition-all premium-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors">{tender.title}</CardTitle>
          <Badge className={STATUS_COLORS[tender.status] || STATUS_COLORS.open}>{tender.status}</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><span>{tender.organization}</span><span>·</span><span>{tender.category}</span></div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{tender.description}</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{tender.budget}</span>
          <span className="flex items-center gap-1"><CalendarDays className="size-3" />{formatDate(tender.deadline)}</span>
          {tender.location && <span className="flex items-center gap-1"><MapPin className="size-3" />{tender.location}</span>}
        </div>
        {requirements.length > 0 && <div className="flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="size-3" />{requirements.length} requirement{requirements.length !== 1 ? 's' : ''}</div>}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1" onClick={onView}><Eye className="size-3.5 mr-1" />View</Button>
          {showDelete && onDelete && <Button size="sm" variant="outline" className="text-destructive" onClick={() => onDelete(tender.id)}><Trash2 className="size-3.5" /></Button>}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateTenderForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [category, setCategory] = useState('');
  const [deadline, setDeadline] = useState('');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);

  const addReq = () => setRequirements([...requirements, '']);
  const removeReq = (i: number) => { if (requirements.length <= 1) return; setRequirements(requirements.filter((_, j) => j !== i)); };
  const updateReq = (i: number, v: string) => { const u = [...requirements]; u[i] = v; setRequirements(u); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const filteredReqs = requirements.filter(r => r.trim() !== '');
      await apiFetch<{ tender: Tender }>('/api/tenders', {
        method: 'POST',
        body: JSON.stringify({ title, organization, category, deadline, budget, description, requirements: filteredReqs, location }),
      });
      toast.success('Tender created!');
      setTitle(''); setOrganization(''); setCategory(''); setDeadline('');
      setBudget(''); setLocation(''); setDescription(''); setRequirements(['']);
      onSuccess();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <Card className="max-w-2xl mx-auto premium-shadow">
      <CardHeader><CardTitle>Create New Tender</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Title *</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tender title" /></div>
            <div className="space-y-2"><Label>Organization *</Label><Input required value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Org name" /></div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Category *</Label><Select value={category} onValueChange={setCategory} required><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Deadline *</Label><Input type="date" required value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
            <div className="space-y-2"><Label>Budget *</Label><Input required value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="ETB 1,000,000" /></div>
          </div>
          <div className="space-y-2"><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" /></div>
          <div className="space-y-2"><Label>Description *</Label><Textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the tender..." rows={4} /></div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Requirements</Label><Button type="button" variant="outline" size="sm" onClick={addReq}><Plus className="size-3.5 mr-1" />Add</Button></div>
            {requirements.map((req, i) => (
              <div key={i} className="flex gap-2">
                <Input value={req} onChange={(e) => updateReq(i, e.target.value)} placeholder="Requirement..." />
                {requirements.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeReq(i)} className="shrink-0 text-destructive">×</Button>}
              </div>
            ))}
          </div>
          <Button type="submit" className="w-full gradient-emerald border-0 text-white" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin mr-2" />}Create Tender
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
