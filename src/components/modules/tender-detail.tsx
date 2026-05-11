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
import { ArrowLeft, MapPin, Calendar, DollarSign, Tag, FileText, Gavel, Clock, Users } from 'lucide-react';

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

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
        <div className="h-40 bg-gray-100 rounded animate-pulse" />
        <div className="h-20 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Tender not found</p>
        <Button variant="outline" onClick={() => setView('tenders')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tenders
        </Button>
      </div>
    );
  }

  const isOpen = tender.status === 'open';
  const deadlinePassed = new Date(tender.deadline) < new Date();
  const canBid = user?.role === 'contractor' && isOpen && !deadlinePassed && !hasBid && user?.profile?.verified;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => setView('tenders')} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tenders
      </Button>

      {/* Tender Header */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{tender.title}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge className={tender.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>
                  {tender.status}
                </Badge>
                {tender.categoryTags.split(',').filter(Boolean).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag.trim()}</Badge>
                ))}
              </div>
            </div>
            {canBid && (
              <Dialog open={showBid} onOpenChange={setShowBid}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Gavel className="h-4 w-4 mr-2" /> Submit Bid
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Submit Bid for {tender.title}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Technical Proposal *</Label>
                      <Textarea placeholder="Methodology, approach, team composition, relevant experience" rows={6}
                        value={bidData.technicalProposal} onChange={e => setBidData(d => ({ ...d, technicalProposal: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Financial Proposal (ETB) *</Label>
                      <Input type="number" placeholder="e.g. 250000"
                        value={bidData.financialProposal} onChange={e => setBidData(d => ({ ...d, financialProposal: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Timeline *</Label>
                      <Input placeholder="e.g. 30 days or 6 weeks"
                        value={bidData.timeline} onChange={e => setBidData(d => ({ ...d, timeline: e.target.value }))} />
                    </div>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmitBid}>
                      Submit Bid
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {hasBid && <Badge variant="secondary">Bid Submitted</Badge>}
            {user?.role === 'admin' && (
              <div className="flex gap-2">
                {tender.status === 'open' && (
                  <Button variant="outline" size="sm" onClick={() => handleStatusChange('closed')}>Close Tender</Button>
                )}
                {tender.status === 'closed' && (
                  <Button variant="outline" size="sm" onClick={() => handleStatusChange('open')}>Reopen</Button>
                )}
                <Button variant="outline" size="sm" onClick={() => handleStatusChange('cancelled')}>Cancel</Button>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-xs text-muted-foreground">Budget Range</p>
                <p className="text-sm font-medium">ETB {tender.budgetMin.toLocaleString()} - {tender.budgetMax.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-xs text-muted-foreground">Deadline</p>
                <p className="text-sm font-medium">{new Date(tender.deadline).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-teal-600" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm font-medium">{tender.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">Bids Received</p>
                <p className="text-sm font-medium">{tender._count?.bids || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scope of Work */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scope of Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">{tender.scope}</div>
        </CardContent>
      </Card>

      {/* Bids List (Admin & Tender Owner) */}
      {(user?.role === 'admin' || user?.role === 'tender_owner') && bids.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submitted Bids ({bids.length})</CardTitle>
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

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-emerald-700 font-semibold text-xs">
              {(bid.user?.profile?.fullName || 'U')[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium">{bid.user?.profile?.fullName || bid.user?.email || 'Contractor'}</p>
            <p className="text-xs text-muted-foreground">Submitted {new Date(bid.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="text-xs">ETB {bid.financialProposal.toLocaleString()}</Badge>
          <Badge variant="outline" className="text-xs">{bid.timeline}</Badge>
          <Badge className={`text-[10px] ${
            bid.status === 'awarded' ? 'bg-emerald-100 text-emerald-700' :
            bid.status === 'rejected' ? 'bg-red-100 text-red-700' :
            bid.status === 'shortlisted' ? 'bg-amber-100 text-amber-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {bid.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Technical Proposal</p>
            <p className="text-sm whitespace-pre-wrap">{bid.technicalProposal}</p>
          </div>

          {user?.role === 'admin' && bid.status === 'pending_review' && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('shortlisted')}>Shortlist</Button>
              <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate('rejected')}>Reject</Button>
            </div>
          )}
          {user?.role === 'admin' && bid.status === 'shortlisted' && (
            <div className="flex gap-2">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleStatusUpdate('awarded')}>Award Bid</Button>
              <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate('rejected')}>Reject</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
