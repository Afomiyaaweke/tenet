'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api, Tender } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  FileSearch, Plus, Search, Filter, MapPin, Calendar, DollarSign,
  Tag, Briefcase, Clock, ArrowRight, TrendingUp, ChevronRight,
} from 'lucide-react';

const CATEGORIES = ['Construction', 'IT', 'Supply', 'Consulting', 'Engineering', 'Architecture', 'Electrical', 'Plumbing', 'HVAC', 'Logistics', 'Healthcare', 'Education', 'Finance', 'Agriculture', 'Telecommunications'];

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

  const statusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
      case 'closed': return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
      case 'awarded': return 'bg-teal-100 text-teal-700 hover:bg-teal-100';
      case 'cancelled': return 'bg-gray-100 text-gray-600 hover:bg-gray-100';
      default: return 'bg-gray-100 text-gray-600 hover:bg-gray-100';
    }
  };

  const statusIconBg = (status: string) => {
    switch (status) {
      case 'open': return 'bg-emerald-50';
      case 'closed': return 'bg-rose-50';
      case 'awarded': return 'bg-teal-50';
      case 'cancelled': return 'bg-gray-50';
      default: return 'bg-gray-50';
    }
  };

  const statusIconColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-emerald-600';
      case 'closed': return 'text-rose-600';
      case 'awarded': return 'text-teal-600';
      case 'cancelled': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto view-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl gradient-emerald flex-shrink-0">
            <FileSearch className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-gradient-emerald">Tender</span> Discovery
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">Find and explore tender opportunities</p>
          </div>
        </div>
        {user?.role === 'admin' && (
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
      </div>

      {/* Filters */}
      <Card className="premium-shadow rounded-xl border-0 bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search tenders..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-10 bg-muted/50 border-border/60 rounded-xl focus:ring-emerald-500/20" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-44 rounded-xl bg-muted/50 border-border/60">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36 rounded-xl bg-muted/50 border-border/60">
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

      {/* Stats Summary */}
      {!loading && tenders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 flex-shrink-0">
                <FileSearch className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{tenders.filter(t => t.status === 'open').length}</p>
                <p className="text-xs text-muted-foreground">Open</p>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 flex-shrink-0">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{tenders.filter(t => t.status === 'closed').length}</p>
                <p className="text-xs text-muted-foreground">Closed</p>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-50 flex-shrink-0">
                <Briefcase className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{tenders.filter(t => t.status === 'awarded').length}</p>
                <p className="text-xs text-muted-foreground">Awarded</p>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-50 flex-shrink-0">
                <TrendingUp className="h-4 w-4 text-rose-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{tenders.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tenders List */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="premium-shadow rounded-xl border-0 bg-white animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-5 bg-muted/50 rounded-xl w-3/4" />
                <div className="h-4 bg-muted/50 rounded-xl w-full" />
                <div className="h-4 bg-muted/50 rounded-xl w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tenders.length === 0 ? (
        <Card className="premium-shadow rounded-xl border-0 bg-white">
          <CardContent className="p-12 text-center">
            <div className="p-3 rounded-2xl gradient-emerald w-fit mx-auto mb-4">
              <FileSearch className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold">No tenders found</h3>
            <p className="text-muted-foreground text-sm mt-1">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenders.map(tender => (
            <Card key={tender.id}
              className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
              onClick={() => setView('tender-detail', { id: tender.id })}>
              <CardContent className="p-5 space-y-3">
                {/* Header: Icon + Title + Status */}
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${statusIconBg(tender.status)} group-hover:scale-105 transition-transform`}>
                    <FileSearch className={`h-4 w-4 ${statusIconColor(tender.status)}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-emerald-700 transition-colors">
                      {tender.title}
                    </h3>
                  </div>
                  <Badge className={`text-[10px] px-2 py-0.5 shrink-0 border-0 rounded-lg ${statusColor(tender.status)}`}>
                    {tender.status}
                  </Badge>
                </div>

                {/* Scope */}
                <p className="text-xs text-muted-foreground line-clamp-2 pl-9">{tender.scope}</p>

                {/* Budget */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-9">
                  <div className="p-1 rounded bg-emerald-50">
                    <DollarSign className="h-3 w-3 text-emerald-600" />
                  </div>
                  <span>ETB {tender.budgetMin.toLocaleString()} – {tender.budgetMax.toLocaleString()}</span>
                </div>

                {/* Location & Deadline */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground pl-9">
                  <div className="flex items-center gap-1">
                    <div className="p-1 rounded bg-amber-50">
                      <MapPin className="h-3 w-3 text-amber-600" />
                    </div>
                    <span>{tender.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="p-1 rounded bg-teal-50">
                      <Calendar className="h-3 w-3 text-teal-600" />
                    </div>
                    <span>{new Date(tender.deadline).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Tags + Match Score */}
                <div className="flex items-center justify-between pt-1 pl-9">
                  <div className="flex flex-wrap gap-1">
                    {tender.categoryTags.split(',').filter(Boolean).slice(0, 3).map(tag => (
                      <Badge key={tag} className="text-[10px] px-1.5 py-0 border-0 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                        {tag.trim()}
                      </Badge>
                    ))}
                    {tender.categoryTags.split(',').filter(Boolean).length > 3 && (
                      <Badge className="text-[10px] px-1.5 py-0 border-0 rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted/60">
                        +{tender.categoryTags.split(',').filter(Boolean).length - 3}
                      </Badge>
                    )}
                  </div>
                  {tender.matchScore !== undefined && (
                    <Badge
                      className={`text-[10px] px-2 py-0.5 border-0 rounded-lg ${
                        tender.matchScore >= 70
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          : tender.matchScore >= 40
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
                      }`}>
                      {tender.matchScore}% match
                    </Badge>
                  )}
                </div>

                {/* Bid count */}
                {tender._count && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground pl-9">
                    <ChevronRight className="h-3 w-3 text-emerald-500" />
                    <span>{tender._count.bids} bid{tender._count.bids !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
