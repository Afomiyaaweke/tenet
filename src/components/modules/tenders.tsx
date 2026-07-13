'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api, Tender, Bid, LiveTender, TenderDocument } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  FileSearch, Plus, Search, MapPin, Calendar, DollarSign,
  Clock, ArrowRight, TrendingUp, ChevronRight, Zap, Timer,
  Users, Building2, Target, GitCompareArrows, CheckCircle, X as XIcon,
  ClipboardList, ChevronDown, ChevronUp, Sparkles, Gavel,
  ExternalLink, FileText, Tag, Briefcase, Eye, ShieldCheck,
  Wallet, Clock3, Globe2, Award, CircleDot, ListChecks,
  Upload, CloudUpload, FileUp, ScanSearch, Brain, Trash2, Loader2,
} from 'lucide-react';
import { InlineTranslator } from '@/components/translator';

const CATEGORIES = ['Construction', 'IT', 'Supply', 'Consulting', 'Engineering', 'Architecture', 'Electrical', 'Plumbing', 'HVAC', 'Logistics', 'Healthcare', 'Education', 'Finance', 'Agriculture', 'Telecommunications', 'Energy'];

// Category icons & colors for visual distinction
const CATEGORY_META: Record<string, { icon: typeof Building2; color: string; bg: string; accent: string }> = {
  Construction: { icon: Building2, color: 'text-amber-700', bg: 'bg-amber-50', accent: 'from-amber-400 to-amber-600' },
  IT: { icon: Zap, color: 'text-violet-700', bg: 'bg-violet-50', accent: 'from-violet-400 to-violet-600' },
  Supply: { icon: ClipboardList, color: 'text-sky-700', bg: 'bg-sky-50', accent: 'from-sky-400 to-sky-600' },
  Consulting: { icon: Briefcase, color: 'text-indigo-700', bg: 'bg-indigo-50', accent: 'from-indigo-400 to-indigo-600' },
  Engineering: { icon: Target, color: 'text-emerald-700', bg: 'bg-emerald-50', accent: 'from-emerald-400 to-emerald-600' },
  Architecture: { icon: Building2, color: 'text-rose-700', bg: 'bg-rose-50', accent: 'from-rose-400 to-rose-600' },
  Electrical: { icon: Zap, color: 'text-yellow-700', bg: 'bg-yellow-50', accent: 'from-yellow-400 to-yellow-600' },
  Plumbing: { icon: FileText, color: 'text-blue-700', bg: 'bg-blue-50', accent: 'from-blue-400 to-blue-600' },
  HVAC: { icon: Clock, color: 'text-teal-700', bg: 'bg-teal-50', accent: 'from-teal-400 to-teal-600' },
  Logistics: { icon: ArrowRight, color: 'text-orange-700', bg: 'bg-orange-50', accent: 'from-orange-400 to-orange-600' },
  Healthcare: { icon: ShieldCheck, color: 'text-red-700', bg: 'bg-red-50', accent: 'from-red-400 to-red-600' },
  Education: { icon: FileText, color: 'text-purple-700', bg: 'bg-purple-50', accent: 'from-purple-400 to-purple-600' },
  Finance: { icon: DollarSign, color: 'text-green-700', bg: 'bg-green-50', accent: 'from-green-400 to-green-600' },
  Agriculture: { icon: FileSearch, color: 'text-lime-700', bg: 'bg-lime-50', accent: 'from-lime-400 to-lime-600' },
  Telecommunications: { icon: Globe2, color: 'text-cyan-700', bg: 'bg-cyan-50', accent: 'from-cyan-400 to-cyan-600' },
  Energy: { icon: Zap, color: 'text-amber-700', bg: 'bg-amber-50', accent: 'from-amber-400 to-orange-600' },
};

function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat] || { icon: FileSearch, color: 'text-muted-foreground', bg: 'bg-muted/50', accent: 'from-gray-400 to-gray-600' };
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function deadlineColor(days: number) {
  if (days <= 0) return 'rose';
  if (days <= 3) return 'rose';
  if (days <= 7) return 'amber';
  return 'emerald';
}

function deadlineBg(days: number) {
  const c = deadlineColor(days);
  const map: Record<string, string> = {
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  };
  return map[c] || map.emerald;
}

function formatBudget(min: number, max: number) {
  const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : n.toLocaleString();
  return `ETB ${fmt(min)} – ${fmt(max)}`;
}

