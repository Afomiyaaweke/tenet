'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api, Bid } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Gavel, Clock, DollarSign, FileSearch } from 'lucide-react';

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
      case 'pending_review': return 'bg-gray-100 text-gray-700';
      case 'shortlisted': return 'bg-amber-100 text-amber-700';
      case 'awarded': return 'bg-emerald-100 text-emerald-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{user?.role === 'admin' ? 'Review Bids' : 'My Bids'}</h2>
          <p className="text-muted-foreground text-sm">
            {user?.role === 'admin' ? 'Manage and evaluate submitted bids' : 'Track your bid submissions'}
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="shortlisted">Shortlisted</SelectItem>
            <SelectItem value="awarded">Awarded</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-20 bg-gray-200 rounded" /></CardContent></Card>
          ))}
        </div>
      ) : bids.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Gavel className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No bids found</h3>
            <p className="text-muted-foreground text-sm">No bids match your current filters</p>
            {user?.role === 'contractor' && (
              <Button variant="outline" className="mt-4" onClick={() => setView('tenders')}>
                <FileSearch className="h-4 w-4 mr-2" /> Browse Tenders
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bids.map(bid => (
            <Card key={bid.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(expandedId === bid.id ? null : bid.id)}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-emerald-700 font-semibold">
                          {(bid.user?.profile?.fullName || bid.tender?.title || 'B')[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{bid.tender?.title || 'Tender'}</p>
                        <p className="text-xs text-muted-foreground">
                          {bid.user?.profile?.fullName || 'Contractor'} &middot; {new Date(bid.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-xs">
                        <DollarSign className="h-3 w-3 mr-1" /> ETB {bid.financialProposal.toLocaleString()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" /> {bid.timeline}
                      </Badge>
                      <Badge className={`text-[10px] ${statusBadge(bid.status)}`}>
                        {bid.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>

                {expandedId === bid.id && (
                  <div className="px-4 pb-4 pt-2 border-t space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Technical Proposal</p>
                      <p className="text-sm whitespace-pre-wrap bg-gray-50 rounded p-3">{bid.technicalProposal}</p>
                    </div>

                    {bid.rejectionNote && (
                      <div className="bg-red-50 rounded p-3">
                        <p className="text-xs font-medium text-red-700 mb-1">Rejection Note</p>
                        <p className="text-sm text-red-600">{bid.rejectionNote}</p>
                      </div>
                    )}

                    {user?.role === 'admin' && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {bid.status === 'pending_review' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(bid.id, 'shortlisted')}>Shortlist</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(bid.id, 'rejected')}>Reject</Button>
                          </>
                        )}
                        {bid.status === 'shortlisted' && (
                          <>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleStatusUpdate(bid.id, 'awarded')}>Award Bid</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(bid.id, 'rejected')}>Reject</Button>
                          </>
                        )}
                      </div>
                    )}
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
