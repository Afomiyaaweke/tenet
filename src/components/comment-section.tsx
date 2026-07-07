'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Star,
  MessageSquarePlus,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  Loader2,
  Award,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/* ───────────────────── Types ───────────────────── */

interface Comment {
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

interface CommentStats {
  totalCount: number;
  avgRating: number;
  ratingDistribution: Record<number, number>;
}

/* ───────────────────── Star helpers ───────────────────── */

function StarRating({
  rating,
  size = 'sm',
  interactive = false,
  onChange,
}: {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (r: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${sizeClasses[size]} transition-colors duration-150 ${
            i <= (hovered || rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-transparent text-gray-300'
          } ${interactive ? 'cursor-pointer hover:scale-110' : ''}`}
          onMouseEnter={() => interactive && setHovered(i)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onChange?.(i)}
        />
      ))}
    </div>
  );
}

/* ───────────────────── Rating Bar ───────────────────── */

function RatingBar({
  stars,
  count,
  total,
}: {
  stars: number;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-3 text-right text-muted-foreground font-medium">{stars}</span>
      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-muted-foreground text-xs">{count}</span>
    </div>
  );
}

/* ───────────────────── Testimonial Card ───────────────────── */

function TestimonialCard({ comment }: { comment: Comment }) {
  const roleLabel: Record<string, string> = {
    user: 'User',
    team_admin: 'Team Admin',
    other: 'Other',
  };

  const roleColor: Record<string, string> = {
    user: 'bg-orange-100 text-orange-700',
    team_admin: 'bg-slate-100 text-slate-700',
    other: 'bg-gray-100 text-gray-700',
  };

  return (
    <Card className="group relative bg-card rounded-2xl border border-border hover:shadow-lg hover:shadow-slate-500/5 hover:border-slate-200/60 transition-all duration-300 overflow-hidden">
      {/* Featured ribbon */}
      {comment.featured && (
        <div className="absolute top-3 -right-8 rotate-45 bg-amber-400 text-amber-900 text-[10px] font-bold px-10 py-0.5 shadow-md">
          Featured
        </div>
      )}
      <CardContent className="p-5 sm:p-6">
        {/* Stars */}
        <div className="mb-3">
          <StarRating rating={comment.rating} />
        </div>

        {/* Comment text - truncated to 3 lines */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">
          &ldquo;{comment.content}&rdquo;
        </p>

        {/* Author */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {comment.name[0]?.toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{comment.name}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {comment.company && (
                <span className="text-xs text-muted-foreground truncate">
                  {comment.company}
                </span>
              )}
              {comment.role && (
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 h-5 font-medium border-0 ${
                    roleColor[comment.role] || roleColor.other
                  }`}
                >
                  {roleLabel[comment.role] || comment.role}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────────── Review Form ───────────────────── */

function ReviewForm({
  onSubmit,
  onSuccess,
}: {
  onSubmit: (data: FormData) => Promise<{ success: boolean; error?: string }>;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('user');
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('company', company);
      formData.append('role', role);
      formData.append('rating', String(rating));
      formData.append('content', content);

      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          company: company || undefined,
          role,
          rating,
          content,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSubmitted(true);
        toast({
          title: 'Review submitted!',
          description: 'Thank you for sharing your experience.',
        });
        onSuccess();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to submit review',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to submit review. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-slate-700" />
        </div>
        <h4 className="text-lg font-bold text-foreground">Thank You!</h4>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your review has been submitted successfully. It helps our community grow!
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSubmitted(false);
            setName('');
            setEmail('');
            setCompany('');
            setRole('user');
            setRating(5);
            setContent('');
          }}
          className="mt-2"
        >
          Write Another Review
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Name <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </div>
        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Email <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Company (optional) */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Company <span className="text-muted-foreground text-xs">(optional)</span>
          </label>
          <Input
            placeholder="Your company name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        {/* Role */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Role</label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="team_admin">Team Admin</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Star rating selector */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Rating</label>
        <div className="flex items-center gap-3">
          <StarRating rating={rating} size="lg" interactive onChange={setRating} />
          <span className="text-sm font-semibold text-foreground">{rating}/5</span>
        </div>
      </div>

      {/* Comment */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Your Review <span className="text-red-500">*</span>
        </label>
        <Textarea
          placeholder="Share your experience with Tenets... (min 10 characters)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          minLength={10}
          rows={4}
          className="resize-none"
        />
      </div>

      <Button
        type="submit"
        disabled={submitting || !name || !email || !content || content.length < 10}
        className="w-full sm:w-auto bg-slate-900 text-white font-semibold border-0 shadow-lg shadow-slate-300/40 hover:shadow-slate-400/60 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Submit Review
          </>
        )}
      </Button>
    </form>
  );
}

/* ───────────────────── Main Component ───────────────────── */

export function CommentSection() {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [stats, setStats] = useState<CommentStats>({
    totalCount: 0,
    avgRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch('/api/comments');
      const data = await res.json();
      if (data.success) {
        setComments(data.data || []);
        setStats(data.stats || { totalCount: 0, avgRating: 0, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const avgDisplay = stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '0.0';

  return (
    <section id="community" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ─── Section Header ─── */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200/60 rounded-full px-4 py-1.5 mb-4">
            <Award className="w-3.5 h-3.5 text-orange-600" />
            <span className="text-xs font-semibold text-orange-700">Testimonials</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
            💬 What Our Community Says
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Hear from users and team admins who are transforming their procurement workflow with Tenets.
          </p>
        </div>

        {/* ─── Rating Overview ─── */}
        <div className="max-w-md mx-auto mb-12">
          <Card className="bg-card rounded-2xl border border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                {/* Big number */}
                <div className="text-center flex-shrink-0">
                  <p className="text-5xl font-extrabold text-foreground">{avgDisplay}</p>
                  <StarRating rating={Math.round(stats.avgRating)} size="md" />
                </div>
                {/* Distribution bars */}
                <div className="flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((s) => (
                    <RatingBar
                      key={s}
                      stars={s}
                      count={stats.ratingDistribution[s] || 0}
                      total={stats.totalCount}
                    />
                  ))}
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4 font-medium">
                Based on {stats.totalCount} review{stats.totalCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ─── Testimonial Grid ─── */}
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-6 mb-12">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-card rounded-2xl border border-border">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div
                        key={j}
                        className="w-4 h-4 bg-muted rounded animate-pulse"
                      />
                    ))}
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-3 bg-muted rounded animate-pulse w-full" />
                    <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
                    <div className="h-3 bg-muted rounded animate-pulse w-3/5" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-3 bg-muted rounded animate-pulse w-20" />
                      <div className="h-2 bg-muted rounded animate-pulse w-14" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : comments.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-6 mb-12 max-h-[800px] overflow-y-auto pr-1 custom-scrollbar">
            {comments.map((comment) => (
              <TestimonialCard key={comment.id} comment={comment} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 mb-12">
            <MessageSquarePlus className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No reviews yet. Be the first to share your experience!
            </p>
          </div>
        )}

        {/* ─── Write a Review ─── */}
        <div className="max-w-2xl mx-auto">
          <Button
            variant="outline"
            className="w-full sm:w-auto bg-slate-900 text-white font-semibold border-0 shadow-lg shadow-slate-300/40 hover:shadow-slate-400/60 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            onClick={() => setFormOpen((prev) => !prev)}
          >
            {formOpen ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Close Form
              </>
            ) : (
              <>
                <MessageSquarePlus className="w-4 h-4 mr-2" />
                Write a Review
              </>
            )}
          </Button>

          {formOpen && (
            <Card className="mt-6 bg-card rounded-2xl border border-border">
              <CardContent className="p-5 sm:p-6">
                <h4 className="text-lg font-bold text-foreground mb-4">Share Your Experience</h4>
                <ReviewForm
                  onSubmit={async () => ({ success: true })}
                  onSuccess={() => {
                    fetchComments();
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