// ─── Inline Tender Detail Panel ───────────────────────────────────
function InlineTenderDetail({ tender, onClose, setView }: {
  tender: Tender;
  onClose: () => void;
  setView: (view: string, params?: Record<string, string>) => void;
}) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidsLoading, setBidsLoading] = useState(true);
  const tags = tender.categoryTags.split(',').filter(Boolean);
  const reqDocs = tender.requiredDocs ? tender.requiredDocs.split(',').filter(Boolean) : [];
  const days = daysUntil(tender.deadline);
  const isLive = 'source' in tender && 'externalUrl' in tender;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBidsLoading(true);
      const res = await api.get('/bids', { tenderId: tender.id });
      if (!cancelled && res.success) setBids(res.data);
      setBidsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tender.id]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
      case 'closed': return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
      case 'awarded': return 'bg-teal-100 text-teal-700 hover:bg-teal-100';
      case 'cancelled': return 'bg-muted text-muted-foreground hover:bg-muted';
      default: return 'bg-muted text-muted-foreground hover:bg-muted';
    }
  };

  const bidStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_review': return 'bg-amber-100 text-amber-700';
      case 'shortlisted': return 'bg-sky-100 text-sky-700';
      case 'awarded': return 'bg-emerald-100 text-emerald-700';
      case 'rejected': return 'bg-rose-100 text-rose-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="animate-[fadeIn_0.2s_ease-out] border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl bg-emerald-50/30 dark:bg-emerald-950/10 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-900/20 dark:to-teal-900/20 border-b border-emerald-200/40 dark:border-emerald-800/30">
        <div className="flex items-center gap-2 min-w-0">
          <Gavel className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <h4 className="font-semibold text-sm truncate">{tender.title}</h4>
          <Badge className={`text-[10px] px-1.5 py-0 border-0 rounded-lg shrink-0 ${statusColor(tender.status)}`}>
            {tender.status}
          </Badge>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex-shrink-0"
          aria-label="Close detail"
        >
          <XIcon className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Scope */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Scope of Work</span>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{tender.scope}</p>
        </div>

        {/* Key Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-background dark:bg-card border border-emerald-200/40 dark:border-emerald-800/30 p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3 w-3 text-emerald-600" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Budget</span>
            </div>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{formatBudget(tender.budgetMin, tender.budgetMax)}</p>
          </div>
          <div className="rounded-lg bg-background dark:bg-card border border-emerald-200/40 dark:border-emerald-800/30 p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-teal-600" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Deadline</span>
            </div>
            <p className="text-xs font-semibold">{new Date(tender.deadline).toLocaleDateString()}</p>
            <Badge className={`text-[9px] px-1 py-0 border-0 rounded ${deadlineBg(days)}`}>
              {days <= 0 ? 'Expired' : days === 1 ? '1 day left' : `${days} days left`}
            </Badge>
          </div>
          <div className="rounded-lg bg-background dark:bg-card border border-emerald-200/40 dark:border-emerald-800/30 p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-amber-600" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Location</span>
            </div>
            <p className="text-xs font-semibold">{tender.location}</p>
          </div>
          <div className="rounded-lg bg-background dark:bg-card border border-emerald-200/40 dark:border-emerald-800/30 p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-violet-600" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Bids</span>
            </div>
            <p className="text-xs font-semibold">{tender._count?.bids ?? bids.length} submitted</p>
          </div>
        </div>

        {/* Category Tags */}
        {tags.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Tag className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Categories</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => {
                const meta = getCategoryMeta(tag.trim());
                return (
                  <Badge key={tag} className={`text-[10px] px-2 py-0.5 border-0 rounded-lg ${meta.bg} ${meta.color}`}>
                    {tag.trim()}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Required Documents */}
        {reqDocs.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ClipboardList className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wide">Required Documents</span>
              <span className="text-[9px] text-teal-600/70 ml-auto">{reqDocs.length} doc{reqDocs.length === 1 ? '' : 's'}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {reqDocs.map((doc, i) => (
                <span key={`${doc}-${i}`} className="inline-flex items-center text-[10px] font-medium bg-background dark:bg-card border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 rounded px-2 py-0.5">
                  {doc.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Existing Bids Preview */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Gavel className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Recent Bids</span>
          </div>
          {bidsLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
              Loading bids...
            </div>
          ) : bids.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No bids submitted yet. Be the first!</p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
              {bids.slice(0, 5).map(bid => (
                <div key={bid.id} className="flex items-center justify-between rounded-lg bg-background dark:bg-card border border-border/40 px-3 py-1.5 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <CircleDot className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">{bid.user?.profile?.fullName || bid.user?.email || 'Anonymous'}</span>
                    {bid.user?.company?.name && (
                      <span className="text-muted-foreground truncate hidden sm:inline">({bid.user.company.name})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">ETB {bid.financialProposal?.toLocaleString()}</span>
                    <Badge className={`text-[9px] px-1 py-0 border-0 rounded ${bidStatusBadge(bid.status)}`}>
                      {bid.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
              {bids.length > 5 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  +{bids.length - 5} more bid{bids.length - 5 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Live tender external link */}
        {isLive && (tender as LiveTender).externalUrl && (
          <div className="rounded-lg border border-orange-200/60 dark:border-orange-800/40 bg-orange-50/50 dark:bg-orange-950/20 p-3">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
              <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Live Tender Source</span>
            </div>
            <a
              href={(tender as LiveTender).externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-orange-600 dark:text-orange-400 underline underline-offset-2 mt-1 inline-flex items-center gap-1 hover:text-orange-800 dark:hover:text-orange-200 transition-colors"
            >
              View on {(tender as LiveTender).source || 'original site'}
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Match Score */}
        {tender.matchScore !== undefined && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Match Score</span>
              <span className={`text-xs font-bold ${
                tender.matchScore >= 70 ? 'text-emerald-700' : tender.matchScore >= 40 ? 'text-amber-700' : 'text-muted-foreground'
              }`}>
                {tender.matchScore}%
              </span>
            </div>
            <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ${
                  tender.matchScore >= 70 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                  tender.matchScore >= 40 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                  'bg-gradient-to-r from-gray-300 to-gray-400'
                }`}
                style={{ width: `${tender.matchScore}%` }}
              />
            </div>
          </div>
        )}

        <Separator className="bg-emerald-200/40 dark:bg-emerald-800/30" />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          {tender.status === 'open' && (
            <Button
              className="flex-1 gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5"
              onClick={() => setView('tender-detail', { id: tender.id, action: 'apply' })}
            >
              <Gavel className="h-4 w-4 mr-2" />
              Apply / Submit Bid
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1 rounded-xl border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            onClick={() => setView('bids', { tenderId: tender.id })}
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Track Application
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-xl border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            onClick={() => setView('tender-detail', { id: tender.id })}
          >
            <Eye className="h-4 w-4 mr-2" />
            Full Details
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-xl"
            onClick={() => setView('tender-detail', { id: tender.id, tab: 'ai-overview' })}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Review
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Category Section ────────────────────────────────────────────
function CategorySection({ category, tenders, expandedTenderId, onExpandTender, compareSelection, toggleCompare, setView }: {
  category: string;
  tenders: Tender[];
  expandedTenderId: string | null;
  onExpandTender: (id: string | null) => void;
  compareSelection: string[];
  toggleCompare: (tenderId: string, e: React.MouseEvent) => void;
  setView: (view: string, params?: Record<string, string>) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;

  if (tenders.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-3 cursor-pointer group py-2 px-1 hover:bg-muted/30 rounded-xl transition-colors">
          <div className={`p-2 rounded-lg ${meta.bg} flex-shrink-0`}>
            <Icon className={`h-4 w-4 ${meta.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
              {category}
            </h3>
            <p className="text-[10px] text-muted-foreground">{tenders.length} tender{tenders.length !== 1 ? 's' : ''}</p>
          </div>
          <Badge className="text-[10px] px-2 py-0.5 border-0 rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted/60">
            {tenders.filter(t => t.status === 'open').length} open
          </Badge>
          <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 mt-3 pl-2">
          {tenders.map(tender => {
            const isExpanded = expandedTenderId === tender.id;
            return (
              <div key={tender.id} className="space-y-0">
                {/* Tender Card */}
                <div
                  className={`hover:-translate-y-[2px] transition-all duration-200 ${isExpanded ? 'ring-2 ring-emerald-300 dark:ring-emerald-700 rounded-xl' : ''}`}
                >
                  <Card
                    className={`premium-shadow rounded-xl border-0 bg-card cursor-pointer group overflow-hidden transition-all duration-200 ${
                      compareSelection.includes(tender.id) ? 'ring-2 ring-emerald-400 ring-offset-2' : ''
                    }`}
                    onClick={() => onExpandTender(isExpanded ? null : tender.id)}
                  >
                    {/* Gradient accent strip */}
                    <div className={`h-1 bg-gradient-to-r ${statusAccent(tender.status)}`} />
                    <CardContent className="p-4 space-y-2.5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-emerald-700 transition-colors flex-1 min-w-0">
                          {tender.title}
                        </h4>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Badge className={`text-[10px] px-1.5 py-0 shrink-0 border-0 rounded-lg ${statusColor(tender.status)}`}>
                            {tender.status}
                          </Badge>
                          <button
                            onClick={(e) => toggleCompare(tender.id, e)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                              compareSelection.includes(tender.id)
                                ? 'border-emerald-500 bg-emerald-500 shadow-sm shadow-emerald-200'
                                : 'border-muted-foreground/30 hover:border-primary hover:bg-primary/10'
                            }`}
                            title="Select to compare"
                          >
                            {compareSelection.includes(tender.id) && (
                              <CheckCircle className="h-3 w-3 text-white" strokeWidth={3} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Scope preview */}
                      <p className="text-xs text-muted-foreground line-clamp-2">{tender.scope}</p>

                      {/* Budget + Location + Deadline in one row */}
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        <div className="flex items-center gap-1">
                          <div className="p-0.5 rounded bg-emerald-50">
                            <DollarSign className="h-3 w-3 text-emerald-600" />
                          </div>
                          <span className="font-medium text-emerald-700">{formatBudget(tender.budgetMin, tender.budgetMax)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="p-0.5 rounded bg-amber-50">
                            <MapPin className="h-3 w-3 text-amber-600" />
                          </div>
                          <span className="text-muted-foreground truncate max-w-[80px]">{tender.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="p-0.5 rounded bg-teal-50">
                            <Calendar className="h-3 w-3 text-teal-600" />
                          </div>
                          <span className="text-muted-foreground">{new Date(tender.deadline).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Deadline + Bids badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {(() => {
                          const d = daysUntil(tender.deadline);
                          const dlBg2 = deadlineBg(d);
                          return (
                            <Badge className={`text-[10px] px-1.5 py-0 border-0 rounded-lg ${dlBg2} hover:${dlBg2} flex items-center gap-1`}>
                              <Timer className="h-2.5 w-2.5" />
                              {d <= 0 ? 'Expired' : d === 1 ? '1 day left' : `${d} days left`}
                            </Badge>
                          );
                        })()}
                        {tender._count && (
                          <Badge className="text-[10px] px-1.5 py-0 border-0 rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted/60 flex items-center gap-1">
                            <Users className="h-2.5 w-2.5" />
                            {tender._count.bids} bid{tender._count.bids !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {/* Category tags compact */}
                        {tender.categoryTags.split(',').filter(Boolean).slice(0, 2).map(tag => (
                          <Badge key={tag} className="text-[9px] px-1.5 py-0 border-0 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                            {tag.trim()}
                          </Badge>
                        ))}
                      </div>

                      {/* Expand indicator */}
                      <div className="flex items-center justify-between pt-0.5">
                        <div className="flex items-center gap-1">
                          {tender.status === 'open' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 h-6 px-1.5 font-medium"
                              onClick={(e) => { e.stopPropagation(); setView('tender-detail', { id: tender.id, action: 'apply' }); }}
                            >
                              <Gavel className="h-3 w-3" />
                              Apply
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-[10px] text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 h-6 px-1.5"
                            onClick={(e) => { e.stopPropagation(); setView('tender-detail', { id: tender.id, tab: 'ai-overview' }); }}
                          >
                            <Sparkles className="h-3 w-3" />
                            AI Review
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-[10px] text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 h-6 px-1.5"
                            onClick={(e) => { e.stopPropagation(); setView('bids', { tenderId: tender.id }); }}
                          >
                            <Briefcase className="h-3 w-3" />
                            Track
                          </Button>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          {isExpanded ? 'Collapse' : 'Expand'} Details
                          <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown className="h-3 w-3" />
                          </div>
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Inline Detail Panel */}
                {isExpanded && (
                  <div className="mt-2 mb-1">
                    <InlineTenderDetail
                      tender={tender}
                      onClose={() => onExpandTender(null)}
                      setView={setView}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Main Tenders View ──────────────────────────────────────────
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
  const [createDocs, setCreateDocs] = useState<TenderDocument[]>([]);
  const [createDocUploading, setCreateDocUploading] = useState(false);
  const [createDocType, setCreateDocType] = useState('tender_document');
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const createDropRef = useRef<HTMLDivElement>(null);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [expandedTenderId, setExpandedTenderId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const TENDER_PAGE_SIZE = 12;
  const categoryScrollRef = useRef<HTMLDivElement>(null);

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
      documentIds: createDocs.map(d => d.id),
    });
    if (res.success) {
      toast.success('Tender created successfully!');
      setShowCreate(false);
      setCreateData({ title: '', scope: '', budgetMin: '', budgetMax: '', deadline: '', location: '', categoryTags: '', requiredDocs: '' });
      setSelectedCategories([]);
      setCreateDocs([]);
      loadTenders();
    } else {
      toast.error(res.error || 'Failed to create tender');
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  // ── Tender Document Upload ──
  const handleCreateDocUpload = useCallback(async (docType?: string) => {
    const fileInput = createFileInputRef.current;
    if (!fileInput?.files?.length) {
      toast.error('Please select a file first');
      return;
    }
    setCreateDocUploading(true);
    try {
      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', docType || createDocType);
      formData.append('autoOcr', 'true');
      formData.append('autoReview', 'true');
      const res = await api.upload('/tenders/documents', formData);
      if (res.success) {
        setCreateDocs(prev => [...prev, res.data]);
        toast.success('Document uploaded — OCR & AI Review started');
        fileInput.value = '';
      } else {
        toast.error(res.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    }
    setCreateDocUploading(false);
  }, [createDocType]);

  const handleCreateDocDrop = useCallback(async (files: FileList, docType?: string) => {
    if (!files.length) return;
    setCreateDocUploading(true);
    try {
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', docType || createDocType);
      formData.append('autoOcr', 'true');
      formData.append('autoReview', 'true');
      const res = await api.upload('/tenders/documents', formData);
      if (res.success) {
        setCreateDocs(prev => [...prev, res.data]);
        toast.success('Document uploaded — OCR & AI Review started');
      } else {
        toast.error(res.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    }
    setCreateDocUploading(false);
  }, [createDocType]);

  const handleRemoveCreateDoc = useCallback(async (docId: string) => {
    try {
      // Use fetch directly since api.delete doesn't support body
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      headers['Content-Type'] = 'application/json';
      const res = await fetch('/api/tenders/documents', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ documentId: docId }),
      });
      const data = await res.json();
      if (data.success) {
        setCreateDocs(prev => prev.filter(d => d.id !== docId));
        toast.success('Document removed');
      } else {
        // Still remove from local state even if server delete fails
        setCreateDocs(prev => prev.filter(d => d.id !== docId));
      }
    } catch {
      setCreateDocs(prev => prev.filter(d => d.id !== docId));
    }
  }, []);

  const toggleCompare = (tenderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompareSelection(prev =>
      prev.includes(tenderId) ? prev.filter(id => id !== tenderId) : [...prev, tenderId].slice(-4)
    );
  };

  const goToCompare = () => {
    if (compareSelection.length >= 2) {
      setView('tender-compare', { ids: compareSelection.join(',') });
    }
  };

  // Group tenders by category
  const tendersByCategory = useMemo(() => {
    const map: Record<string, Tender[]> = {};
    tenders.forEach(t => {
      const cats = t.categoryTags.split(',').filter(Boolean).map(c => c.trim());
      if (cats.length === 0) {
        if (!map['Uncategorized']) map['Uncategorized'] = [];
        map['Uncategorized'].push(t);
      } else {
        cats.forEach(cat => {
          if (!map[cat]) map[cat] = [];
          // avoid duplicate if tender has multiple categories
          if (!map[cat].some(existing => existing.id === t.id)) {
            map[cat].push(t);
          }
        });
      }
    });
    return map;
  }, [tenders]);

  // Get active categories (those with tenders), sorted by CATEGORIES order
  const activeCategories = useMemo(() => {
    const catSet = new Set<string>();
    tenders.forEach(t => {
      t.categoryTags.split(',').filter(Boolean).forEach(c => catSet.add(c.trim()));
    });
    // Sort by CATEGORIES order, then alphabetically for any not in list
    const ordered = CATEGORIES.filter(c => catSet.has(c));
    const extras = Array.from(catSet).filter(c => !CATEGORIES.includes(c)).sort();
    return [...ordered, ...extras];
  }, [tenders]);

  const stats = useMemo(() => ({
    open: tenders.filter(t => t.status === 'open').length,
    closed: tenders.filter(t => t.status === 'closed').length,
    awarded: tenders.filter(t => t.status === 'awarded').length,
    total: tenders.length,
  }), [tenders]);

  // When a specific category is selected, show only that category's tenders
  const displayCategories = useMemo(() => {
    if (categoryFilter && categoryFilter !== 'all') {
      return [categoryFilter];
    }
    return activeCategories;
  }, [categoryFilter, activeCategories]);

  // Flat list when a specific category is selected
  const filteredTenders = useMemo(() => {
    if (categoryFilter && categoryFilter !== 'all') {
      return tendersByCategory[categoryFilter] || [];
    }
    return tenders;
  }, [categoryFilter, tendersByCategory, tenders]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto view-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-[fadeIn_0.3s_ease-out]">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl gradient-emerald shadow-md flex-shrink-0">
            <FileSearch className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-gradient-emerald">My</span> Tenders
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">Explore published tender opportunities by sector — click to apply</p>
          </div>
        </div>
        <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) { setCreateDocs([]); setCreateDocType('tender_document'); } }}>
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

              {/* ── Tender Document Upload ── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg gradient-emerald">
                    <FileUp className="h-3.5 w-3.5 text-white" />
                  </div>
                  <Label className="text-sm font-semibold uppercase tracking-wide">Tender Documents</Label>
                  <span className="text-[10px] text-muted-foreground ml-1">RFP, specifications, terms of reference, etc.</span>
                </div>

                {/* Upload area with drag & drop */}
                <div
                  ref={createDropRef}
                  className="relative"
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('ring-2', 'ring-emerald-400', 'bg-emerald-50/60'); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('ring-2', 'ring-emerald-400', 'bg-emerald-50/60'); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('ring-2', 'ring-emerald-400', 'bg-emerald-50/60'); handleCreateDocDrop(e.dataTransfer.files, createDocType); }}
                >
                  <div className="p-4 bg-gradient-to-b from-emerald-50/40 to-emerald-50/10 border-2 border-dashed border-emerald-200 rounded-xl text-center hover:border-emerald-300 transition-colors">
                    <CloudUpload className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-xs font-medium text-emerald-700 mb-1">
                      Drag & drop tender documents here
                    </p>
                    <p className="text-[10px] text-muted-foreground mb-3">
                      Or click to browse — PDF, JPEG, PNG, DOCX, DOC, TXT (max 10MB)
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-3">
                      <input
                        ref={createFileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.docx,.doc,.txt"
                        className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 file:cursor-pointer file:transition-colors"
                      />
                      <select
                        value={createDocType}
                        onChange={e => setCreateDocType(e.target.value)}
                        className="h-7 text-xs rounded-lg bg-white/80 border border-emerald-200 px-2"
                      >
                        <option value="tender_document">Tender Document</option>
                        <option value="external_doc">External Document</option>
                        <option value="technical_proposal">Technical Spec</option>
                        <option value="financial_proposal">Financial Spec</option>
                        <option value="business_license">Business License</option>
                        <option value="tax_clearance">Tax Clearance</option>
                        <option value="certificate">Certificate</option>
                        <option value="portfolio">Portfolio</option>
                        <option value="other">Other</option>
                      </select>
                      <Button
                        size="sm"
                        className="gradient-emerald text-white rounded-lg text-[10px] h-7 px-3 hover:opacity-90"
                        onClick={() => handleCreateDocUpload(createDocType)}
                        disabled={createDocUploading}
                      >
                        {createDocUploading ? (
                          <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading...</>
                        ) : (
                          <><Upload className="h-3 w-3 mr-1" /> Upload</>
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground">
                      <ScanSearch className="h-2.5 w-2.5 text-emerald-500" /> Auto OCR
                      <span className="text-muted-foreground/40">→</span>
                      <Brain className="h-2.5 w-2.5 text-purple-500" /> Auto AI Review
                    </div>
                  </div>
                </div>

                {/* Uploaded documents list */}
                {createDocs.length > 0 && (
                  <div className="space-y-2">
                    {createDocs.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 p-2.5 bg-muted/40 rounded-xl border border-border/40 group hover:bg-muted/60 transition-colors">
                        <div className="p-1.5 rounded-lg bg-emerald-50 flex-shrink-0">
                          <FileText className="h-3.5 w-3.5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{doc.fileName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[8px] h-4 px-1.5">{doc.docType.replace(/_/g, ' ')}</Badge>
                            {doc.ocrStatus === 'processing' && (
                              <span className="text-[8px] text-amber-600 flex items-center gap-0.5">
                                <Loader2 className="h-2 w-2 animate-spin" /> OCR...
                              </span>
                            )}
                            {doc.ocrStatus === 'completed' && (
                              <span className="text-[8px] text-emerald-600 flex items-center gap-0.5">
                                <CheckCircle className="h-2 w-2" /> OCR ✓
                              </span>
                            )}
                            {doc.aiReviewStatus === 'processing' && (
                              <span className="text-[8px] text-purple-600 flex items-center gap-0.5">
                                <Loader2 className="h-2 w-2 animate-spin" /> Review...
                              </span>
                            )}
                            {doc.aiReviewStatus === 'completed' && (
                              <span className="text-[8px] text-purple-600 flex items-center gap-0.5">
                                <Brain className="h-2 w-2" /> Review ✓
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                          onClick={() => handleRemoveCreateDoc(doc.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button className="w-full gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5" onClick={handleCreate}>
                Create Tender <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search / Filter Bar */}
      <div className="animate-[fadeIn_0.3s_ease-out]">
        <Card className="premium-shadow rounded-xl border-0 bg-card">
          <CardContent className="p-4 space-y-3">
            {/* Search row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search tenders by title, scope, or keyword..." value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-10 bg-muted/50 border-border/60 rounded-xl focus:ring-emerald-500/20 h-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36 rounded-xl bg-muted/50 border-border/60 h-10">
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
      </div>

      {/* Category Tabs - Horizontal Scrollable */}
      <div className="animate-[fadeIn_0.3s_ease-out]">
        <div
          ref={categoryScrollRef}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
        >
          {/* "All" tab */}
          <button
            onClick={() => setCategoryFilter('')}
            className={`flex-shrink-0 text-xs px-4 py-2 rounded-xl transition-all duration-200 font-medium border ${
              !categoryFilter || categoryFilter === 'all'
                ? 'gradient-emerald text-white border-transparent premium-shadow'
                : 'bg-card border-border/60 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30'
            }`}
          >
            All ({tenders.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = (tendersByCategory[cat] || []).length;
            const meta = getCategoryMeta(cat);
            const Icon = meta.icon;
            const isActive = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(isActive ? '' : cat)}
                className={`flex-shrink-0 text-xs px-3 py-2 rounded-xl transition-all duration-200 font-medium border flex items-center gap-1.5 ${
                  isActive
                    ? 'gradient-emerald text-white border-transparent premium-shadow'
                    : count > 0
                      ? 'bg-card border-border/60 text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30'
                      : 'bg-muted/30 border-transparent text-muted-foreground/50 cursor-default'
                }`}
                disabled={count === 0 && !isActive}
              >
                <Icon className="h-3 w-3" />
                {cat}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0 rounded-full ${
                    isActive ? 'bg-white/20' : 'bg-muted/60'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats Summary */}
      {!loading && tenders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-[fadeIn_0.3s_ease-out]">
          {[
            { label: 'Open', count: stats.open, icon: FileSearch, bg: 'bg-emerald-50', color: 'text-emerald-600' },
            { label: 'Closed', count: stats.closed, icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600' },
            { label: 'Awarded', count: stats.awarded, icon: TrendingUp, bg: 'bg-teal-50', color: 'text-teal-600' },
            { label: 'Total', count: stats.total, icon: Target, bg: 'bg-emerald-50', color: 'text-emerald-600' },
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

      {/* Tenders List - Category Grouped or Flat */}
      {loading ? (
        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted/50 animate-pulse" />
                <div className="h-5 bg-muted/50 rounded-xl w-32 animate-pulse" />
              </div>
              <div className="grid md:grid-cols-2 gap-3 pl-2">
                {[1, 2].map(j => (
                  <Card key={j} className="premium-shadow rounded-xl border-0 bg-card animate-pulse overflow-hidden">
                    <div className="h-1.5 bg-muted/30" />
                    <CardContent className="p-4 space-y-2.5">
                      <div className="h-4 bg-muted/50 rounded-xl w-3/4" />
                      <div className="h-3 bg-muted/50 rounded-xl w-full" />
                      <div className="h-3 bg-muted/50 rounded-xl w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : tenders.length === 0 ? (
        <div className="animate-[fadeIn_0.3s_ease-out]">
          <Card className="premium-shadow rounded-xl border-0 bg-card">
            <CardContent className="p-16 text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-2xl gradient-emerald opacity-20" />
                <div className="absolute inset-2 rounded-xl gradient-emerald flex items-center justify-center">
                  <FileSearch className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold">No tenders found</h3>
              <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
                {search || categoryFilter
                  ? 'Try adjusting your search or filters to find more opportunities'
                  : 'New tenders are posted regularly. Check back soon!'}
              </p>
              {(search || categoryFilter) && (
                <Button variant="outline" className="mt-4 rounded-xl" onClick={() => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); }}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      ) : categoryFilter && categoryFilter !== 'all' ? (
        /* Single category view - show flat list with inline detail */
        <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
          {(tendersByCategory[categoryFilter] || []).map(tender => {
            const isExpanded = expandedTenderId === tender.id;
            const days = daysUntil(tender.deadline);
            const tags = tender.categoryTags.split(',').filter(Boolean);
            const reqDocs = tender.requiredDocs ? tender.requiredDocs.split(',').filter(Boolean) : [];

            return (
              <div key={tender.id} className="space-y-0">
                <div className={`hover:-translate-y-[3px] transition-all duration-200 ${isExpanded ? 'ring-2 ring-emerald-300 dark:ring-emerald-700 rounded-xl' : ''}`}>
                  <Card
                    className={`premium-shadow rounded-xl border-0 bg-card cursor-pointer group overflow-hidden transition-all duration-200 ${
                      compareSelection.includes(tender.id) ? 'ring-2 ring-emerald-400 ring-offset-2' : ''
                    }`}
                    onClick={() => setExpandedTenderId(isExpanded ? null : tender.id)}
                  >
                    <div className={`h-1.5 bg-gradient-to-r ${statusAccent(tender.status)}`} />
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-emerald-700 transition-colors flex-1 min-w-0">
                          {tender.title}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Badge className={`text-[10px] px-1.5 py-0 shrink-0 border-0 rounded-lg ${statusColor(tender.status)}`}>
                            {tender.status}
                          </Badge>
                          <button
                            onClick={(e) => toggleCompare(tender.id, e)}
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                              compareSelection.includes(tender.id)
                                ? 'border-emerald-500 bg-emerald-500 shadow-sm shadow-emerald-200'
                                : 'border-muted-foreground/30 hover:border-primary hover:bg-primary/10'
                            }`}
                            title="Select to compare"
                          >
                            {compareSelection.includes(tender.id) && (
                              <CheckCircle className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                            )}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2">{tender.scope}</p>

                      <div className="flex items-center gap-1.5 text-xs">
                        <div className="p-1 rounded bg-emerald-50">
                          <DollarSign className="h-3 w-3 text-emerald-600" />
                        </div>
                        <span className="font-medium text-emerald-700">ETB {tender.budgetMin.toLocaleString()} – {tender.budgetMax.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <div className="p-1 rounded bg-amber-50">
                            <MapPin className="h-3 w-3 text-amber-600" />
                          </div>
                          <span className="truncate max-w-[100px]">{tender.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="p-1 rounded bg-teal-50">
                            <Calendar className="h-3 w-3 text-teal-600" />
                          </div>
                          <span>{new Date(tender.deadline).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] px-1.5 py-0 border-0 rounded-lg ${deadlineBg(days)} hover:${deadlineBg(days)} flex items-center gap-1`}>
                          <Timer className="h-2.5 w-2.5" />
                          {days <= 0 ? 'Expired' : days === 1 ? '1 day left' : `${days} days left`}
                        </Badge>
                        {tender._count && (
                          <Badge className="text-[10px] px-1.5 py-0 border-0 rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted/60 flex items-center gap-1">
                            <Users className="h-2.5 w-2.5" />
                            {tender._count.bids} bid{tender._count.bids !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 3).map(tag => (
                          <Badge key={tag} className="text-[10px] px-1.5 py-0 border-0 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                            {tag.trim()}
                          </Badge>
                        ))}
                        {tags.length > 3 && (
                          <Badge className="text-[10px] px-1.5 py-0 border-0 rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted/60">
                            +{tags.length - 3}
                          </Badge>
                        )}
                      </div>

                      {reqDocs.length > 0 && (
                        <div className="rounded-lg border border-teal-200/60 dark:border-teal-900/40 bg-teal-50/50 dark:bg-teal-950/20 p-2.5 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <ClipboardList className="h-3 w-3 text-teal-600 dark:text-teal-400 shrink-0" />
                            <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wide">Requirements</span>
                            <span className="text-[9px] text-teal-600/70 dark:text-teal-400/70 ml-auto">{reqDocs.length} doc{reqDocs.length === 1 ? '' : 's'}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {reqDocs.slice(0, 3).map((doc, i) => (
                              <span key={`${doc}-${i}`} className="inline-flex items-center text-[10px] font-medium bg-background dark:bg-card border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 rounded px-1.5 py-0.5">
                                {doc.trim()}
                              </span>
                            ))}
                            {reqDocs.length > 3 && (
                              <span className="text-[10px] text-teal-600/70 dark:text-teal-400/70 px-1.5 py-0.5">+{reqDocs.length - 3}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {tender.matchScore !== undefined && (
                        <div className="pt-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground font-medium">Match Score</span>
                            <span className={`text-[10px] font-bold ${
                              tender.matchScore >= 70 ? 'text-emerald-700' : tender.matchScore >= 40 ? 'text-amber-700' : 'text-muted-foreground'
                            }`}>
                              {tender.matchScore}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${matchBarColor(tender.matchScore)} transition-[width] duration-700`}
                              style={{ width: `${tender.matchScore}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1">
                          {tender.status === 'open' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 h-6 px-1.5 font-medium"
                              onClick={(e) => { e.stopPropagation(); setView('tender-detail', { id: tender.id, action: 'apply' }); }}
                            >
                              <Gavel className="h-3 w-3" />
                              Apply
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-[10px] text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 h-6 px-1.5"
                            onClick={(e) => { e.stopPropagation(); setView('tender-detail', { id: tender.id, tab: 'ai-overview' }); }}
                          >
                            <Sparkles className="h-3 w-3" />
                            AI Review
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-[10px] text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 h-6 px-1.5"
                            onClick={(e) => { e.stopPropagation(); setView('bids', { tenderId: tender.id }); }}
                          >
                            <Briefcase className="h-3 w-3" />
                            Track
                          </Button>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          {isExpanded ? 'Collapse' : 'Expand'} Details
                          <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown className="h-3 w-3" />
                          </div>
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {isExpanded && (
                  <div className="mt-2 mb-1">
                    <InlineTenderDetail
                      tender={tender}
                      onClose={() => setExpandedTenderId(null)}
                      setView={setView}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* All categories view - grouped by category with collapsible sections */
        <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
          {displayCategories.map(cat => {
            const catTenders = tendersByCategory[cat] || [];
            if (catTenders.length === 0) return null;
            return (
              <CategorySection
                key={cat}
                category={cat}
                tenders={catTenders.slice(0, visibleCount)}
                expandedTenderId={expandedTenderId}
                onExpandTender={setExpandedTenderId}
                compareSelection={compareSelection}
                toggleCompare={toggleCompare}
                setView={setView}
              />
            );
          })}
        </div>
      )}

      {/* See More / Load More */}
      {!loading && filteredTenders.length > visibleCount && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="lg"
            className="gap-2 rounded-xl border-orange-200 dark:border-orange-800/40 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30"
            onClick={() => setVisibleCount(prev => Math.min(prev + TENDER_PAGE_SIZE, filteredTenders.length))}
          >
            <ChevronDown className="h-4 w-4" />
            See More ({filteredTenders.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      {/* Floating Compare Bar */}
      {compareSelection.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex items-center gap-3 bg-card/95 backdrop-blur-md rounded-2xl px-5 py-3 premium-shadow-lg border border-primary/20">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-emerald">
                <GitCompareArrows className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {compareSelection.length} tender{compareSelection.length !== 1 ? 's' : ''} selected
                </p>
                <p className="text-[10px] text-muted-foreground">Select 2-4 to compare</p>
              </div>
            </div>
            <div className="h-8 w-px bg-border/60" />
            <Button
              size="sm"
              className={`rounded-xl font-semibold transition-all hover:-translate-y-0.5 ${
                compareSelection.length >= 2
                  ? 'gradient-emerald hover:opacity-90 text-white premium-shadow'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
              disabled={compareSelection.length < 2}
              onClick={goToCompare}
            >
              <GitCompareArrows className="h-3.5 w-3.5 mr-1.5" />
              Compare {compareSelection.length >= 2 ? `(${compareSelection.length})` : ''}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
              onClick={() => setCompareSelection([])}
            >
              <XIcon className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared helpers ──────────────────────────────────────────────
function statusColor(status: string) {
  switch (status) {
    case 'open': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
    case 'closed': return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
    case 'awarded': return 'bg-teal-100 text-teal-700 hover:bg-teal-100';
    case 'cancelled': return 'bg-muted text-muted-foreground hover:bg-muted';
    default: return 'bg-muted text-muted-foreground hover:bg-muted';
  }
}

function statusAccent(status: string) {
  switch (status) {
    case 'open': return 'from-emerald-400 to-emerald-600';
    case 'closed': return 'from-rose-400 to-rose-600';
    case 'awarded': return 'from-teal-400 to-teal-600';
    case 'cancelled': return 'from-gray-300 to-gray-400';
    default: return 'from-gray-300 to-gray-400';
  }
}

function matchBarColor(score: number) {
  if (score >= 70) return 'from-emerald-400 to-emerald-600';
  if (score >= 40) return 'from-amber-400 to-amber-600';
  return 'from-gray-300 to-gray-400';
}
