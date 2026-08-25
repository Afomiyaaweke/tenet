'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api, Tender, Bid } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  ArrowLeft, MapPin, Calendar, DollarSign, Tag, FileText, Gavel, Clock, Users,
  ChevronRight, TrendingUp, Timer, Target, Award, CheckCircle, X,
  Briefcase, GitCompareArrows, Zap, Eye, Building2, CircleCheck,
  ChartColumn, Scale, FileStack,
} from 'lucide-react';

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatETB(amount: number): string {
  return `ETB ${amount.toLocaleString()}`;
}

/* ────────────── Tender Comparison View ────────────── */

export function TenderCompareView({ tenderIds }: { tenderIds?: string }) {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);

  const ids = useMemo(() => {
    if (!tenderIds) return [];
    return tenderIds.split(',').filter(Boolean);
  }, [tenderIds]);

  const loadTenders = useCallback(async () => {
    if (ids.length === 0) { setLoading(false); return; }
    setLoading(true);
    const loaded: Tender[] = [];
    for (const id of ids) {
      const res = await api.get(`/tenders/${id}`);
      if (res.success) loaded.push(res.data);
    }
    setTenders(loaded);
    setLoading(false);
  }, [ids]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { loadTenders(); }, [loadTenders]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto view-enter">
        <div className="h-8 bg-muted/50 rounded-xl w-1/3 animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-96 bg-muted/50 rounded-xl animate-pulse premium-shadow" />
          ))}
        </div>
      </div>
    );
  }

  if (tenders.length === 0) {
    return (
      <div className="p-6 text-center view-enter">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-2xl gradient-emerald opacity-20" />
          <div className="absolute inset-2 rounded-xl gradient-emerald flex items-center justify-center">
            <GitCompareArrows className="h-8 w-8 text-white" />
          </div>
        </div>
        <h3 className="text-lg font-semibold">No tenders to compare</h3>
        <p className="text-muted-foreground text-sm mt-2">Go back to tenders and select at least 2 to compare</p>
        <Button variant="outline" onClick={() => setView('tenders')} className="mt-4 rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tenders
        </Button>
      </div>
    );
  }

  // Comparison rows
  const comparisonFields = [
    {
      label: 'Status',
      icon: CircleCheck,
      render: (t: Tender) => {
        const colors: Record<string, string> = {
          open: 'bg-emerald-100 text-emerald-700',
          closed: 'bg-rose-100 text-rose-700',
          awarded: 'bg-teal-100 text-teal-700',
          cancelled: 'bg-muted text-muted-foreground',
          draft: 'bg-muted text-muted-foreground',
        };
        return (
          <Badge className={`text-xs px-2.5 py-1 border-0 rounded-lg ${colors[t.status] || 'bg-muted text-muted-foreground'}`}>
            {t.status}
          </Badge>
        );
      },
    },
    {
      label: 'Budget Range',
      icon: DollarSign,
      render: (t: Tender) => (
        <div className="space-y-1">
          <p className="text-sm font-bold text-emerald-700">{formatETB(t.budgetMin)} – {formatETB(t.budgetMax)}</p>
          <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: '100%' }} />
          </div>
        </div>
      ),
    },
    {
      label: 'Deadline',
      icon: Timer,
      render: (t: Tender) => {
        const days = daysUntil(t.deadline);
        return (
          <div>
            <p className="text-sm font-semibold">{new Date(t.deadline).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
            <p className={`text-xs font-medium ${days <= 0 ? 'text-rose-600' : days <= 3 ? 'text-rose-600' : days <= 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {days <= 0 ? 'Expired' : days === 1 ? '1 day left' : `${days} days left`}
            </p>
          </div>
        );
      },
    },
    {
      label: 'Location',
      icon: MapPin,
      render: (t: Tender) => <p className="text-sm font-medium">{t.location}</p>,
    },
    {
      label: 'Categories',
      icon: Tag,
      render: (t: Tender) => (
        <div className="flex flex-wrap gap-1">
          {t.categoryTags.split(',').filter(Boolean).map(tag => (
            <Badge key={tag} className="text-[10px] px-1.5 py-0 border-0 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-primary/10">
              {tag.trim()}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      label: 'Total Bids',
      icon: Users,
      render: (t: Tender) => <p className="text-sm font-bold">{t._count?.bids || 0}</p>,
    },
    {
      label: 'Match Score',
      icon: Target,
      render: (t: Tender) => {
        if (t.matchScore === undefined) return <p className="text-xs text-muted-foreground">N/A</p>;
        const barColor = t.matchScore >= 70 ? 'from-emerald-400 to-emerald-600' : t.matchScore >= 40 ? 'from-amber-400 to-amber-600' : 'from-muted to-muted-foreground/50';
        const textColor = t.matchScore >= 70 ? 'text-emerald-700' : t.matchScore >= 40 ? 'text-amber-700' : 'text-muted-foreground';
        return (
          <div className="space-y-1">
            <p className={`text-sm font-bold ${textColor}`}>{t.matchScore}%</p>
            <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r ${barColor}`} style={{ width: `${t.matchScore}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      label: 'Required Documents',
      icon: FileStack,
      render: (t: Tender) => {
        const docs = t.requiredDocs?.split(',').filter(Boolean) || [];
        if (docs.length === 0) return <p className="text-xs text-muted-foreground">None specified</p>;
        return (
          <div className="space-y-1">
            {docs.map(doc => (
              <p key={doc} className="text-xs font-medium">• {doc.trim()}</p>
            ))}
          </div>
        );
      },
    },
  ];

  // Find the "best" values for highlighting
  const bestBudget = tenders.reduce((best, t) => t.budgetMax > (best?.budgetMax || 0) ? t : best, tenders[0]);
  const mostDays = tenders.reduce((best, t) => daysUntil(t.deadline) > daysUntil(best.deadline) ? t : best, tenders[0]);
  const mostBids = tenders.reduce((best, t) => (t._count?.bids || 0) > (best._count?.bids || 0) ? t : best, tenders[0]);
  const bestMatch = tenders.reduce((best, t) => (t.matchScore || 0) > (best.matchScore || 0) ? t : best, tenders[0]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto view-enter">
      {/* Header */}
      <div
 className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-[fadeIn_0.3s_ease-out]"
 >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl gradient-emerald shadow-md flex-shrink-0">
            <GitCompareArrows className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-gradient-emerald">Compare</span> Tenders
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">Side-by-side comparison of {tenders.length} tenders</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setView('tenders')}
          className="rounded-xl hover:text-emerald-700 hover:bg-primary/10 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tenders
        </Button>
      </div>

      {/* Quick Insights */}
      <div className="animate-[fadeIn_0.3s_ease-out]"
 >
        <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400" />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg gradient-emerald">
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <h3 className="text-sm font-bold">Quick Insights</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-emerald-50/60 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="h-3 w-3 text-emerald-600" />
                  <span className="text-[10px] text-emerald-600 font-medium">Highest Budget</span>
                </div>
                <p className="text-xs font-bold text-emerald-700 truncate">{bestBudget?.title}</p>
                <p className="text-[10px] text-emerald-600">{formatETB(bestBudget?.budgetMax || 0)}</p>
              </div>
              <div className="bg-amber-50/60 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Timer className="h-3 w-3 text-amber-600" />
                  <span className="text-[10px] text-amber-600 font-medium">Most Time</span>
                </div>
                <p className="text-xs font-bold text-amber-700 truncate">{mostDays?.title}</p>
                <p className="text-[10px] text-amber-600">{daysUntil(mostDays?.deadline || '')} days left</p>
              </div>
              <div className="bg-teal-50/60 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="h-3 w-3 text-teal-600" />
                  <span className="text-[10px] text-teal-600 font-medium">Most Bids</span>
                </div>
                <p className="text-xs font-bold text-teal-700 truncate">{mostBids?.title}</p>
                <p className="text-[10px] text-teal-600">{mostBids?._count?.bids || 0} bids</p>
              </div>
              <div className="bg-purple-50/60 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Target className="h-3 w-3 text-purple-600" />
                  <span className="text-[10px] text-purple-600 font-medium">Best Match</span>
                </div>
                <p className="text-xs font-bold text-purple-700 truncate">{bestMatch?.title}</p>
                <p className="text-[10px] text-purple-600">{bestMatch?.matchScore || 0}% match</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <div className="animate-[fadeIn_0.3s_ease-out]"
 >
        <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-400" />
          <ScrollArea className="w-full">
            <div className="min-w-[600px]">
              {/* Header Row */}
              <div className="grid border-b border-border/50" style={{ gridTemplateColumns: `200px repeat(${tenders.length}, 1fr)` }}>
                <div className="p-4 bg-muted/30 flex items-center gap-2 sticky left-0 z-10 bg-card">
                  <Scale className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-bold">Attributes</span>
                </div>
                {tenders.map((tender, i) => (
                  <div key={tender.id} className="p-4 border-l border-border/30">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold truncate">{tender.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">ID: {tender.id.slice(0, 8)}...</p>
                      </div>
                      <Button size="sm" variant="ghost"
                        className="h-7 w-7 p-0 rounded-lg hover:bg-primary/10 hover:text-emerald-700 flex-shrink-0"
                        onClick={() => setView('tender-detail', { id: tender.id })}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comparison Rows */}
              {comparisonFields.map((field, idx) => (
                <div
 key={field.label}
 className="grid border-b border-border/30 hover:bg-muted/20 transition-colors"
 style={{ gridTemplateColumns: `200px repeat(${tenders.length}, 1fr)` }}
 >
                  <div className="p-3 flex items-center gap-2 sticky left-0 z-10 bg-card">
                    <div className="p-1 rounded bg-muted/50">
                      <field.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">{field.label}</span>
                  </div>
                  {tenders.map(tender => (
                    <div key={tender.id} className="p-3 border-l border-border/20">
                      {field.render(tender)}
                    </div>
                  ))}
                </div>
              ))}

              {/* Scope Row */}
              <div
 className="grid"
 style={{ gridTemplateColumns: `200px repeat(${tenders.length}, 1fr)` }}
 >
                <div className="p-3 flex items-center gap-2 sticky left-0 z-10 bg-card">
                  <div className="p-1 rounded bg-muted/50">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">Scope</span>
                </div>
                {tenders.map(tender => (
                  <div key={tender.id} className="p-3 border-l border-border/20">
                    <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">{tender.scope}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Visual Budget Comparison Chart */}
      <div className="animate-[fadeIn_0.3s_ease-out]"
 >
        <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-amber-400" />
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-emerald">
                <ChartColumn className="h-3.5 w-3.5 text-white" />
              </div>
              Budget Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenders.map((tender, i) => {
              const maxBudget = Math.max(...tenders.map(t => t.budgetMax));
              const minPercent = (tender.budgetMin / maxBudget) * 100;
              const maxPercent = (tender.budgetMax / maxBudget) * 100;
              const colors = ['from-emerald-400 to-emerald-600', 'from-teal-400 to-teal-600', 'from-amber-400 to-amber-600', 'from-purple-400 to-purple-600', 'from-rose-400 to-rose-600'];
              const barColor = colors[i % colors.length];
              return (
                <div key={tender.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium truncate max-w-[200px]">{tender.title}</p>
                    <p className="text-xs font-bold text-emerald-700">{formatETB(tender.budgetMin)} – {formatETB(tender.budgetMax)}</p>
                  </div>
                  <div className="relative h-6 bg-muted/30 rounded-lg overflow-hidden">
                    <div
                      className={`absolute top-0 h-full rounded-lg bg-gradient-to-r ${barColor} opacity-80`}
                      style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-foreground/80 drop-shadow-sm">
                        {formatETB(tender.budgetMax)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Deadline Comparison */}
      <div className="animate-[fadeIn_0.3s_ease-out]"
 >
        <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-amber-400 to-teal-400" />
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-amber">
                <Timer className="h-3.5 w-3.5 text-white" />
              </div>
              Deadline Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenders.map((tender, i) => {
              const days = daysUntil(tender.deadline);
              const maxDays = Math.max(...tenders.map(t => Math.max(daysUntil(t.deadline), 1)));
              const percent = Math.max(5, (Math.max(days, 0) / maxDays) * 100);
              const urgency = days <= 0 ? 'bg-muted' : days <= 3 ? 'from-rose-400 to-rose-500' : days <= 7 ? 'from-amber-400 to-amber-500' : 'from-emerald-400 to-emerald-500';
              return (
                <div key={tender.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium truncate max-w-[200px]">{tender.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{new Date(tender.deadline).toLocaleDateString()}</span>
                      <Badge className={`text-[10px] px-1.5 py-0 border-0 rounded-lg ${
                        days <= 0 ? 'bg-muted text-muted-foreground' :
                        days <= 3 ? 'bg-rose-100 text-rose-700' :
                        days <= 7 ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {days <= 0 ? 'Expired' : `${days}d left`}
                      </Badge>
                    </div>
                  </div>
                  <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${urgency.includes('from-') ? `bg-gradient-to-r ${urgency}` : urgency}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div
 className="flex flex-wrap gap-3 animate-[fadeIn_0.3s_ease-out]"
 >
        {tenders.map(tender => (
          <Button
            key={tender.id}
            variant="outline"
            className="rounded-xl hover:text-emerald-700 hover:bg-primary/10 transition-all hover:-translate-y-0.5"
            onClick={() => setView('tender-detail', { id: tender.id })}
          >
            <Eye className="h-4 w-4 mr-2" />
            View: {tender.title.length > 20 ? tender.title.slice(0, 20) + '...' : tender.title}
          </Button>
        ))}
      </div>
    </div>
  );
}

/* ────────────── Bid Comparison View ────────────── */

export function BidCompareView({ tenderId }: { tenderId?: string }) {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const [tender, setTender] = useState<Tender | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBids, setSelectedBids] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);

  const loadData = useCallback(async () => {
    if (!tenderId) return;
    setLoading(true);
    const [tenderRes, bidsRes] = await Promise.all([
      api.get(`/tenders/${tenderId}`),
      api.get('/bids', { tenderId }),
    ]);
    if (tenderRes.success) setTender(tenderRes.data);
    if (bidsRes.success) setBids(bidsRes.data);
    setLoading(false);
  }, [tenderId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { loadData(); }, [loadData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleBid = (bidId: string) => {
    setSelectedBids(prev =>
      prev.includes(bidId) ? prev.filter(id => id !== bidId) : [...prev, bidId].slice(-4)
    );
  };

  const comparedBids = useMemo(() =>
    bids.filter(b => selectedBids.includes(b.id)),
    [bids, selectedBids]
  );

  const handleStatusUpdate = async (bidId: string, status: string) => {
    const res = await api.patch(`/bids/${bidId}/status`, { status });
    if (res.success) {
      toast.success(`Bid ${status}`);
      loadData();
    } else {
      toast.error(res.error || 'Failed to update bid');
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto view-enter">
        <div className="h-8 bg-muted/50 rounded-xl w-1/3 animate-pulse" />
        <div className="h-40 bg-muted/50 rounded-xl animate-pulse premium-shadow" />
      </div>
    );
  }

  const bidComparisonFields = [
    {
      label: 'Contractor',
      icon: Building2,
      render: (b: Bid) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-emerald flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-xs">
              {(b.user?.profile?.fullName || 'U')[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{b.user?.profile?.fullName || b.user?.email || 'Contractor'}</p>
            {b.user?.company?.name && (
              <p className="text-[10px] text-muted-foreground truncate">{b.user.company.name}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      label: 'Financial Proposal',
      icon: DollarSign,
      highlight: 'lowest',
      render: (b: Bid) => {
        const isLowest = comparedBids.length > 1 && b.financialProposal === Math.min(...comparedBids.map(x => x.financialProposal));
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-emerald-700">{formatETB(b.financialProposal)}</p>
              {isLowest && (
                <Badge className="text-[9px] px-1 py-0 border-0 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  Lowest
                </Badge>
              )}
            </div>
            {tender && (
              <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                  style={{ width: `${Math.min(100, (b.financialProposal / tender.budgetMax) * 100)}%` }}
                />
              </div>
            )}
          </div>
        );
      },
    },
    {
      label: 'Proposed Timeline',
      icon: Clock,
      render: (b: Bid) => <p className="text-sm font-medium">{b.timeline}</p>,
    },
    {
      label: 'Status',
      icon: CircleCheck,
      render: (b: Bid) => {
        const colors: Record<string, string> = {
          pending_review: 'bg-amber-100 text-amber-700',
          shortlisted: 'bg-teal-100 text-teal-700',
          awarded: 'bg-emerald-100 text-emerald-700',
          rejected: 'bg-rose-100 text-rose-700',
        };
        return (
          <Badge className={`text-xs px-2.5 py-1 border-0 rounded-lg ${colors[b.status] || 'bg-muted text-muted-foreground'}`}>
            {b.status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      label: 'Submitted',
      icon: Calendar,
      render: (b: Bid) => (
        <p className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString()}</p>
      ),
    },
    {
      label: 'Technical Proposal',
      icon: FileText,
      render: (b: Bid) => (
        <p className="text-xs text-muted-foreground line-clamp-5 leading-relaxed whitespace-pre-wrap">{b.technicalProposal}</p>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto view-enter">
      {/* Header */}
      <div
 className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-[fadeIn_0.3s_ease-out]"
 >
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setView('tender-detail', { id: tenderId || '' })}
            className="hover:text-emerald-700 hover:bg-primary/10 transition-colors rounded-xl p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="p-3 rounded-2xl gradient-emerald shadow-md flex-shrink-0">
            <Gavel className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-gradient-emerald">Compare</span> Bids
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {tender ? `For: ${tender.title}` : 'Side-by-side bid comparison'}
            </p>
          </div>
        </div>
      </div>

      {/* Tender Summary */}
      {tender && (
        <div className="animate-[fadeIn_0.3s_ease-out]">
          <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-400" />
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-emerald-50/60 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-emerald-600 font-medium">Budget Range</p>
                  <p className="text-xs font-bold text-emerald-700 mt-1">{formatETB(tender.budgetMin)} – {formatETB(tender.budgetMax)}</p>
                </div>
                <div className="bg-amber-50/60 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-amber-600 font-medium">Deadline</p>
                  <p className="text-xs font-bold text-amber-700 mt-1">{new Date(tender.deadline).toLocaleDateString()}</p>
                </div>
                <div className="bg-teal-50/60 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-teal-600 font-medium">Total Bids</p>
                  <p className="text-xs font-bold text-teal-700 mt-1">{bids.length}</p>
                </div>
                <div className="bg-purple-50/60 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-purple-600 font-medium">Status</p>
                  <p className="text-xs font-bold text-purple-700 mt-1 capitalize">{tender.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bid Selection */}
      <div className="animate-[fadeIn_0.3s_ease-out]">
        <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-amber-400 to-amber-600" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg gradient-amber">
                  <Award className="h-3.5 w-3.5 text-white" />
                </div>
                Select Bids to Compare
                <Badge className="bg-amber-50 text-amber-700 border-0 rounded-lg text-[10px] hover:bg-amber-50">
                  {selectedBids.length} / 4 selected
                </Badge>
              </CardTitle>
              {selectedBids.length >= 2 && (
                <Button
                  size="sm"
                  className="gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5"
                  onClick={() => setCompareMode(!compareMode)}
                >
                  <GitCompareArrows className="h-3.5 w-3.5 mr-1.5" />
                  {compareMode ? 'Hide Comparison' : 'Compare Now'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {bids.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-3 rounded-2xl bg-muted/50 w-fit mx-auto mb-4">
                  <Gavel className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold">No bids submitted yet</h3>
                <p className="text-muted-foreground text-xs mt-1">Bids will appear here once users submit proposals</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {bids.map(bid => {
                  const isSelected = selectedBids.includes(bid.id);
                  return (
                    <button
                      key={bid.id}
                      onClick={() => toggleBid(bid.id)}
                      className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-50/50 shadow-md shadow-emerald-100'
                          : 'border-transparent bg-muted/30 hover:bg-muted/50 hover:border-muted'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                          isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground/30'
                        }`}>
                          {isSelected && <CheckCircle className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{bid.user?.profile?.fullName || bid.user?.email || 'Contractor'}</p>
                          {bid.user?.company?.name && (
                            <p className="text-[10px] text-muted-foreground truncate">{bid.user.company.name}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className="text-[10px] px-1.5 py-0 border-0 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-primary/10">
                              <DollarSign className="h-2.5 w-2.5 mr-0.5" /> {formatETB(bid.financialProposal)}
                            </Badge>
                            <Badge className="text-[10px] px-1.5 py-0 border-0 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-50">
                              <Clock className="h-2.5 w-2.5 mr-0.5" /> {bid.timeline}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              bid.status === 'awarded' ? 'bg-emerald-500' :
                              bid.status === 'rejected' ? 'bg-rose-500' :
                              bid.status === 'shortlisted' ? 'bg-teal-500' :
                              'bg-amber-500'
                            }`} />
                            <span className="text-[10px] text-muted-foreground capitalize">{bid.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      {compareMode && comparedBids.length >= 2 && (
          <div className="animate-[fadeIn_0.3s_ease-out]"
 >
            <Card className="premium-shadow-lg rounded-xl border-0 bg-card overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400" />
              <ScrollArea className="w-full">
                <div className="min-w-[500px]">
                  {/* Header Row */}
                  <div className="grid border-b border-border/50" style={{ gridTemplateColumns: `180px repeat(${comparedBids.length}, 1fr)` }}>
                    <div className="p-4 bg-muted/30 flex items-center gap-2 sticky left-0 z-10 bg-card">
                      <Scale className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-bold">Criteria</span>
                    </div>
                    {comparedBids.map(bid => (
                      <div key={bid.id} className="p-4 border-l border-border/30">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg gradient-emerald flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-xs">
                              {(bid.user?.profile?.fullName || 'U')[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{bid.user?.profile?.fullName || 'Contractor'}</p>
                            {bid.user?.company?.name && (
                              <p className="text-[10px] text-muted-foreground truncate">{bid.user.company.name}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Comparison Rows */}
                  {bidComparisonFields.map(field => (
                    <div
                      key={field.label}
                      className="grid border-b border-border/30 hover:bg-muted/10 transition-colors"
                      style={{ gridTemplateColumns: `180px repeat(${comparedBids.length}, 1fr)` }}
                    >
                      <div className="p-3 flex items-center gap-2 sticky left-0 z-10 bg-card">
                        <div className="p-1 rounded bg-muted/50">
                          <field.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">{field.label}</span>
                      </div>
                      {comparedBids.map(bid => (
                        <div key={bid.id} className="p-3 border-l border-border/20">
                          {field.render(bid)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Action Buttons */}
              <div className="p-4 border-t border-border/50 bg-muted/20">
                <div className="grid gap-3" style={{ gridTemplateColumns: `180px repeat(${comparedBids.length}, 1fr)` }}>
                  <div className="flex items-center">
                    <span className="text-xs font-semibold text-muted-foreground">Actions</span>
                  </div>
                  {comparedBids.map(bid => (
                    <div key={bid.id} className="border-l border-border/20 pl-3">
                      <div className="flex flex-wrap gap-2">
                        {bid.status === 'pending_review' && (
                          <>
                            <Button size="sm" className="gradient-teal text-white rounded-lg text-[11px] h-7 px-2.5 hover:opacity-90"
                              onClick={() => handleStatusUpdate(bid.id, 'shortlisted')}>
                              <Award className="h-3 w-3 mr-1" /> Shortlist
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-lg text-[11px] h-7 px-2.5 border-rose-200 text-rose-600 hover:bg-rose-50"
                              onClick={() => handleStatusUpdate(bid.id, 'rejected')}>
                              <X className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {bid.status === 'shortlisted' && (
                          <>
                            <Button size="sm" className="gradient-emerald text-white rounded-lg text-[11px] h-7 px-2.5 hover:opacity-90"
                              onClick={() => handleStatusUpdate(bid.id, 'awarded')}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Award
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-lg text-[11px] h-7 px-2.5 border-rose-200 text-rose-600 hover:bg-rose-50"
                              onClick={() => handleStatusUpdate(bid.id, 'rejected')}>
                              <X className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {bid.status === 'awarded' && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 rounded-lg text-[10px] hover:bg-emerald-100 py-1.5 px-3">
                            <CheckCircle className="h-3 w-3 mr-1" /> Awarded
                          </Badge>
                        )}
                        {bid.status === 'rejected' && (
                          <Badge className="bg-rose-100 text-rose-700 border-0 rounded-lg text-[10px] hover:bg-rose-100 py-1.5 px-3">
                            <X className="h-3 w-3 mr-1" /> Rejected
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}
{/* Financial Comparison Chart */}
      {comparedBids.length >= 2 && compareMode && (
        <div className="animate-[fadeIn_0.3s_ease-out]"
 >
          <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-amber-400" />
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg gradient-emerald">
                  <ChartColumn className="h-3.5 w-3.5 text-white" />
                </div>
                Financial Proposal Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comparedBids.map((bid, i) => {
                const maxProposal = Math.max(...comparedBids.map(b => b.financialProposal));
                const isLowest = bid.financialProposal === Math.min(...comparedBids.map(b => b.financialProposal));
                const percent = (bid.financialProposal / maxProposal) * 100;
                const colors = ['from-emerald-400 to-emerald-600', 'from-teal-400 to-teal-600', 'from-amber-400 to-amber-600', 'from-purple-400 to-purple-600'];
                const barColor = colors[i % colors.length];
                return (
                  <div key={bid.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium truncate max-w-[180px]">
                        {bid.user?.profile?.fullName || 'Contractor'}
                        {isLowest && <span className="text-emerald-600 ml-1">★ Lowest</span>}
                      </p>
                      <p className="text-xs font-bold text-emerald-700">{formatETB(bid.financialProposal)}</p>
                    </div>
                    <div className="relative h-7 bg-muted/30 rounded-lg overflow-hidden">
                      <div
                        className={`absolute top-0 h-full rounded-lg bg-gradient-to-r ${barColor} opacity-80 transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-[10px] font-bold text-white drop-shadow-sm">
                          {((bid.financialProposal / (tender?.budgetMax || bid.financialProposal)) * 100).toFixed(0)}% of max budget
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
