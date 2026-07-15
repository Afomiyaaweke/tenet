'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Search,
  FileText,
  Plus,
  LogOut,
  Building2,
  CalendarDays,
  MapPin,
  DollarSign,
  Users,
  Trash2,
  Eye,
  Download,
  CheckCircle2,
  X,
  PlusCircle,
  Loader2,
  Briefcase,
  FileBadge,
  FolderOpen,
  TrendingUp,
  Menu,
  ChevronDown,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ───────────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  company: string | null;
}

interface Tender {
  id: string;
  title: string;
  organization: string;
  category: string;
  deadline: string;
  budget: string;
  description: string;
  requirements: string;
  location: string;
  status: string;
  bidCount: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: { name: string; company: string | null };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Construction',
  'IT',
  'Healthcare',
  'Education',
  'Energy',
  'Agriculture',
  'Transport',
  'Consulting',
];

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  closed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  awarded: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseRequirements(requirements: string): string[] {
  try {
    const parsed = JSON.parse(requirements);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function isDeadlineSoon(deadline: string): boolean {
  const d = new Date(deadline);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

function isDeadlinePast(deadline: string): boolean {
  return new Date(deadline).getTime() < Date.now();
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── Auth Gate Component ─────────────────────────────────────────────────────

function AuthGate({ onAuth }: { onAuth: (user: User) => void }) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCompany, setRegCompany] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<{ user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      toast.success('Welcome back!');
      onAuth(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<{ user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          company: regCompany || undefined,
        }),
      });
      toast.success('Account created successfully!');
      onAuth(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md view-enter">
          {/* Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="gradient-emerald rounded-xl p-2.5 shadow-lg">
                <FileBadge className="size-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gradient-emerald">Tenets</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Transforming procurement through technology
            </p>
          </div>

          {/* Auth Card */}
          <Card className="glass-card premium-shadow border-0">
            <CardHeader className="pb-4">
              <Tabs value={tab} onValueChange={(v) => { setTab(v as 'login' | 'register'); setError(''); }}>
                <TabsList className="w-full">
                  <TabsTrigger value="login" className="flex-1">Sign In</TabsTrigger>
                  <TabsTrigger value="register" className="flex-1">Create Account</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                  <X className="size-4 shrink-0" />
                  {error}
                </div>
              )}

              {tab === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" className="w-full gradient-emerald border-0 text-white" disabled={loading}>
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Full Name</Label>
                    <Input
                      id="reg-name"
                      placeholder="John Doe"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-company">Company (optional)</Label>
                    <Input
                      id="reg-company"
                      placeholder="Acme Corp"
                      value={regCompany}
                      onChange={(e) => setRegCompany(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" className="w-full gradient-emerald border-0 text-white" disabled={loading}>
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Sticky Footer */}
      <footer className="mt-auto border-t bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Tenets &mdash; Transforming procurement through technology
        </div>
      </footer>
    </div>
  );
}

// ─── Tender Review Dialog ────────────────────────────────────────────────────

function TenderReviewDialog({
  tender,
  open,
  onOpenChange,
}: {
  tender: Tender | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [exporting, setExporting] = useState(false);

  if (!tender) return null;

  const requirements = parseRequirements(tender.requirements);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/tenders/${tender.id}/export-pdf`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tender.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF exported successfully');
    } catch {
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <div className="flex-1 overflow-y-auto">
          {/* Header Section */}
          <div className="gradient-emerald p-6 pb-8 rounded-t-lg relative">
            <DialogHeader>
              <DialogTitle className="text-xl text-white font-bold leading-tight pr-8">
                {tender.title}
              </DialogTitle>
              <DialogDescription className="text-white/80 mt-1">
                Published by {tender.user.name}
                {tender.user.company && ` · ${tender.user.company}`}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                <Building2 className="size-3" />
                {tender.organization}
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                <Briefcase className="size-3" />
                {tender.category}
              </Badge>
              <Badge
                className={`border-0 ${
                  tender.status === 'open'
                    ? 'bg-emerald-600 text-white'
                    : tender.status === 'closed'
                      ? 'bg-red-600 text-white'
                      : 'bg-amber-600 text-white'
                }`}
              >
                {tender.status.charAt(0).toUpperCase() + tender.status.slice(1)}
              </Badge>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Key Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Budget</p>
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <DollarSign className="size-4 text-emerald-600" />
                  {tender.budget}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Deadline</p>
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <CalendarDays className={`size-4 ${isDeadlinePast(tender.deadline) ? 'text-red-500' : isDeadlineSoon(tender.deadline) ? 'text-amber-500' : 'text-emerald-600'}`} />
                  {formatDate(tender.deadline)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</p>
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <MapPin className="size-4 text-emerald-600" />
                  {tender.location || 'Not specified'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Published</p>
                <p className="text-sm font-semibold">
                  {formatDate(tender.createdAt)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bids</p>
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Users className="size-4 text-emerald-600" />
                  {tender.bidCount} {tender.bidCount === 1 ? 'bid' : 'bids'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Description Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Description
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {tender.description}
              </p>
            </div>

            <Separator />

            {/* Requirements Section - KEY FEATURE */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Requirements
              </h3>
              {requirements.length > 0 ? (
                <ul className="space-y-2.5">
                  {requirements.map((req, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30"
                    >
                      <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-sm leading-relaxed">{req}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">No specific requirements listed.</p>
              )}
            </div>
          </div>
        </div>

        {/* Dialog Footer */}
        <div className="border-t p-4 bg-muted/30">
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              onClick={handleExportPdf}
              disabled={exporting}
              className="gradient-emerald border-0 text-white"
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {exporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tender Card Component ──────────────────────────────────────────────────

function TenderCard({
  tender,
  onView,
  onDelete,
  showDelete = false,
}: {
  tender: Tender;
  onView: (tender: Tender) => void;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
}) {
  const requirements = parseRequirements(tender.requirements);
  const deadlinePast = isDeadlinePast(tender.deadline);
  const deadlineSoon = isDeadlineSoon(tender.deadline);

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 premium-shadow overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
            {tender.title}
          </CardTitle>
          <Badge
            variant="secondary"
            className={`shrink-0 text-[11px] ${STATUS_COLORS[tender.status] || ''}`}
          >
            {tender.status}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1.5">
          <Building2 className="size-3.5" />
          {tender.organization}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[11px]">
            <Briefcase className="size-3" />
            {tender.category}
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            <MapPin className="size-3" />
            {tender.location || 'N/A'}
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            <Users className="size-3" />
            {tender.bidCount} bids
          </Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <DollarSign className="size-3.5" />
            {tender.budget}
          </span>
          <span
            className={`text-xs flex items-center gap-1 ${
              deadlinePast
                ? 'text-red-500'
                : deadlineSoon
                  ? 'text-amber-600'
                  : 'text-muted-foreground'
            }`}
          >
            <CalendarDays className="size-3" />
            {formatDate(tender.deadline)}
          </span>
        </div>
        {requirements.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {requirements.length} requirement{requirements.length !== 1 ? 's' : ''}
          </p>
        )}
      </CardContent>
      <CardFooter className="gap-2 pt-0">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => onView(tender)}
        >
          <Eye className="size-3.5" />
          View
        </Button>
        {showDelete && onDelete && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(tender.id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// ─── Dashboard Tab ───────────────────────────────────────────────────────────

function DashboardTab({
  tenders,
  myTenders,
  onView,
}: {
  tenders: Tender[];
  myTenders: Tender[];
  onView: (tender: Tender) => void;
}) {
  const openTenders = tenders.filter((t) => t.status === 'open');
  const categories = [...new Set(tenders.map((t) => t.category))];

  const stats = [
    {
      label: 'Total Tenders',
      value: tenders.length,
      icon: FileText,
      gradient: 'gradient-emerald',
      textClass: 'text-white',
    },
    {
      label: 'Open Tenders',
      value: openTenders.length,
      icon: FolderOpen,
      gradient: 'gradient-teal',
      textClass: 'text-white',
    },
    {
      label: 'My Tenders',
      value: myTenders.length,
      icon: FileBadge,
      gradient: 'gradient-amber',
      textClass: 'text-white',
    },
    {
      label: 'Categories',
      value: categories.length,
      icon: TrendingUp,
      gradient: 'gradient-slate',
      textClass: 'text-white',
    },
  ];

  const recentTenders = [...tenders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 view-enter">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="overflow-hidden border-0 premium-shadow">
            <CardContent className="p-0">
              <div className={`${stat.gradient} p-4 flex items-center gap-3`}>
                <div className="bg-white/20 rounded-lg p-2">
                  <stat.icon className={`size-5 ${stat.textClass}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-white/80">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Tenders */}
      <Card className="border-0 premium-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Recent Tenders</CardTitle>
          <CardDescription>Latest opportunities in the ecosystem</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTenders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No tenders found. Create your first tender!
            </p>
          ) : (
            <div className="space-y-3">
              {recentTenders.map((tender) => (
                <div
                  key={tender.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onView(tender)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tender.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {tender.organization} · {tender.category} · {formatDate(tender.deadline)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Badge
                      variant="secondary"
                      className={`text-[11px] ${STATUS_COLORS[tender.status] || ''}`}
                    >
                      {tender.status}
                    </Badge>
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      {tender.budget}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Browse Tenders Tab ──────────────────────────────────────────────────────

function BrowseTendersTab({
  tenders,
  onView,
  loading,
}: {
  tenders: Tender[];
  onView: (tender: Tender) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');

  const filtered = tenders.filter((t) => {
    const matchesSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.organization.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || t.category === category;
    const matchesStatus = status === 'all' || t.status === status;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6 view-enter">
      {/* Search & Filter Bar */}
      <Card className="border-0 premium-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search tenders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="awarded">Awarded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-0 premium-shadow">
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 premium-shadow">
          <CardContent className="py-12 text-center">
            <Search className="size-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No tenders found matching your criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tender) => (
            <TenderCard key={tender.id} tender={tender} onView={onView} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── My Tenders Tab ──────────────────────────────────────────────────────────

function MyTendersTab({
  tenders,
  onView,
  onDelete,
  loading,
}: {
  tenders: Tender[];
  onView: (tender: Tender) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-4 view-enter">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-0 premium-shadow">
            <CardContent className="p-4">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 view-enter">
      {tenders.length === 0 ? (
        <Card className="border-0 premium-shadow">
          <CardContent className="py-12 text-center">
            <FileText className="size-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-2">You haven&apos;t created any tenders yet</p>
            <p className="text-sm text-muted-foreground">
              Go to the Create Tender tab to publish your first tender
            </p>
          </CardContent>
        </Card>
      ) : (
        tenders.map((tender) => (
          <TenderCard
            key={tender.id}
            tender={tender}
            onView={onView}
            onDelete={onDelete}
            showDelete
          />
        ))
      )}
    </div>
  );
}

// ─── Create Tender Tab ───────────────────────────────────────────────────────

function CreateTenderTab({ onCreated }: { onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [category, setCategory] = useState('');
  const [deadline, setDeadline] = useState('');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState<string[]>(['']);
  const [error, setError] = useState('');

  const addRequirement = () => setRequirements([...requirements, '']);

  const removeRequirement = (index: number) => {
    if (requirements.length <= 1) return;
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const updateRequirement = (index: number, value: string) => {
    const updated = [...requirements];
    updated[index] = value;
    setRequirements(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title || !organization || !category || !deadline || !budget || !description) {
      setError('Please fill in all required fields');
      return;
    }

    const filteredReqs = requirements.filter((r) => r.trim() !== '');

    setLoading(true);
    try {
      await apiFetch('/api/tenders', {
        method: 'POST',
        body: JSON.stringify({
          title,
          organization,
          category,
          deadline,
          budget,
          description,
          requirements: filteredReqs,
          location,
        }),
      });
      toast.success('Tender created successfully!');
      setTitle('');
      setOrganization('');
      setCategory('');
      setDeadline('');
      setBudget('');
      setLocation('');
      setDescription('');
      setRequirements(['']);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tender');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="view-enter">
      <Card className="border-0 premium-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Publish New Tender</CardTitle>
          <CardDescription>Fill in the details to create a new tender opportunity</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
              <X className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., School Building Construction"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">Organization *</Label>
                <Input
                  id="organization"
                  placeholder="e.g., Ministry of Education"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={category} onValueChange={setCategory} disabled={loading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline *</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget *</Label>
                <Input
                  id="budget"
                  placeholder="e.g., ETB 5,000,000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Addis Ababa"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Provide a detailed description of the tender..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
                disabled={loading}
              />
            </div>

            {/* Dynamic Requirements List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Requirements</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRequirement}
                  disabled={loading}
                >
                  <PlusCircle className="size-3.5" />
                  Add Requirement
                </Button>
              </div>
              <div className="space-y-2">
                {requirements.map((req, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder={`Requirement ${i + 1}`}
                      value={req}
                      onChange={(e) => updateRequirement(i, e.target.value)}
                      disabled={loading}
                    />
                    {requirements.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRequirement(i)}
                        disabled={loading}
                        className="shrink-0 text-destructive hover:text-destructive"
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gradient-emerald border-0 text-white"
              disabled={loading}
              size="lg"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? 'Creating Tender...' : 'Publish Tender'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [myTenders, setMyTenders] = useState<Tender[]>([]);
  const [tendersLoading, setTendersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reviewTender, setReviewTender] = useState<Tender | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check auth on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{ user: User }>('/api/auth/me');
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  // Fetch tenders when user logs in
  const fetchTenders = useCallback(async () => {
    if (!user) return;
    setTendersLoading(true);
    try {
      const [allData, mineData] = await Promise.all([
        apiFetch<{ tenders: Tender[] }>('/api/tenders?status=all&category=all'),
        apiFetch<{ tenders: Tender[] }>('/api/tenders?mine=true&status=all'),
      ]);
      setTenders(allData.tenders);
      setMyTenders(mineData.tenders);
    } catch {
      toast.error('Failed to load tenders');
    } finally {
      setTendersLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTenders();
  }, [fetchTenders]);

  const handleAuth = (u: User) => {
    setUser(u);
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setTenders([]);
      setMyTenders([]);
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    }
  };

  const handleDeleteTender = async (id: string) => {
    try {
      await apiFetch(`/api/tenders/${id}`, { method: 'DELETE' });
      toast.success('Tender deleted');
      fetchTenders();
    } catch {
      toast.error('Failed to delete tender');
    }
  };

  const handleViewTender = (tender: Tender) => {
    setReviewTender(tender);
    setReviewOpen(true);
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="gradient-emerald rounded-xl p-3 inline-block shadow-lg">
            <FileBadge className="size-8 text-white" />
          </div>
          <div className="flex items-center gap-2 justify-center">
            <Loader2 className="size-5 animate-spin text-emerald-600" />
            <span className="text-muted-foreground">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Auth gate
  if (!user) {
    return <AuthGate onAuth={handleAuth} />;
  }

  // Portal
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="gradient-emerald rounded-lg p-1.5">
              <FileBadge className="size-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gradient-emerald hidden sm:block">Tenets</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="size-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="size-8">
                    <AvatarFallback className="gradient-emerald text-white text-xs">
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium leading-tight">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{user.role}</p>
                  </div>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    {user.company && (
                      <p className="text-xs text-muted-foreground">{user.company}</p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Desktop Tab Navigation */}
          <div className="hidden sm:block mb-6">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="dashboard">
                <LayoutDashboard className="size-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="browse">
                <Search className="size-4" />
                Browse
              </TabsTrigger>
              <TabsTrigger value="my-tenders">
                <FileText className="size-4" />
                My Tenders
              </TabsTrigger>
              <TabsTrigger value="create">
                <Plus className="size-4" />
                Create
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Mobile Tab Navigation */}
          {mobileMenuOpen && (
            <div className="sm:hidden mb-4 view-enter">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <LayoutDashboard className="size-4" />
                </TabsTrigger>
                <TabsTrigger value="browse" onClick={() => setMobileMenuOpen(false)}>
                  <Search className="size-4" />
                </TabsTrigger>
                <TabsTrigger value="my-tenders" onClick={() => setMobileMenuOpen(false)}>
                  <FileText className="size-4" />
                </TabsTrigger>
                <TabsTrigger value="create" onClick={() => setMobileMenuOpen(false)}>
                  <Plus className="size-4" />
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          {/* Mobile active tab label */}
          <div className="sm:hidden mb-4">
            <TabsList className="hidden">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            </TabsList>
            <p className="text-sm font-medium text-muted-foreground">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'browse' && 'Browse Tenders'}
              {activeTab === 'my-tenders' && 'My Tenders'}
              {activeTab === 'create' && 'Create Tender'}
            </p>
          </div>

          <TabsContent value="dashboard">
            <DashboardTab tenders={tenders} myTenders={myTenders} onView={handleViewTender} />
          </TabsContent>

          <TabsContent value="browse">
            <BrowseTendersTab tenders={tenders} onView={handleViewTender} loading={tendersLoading} />
          </TabsContent>

          <TabsContent value="my-tenders">
            <MyTendersTab tenders={myTenders} onView={handleViewTender} onDelete={handleDeleteTender} loading={tendersLoading} />
          </TabsContent>

          <TabsContent value="create">
            <CreateTenderTab onCreated={fetchTenders} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Tender Review Dialog */}
      <TenderReviewDialog
        tender={reviewTender}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
      />

      {/* Sticky Footer */}
      <footer className="mt-auto border-t bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Tenets &mdash; Transforming procurement through technology
        </div>
      </footer>
    </div>
  );
}
