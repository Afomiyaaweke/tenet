'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api, Bid } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Gavel, Clock, DollarSign, FileSearch, Award, AlertCircle,
  CheckCircle, ChevronDown, ChevronUp, ArrowRight, TrendingUp,
  Briefcase, Shield, X,
} from 'lucide-react';

export function BidsView() {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending_review': return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
      case 'shortlisted': return 'bg-teal-100 text-teal-700 hover:bg-teal-100';
      case 'awarded': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
      case 'rejected': return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
      default: return 'bg-gray-100 text-gray-600 hover:bg-gray-100';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending_review': return { icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600' };
      case 'shortlisted': return { icon: Award, bg: 'bg-teal-50', color: 'text-teal-600' };
      case 'awarded': return { icon: CheckCircle, bg: 'bg-emerald-50', color: 'text-emerald-600' };
      case 'rejected': return { icon: AlertCircle, bg: 'bg-rose-50', color: 'text-rose-600' };
      default: return { icon: Gavel, bg: 'bg-gray-50', color: 'text-gray-500' };
    }
  };

  const bidStats = () => {
    const pending = bids.filter(b => b.status === 'pending_review').length;
    const shortlisted = bids.filter(b => b.status === 'shortlisted').length;
    const awarded = bids.filter(b => b.status === 'awarded').length;
    const rejected = bids.filter(b => b.status === 'rejected').length;
    return { pending, shortlisted, awarded, rejected };
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto view-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl gradient-amber flex-shrink-0">
            <Gavel className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-gradient-emerald">{user?.role === 'admin' ? 'Review' : 'My'}</span> Bids
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {user?.role === 'admin' ? 'Manage and evaluate submitted bids' : 'Track your bid submissions'}
            </p>
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 rounded-xl bg-muted/50 border-border/60">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="shortlisted">Shortlisted</SelectItem>
            <SelectItem value="awarded">Awarded</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Summary */}
      {!loading && bids.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 flex-shrink-0">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{bidStats().pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-50 flex-shrink-0">
                <Award className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{bidStats().shortlisted}</p>
                <p className="text-xs text-muted-foreground">Shortlisted</p>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 flex-shrink-0">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{bidStats().awarded}</p>
                <p className="text-xs text-muted-foreground">Awarded</p>
              </div>
            </CardContent>
          </Card>
          <Card className="premium-shadow rounded-xl border-0 bg-white hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-50 flex-shrink-0">
                <AlertCircle className="h-4 w-4 text-rose-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{bidStats().rejected}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bids List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="premium-shadow rounded-xl border-0 bg-white animate-pulse">
              <CardContent className="p-5"><div className="h-20 bg-muted/50 rounded-xl" /></CardContent>
            </Card>
          ))}
        </div>
      ) : bids.length === 0 ? (
        <Card className="premium-shadow rounded-xl border-0 bg-white">
          <CardContent className="p-12 text-center">
            <div className="p-3 rounded-2xl gradient-amber w-fit mx-auto mb-4">
              <Gavel className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold">No bids found</h3>
            <p className="text-muted-foreground text-sm mt-1">No bids match your current filters</p>
            {user?.role === 'contractor' && (
              <Button
                className="mt-4 gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5"
                onClick={() => setView('tenders')}>
                <FileSearch className="h-4 w-4 mr-2" /> Browse Tenders
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bids.map(bid => {
            const sInfo = statusIcon(bid.status);
            const SIcon = sInfo.icon;
            const isExpanded = expandedId === bid.id;

            return (
              <Card key={bid.id}
                className="premium-shadow rounded-xl border-0 bg-white overflow-hidden hover:-translate-y-0.5 transition-all duration-200">
                <CardContent className="p-0">
                  {/* Bid Header Row */}
                  <div className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : bid.id)}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Status Icon */}
                        <div className={`p-2.5 rounded-xl flex-shrink-0 ${sInfo.bg}`}>
                          <SIcon className={`h-5 w-5 ${sInfo.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate group-hover:text-emerald-700 transition-colors">
                            {bid.tender?.title || 'Tender'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {bid.user?.profile?.fullName || 'Contractor'} &middot; {new Date(bid.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className="text-xs border-0 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                          <DollarSign className="h-3 w-3 mr-1" /> ETB {bid.financialProposal.toLocaleString()}
                        </Badge>
                        <Badge className="text-xs border-0 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-50">
                          <Clock className="h-3 w-3 mr-1" /> {bid.timeline}
                        </Badge>
                        <Badge className={`text-[10px] px-2 py-0.5 border-0 rounded-lg ${statusBadge(bid.status)}`}>
                          {bid.status.replace('_', ' ')}
                        </Badge>
                        <div className="text-muted-foreground ml-1">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-3 border-t border-border/40 space-y-4">
                      {/* Technical Proposal */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-lg bg-emerald-50">
                            <Briefcase className="h-3.5 w-3.5 text-emerald-600" />
                          </div>
                          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Technical Proposal</p>
                        </div>
                        <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-xl p-4 leading-relaxed">{bid.technicalProposal}</p>
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

                      {/* Admin Actions */}
                      {user?.role === 'admin' && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {bid.status === 'pending_review' && (
                            <>
                              <Button
                                size="sm"
                                className="gradient-teal text-white rounded-xl hover:opacity-90 premium-shadow transition-all hover:-translate-y-0.5"
                                onClick={() => handleStatusUpdate(bid.id, 'shortlisted')}>
                                <Award className="h-3.5 w-3.5 mr-1.5" /> Shortlist
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all"
                                onClick={() => handleStatusUpdate(bid.id, 'rejected')}>
                                <X className="h-3.5 w-3.5 mr-1.5" /> Reject
                              </Button>
                            </>
                          )}
                          {bid.status === 'shortlisted' && (
                            <>
                              <Button
                                size="sm"
                                className="gradient-emerald text-white rounded-xl hover:opacity-90 premium-shadow transition-all hover:-translate-y-0.5"
                                onClick={() => handleStatusUpdate(bid.id, 'awarded')}>
                                <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Award Bid
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all"
                                onClick={() => handleStatusUpdate(bid.id, 'rejected')}>
                                <X className="h-3.5 w-3.5 mr-1.5" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
