'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api, Tender, Bid } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, MapPin, Calendar, DollarSign, Tag, FileText, Gavel, Clock, Users,
  ChevronDown, ChevronUp, Award, AlertCircle, CheckCircle, X, ArrowRight,
  Briefcase, TrendingUp,
} from 'lucide-react';

export function TenderDetailView({ tenderId }: { tenderId?: string }) {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const [tender, setTender] = useState<Tender | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBid, setShowBid] = useState(false);
  const [bidData, setBidData] = useState({
    technicalProposal: '', financialProposal: '', timeline: '',
  });
  const [hasBid, setHasBid] = useState(false);

  const loadTender = useCallback(async () => {
    setLoading(true);
    const res = await api.get(`/tenders/${tenderId}`);
    if (res.success) setTender(res.data);
    // Load bids for this tender
    const bidsRes = await api.get('/bids', { tenderId: tenderId! });
    if (bidsRes.success) {
      setBids(bidsRes.data);
      setHasBid(bidsRes.data.some((b: Bid) => b.userId === user?.id));
    }
    setLoading(false);
  }, [tenderId, user?.id]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (tenderId) loadTender();
  }, [tenderId, loadTender]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmitBid = async () => {
    const res = await api.post('/bids', {
      tenderId,
      ...bidData,
      financialProposal: parseFloat(bidData.financialProposal),
    });
    if (res.success) {
      toast.success('Bid submitted successfully!');
      setShowBid(false);
      loadTender();
    } else {
      toast.error(res.error || 'Failed to submit bid');
    }
  };

  const handleStatusChange = async (status: string) => {
    const res = await api.patch(`/tenders/${tenderId}/status`, { status });
    if (res.success) {
      toast.success(`Tender status updated to ${status}`);
      loadTender();
    } else {
      toast.error(res.error || 'Failed to update status');
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'open': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
      case 'closed': return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
      case 'awarded': return 'bg-teal-100 text-teal-700 hover:bg-teal-100';
      case 'cancelled': return 'bg-gray-100 text-gray-600 hover:bg-gray-100';
      default: return 'bg-gray-100 text-gray-600 hover:bg-gray-100';
    }
  };

  const statusDot = (status: string) => {
    switch (status) {
      case 'open': return 'bg-emerald-500';
      case 'closed': return 'bg-rose-500';
      case 'awarded': return 'bg-teal-500';
      case 'cancelled': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto view-enter">
        <div className="h-8 bg-muted/50 rounded-xl w-1/3 animate-pulse" />
        <div className="h-40 bg-muted/50 rounded-xl animate-pulse premium-shadow" />
        <div className="h-20 bg-muted/50 rounded-xl animate-pulse premium-shadow" />
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="p-6 text-center view-enter">
        <div className="p-3 rounded-2xl gradient-rose w-fit mx-auto mb-4">
          <FileText className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold">Tender not found</h3>
        <Button variant="outline" onClick={() => setView('tenders')} className="mt-4 rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tenders
        </Button>
      </div>
    );
  }

  const isOpen = tender.status === 'open';
  const deadlinePassed = new Date(tender.deadline) < new Date();
  const canBid = user?.role === 'contractor' && isOpen && !deadlinePassed && !hasBid && user?.profile?.verified;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto view-enter">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => setView('tenders')}
        className="mb-2 hover:text-emerald-700 hover:bg-emerald-50 transition-colors rounded-xl">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tenders
      </Button>

      {/* Tender Header - Hero Card */}
      <Card className="premium-shadow-lg rounded-xl border-0 bg-white">
        <CardContent className="p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                  tender.status === 'open' ? 'gradient-emerald' :
                  tender.status === 'awarded' ? 'gradient-teal' :
                  tender.status === 'cancelled' ? 'bg-gray-100' :
                  'gradient-rose'
                }`}>
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">{tender.title}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 ml-11">
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDot(tender.status)}`} />
                  <Badge className={`text-xs px-2.5 py-0.5 border-0 rounded-lg ${statusBadge(tender.status)}`}>
                    {tender.status}
                  </Badge>
                </div>
                {tender.categoryTags.split(',').filter(Boolean).map(tag => (
                  <Badge key={tag} className="text-xs bg-emerald-50 text-emerald-700 border-0 rounded-lg hover:bg-emerald-50">
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {canBid && (
                <Dialog open={showBid} onOpenChange={setShowBid}>
                  <DialogTrigger asChild>
                    <Button className="gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5">
                      <Gavel className="h-4 w-4 mr-2" /> Submit Bid
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">
                        <span className="text-gradient-emerald">Submit Bid</span> for {tender.title}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Technical Proposal *</Label>
                        <Textarea placeholder="Methodology, approach, team composition, relevant experience" rows={6}
                          value={bidData.technicalProposal} onChange={e => setBidData(d => ({ ...d, technicalProposal: e.target.value }))}
                          className="bg-muted/50 border-border/60 rounded-xl focus:ring-emerald-500/20" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Financial Proposal (ETB) *</Label>
                        <Input type="number" placeholder="e.g. 250000"
                          value={bidData.financialProposal} onChange={e => setBidData(d => ({ ...d, financialProposal: e.target.value }))}
                          className="bg-muted/50 border-border/60 rounded-xl focus:ring-emerald-500/20" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Timeline *</Label>
                        <Input placeholder="e.g. 30 days or 6 weeks"
                          value={bidData.timeline} onChange={e => setBidData(d => ({ ...d, timeline: e.target.value }))}
                          className="bg-muted/50 border-border/60 rounded-xl focus:ring-emerald-500/20" />
                      </div>
                      <Button className="w-full gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5" onClick={handleSubmitBid}>
                        Submit Bid <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {hasBid && (
                <Badge className="bg-emerald-100 text-emerald-700 border-0 rounded-lg hover:bg-emerald-100">
                  <CheckCircle className="h-3 w-3 mr-1" /> Bid Submitted
                </Badge>
              )}
              {user?.role === 'admin' && (
                <div className="flex gap-2">
                  {tender.status === 'open' && (
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange('closed')}
                      className="rounded-xl text-xs">Close Tender</Button>
                  )}
                  {tender.status === 'closed' && (
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange('open')}
                      className="rounded-xl text-xs">Reopen</Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleStatusChange('cancelled')}
                    className="rounded-xl text-xs border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700">Cancel</Button>
                </div>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/40">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 flex-shrink-0">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Budget Range</p>
                <p className="text-sm font-semibold">ETB {tender.budgetMin.toLocaleString()} - {tender.budgetMax.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 flex-shrink-0">
                <Calendar className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deadline</p>
                <p className="text-sm font-semibold">{new Date(tender.deadline).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-50 flex-shrink-0">
                <MapPin className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm font-semibold">{tender.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 flex-shrink-0">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bids Received</p>
                <p className="text-sm font-semibold">{tender._count?.bids || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scope of Work */}
      <Card className="premium-shadow rounded-xl border-0 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg gradient-emerald">
              <Briefcase className="h-3.5 w-3.5 text-white" />
            </div>
            Scope of Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm bg-muted/30 rounded-xl p-4 leading-relaxed">{tender.scope}</div>
        </CardContent>
      </Card>

      {/* Bids List (Admin & Tender Owner) */}
      {(user?.role === 'admin' || user?.role === 'tender_owner') && bids.length > 0 && (
        <Card className="premium-shadow rounded-xl border-0 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-amber">
                <Gavel className="h-3.5 w-3.5 text-white" />
              </div>
              Submitted Bids
              <Badge className="bg-amber-50 text-amber-700 border-0 rounded-lg text-[10px] hover:bg-amber-50">
                {bids.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bids.map(bid => (
              <BidCard key={bid.id} bid={bid} onUpdate={loadTender} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BidCard({ bid, onUpdate }: { bid: Bid; onUpdate: () => void }) {
  const { user } = useAuthStore();
  const [expanded, setExpanded] = useState(false);

  const handleStatusUpdate = async (status: string) => {
    const res = await api.patch(`/bids/${bid.id}/status`, { status });
    if (res.success) {
      toast.success(`Bid ${status}`);
      onUpdate();
    } else {
      toast.error(res.error || 'Failed to update bid');
    }
  };

  const bidStatusBadge = (status: string) => {
    switch (status) {
      case 'awarded': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
      case 'rejected': return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
      case 'shortlisted': return 'bg-teal-100 text-teal-700 hover:bg-teal-100';
      case 'pending_review': return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
      default: return 'bg-gray-100 text-gray-600 hover:bg-gray-100';
    }
  };

  const bidStatusDot = (status: string) => {
    switch (status) {
      case 'awarded': return 'bg-emerald-500';
      case 'rejected': return 'bg-rose-500';
      case 'shortlisted': return 'bg-teal-500';
      case 'pending_review': return 'bg-amber-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors space-y-2">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-emerald flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-xs">
              {(bid.user?.profile?.fullName || 'U')[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium">{bid.user?.profile?.fullName || bid.user?.email || 'Contractor'}</p>
            <p className="text-xs text-muted-foreground">Submitted {new Date(bid.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="text-xs border-0 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
            <DollarSign className="h-3 w-3 mr-1" /> ETB {bid.financialProposal.toLocaleString()}
          </Badge>
          <Badge className="text-xs border-0 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-50">
            <Clock className="h-3 w-3 mr-1" /> {bid.timeline}
          </Badge>
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${bidStatusDot(bid.status)}`} />
            <Badge className={`text-[10px] px-2 py-0.5 border-0 rounded-lg ${bidStatusBadge(bid.status)}`}>
              {bid.status.replace('_', ' ')}
            </Badge>
          </div>
          <div className="text-muted-foreground ml-1">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/40 space-y-4">
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

          {/* Admin Actions */}
          {user?.role === 'admin' && bid.status === 'pending_review' && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm"
                className="gradient-teal text-white rounded-xl hover:opacity-90 premium-shadow transition-all hover:-translate-y-0.5"
                onClick={() => handleStatusUpdate('shortlisted')}>
                <Award className="h-3.5 w-3.5 mr-1.5" /> Shortlist
              </Button>
              <Button size="sm" variant="outline"
                className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all"
                onClick={() => handleStatusUpdate('rejected')}>
                <X className="h-3.5 w-3.5 mr-1.5" /> Reject
              </Button>
            </div>
          )}
          {user?.role === 'admin' && bid.status === 'shortlisted' && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm"
                className="gradient-emerald text-white rounded-xl hover:opacity-90 premium-shadow transition-all hover:-translate-y-0.5"
                onClick={() => handleStatusUpdate('awarded')}>
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Award Bid
              </Button>
              <Button size="sm" variant="outline"
                className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all"
                onClick={() => handleStatusUpdate('rejected')}>
                <X className="h-3.5 w-3.5 mr-1.5" /> Reject
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
