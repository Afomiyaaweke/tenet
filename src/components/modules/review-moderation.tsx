'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Star, CheckCircle2, XCircle, Flag,
  Loader2, MessageSquare, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface Review {
  id: string;
  name: string;
  email: string;
  company: string | null;
  role: string | null;
  content: string;
  rating: number;
  featured: boolean;
  approved: boolean;
  createdAt: string;
}

export function ReviewModerationView() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/comments', { all: 'true' });
      if (res.success) {
        setReviews(res.data || []);
      } else {
        toast.error('Failed to fetch reviews');
      }
    } catch {
      toast.error('Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const updateReview = async (id: string, updates: { approved?: boolean; featured?: boolean }) => {
    setUpdating(id);
    try {
      const res = await api.patch(`/comments/${id}`, updates);
      if (res.success) {
        setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
        toast.success('Review updated');
      } else {
        toast.error(res.error || 'Failed to update review');
      }
    } catch {
      toast.error('Failed to update review');
    } finally {
      setUpdating(null);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'pending') return !r.approved;
    if (filter === 'approved') return r.approved;
    if (filter === 'rejected') return !r.approved;
    return true;
  });

  const pendingCount = reviews.filter((r) => !r.approved).length;
  const approvedCount = reviews.filter((r) => r.approved).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Review Moderation</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage user reviews and testimonials
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReviews} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-0">
        <Card className="rounded-l-xl rounded-r-none border-r-0">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{reviews.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="rounded-none border-r-0">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card className="rounded-r-xl rounded-l-none">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'approved', 'pending'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className={filter === f ? 'bg-slate-900 text-white' : ''}
          >
            {f === 'all' && `All (${reviews.length})`}
            {f === 'approved' && `Approved (${approvedCount})`}
            {f === 'pending' && `Pending (${pendingCount})`}
          </Button>
        ))}
      </div>

      {/* Review list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-3/4 mb-3" />
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No reviews found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
          {filteredReviews.map((review) => (
            <Card
              key={review.id}
              className={`transition-all duration-200 ${
                !review.approved
                  ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800'
                  : 'border-border'
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i <= review.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-transparent text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 h-5 font-medium border-0 ${
                          review.approved
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}
                      >
                        {review.approved ? 'Approved' : 'Pending'}
                      </Badge>
                      {review.featured && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-medium border-0 bg-blue-100 text-blue-700">
                          Featured
                        </Badge>
                      )}
                    </div>

                    {/* Content */}
                    <p className="text-sm text-foreground mb-3 leading-relaxed">
                      &ldquo;{review.content}&rdquo;
                    </p>

                    {/* Author info */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{review.name}</span>
                      {review.company && <span>· {review.company}</span>}
                      <span>· {new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {!review.approved ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                        onClick={() => updateReview(review.id, { approved: true })}
                        disabled={!!updating}
                      >
                        {updating === review.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Approve
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
                        onClick={() => updateReview(review.id, { approved: false })}
                        disabled={!!updating}
                      >
                        {updating === review.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        Unapprove
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 text-xs gap-1 ${
                        review.featured
                          ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-slate-200'
                      }`}
                      onClick={() => updateReview(review.id, { featured: !review.featured })}
                      disabled={!!updating}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      {review.featured ? 'Unfeature' : 'Feature'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
