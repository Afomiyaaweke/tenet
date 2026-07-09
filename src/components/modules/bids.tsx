'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api, Bid } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Gavel, Clock, DollarSign, FileSearch, Award, AlertCircle,
  CheckCircle, ChevronDown, ChevronUp, ArrowRight, TrendingUp,
  Briefcase, X, Eye, RotateCcw, Filter, Target,
  CircleDot, Building2, FileSignature, Stamp, Sparkles, Languages,
} from 'lucide-react';
import { useStampSignature, StampSignatureSelector, type SavedSignature } from '@/components/stamp-signature';
import { InlineTranslator } from '@/components/translator';

type BidTab = 'all' | 'pending_review' | 'shortlisted' | 'awarded' | 'rejected';

export function BidsView() {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BidTab>('all');
  const [stampSelectorOpen, setStampSelectorOpen] = useState(false);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  const [bidSignatures, setBidSignatures] = useState<Record<string, SavedSignature>>({});
  const stampSigHook = useStampSignature();
  const [visibleCount, setVisibleCount] = useState(10);
  const BID_PAGE_SIZE = 10;

  const loadBids = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
    const res = await api.get('/bids', params);
    if (res.success) setBids(res.data);
    setLoading(false);
  }, [statusFilter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadBids(); }, [loadBids]);

  const handleStatusUpdate = async (bidId: string, status: string) => {
    const res = await api.patch(`/bids/${bidId}/status`, { status });
    if (res.success) {
      toast.success(`Bid ${status}`);
      loadBids();
    } else {
      toast.error(res.error || 'Failed to update bid');
    }
  };

  const stats = useMemo(() => ({
    pending: bids.filter(b => b.status === 'pending_review').length,
    shortlisted: bids.filter(b => b.status === 'shortlisted').length,
    awarded: bids.filter(b => b.status === 'awarded').length,
    rejected: bids.filter(b => b.status === 'rejected').length,
    total: bids.length,
  }), [bids]);

  const filteredBids = useMemo(() => {
    if (activeTab === 'all') return bids;
    return bids.filter(b => b.status === activeTab);
  }, [bids, activeTab]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending_review': return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
      case 'shortlisted': return 'bg-teal-100 text-teal-700 hover:bg-teal-100';
      case 'awarded': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
      case 'rejected': return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
      default: return 'bg-muted text-muted-foreground hover:bg-muted';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending_review': return { icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600' };
      case 'shortlisted': return { icon: Award, bg: 'bg-teal-50', color: 'text-teal-600' };
      case 'awarded': return { icon: CheckCircle, bg: 'bg-emerald-50', color: 'text-emerald-600' };
      case 'rejected': return { icon: AlertCircle, bg: 'bg-rose-50', color: 'text-rose-600' };
      default: return { icon: Gavel, bg: 'bg-muted/50', color: 'text-muted-foreground' };
    }
  };

  const isAdminOrOwner = user?.role === 'team_admin';

  const tabs: { key: BidTab; label: string; icon: typeof Clock; count: number; color: string }[] = [
    { key: 'all', label: 'All', icon: Gavel, count: stats.total, color: 'emerald' },
    { key: 'pending_review', label: 'Pending', icon: Clock, count: stats.pending, color: 'amber' },
    { key: 'shortlisted', label: 'Shortlisted', icon: Award, count: stats.shortlisted, color: 'teal' },
    { key: 'awarded', label: 'Awarded', icon: CheckCircle, count: stats.awarded, color: 'emerald' },
    { key: 'rejected', label: 'Rejected', icon: AlertCircle, count: stats.rejected, color: 'rose' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto view-enter">
      {/* Header */}
      <div
 className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-[fadeIn_0.3s_ease-out]"
 >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl gradient-amber shadow-md flex-shrink-0">
            <Gavel className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-gradient-emerald">{isAdminOrOwner ? 'Review' : 'My'}</span> Bids
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {isAdminOrOwner ? 'Manage and evaluate submitted bids' : 'Track your bid submissions'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      {!loading && bids.length > 0 && (
        <div
 className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-[fadeIn_0.3s_ease-out]"
 >
          {[
            { label: 'Pending', count: stats.pending, icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600' },
            { label: 'Shortlisted', count: stats.shortlisted, icon: Award, bg: 'bg-teal-50', color: 'text-teal-600' },
            { label: 'Awarded', count: stats.awarded, icon: CheckCircle, bg: 'bg-emerald-50', color: 'text-emerald-600' },
            { label: 'Rejected', count: stats.rejected, icon: AlertCircle, bg: 'bg-rose-50', color: 'text-rose-600' },
          ].map(stat => (
            <div key={stat.label}>
              <Card className="premium-shadow rounded-xl border-0 bg-card hover:-translate-y-0.5 transition-all duration-200">
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
            </div>
          ))}
        </div>
      )}

      {/* Tab Navigation */}
      {!loading && bids.length > 0 && (
        <div className="animate-[fadeIn_0.3s_ease-out]"
 >
          <Card className="premium-shadow rounded-xl border-0 bg-card">
            <CardContent className="p-1.5">
              <div className="flex gap-1 overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'gradient-emerald text-white premium-shadow'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0 rounded-full ${
                      activeTab === tab.key
                        ? 'bg-white/20 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bids List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="premium-shadow rounded-xl border-0 bg-card animate-pulse overflow-hidden">
              <div className="h-1 bg-muted/30" />
              <CardContent className="p-5"><div className="h-20 bg-muted/50 rounded-xl" /></CardContent>
            </Card>
          ))}
        </div>
      ) : bids.length === 0 ? (
        <div className="animate-[fadeIn_0.3s_ease-out]">
          <Card className="premium-shadow rounded-xl border-0 bg-card">
            <CardContent className="p-16 text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-2xl gradient-amber opacity-20" />
                <div className="absolute inset-2 rounded-xl gradient-amber flex items-center justify-center">
                  <Gavel className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold">No bids found</h3>
              <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
                {user?.role === 'user'
                  ? 'Start by browsing open tenders and submitting your proposals'
                  : 'No bids match your current filters'}
              </p>
              {user?.role === 'user' && (
                <Button
                  className="mt-4 gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5"
                  onClick={() => setView('tenders')}>
                  <FileSearch className="h-4 w-4 mr-2" /> Browse Tenders
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      ) : filteredBids.length === 0 ? (
        <div className="animate-[fadeIn_0.3s_ease-out]">
          <Card className="premium-shadow rounded-xl border-0 bg-card">
            <CardContent className="p-12 text-center">
              <div className="p-3 rounded-2xl bg-muted/50 w-fit mx-auto mb-4">
                <Filter className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No {activeTab === 'all' ? '' : activeTab.replace('_', ' ')} bids</h3>
              <p className="text-muted-foreground text-sm mt-1">Try selecting a different tab</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
          {filteredBids.slice(0, visibleCount).map(bid => {
              const sInfo = statusIcon(bid.status);
              const SIcon = sInfo.icon;
              const isExpanded = expandedId === bid.id;
              const companyName = bid.user?.company?.name;
              const jobTitle = bid.user?.profile?.jobTitle;

              return (
                <div className="hover:-translate-y-[2px] transition-all duration-200"
 key={bid.id}
 >
                  <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                    {/* Status accent strip */}
                    <div className={`h-1 ${
                      bid.status === 'pending_review' ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                      bid.status === 'shortlisted' ? 'bg-gradient-to-r from-teal-400 to-teal-600' :
                      bid.status === 'awarded' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                      bid.status === 'rejected' ? 'bg-gradient-to-r from-rose-400 to-rose-500' :
                      'bg-gradient-to-r from-muted to-muted-foreground/50'
                    }`} />

                    <CardContent className="p-0">
                      {/* Bid Header Row */}
                      <div className="p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : bid.id)}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Status Icon */}
                            <div className={`p-2.5 rounded-xl flex-shrink-0 ${sInfo.bg}`}>
                              <SIcon className={`h-5 w-5 ${sInfo.color}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate hover:text-emerald-700 transition-colors">
                                {bid.tender?.title || 'Tender'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {isAdminOrOwner
                                  ? (
                                    <span className="flex items-center gap-1 flex-wrap">
                                      <span>{bid.user?.profile?.fullName || bid.user?.email || 'Contractor'}</span>
                                      {jobTitle && <span className="text-muted-foreground/60">&middot; {jobTitle}</span>}
                                      {companyName && (
                                        <span className="inline-flex items-center gap-0.5">
                                          <span className="text-muted-foreground/60">&middot;</span>
                                          <Building2 className="h-3 w-3" /> {companyName}
                                        </span>
                                      )}
                                      <span className="text-muted-foreground/60">&middot; {new Date(bid.createdAt).toLocaleDateString()}</span>
                                    </span>
                                  )
                                  : (
                                    <span className="flex items-center gap-1.5 flex-wrap">
                                      <span>{bid.user?.profile?.fullName || 'Contractor'}</span>
                                      {companyName && (
                                        <span className="inline-flex items-center gap-0.5">
                                          <span className="text-muted-foreground/60">&middot;</span>
                                          <Building2 className="h-3 w-3" /> {companyName}
                                        </span>
                                      )}
                                      <span className="text-muted-foreground/60">&middot; {new Date(bid.createdAt).toLocaleDateString()}</span>
                                    </span>
                                  )
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                            {/* Financial badge */}
                            <Badge className="text-xs border-0 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-primary/10">
                              <DollarSign className="h-3 w-3 mr-1" /> ETB {bid.financialProposal.toLocaleString()}
                            </Badge>
                            {/* Timeline badge */}
                            <Badge className="text-xs border-0 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-50">
                              <Clock className="h-3 w-3 mr-1" /> {bid.timeline}
                            </Badge>
                            {/* Status badge */}
                            <div className="flex items-center gap-1">
                              <CircleDot className={`h-2 w-2 ${
                                bid.status === 'awarded' ? 'text-emerald-500' :
                                bid.status === 'rejected' ? 'text-rose-500' :
                                bid.status === 'shortlisted' ? 'text-teal-500' :
                                'text-amber-500'
                              }`} />
                              <Badge className={`text-[10px] px-2 py-0.5 border-0 rounded-lg ${statusBadge(bid.status)}`}>
                                {bid.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground ml-1">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                          <div
 className="overflow-hidden animate-[fadeIn_0.3s_ease-out]"
 >
                            <div className="px-5 pb-5 pt-3 border-t border-border/40 space-y-4">
                              {/* Technical Proposal */}
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="p-1.5 rounded-lg gradient-emerald">
                                    <Briefcase className="h-3.5 w-3.5 text-white" />
                                  </div>
                                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Technical Proposal</p>
                                </div>
                                <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-xl p-4 leading-relaxed">{bid.technicalProposal}</p>
                                <InlineTranslator text={bid.technicalProposal} className="mt-2" />
                              </div>

                              {/* Rejection Note */}
                              {bid.rejectionNote && (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 rounded-lg bg-rose-50">
                                      <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                                    </div>
                                    <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Rejection Note</p>
                                  </div>
                                  <p className="text-sm text-rose-600 bg-rose-50 rounded-xl p-4">{bid.rejectionNote}</p>
                                </div>
                              )}

                              {/* Quick Actions */}
                              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                                {/* Admin/Tender Owner actions */}
                                {isAdminOrOwner && bid.status === 'pending_review' && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="gradient-teal text-white rounded-xl hover:opacity-90 premium-shadow transition-all hover:-translate-y-0.5"
                                      onClick={(e) => { e.stopPropagation(); handleStatusUpdate(bid.id, 'shortlisted'); }}>
                                      <Award className="h-3.5 w-3.5 mr-1.5" /> Shortlist
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all"
                                      onClick={(e) => { e.stopPropagation(); handleStatusUpdate(bid.id, 'rejected'); }}>
                                      <X className="h-3.5 w-3.5 mr-1.5" /> Reject
                                    </Button>
                                  </>
                                )}
                                {isAdminOrOwner && bid.status === 'shortlisted' && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="gradient-emerald text-white rounded-xl hover:opacity-90 premium-shadow transition-all hover:-translate-y-0.5"
                                      onClick={(e) => { e.stopPropagation(); handleStatusUpdate(bid.id, 'awarded'); }}>
                                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Award Bid
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all"
                                      onClick={(e) => { e.stopPropagation(); handleStatusUpdate(bid.id, 'rejected'); }}>
                                      <X className="h-3.5 w-3.5 mr-1.5" /> Reject
                                    </Button>
                                  </>
                                )}

                                {/* Sign Bid - available to all */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 transition-all"
                                  onClick={(e) => { e.stopPropagation(); setSelectedBidId(bid.id); setStampSelectorOpen(true); }}>
                                  <FileSignature className="h-3.5 w-3.5 mr-1.5" /> {bidSignatures[bid.id] ? 'Signed' : 'Sign Bid'}
                                </Button>

                                {/* View Tender link */}
                                {bid.tender && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="rounded-xl text-emerald-600 hover:bg-primary/10 hover:text-emerald-700 transition-all"
                                    onClick={(e) => { e.stopPropagation(); setView('tender-detail', { id: bid.tender!.id }); }}>
                                    <Eye className="h-3.5 w-3.5 mr-1.5" /> View Tender
                                  </Button>
                                )}

                                {/* Review with AI */}
                                {bid.tender && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="rounded-xl text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all"
                                    onClick={(e) => { e.stopPropagation(); setView('tender-detail', { id: bid.tender!.id, tab: 'ai-overview' }); }}>
                                    <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Review with AI
                                  </Button>
                                )}

                                {/* Contractor: Withdraw action for pending bids */}
                                {user?.role === 'user' && bid.status === 'pending_review' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl text-muted-foreground hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all"
                                    onClick={(e) => { e.stopPropagation(); handleStatusUpdate(bid.id, 'rejected'); }}>
                                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Withdraw
                                  </Button>
                                )}

                              {/* Applied Signature Preview */}
                              {bidSignatures[bid.id] && (
                                <div className="flex items-center gap-2 mt-2 p-2 bg-orange-50/50 border border-orange-100 rounded-xl">
                                  <div className="w-10 h-8 bg-white rounded overflow-hidden p-0.5 flex-shrink-0">
                                    <img src={bidSignatures[bid.id].dataUrl} alt="signature" className="max-w-full max-h-full object-contain" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-medium text-orange-700 truncate">{bidSignatures[bid.id].label}</p>
                                    <p className="text-[9px] text-orange-500">Applied to bid</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 text-muted-foreground hover:text-rose-600 rounded"
                                    onClick={(e) => { e.stopPropagation(); setBidSignatures(prev => { const next = { ...prev }; delete next[bid.id]; return next; }); }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}

                              {/* Status tracking for user */}
                                {user?.role === 'user' && (
                                  <div className="flex items-center gap-2 ml-auto">
                                    <div className="flex items-center gap-1.5">
                                      {['pending_review', 'shortlisted', 'awarded'].map((step, idx) => {
                                        const stepOrder = ['pending_review', 'shortlisted', 'awarded'].indexOf(bid.status);
                                        const isActive = stepOrder >= idx;
                                        const isCurrent = bid.status === step;
                                        return (
                                          <div key={step} className="flex items-center gap-1.5">
                                            <div className={`h-2 w-2 rounded-full transition-all ${
                                              isActive ? (isCurrent ? 'bg-emerald-500 scale-125' : 'bg-emerald-300') : 'bg-muted'
                                            }`} />
                                            <span className={`text-[10px] ${isCurrent ? 'text-emerald-700 font-semibold' : 'text-muted-foreground'}`}>
                                              {step === 'pending_review' ? 'Submitted' : step.charAt(0).toUpperCase() + step.slice(1)}
                                            </span>
                                            {idx < 2 && <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/50" />}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
      )}

      {/* See More / Load More bids */}
      {!loading && filteredBids.length > visibleCount && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="lg"
            className="gap-2 rounded-xl border-orange-200 dark:border-orange-800/40 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30"
            onClick={() => setVisibleCount(prev => Math.min(prev + BID_PAGE_SIZE, filteredBids.length))}
          >
            <ChevronDown className="h-4 w-4" />
            See More ({filteredBids.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      {/* Stamp & Signature Selector Dialog */}
      <StampSignatureSelector
        hook={stampSigHook}
        open={stampSelectorOpen}
        onClose={() => { setStampSelectorOpen(false); setSelectedBidId(null); }}
        onSelect={(item) => {
          if (selectedBidId) {
            setBidSignatures(prev => ({ ...prev, [selectedBidId]: item }));
            toast.success(`${item.label} applied to bid`);
          }
          setStampSelectorOpen(false);
          setSelectedBidId(null);
        }}
        title="Select Signature for Bid"
      />
    </div>
  );
}
