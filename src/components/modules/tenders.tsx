'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useNavStore } from '@/store';
import { api, Tender } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  FileSearch, Plus, Search, MapPin, Calendar, DollarSign,
  Clock, ArrowRight, TrendingUp, ChevronRight, Zap, Timer,
  Users, Building2, Target, GitCompareArrows, CheckCircle, X as XIcon,
} from 'lucide-react';

const CATEGORIES = ['Construction', 'IT', 'Supply', 'Consulting', 'Engineering', 'Architecture', 'Electrical', 'Plumbing', 'HVAC', 'Logistics', 'Healthcare', 'Education', 'Finance', 'Agriculture', 'Telecommunications'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function deadlineColor(days: number) {
  if (days <= 0) return 'rose';
  if (days <= 3) return 'rose';
  if (days <= 7) return 'amber';
  return 'emerald';
}

function deadlineBg(days: number) {
  const c = deadlineColor(days);
  return `bg-${c}-50 text-${c}-700`;
}

export function TendersView() {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createData, setCreateData] = useState({
    title: '', scope: '', budgetMin: '', budgetMax: '', deadline: '',
    location: '', categoryTags: '', requiredDocs: '',
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);

  const loadTenders = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (categoryFilter && categoryFilter !== 'all') params.category = categoryFilter;
    if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
    const res = await api.get('/tenders', params);
    if (res.success) setTenders(res.data);
    setLoading(false);
  }, [search, categoryFilter, statusFilter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadTenders(); }, [loadTenders]);

  const handleCreate = async () => {
    const res = await api.post('/tenders', {
      ...createData,
      budgetMin: parseFloat(createData.budgetMin),
      budgetMax: parseFloat(createData.budgetMax),
      categoryTags: selectedCategories.join(','),
    });
    if (res.success) {
      toast.success('Tender created successfully!');
      setShowCreate(false);
      loadTenders();
    } else {
      toast.error(res.error || 'Failed to create tender');
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const toggleCompare = (tenderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompareSelection(prev =>
      prev.includes(tenderId) ? prev.filter(id => id !== tenderId) : [...prev, tenderId].slice(-4)
    );
  };

  const goToCompare = () => {
    if (compareSelection.length >= 2) {
      setView('tender-compare', { ids: compareSelection.join(',') });
    }
  };

  const stats = useMemo(() => ({
    open: tenders.filter(t => t.status === 'open').length,
    closed: tenders.filter(t => t.status === 'closed').length,
    awarded: tenders.filter(t => t.status === 'awarded').length,
    total: tenders.length,
  }), [tenders]);

  const topCategories = useMemo(() => {
    const catMap: Record<string, number> = {};
    tenders.forEach(t => t.categoryTags.split(',').filter(Boolean).forEach(c => { catMap[c.trim()] = (catMap[c.trim()] || 0) + 1; }));
    return Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c]) => c);
  }, [tenders]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
      case 'closed': return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
      case 'awarded': return 'bg-teal-100 text-teal-700 hover:bg-teal-100';
      case 'cancelled': return 'bg-gray-100 text-gray-600 hover:bg-gray-100';
      default: return 'bg-gray-100 text-gray-600 hover:bg-gray-100';
    }
  };

  const statusAccent = (status: string) => {
    switch (status) {
      case 'open': return 'from-emerald-400 to-emerald-600';
      case 'closed': return 'from-rose-400 to-rose-600';
      case 'awarded': return 'from-teal-400 to-teal-600';
      case 'cancelled': return 'from-gray-300 to-gray-400';
      default: return 'from-gray-300 to-gray-400';
    }
  };

  const matchBarColor = (score: number) => {
    if (score >= 70) return 'from-emerald-400 to-emerald-600';
    if (score >= 40) return 'from-amber-400 to-amber-600';
    return 'from-gray-300 to-gray-400';
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto view-enter">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl gradient-emerald shadow-md flex-shrink-0">
            <FileSearch className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-gradient-emerald">Tender</span> Discovery
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">Find and explore tender opportunities</p>
          </div>
        </div>
        {(user?.role === 'admin' || user?.role === 'tender_owner') && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gradient-emerald hover:opacity-90 text-white rounded-xl px-5 premium-shadow transition-all hover:-translate-y-0.5">
                <Plus className="h-4 w-4 mr-2" /> Create Tender
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  <span className="text-gradient-emerald">Create New</span> Tender
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Title *</Label>
                  <Input placeholder="e.g. Office Building Construction" value={createData.title}
                    onChange={e => setCreateData(d => ({ ...d, title: e.target.value }))}
                    className="bg-muted/50 border-border/60 rounded-xl focus:ring-emerald-500/20" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Scope of Work *</Label>
                  <Textarea placeholder="Detailed project description, deliverables, requirements" rows={4}
                    value={createData.scope} onChange={e => setCreateData(d => ({ ...d, scope: e.target.value }))}
                    className="bg-muted/50 border-border/60 rounded-xl focus:ring-emerald-500/20" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Budget Min (ETB) *</Label>
                    <Input type="number" placeholder="100000" value={createData.budgetMin}
                      onChange={e => setCreateData(d => ({ ...d, budgetMin: e.target.value }))}
                      className="bg-muted/50 border-border/60 rounded-xl focus:ring-emerald-500/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Budget Max (ETB) *</Label>
                    <Input type="number" placeholder="500000" value={createData.budgetMax}
                      onChange={e => setCreateData(d => ({ ...d, budgetMax: e.target.value }))}
                      className="bg-muted/50 border-border/60 rounded-xl focus:ring-emerald-500/20" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Deadline *</Label>
                    <Input type="datetime-local" value={createData.deadline}
                      onChange={e => setCreateData(d => ({ ...d, deadline: e.target.value }))}
                      className="bg-muted/50 border-border/60 rounded-xl focus:ring-emerald-500/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Location *</Label>
                    <Input placeholder="Addis Ababa" value={createData.location}
                      onChange={e => setCreateData(d => ({ ...d, location: e.target.value }))}
                      className="bg-muted/50 border-border/60 rounded-xl focus:ring-emerald-500/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Category Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <Badge key={cat}
                        className={`cursor-pointer text-xs rounded-lg transition-all duration-200 ${
                          selectedCategories.includes(cat)
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
                            : 'bg-background border-border/60 text-muted-foreground hover:bg-muted/80'
                        }`}
                        onClick={() => toggleCategory(cat)}>
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button className="w-full gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5" onClick={handleCreate}>
                  Create Tender <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </motion.div>

      {/* Search / Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="premium-shadow rounded-xl border-0 bg-white">
          <CardContent className="p-4 space-y-3">
            {/* Search row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search tenders by title, scope, or keyword..." value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-10 bg-muted/50 border-border/60 rounded-xl focus:ring-emerald-500/20 h-10" />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-44 rounded-xl bg-muted/50 border-border/60 h-10">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36 rounded-xl bg-muted/50 border-border/60 h-10">
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
            {/* Category pills */}
            {!loading && topCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {topCategories.map(cat => (
                  <button key={cat}
                    onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
                    className={`text-[11px] px-3 py-1 rounded-full transition-all duration-200 font-medium ${
                      categoryFilter === cat
                        ? 'gradient-emerald text-white premium-shadow'
                        : 'bg-muted/60 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Summary */}
      {!loading && tenders.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {[
            { label: 'Open', count: stats.open, icon: FileSearch, bg: 'bg-emerald-50', color: 'text-emerald-600' },
            { label: 'Closed', count: stats.closed, icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600' },
            { label: 'Awarded', count: stats.awarded, icon: TrendingUp, bg: 'bg-teal-50', color: 'text-teal-600' },
            { label: 'Total', count: stats.total, icon: Target, bg: 'bg-emerald-50', color: 'text-emerald-600' },
          ].map(stat => (
            <motion.div key={stat.label} variants={itemVariants}>
              <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bg} flex-shrink-0`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stat.count}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Tenders List */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="premium-shadow rounded-xl border-0 bg-white animate-pulse overflow-hidden">
              <div className="h-1.5 bg-muted/30" />
              <CardContent className="p-5 space-y-3">
                <div className="h-5 bg-muted/50 rounded-xl w-3/4" />
                <div className="h-4 bg-muted/50 rounded-xl w-full" />
                <div className="h-4 bg-muted/50 rounded-xl w-1/2" />
                <div className="h-2 bg-muted/50 rounded-full w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tenders.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <Card className="premium-shadow rounded-xl border-0 bg-white">
            <CardContent className="p-16 text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-2xl gradient-emerald opacity-20" />
                <div className="absolute inset-2 rounded-xl gradient-emerald flex items-center justify-center">
                  <FileSearch className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold">No tenders found</h3>
              <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
                {search || categoryFilter
                  ? 'Try adjusting your search or filters to find more opportunities'
                  : 'New tenders are posted regularly. Check back soon!'}
              </p>
              {(search || categoryFilter) && (
                <Button variant="outline" className="mt-4 rounded-xl" onClick={() => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); }}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {tenders.map(tender => {
              const days = daysUntil(tender.deadline);
              const dlColor = deadlineColor(days);
              const dlBg = deadlineBg(days);
              const tags = tender.categoryTags.split(',').filter(Boolean);

              return (
                <motion.div
                  key={tender.id}
                  variants={itemVariants}
                  layout
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className={`premium-shadow rounded-xl border-0 bg-white cursor-pointer group overflow-hidden transition-all duration-200 ${
                      compareSelection.includes(tender.id) ? 'ring-2 ring-emerald-400 ring-offset-2' : ''
                    }`}
                    onClick={() => setView('tender-detail', { id: tender.id })}
                  >
                    {/* Gradient accent strip at top */}
                    <div className={`h-1.5 bg-gradient-to-r ${statusAccent(tender.status)}`} />

                    <CardContent className="p-5 space-y-3">
                      {/* Header: Title + Status + Compare checkbox */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-emerald-700 transition-colors flex-1 min-w-0">
                          {tender.title}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Badge className={`text-[10px] px-1.5 py-0 shrink-0 border-0 rounded-lg ${statusColor(tender.status)}`}>
                            {tender.status}
                          </Badge>
                          <button
                            onClick={(e) => toggleCompare(tender.id, e)}
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                              compareSelection.includes(tender.id)
                                ? 'border-emerald-500 bg-emerald-500 shadow-sm shadow-emerald-200'
                                : 'border-muted-foreground/30 hover:border-emerald-400 hover:bg-emerald-50'
                            }`}
                            title="Select to compare"
                          >
                            {compareSelection.includes(tender.id) && (
                              <CheckCircle className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Scope */}
                      <p className="text-xs text-muted-foreground line-clamp-2">{tender.scope}</p>

                      {/* Budget */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <div className="p-1 rounded bg-emerald-50">
                          <DollarSign className="h-3 w-3 text-emerald-600" />
                        </div>
                        <span className="font-medium text-emerald-700">ETB {tender.budgetMin.toLocaleString()} – {tender.budgetMax.toLocaleString()}</span>
                      </div>

                      {/* Location & Deadline */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <div className="p-1 rounded bg-amber-50">
                            <MapPin className="h-3 w-3 text-amber-600" />
                          </div>
                          <span className="truncate max-w-[100px]">{tender.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="p-1 rounded bg-teal-50">
                            <Calendar className="h-3 w-3 text-teal-600" />
                          </div>
                          <span>{new Date(tender.deadline).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Deadline countdown badge */}
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] px-1.5 py-0 border-0 rounded-lg ${dlBg} hover:${dlBg} flex items-center gap-1`}>
                          <Timer className="h-2.5 w-2.5" />
                          {days <= 0 ? 'Expired' : days === 1 ? '1 day left' : `${days} days left`}
                        </Badge>
                        {tender._count && (
                          <Badge className="text-[10px] px-1.5 py-0 border-0 rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted/60 flex items-center gap-1">
                            <Users className="h-2.5 w-2.5" />
                            {tender._count.bids} bid{tender._count.bids !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>

                      {/* Category tags */}
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 3).map(tag => (
                          <Badge key={tag} className="text-[10px] px-1.5 py-0 border-0 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                            {tag.trim()}
                          </Badge>
                        ))}
                        {tags.length > 3 && (
                          <Badge className="text-[10px] px-1.5 py-0 border-0 rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted/60">
                            +{tags.length - 3}
                          </Badge>
                        )}
                      </div>

                      {/* Match score with progress bar */}
                      {tender.matchScore !== undefined && (
                        <div className="pt-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground font-medium">Match Score</span>
                            <span className={`text-[10px] font-bold ${
                              tender.matchScore >= 70 ? 'text-emerald-700' : tender.matchScore >= 40 ? 'text-amber-700' : 'text-gray-500'
                            }`}>
                              {tender.matchScore}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full bg-gradient-to-r ${matchBarColor(tender.matchScore)}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${tender.matchScore}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                            />
                          </div>
                        </div>
                      )}

                      {/* View indicator */}
                      <div className="flex items-center justify-end pt-1">
                        <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          View Details <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Floating Compare Bar */}
      <AnimatePresence>
        {compareSelection.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md rounded-2xl px-5 py-3 premium-shadow-lg border border-emerald-200/60">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg gradient-emerald">
                  <GitCompareArrows className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {compareSelection.length} tender{compareSelection.length !== 1 ? 's' : ''} selected
                  </p>
                  <p className="text-[10px] text-muted-foreground">Select 2-4 to compare</p>
                </div>
              </div>
              <div className="h-8 w-px bg-border/60" />
              <Button
                size="sm"
                className={`rounded-xl font-semibold transition-all hover:-translate-y-0.5 ${
                  compareSelection.length >= 2
                    ? 'gradient-emerald hover:opacity-90 text-white premium-shadow'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
                disabled={compareSelection.length < 2}
                onClick={goToCompare}
              >
                <GitCompareArrows className="h-3.5 w-3.5 mr-1.5" />
                Compare {compareSelection.length >= 2 ? `(${compareSelection.length})` : ''}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                onClick={() => setCompareSelection([])}
              >
                <XIcon className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
