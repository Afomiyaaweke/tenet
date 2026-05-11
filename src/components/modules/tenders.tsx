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
import { toast } from 'sonner';
import { FileSearch, Plus, Search, Filter, MapPin, Calendar, DollarSign, Tag } from 'lucide-react';

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
      case 'open': return 'bg-emerald-100 text-emerald-700';
      case 'closed': return 'bg-red-100 text-red-700';
      case 'awarded': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Tender Discovery</h2>
          <p className="text-muted-foreground text-sm">Find and explore tender opportunities</p>
        </div>
        {user?.role === 'admin' && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" /> Create Tender
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Tender</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input placeholder="e.g. Office Building Construction" value={createData.title}
                    onChange={e => setCreateData(d => ({ ...d, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Scope of Work *</Label>
                  <Textarea placeholder="Detailed project description, deliverables, requirements" rows={4}
                    value={createData.scope} onChange={e => setCreateData(d => ({ ...d, scope: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Budget Min (ETB) *</Label>
                    <Input type="number" placeholder="100000" value={createData.budgetMin}
                      onChange={e => setCreateData(d => ({ ...d, budgetMin: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Budget Max (ETB) *</Label>
                    <Input type="number" placeholder="500000" value={createData.budgetMax}
                      onChange={e => setCreateData(d => ({ ...d, budgetMax: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Deadline *</Label>
                    <Input type="datetime-local" value={createData.deadline}
                      onChange={e => setCreateData(d => ({ ...d, deadline: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Location *</Label>
                    <Input placeholder="Addis Ababa" value={createData.location}
                      onChange={e => setCreateData(d => ({ ...d, location: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Category Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <Badge key={cat} variant={selectedCategories.includes(cat) ? 'default' : 'outline'}
                        className="cursor-pointer text-xs" onClick={() => toggleCategory(cat)}>
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate}>
                  Create Tender
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tenders..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="awarded">Awarded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tenders List */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tenders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileSearch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No tenders found</h3>
            <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenders.map(tender => (
            <Card key={tender.id} className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setView('tender-detail', { id: tender.id })}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-emerald-700 transition-colors">
                    {tender.title}
                  </h3>
                  <Badge className={`text-[10px] px-1.5 py-0.5 shrink-0 ${statusColor(tender.status)}`}>
                    {tender.status}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">{tender.scope}</p>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  <span>ETB {tender.budgetMin.toLocaleString()} - {tender.budgetMax.toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{tender.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(tender.deadline).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex flex-wrap gap-1">
                    {tender.categoryTags.split(',').filter(Boolean).slice(0, 3).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag.trim()}</Badge>
                    ))}
                    {tender.categoryTags.split(',').filter(Boolean).length > 3 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        +{tender.categoryTags.split(',').filter(Boolean).length - 3}
                      </Badge>
                    )}
                  </div>
                  {tender.matchScore !== undefined && (
                    <Badge variant={tender.matchScore >= 50 ? 'default' : 'outline'}
                      className={`text-[10px] px-1.5 py-0 ${tender.matchScore >= 70 ? 'bg-emerald-100 text-emerald-700' : tender.matchScore >= 40 ? 'bg-amber-100 text-amber-700' : ''}`}>
                      {tender.matchScore}% match
                    </Badge>
                  )}
                </div>

                {tender._count && (
                  <p className="text-[10px] text-muted-foreground">{tender._count.bids} bid{tender._count.bids !== 1 ? 's' : ''}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
