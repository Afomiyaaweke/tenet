'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api, Bid, BidDocument } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Gavel, Clock, DollarSign, FileSearch, Award, AlertCircle,
  CheckCircle, ChevronDown, ChevronUp, ArrowRight, TrendingUp,
  Briefcase, X, Eye, RotateCcw, Filter, Target,
  CircleDot, Building2, FileSignature, Stamp, Sparkles, Languages,
  Bookmark, MapPin, Calendar, ExternalLink, Trash2, PenLine,
  ScanSearch, Brain, Loader2, AlertTriangle, Upload, FileText,
  CloudUpload, FileUp, ThumbsUp, ThumbsDown, AlertOctagon,
  BarChart3, CheckCircle2, XCircle, Globe, MessageSquare, Copy,
  FileDown, FileSpreadsheet,
} from 'lucide-react';
import { useStampSignature, StampSignatureSelector, type SavedSignature } from '@/components/stamp-signature';
import { InlineTranslator } from '@/components/translator';

type BidTab = 'all' | 'pending_review' | 'drafted' | 'shortlisted' | 'awarded' | 'rejected' | 'saved';

interface AIReviewData {
  complianceScore?: number;
  completenessScore?: number;
  riskLevel?: string;
  findings?: Array<{ type: string; title?: string; description: string; category?: string; severity?: string }>;
  strengths?: string[];
  weaknesses?: string[];
  missingElements?: string[];
  recommendations?: string[];
  summary?: string;
  overallAssessment?: string;
}

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

  // Document/OCR/AI state
  const [ocrLoading, setOcrLoading] = useState<Set<string>>(new Set());
  const [reviewLoading, setReviewLoading] = useState<Set<string>>(new Set());
  const [docOcrText, setDocOcrText] = useState<Record<string, string>>({});
  const [docReview, setDocReview] = useState<Record<string, AIReviewData>>({});
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewDialogDocId, setReviewDialogDocId] = useState<string | null>(null);
  const [docUploadBidId, setDocUploadBidId] = useState<string | null>(null);
  const docFileRef = useRef<HTMLInputElement>(null);
  const [docUploadType, setDocUploadType] = useState('bid_attachment');
  const [extractPrompt, setExtractPrompt] = useState<Record<string, string>>({});
  const [extractLoading, setExtractLoading] = useState<Set<string>>(new Set());
  const [extractResults, setExtractResults] = useState<Record<string, string>>({});
  const [showExtract, setShowExtract] = useState<Set<string>>(new Set());
  const [submitUrlForBid, setSubmitUrlForBid] = useState<Record<string, string>>({});
  const [reviewPromptForBid, setReviewPromptForBid] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Saved tenders state
  const [savedTenders, setSavedTenders] = useState<any[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  const loadSavedTenders = useCallback(async () => {
    setSavedLoading(true);
    const res = await api.get('/tenders/saved');
    if (res.success) setSavedTenders(res.data);
    setSavedLoading(false);
  }, []);

  const handleRemoveSaved = async (id: string) => {
    const res = await api.delete(`/tenders/saved/${id}`);
    if (res.success) {
      toast.success('Removed from saved tenders');
      loadSavedTenders();
    } else {
      toast.error('Failed to remove');
    }
  };

  const loadBids = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
    const res = await api.get('/bids', params);
    if (res.success) setBids(res.data);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { loadBids(); loadSavedTenders(); }, [loadBids, loadSavedTenders]);

  const handleStatusUpdate = async (bidId: string, status: string) => {
    const res = await api.patch(`/bids/${bidId}/status`, { status });
    if (res.success) {
      toast.success(`Bid ${status}`);
      loadBids();
    } else {
      toast.error(res.error || 'Failed to update bid');
    }
  };

  const handleMarkAsDraft = async (bidId: string) => {
    const res = await api.patch(`/bids/${bidId}/status`, { status: 'drafted' });
    if (res.success) {
      toast.success('Bid saved as draft');
      loadBids();
    } else {
      toast.error(res.error || 'Failed to update bid');
    }
  };

  const handleSubmitDraft = async (bidId: string) => {
    const res = await api.patch(`/bids/${bidId}/status`, { status: 'pending_review' });
    if (res.success) {
      toast.success('Bid submitted for review');
      loadBids();
    } else {
      toast.error(res.error || 'Failed to submit bid');
    }
  };

  const [withdrawingBidId, setWithdrawingBidId] = useState<string | null>(null);

  const handleWithdrawBid = async (bidId: string) => {
    setWithdrawingBidId(bidId);
    try {
      const res = await api.patch(`/bids/${bidId}/status`, { status: 'withdrawn' });
      if (res.success) {
        toast.success('Bid withdrawn successfully');
        loadBids();
      } else {
        toast.error(res.error || 'Failed to withdraw bid');
      }
    } catch {
      toast.error('Failed to withdraw bid');
    } finally {
      setWithdrawingBidId(null);
    }
  };

  // ── Document Upload (with auto-OCR + auto-AI Review) ──
  const handleDocUpload = useCallback(async (bidId: string, docType?: string, fileInputRef?: React.RefObject<HTMLInputElement | null>) => {
    const ref = fileInputRef || docFileRef;
    const file = ref.current?.files?.[0];
    if (!file) return;
    const type = docType || docUploadType;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', type);
    formData.append('autoOcr', 'true');
    formData.append('autoReview', 'true');
    formData.append('submitUrl', submitUrlForBid[bidId] || '');
    formData.append('reviewPrompt', reviewPromptForBid[bidId] || '');
    try {
      const res = await api.upload(`/bids/${bidId}/documents`, formData);
      if (res.success) {
        toast.success('Document uploaded - OCR & AI Review started automatically');
        if (ref.current) ref.current.value = '';
        loadBids();
        // Start polling for the newly uploaded document
        const newDocId = res.data?.id;
        if (newDocId) {
          setOcrLoading(prev => new Set(prev).add(newDocId));
          pollOcrThenReview(newDocId);
        }
      } else {
        toast.error(res.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setDocUploadBidId(null);
    }
  }, [docUploadType, loadBids, submitUrlForBid, reviewPromptForBid]);

  // ── Ref for AI Review handler (avoids circular dep with pollOcrThenReview) ──
  const runReviewRef = useRef<(docId: string) => void>(() => {});

  // ── AI Review Processing ──
  const handleRunReview = useCallback(async (docId: string) => {
    setReviewLoading(prev => new Set(prev).add(docId));
    try {
      const res = await api.post(`/document-review/${docId}`, undefined, { timeout: 55_000 });
      if (!res.success && res.error?.includes('OCR must be completed')) {
        setReviewLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
        toast.error('Run OCR first before AI review');
        return;
      }
      const poll = async (attempts = 0): Promise<void> => {
        if (attempts > 60) {
          setReviewLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
          toast.error('AI Review processing timed out');
          return;
        }
        await new Promise(r => setTimeout(r, 2000));
        const pollRes = await api.get(`/document-review/${docId}`);
        if (pollRes.success && pollRes.data?.aiReviewStatus === 'completed') {
          setReviewLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
          let reviewData = pollRes.data.aiReview || {};
          if (typeof reviewData === 'string') {
            try { reviewData = JSON.parse(reviewData); } catch { reviewData = { summary: reviewData }; }
          }
          setDocReview(prev => ({ ...prev, [docId]: reviewData as AIReviewData }));
          loadBids();
          toast.success('AI Review completed - Document fully processed');
        } else if (pollRes.success && pollRes.data?.aiReviewStatus === 'failed') {
          setReviewLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
          toast.error('AI Review processing failed');
          loadBids();
        } else {
          await poll(attempts + 1);
        }
      };
      poll();
    } catch {
      setReviewLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
      toast.error('Failed to start AI Review');
    }
  }, [loadBids]);

  // Keep ref updated
  runReviewRef.current = handleRunReview;

  // ── Poll OCR then auto-trigger AI Review ──
  const pollOcrThenReview = useCallback(async (docId: string) => {
    const poll = async (attempts = 0): Promise<void> => {
      if (attempts > 60) {
        setOcrLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
        toast.error('OCR processing timed out');
        return;
      }
      await new Promise(r => setTimeout(r, 2000));
      const res = await api.get(`/document-ocr/${docId}`);
      if (res.success && res.data?.ocrStatus === 'completed') {
        setOcrLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
        setDocOcrText(prev => ({ ...prev, [docId]: res.data.ocrText || '' }));
        loadBids();
        toast.success('OCR completed - Starting AI Review...');
        // Auto-chain: trigger AI Review after OCR completes
        runReviewRef.current(docId);
      } else if (res.success && res.data?.ocrStatus === 'failed') {
        setOcrLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
        toast.error('OCR processing failed');
        loadBids();
      } else {
        await poll(attempts + 1);
      }
    };
    poll();
  }, [loadBids]);

  // ── Drag & Drop Upload ──
  const handleDocDrop = useCallback(async (bidId: string, files: FileList | null, docType?: string) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowed = ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'doc', 'txt'];
    if (!allowed.includes(ext)) {
      toast.error('Invalid file type. Allowed: PDF, JPEG, PNG, DOCX, DOC, TXT');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum 10MB.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType || docUploadType);
    formData.append('autoOcr', 'true');
    formData.append('autoReview', 'true');
    formData.append('submitUrl', submitUrlForBid[bidId] || '');
    formData.append('reviewPrompt', reviewPromptForBid[bidId] || '');
    try {
      const res = await api.upload(`/bids/${bidId}/documents`, formData);
      if (res.success) {
        toast.success('Document dropped - OCR & AI Review started');
        loadBids();
        const newDocId = res.data?.id;
        if (newDocId) {
          setOcrLoading(prev => new Set(prev).add(newDocId));
          pollOcrThenReview(newDocId);
        }
      } else {
        toast.error(res.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    }
  }, [docUploadType, loadBids, pollOcrThenReview, submitUrlForBid, reviewPromptForBid]);

  // ── OCR Processing (manual trigger) ──
  const handleRunOcr = useCallback(async (docId: string) => {
    setOcrLoading(prev => new Set(prev).add(docId));
    try {
      await api.post(`/document-ocr/${docId}`);
      pollOcrThenReview(docId);
    } catch {
      setOcrLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
      toast.error('Failed to start OCR');
    }
  }, [pollOcrThenReview]);

  // ── View OCR text inline ──
  const handleViewOcr = useCallback(async (docId: string) => {
    if (expandedDocId === docId) {
      setExpandedDocId(null);
      return;
    }
    setExpandedDocId(docId);
    if (!docOcrText[docId]) {
      const res = await api.get(`/document-ocr/${docId}`);
      if (res.success) {
        setDocOcrText(prev => ({ ...prev, [docId]: res.data?.ocrText || '' }));
      }
    }
  }, [expandedDocId, docOcrText]);

  // ── AI Extract: extract specific info from document via prompt ──
  const handleAiExtract = useCallback(async (docId: string) => {
    const prompt = extractPrompt[docId]?.trim();
    if (!prompt) {
      toast.error('Please enter a prompt describing what to extract');
      return;
    }
    setExtractLoading(prev => new Set(prev).add(docId));
    try {
      const res = await api.post('/documents/ai-extract', { documentId: docId, prompt });
      if (res.success) {
        setExtractResults(prev => ({ ...prev, [docId]: res.data.extractedInfo }));
        toast.success('Information extracted successfully');
      } else {
        toast.error(res.error || 'AI extraction failed');
      }
    } catch {
      toast.error('AI extraction failed');
    } finally {
      setExtractLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
    }
  }, [extractPrompt]);

  const isDrafted = (b: Bid) => {
    if (b.status === 'drafted') return true;
    // Backward compatibility: treat pending_review bids with no real data as drafted
    if (b.status !== 'pending_review') return false;
    return (
      !b.financialProposal ||
      b.financialProposal === 0 ||
      b.technicalProposal?.includes('Pending document upload') ||
      b.timeline?.includes('Pending document upload')
    );
  };

  const stats = useMemo(() => ({
    pending: bids.filter(b => b.status === 'pending_review').length,
    drafted: bids.filter(b => isDrafted(b)).length,
    shortlisted: bids.filter(b => b.status === 'shortlisted').length,
    awarded: bids.filter(b => b.status === 'awarded').length,
    rejected: bids.filter(b => b.status === 'rejected').length,
    total: bids.length,
  }), [bids]);

  const filteredBids = useMemo(() => {
    if (activeTab === 'saved') return [] as Bid[];
    if (activeTab === 'all') return bids;
    if (activeTab === 'drafted') return bids.filter(b => isDrafted(b));
    return bids.filter(b => b.status === activeTab);
  }, [bids, activeTab]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'drafted': return 'bg-sky-100 text-sky-700 hover:bg-sky-100';
      case 'pending_review': return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
      case 'shortlisted': return 'bg-teal-100 text-teal-700 hover:bg-teal-100';
      case 'awarded': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
      case 'rejected': return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
      default: return 'bg-muted text-muted-foreground hover:bg-muted';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'drafted': return { icon: PenLine, bg: 'bg-sky-50', color: 'text-sky-600' };
      case 'pending_review': return { icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600' };
      case 'shortlisted': return { icon: Award, bg: 'bg-teal-50', color: 'text-teal-600' };
      case 'awarded': return { icon: CheckCircle, bg: 'bg-emerald-50', color: 'text-emerald-600' };
      case 'rejected': return { icon: AlertCircle, bg: 'bg-rose-50', color: 'text-rose-600' };
      default: return { icon: Gavel, bg: 'bg-muted/50', color: 'text-muted-foreground' };
    }
  };

  const isAdminOrOwner = user?.role === 'team_admin';

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-50';
    if (score >= 60) return 'bg-amber-50';
    return 'bg-rose-50';
  };

  const getRiskColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'low': return 'bg-emerald-100 text-emerald-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'high': case 'critical': return 'bg-rose-100 text-rose-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const tabs: { key: BidTab; label: string; icon: typeof Clock; count: number; color: string }[] = [
    { key: 'all', label: 'All', icon: Gavel, count: stats.total, color: 'emerald' },
    { key: 'pending_review', label: 'Pending', icon: Clock, count: stats.pending, color: 'amber' },
    { key: 'drafted', label: 'Drafted', icon: PenLine, count: stats.drafted, color: 'sky' },
    { key: 'shortlisted', label: 'Shortlisted', icon: Award, count: stats.shortlisted, color: 'teal' },
    { key: 'awarded', label: 'Awarded', icon: CheckCircle, count: stats.awarded, color: 'emerald' },
    { key: 'rejected', label: 'Rejected', icon: AlertCircle, count: stats.rejected, color: 'rose' },
    { key: 'saved', label: 'Saved Tenders', icon: Bookmark, count: savedTenders.length, color: 'violet' },
  ];

  // Review dialog data
  const reviewDialogData = reviewDialogDocId ? docReview[reviewDialogDocId] : null;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto view-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-[fadeIn_0.3s_ease-out]">
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
      {!loading && (bids.length > 0 || savedTenders.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-[fadeIn_0.3s_ease-out]">
          {[
            { label: 'Pending', count: stats.pending, icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600' },
            { label: 'Drafted', count: stats.drafted, icon: PenLine, bg: 'bg-sky-50', color: 'text-sky-600' },
            { label: 'Shortlisted', count: stats.shortlisted, icon: Award, bg: 'bg-teal-50', color: 'text-teal-600' },
            { label: 'Awarded', count: stats.awarded, icon: CheckCircle, bg: 'bg-emerald-50', color: 'text-emerald-600' },
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
      {!loading && (
        <div className="animate-[fadeIn_0.3s_ease-out]">
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

      {/* Saved Tenders Tab */}
      {activeTab === 'saved' && (
        <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
          {savedLoading ? (
            [1, 2, 3].map(i => (
              <Card key={i} className="premium-shadow rounded-xl border-0 bg-card animate-pulse">
                <CardContent className="p-5"><div className="h-20 bg-muted/50 rounded-xl" /></CardContent>
              </Card>
            ))
          ) : savedTenders.length === 0 ? (
            <Card className="premium-shadow rounded-xl border-0 bg-card">
              <CardContent className="p-12 text-center">
                <div className="p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/30 w-fit mx-auto mb-4">
                  <Bookmark className="h-8 w-8 text-violet-500" />
                </div>
                <h3 className="text-lg font-semibold">No saved tenders yet</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                  Bookmark tenders from Live Tenders to work on them later
                </p>
                <Button
                  className="mt-4 gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow"
                  onClick={() => setView('live-tenders')}
                >
                  <FileSearch className="h-4 w-4 mr-2" /> Browse Live Tenders
                </Button>
              </CardContent>
            </Card>
          ) : (
            savedTenders.map((st: any) => (
              <Card key={st.id} className="premium-shadow rounded-xl border-0 bg-card overflow-hidden hover:-translate-y-[2px] transition-all duration-200">
                <div className="h-1 bg-gradient-to-r from-violet-400 to-purple-500" />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-[10px] bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                          {st.source}
                        </Badge>
                        <Badge variant="secondary" className={`text-[10px] ${
                          st.status === 'saved' ? 'bg-amber-50 text-amber-700' :
                          st.status === 'bidding' ? 'bg-teal-50 text-teal-700' :
                          st.status === 'applied' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {st.status}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-sm line-clamp-2">{st.title}</h4>
                      {st.scope && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{st.scope}</p>}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        {(st.budgetMin > 0 || st.budgetMax > 0) && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {st.currency || 'USD'} {st.budgetMin?.toLocaleString() || '-'} – {st.budgetMax?.toLocaleString() || '-'}
                          </span>
                        )}
                        {st.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {st.location}
                          </span>
                        )}
                        {st.deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {new Date(st.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {st.categoryTags && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {st.categoryTags.split(',').map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0 bg-muted/50">
                              {tag.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {st.notes && (
                        <div className="mt-2 p-2 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                          <PenLine className="h-3 w-3 inline mr-1" /> {st.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {st.externalUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => window.open(st.externalUrl, '_blank')}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {st.externalUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          onClick={async () => {
                            try {
                              const token = useAuthStore.getState().token;
                              const res = await fetch('/api/tenders/fetch-doc/export-pdf', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ url: st.externalUrl, title: st.title }),
                              });
                              if (!res.ok) throw new Error('Export failed');
                              const blob = await res.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `Original_${(st.title || 'Requirements').replace(/[^a-zA-Z0-9]/g, '_')}_Source.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(url);
                              toast.success('PDF exported!');
                            } catch {
                              toast.error('Failed to export PDF');
                            }
                          }}
                        >
                          <FileDown className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {st.externalUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          onClick={async () => {
                            try {
                              const token = useAuthStore.getState().token;
                              const res = await fetch('/api/tenders/fetch-doc/export-csv', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ url: st.externalUrl, title: st.title }),
                              });
                              if (!res.ok) throw new Error('Export failed');
                              const blob = await res.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `Original_${(st.title || 'Requirements').replace(/[^a-zA-Z0-9]/g, '_')}_Source.csv`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(url);
                              toast.success('CSV exported!');
                            } catch {
                              toast.error('Failed to export CSV');
                            }
                          }}
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        onClick={() => handleRemoveSaved(st.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Bids List */}
      {activeTab !== 'saved' && (loading ? (
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
              const bidDocs = bid.documents || [];
              const bidIsDrafted = isDrafted(bid);

              return (
                <div className="hover:-translate-y-[2px] transition-all duration-200" key={bid.id}>
                  <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                    {/* Status accent strip */}
                    <div className={`h-1 ${
                      bidIsDrafted ? 'bg-gradient-to-r from-sky-400 to-sky-500' :
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
                            <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                              bidIsDrafted ? 'bg-sky-50' : sInfo.bg
                            }`}>
                              <SIcon className={`h-5 w-5 ${bidIsDrafted ? 'text-sky-600' : sInfo.color}`} />
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
                            {/* Doc count indicator */}
                            {bidDocs.length > 0 && (
                              <Badge className="text-[10px] border-0 rounded-lg bg-sky-50 text-sky-700">
                                <FileText className="h-2.5 w-2.5 mr-0.5" /> {bidDocs.length} doc{bidDocs.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            {/* Status badge */}
                            <div className="flex items-center gap-1">
                              <CircleDot className={`h-2 w-2 ${
                                bidIsDrafted ? 'text-sky-500' :
                                bid.status === 'awarded' ? 'text-emerald-500' :
                                bid.status === 'rejected' ? 'text-rose-500' :
                                bid.status === 'shortlisted' ? 'text-teal-500' :
                                'text-amber-500'
                              }`} />
                              <Badge className={`text-[10px] px-2 py-0.5 border-0 rounded-lg ${
                                bidIsDrafted ? 'bg-sky-100 text-sky-700 hover:bg-sky-100' :
                                statusBadge(bid.status)
                              }`}>
                                {bidIsDrafted ? 'Drafted' : bid.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            {/* Continue & Withdraw buttons for drafted bids */}
                            {bidIsDrafted && (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  className="h-7 text-[10px] gradient-sky text-white rounded-lg hover:opacity-90 px-3"
                                  onClick={(e) => { e.stopPropagation(); setExpandedId(bid.id); }}
                                >
                                  <PenLine className="h-3 w-3 mr-1" /> Continue
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg px-3"
                                  disabled={withdrawingBidId === bid.id}
                                  onClick={(e) => { e.stopPropagation(); handleWithdrawBid(bid.id); }}
                                >
                                  {withdrawingBidId === bid.id ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3 mr-1" />
                                  )}
                                  Withdraw
                                </Button>
                              </div>
                            )}
                            <div className="text-muted-foreground ml-1">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                          <div className="overflow-hidden animate-[fadeIn_0.3s_ease-out]">
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

                              {/* ── Bid Submission Documents ── */}
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="p-1.5 rounded-lg gradient-emerald">
                                    <FileUp className="h-3.5 w-3.5 text-white" />
                                  </div>
                                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                                    Bid Submission Documents
                                  </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  {/* Technical Proposal Document Upload */}
                                  <div
                                    className="relative group"
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('ring-2', 'ring-emerald-400', 'bg-emerald-50/60'); }}
                                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('ring-2', 'ring-emerald-400', 'bg-emerald-50/60'); }}
                                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('ring-2', 'ring-emerald-400', 'bg-emerald-50/60'); handleDocDrop(bid.id, e.dataTransfer.files, 'technical_proposal'); }}
                                  >
                                    <div className="p-3 bg-gradient-to-b from-emerald-50/40 to-emerald-50/10 border-2 border-dashed border-emerald-200 rounded-xl text-center hover:border-emerald-300 transition-colors">
                                      <Briefcase className="h-5 w-5 text-emerald-500 mx-auto mb-1.5" />
                                      <p className="text-[10px] font-semibold text-emerald-700 mb-0.5">Technical Proposal</p>
                                      <p className="text-[8px] text-muted-foreground mb-2">Drag & drop or browse</p>
                                      <input
                                        ref={el => { fileInputRefs.current[`tech_${bid.id}`] = el; }}
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png,.docx,.doc,.txt"
                                        className="hidden"
                                        onChange={() => handleDocUpload(bid.id, 'technical_proposal', { current: fileInputRefs.current[`tech_${bid.id}`] } as React.RefObject<HTMLInputElement | null>)}
                                      />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 text-[9px] border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg"
                                        onClick={(e) => { e.stopPropagation(); fileInputRefs.current[`tech_${bid.id}`]?.click(); }}
                                      >
                                        <Upload className="h-2.5 w-2.5 mr-1" /> Upload
                                      </Button>
                                      <div className="flex items-center justify-center gap-1.5 mt-2 text-[7px] text-muted-foreground">
                                        <ScanSearch className="h-2.5 w-2.5 text-emerald-500" /> Auto OCR
                                        <span className="text-muted-foreground/40">→</span>
                                        <Brain className="h-2.5 w-2.5 text-purple-500" /> Auto Review
                                      </div>
                                    </div>
                                  </div>

                                  {/* Financial Proposal Document Upload */}
                                  <div
                                    className="relative group"
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('ring-2', 'ring-amber-400', 'bg-amber-50/60'); }}
                                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('ring-2', 'ring-amber-400', 'bg-amber-50/60'); }}
                                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('ring-2', 'ring-amber-400', 'bg-amber-50/60'); handleDocDrop(bid.id, e.dataTransfer.files, 'financial_proposal'); }}
                                  >
                                    <div className="p-3 bg-gradient-to-b from-amber-50/40 to-amber-50/10 border-2 border-dashed border-amber-200 rounded-xl text-center hover:border-amber-300 transition-colors">
                                      <DollarSign className="h-5 w-5 text-amber-500 mx-auto mb-1.5" />
                                      <p className="text-[10px] font-semibold text-amber-700 mb-0.5">Financial Proposal</p>
                                      <p className="text-[8px] text-muted-foreground mb-2">Drag & drop or browse</p>
                                      <input
                                        ref={el => { fileInputRefs.current[`fin_${bid.id}`] = el; }}
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png,.docx,.doc,.txt"
                                        className="hidden"
                                        onChange={() => handleDocUpload(bid.id, 'financial_proposal', { current: fileInputRefs.current[`fin_${bid.id}`] } as React.RefObject<HTMLInputElement | null>)}
                                      />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 text-[9px] border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg"
                                        onClick={(e) => { e.stopPropagation(); fileInputRefs.current[`fin_${bid.id}`]?.click(); }}
                                      >
                                        <Upload className="h-2.5 w-2.5 mr-1" /> Upload
                                      </Button>
                                      <div className="flex items-center justify-center gap-1.5 mt-2 text-[7px] text-muted-foreground">
                                        <ScanSearch className="h-2.5 w-2.5 text-amber-500" /> Auto OCR
                                        <span className="text-muted-foreground/40">→</span>
                                        <Brain className="h-2.5 w-2.5 text-purple-500" /> Auto Review
                                      </div>
                                    </div>
                                  </div>

                                  {/* Timeline Document Upload */}
                                  <div
                                    className="relative group"
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('ring-2', 'ring-sky-400', 'bg-sky-50/60'); }}
                                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('ring-2', 'ring-sky-400', 'bg-sky-50/60'); }}
                                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('ring-2', 'ring-sky-400', 'bg-sky-50/60'); handleDocDrop(bid.id, e.dataTransfer.files, 'timeline_doc'); }}
                                  >
                                    <div className="p-3 bg-gradient-to-b from-sky-50/40 to-sky-50/10 border-2 border-dashed border-sky-200 rounded-xl text-center hover:border-sky-300 transition-colors">
                                      <Calendar className="h-5 w-5 text-sky-500 mx-auto mb-1.5" />
                                      <p className="text-[10px] font-semibold text-sky-700 mb-0.5">Timeline Document</p>
                                      <p className="text-[8px] text-muted-foreground mb-2">Drag & drop or browse</p>
                                      <input
                                        ref={el => { fileInputRefs.current[`timeline_${bid.id}`] = el; }}
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png,.docx,.doc,.txt"
                                        className="hidden"
                                        onChange={() => handleDocUpload(bid.id, 'timeline_doc', { current: fileInputRefs.current[`timeline_${bid.id}`] } as React.RefObject<HTMLInputElement | null>)}
                                      />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 text-[9px] border-sky-200 text-sky-600 hover:bg-sky-50 hover:text-sky-700 rounded-lg"
                                        onClick={(e) => { e.stopPropagation(); fileInputRefs.current[`timeline_${bid.id}`]?.click(); }}
                                      >
                                        <Upload className="h-2.5 w-2.5 mr-1" /> Upload
                                      </Button>
                                      <div className="flex items-center justify-center gap-1.5 mt-2 text-[7px] text-muted-foreground">
                                        <ScanSearch className="h-2.5 w-2.5 text-sky-500" /> Auto OCR
                                        <span className="text-muted-foreground/40">→</span>
                                        <Brain className="h-2.5 w-2.5 text-purple-500" /> Auto Review
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* ── External Document Upload ── */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-violet-50">
                                      <Globe className="h-3.5 w-3.5 text-violet-600" />
                                    </div>
                                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                                      External Document Upload
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-[10px] text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDocUploadBidId(docUploadBidId === bid.id ? null : bid.id);
                                    }}
                                  >
                                    <Upload className="h-3 w-3 mr-1" />
                                    {docUploadBidId === bid.id ? 'Cancel' : 'Add Doc'}
                                  </Button>
                                </div>

                                {/* External doc upload area with submitUrl & reviewPrompt */}
                                {docUploadBidId === bid.id && (
                                  <div
                                    className="mb-3 relative"
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('ring-2', 'ring-violet-400', 'bg-violet-50/60'); }}
                                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('ring-2', 'ring-violet-400', 'bg-violet-50/60'); }}
                                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('ring-2', 'ring-violet-400', 'bg-violet-50/60'); handleDocDrop(bid.id, e.dataTransfer.files, 'external_doc'); }}
                                  >
                                    <div className="p-4 bg-gradient-to-b from-violet-50/40 to-violet-50/20 border-2 border-dashed border-violet-200 rounded-xl animate-[fadeIn_0.2s_ease-out]">
                                      <div className="text-center mb-3">
                                        <CloudUpload className="h-7 w-7 text-violet-400 mx-auto mb-2" />
                                        <p className="text-xs font-medium text-violet-700 mb-1">
                                          Drag & drop external documents here
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mb-3">
                                          Or click to browse - PDF, JPEG, PNG, DOCX, DOC, TXT (max 10MB)
                                        </p>
                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-3">
                                          <input
                                            ref={docFileRef}
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png,.docx,.doc,.txt"
                                            className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-violet-100 file:text-violet-700 hover:file:bg-violet-200 file:cursor-pointer file:transition-colors"
                                          />
                                          <div className="flex items-center gap-2">
                                            <select
                                              value={docUploadType}
                                              onChange={e => setDocUploadType(e.target.value)}
                                              className="h-7 text-xs rounded-lg bg-white/80 border border-violet-200 px-2"
                                            >
                                              <option value="external_doc">External Document</option>
                                              <option value="bid_attachment">Bid Attachment</option>
                                              <option value="business_license">Business License</option>
                                              <option value="tax_clearance">Tax Clearance</option>
                                              <option value="certificate">Certificate</option>
                                              <option value="portfolio">Portfolio</option>
                                              <option value="other">Other</option>
                                            </select>
                                            <Button
                                              size="sm"
                                              className="gradient-emerald text-white rounded-lg text-[10px] h-7 px-3 hover:opacity-90"
                                              onClick={() => handleDocUpload(bid.id, docUploadType)}
                                            >
                                              <CloudUpload className="h-3 w-3 mr-1" /> Upload & Process
                                            </Button>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Submit URL field */}
                                      <div className="mb-3">
                                        <label className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                          <ExternalLink className="h-3 w-3" /> Submit URL
                                          <span className="text-muted-foreground/50">(optional - external tender portal URL)</span>
                                        </label>
                                        <Input
                                          type="url"
                                          placeholder="Enter external submission URL"
                                          className="h-7 text-xs rounded-lg border-violet-200 bg-white/60"
                                          value={submitUrlForBid[bid.id] || ''}
                                          onChange={(e) => setSubmitUrlForBid(prev => ({ ...prev, [bid.id]: e.target.value }))}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>

                                      {/* Review Prompt field */}
                                      <div>
                                        <label className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                          <MessageSquare className="h-3 w-3" /> Review Prompt
                                          <span className="text-muted-foreground/50">(optional - custom instructions for AI reviewer)</span>
                                        </label>
                                        <Textarea
                                          placeholder="E.g., Focus on compliance with Ethiopian procurement law and highlight any missing financial guarantees..."
                                          className="text-xs rounded-lg border-violet-200 bg-white/60 min-h-16"
                                          value={reviewPromptForBid[bid.id] || ''}
                                          onChange={(e) => setReviewPromptForBid(prev => ({ ...prev, [bid.id]: e.target.value }))}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>

                                      <div className="flex items-center justify-center gap-3 text-[9px] text-muted-foreground mt-3">
                                        <span className="flex items-center gap-1"><ScanSearch className="h-3 w-3 text-violet-500" /> Auto OCR</span>
                                        <span className="text-muted-foreground/40">→</span>
                                        <span className="flex items-center gap-1"><Brain className="h-3 w-3 text-purple-500" /> Auto AI Review</span>
                                        <span className="text-muted-foreground/40">→</span>
                                        <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Ready</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* ── All Documents List ── */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-sky-50">
                                      <ScanSearch className="h-3.5 w-3.5 text-sky-600" />
                                    </div>
                                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                                      Documents
                                    </p>
                                    {bidDocs.length > 0 && (
                                      <Badge className="text-[9px] px-1.5 py-0 border-0 bg-sky-50 text-sky-700">
                                        {bidDocs.length}
                                      </Badge>
                                    )}
                                    {/* Pipeline summary */}
                                    {bidDocs.length > 0 && (
                                      <div className="hidden sm:flex items-center gap-1 ml-2">
                                        <Badge className="text-[7px] px-1 py-0 border-0 bg-amber-50 text-amber-600 h-3.5">
                                          {bidDocs.filter((d: any) => d.ocrStatus === 'none' || d.ocrStatus === 'failed').length} pending
                                        </Badge>
                                        <Badge className="text-[7px] px-1 py-0 border-0 bg-sky-50 text-sky-600 h-3.5">
                                          {bidDocs.filter((d: any) => d.ocrStatus === 'processing').length} OCR
                                        </Badge>
                                        <Badge className="text-[7px] px-1 py-0 border-0 bg-emerald-50 text-emerald-600 h-3.5">
                                          {bidDocs.filter((d: any) => d.ocrStatus === 'completed').length} extracted
                                        </Badge>
                                        <Badge className="text-[7px] px-1 py-0 border-0 bg-purple-50 text-purple-600 h-3.5">
                                          {bidDocs.filter((d: any) => d.aiReviewStatus === 'completed').length} reviewed
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Document list with processing pipeline */}
                                {bidDocs.length > 0 ? (
                                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
                                    {bidDocs.map((doc: any) => {
                                      const isOcrLoading = ocrLoading.has(doc.id);
                                      const isReviewLoading = reviewLoading.has(doc.id);
                                      const isDocExpanded = expandedDocId === doc.id;
                                      const isFullyProcessed = doc.ocrStatus === 'completed' && doc.aiReviewStatus === 'completed';

                                      // Doc type color mapping
                                      const docTypeConfig: Record<string, { bg: string; text: string; icon: typeof FileText; badgeBg: string; badgeText: string; label: string }> = {
                                        technical_proposal: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: Briefcase, badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', label: 'Technical' },
                                        financial_proposal: { bg: 'bg-amber-50', text: 'text-amber-600', icon: DollarSign, badgeBg: 'bg-amber-100', badgeText: 'text-amber-700', label: 'Financial' },
                                        timeline_doc: { bg: 'bg-sky-50', text: 'text-sky-600', icon: Calendar, badgeBg: 'bg-sky-100', badgeText: 'text-sky-700', label: 'Timeline' },
                                        external_doc: { bg: 'bg-violet-50', text: 'text-violet-600', icon: Globe, badgeBg: 'bg-violet-100', badgeText: 'text-violet-700', label: 'External' },
                                        bid_attachment: { bg: 'bg-sky-50', text: 'text-sky-600', icon: FileText, badgeBg: 'bg-sky-100', badgeText: 'text-sky-700', label: 'Attachment' },
                                        business_license: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: FileText, badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', label: 'License' },
                                        tax_clearance: { bg: 'bg-amber-50', text: 'text-amber-600', icon: FileText, badgeBg: 'bg-amber-100', badgeText: 'text-amber-700', label: 'Tax' },
                                        certificate: { bg: 'bg-teal-50', text: 'text-teal-600', icon: FileText, badgeBg: 'bg-teal-100', badgeText: 'text-teal-700', label: 'Certificate' },
                                        portfolio: { bg: 'bg-orange-50', text: 'text-orange-600', icon: FileText, badgeBg: 'bg-orange-100', badgeText: 'text-orange-700', label: 'Portfolio' },
                                      };
                                      const dtConfig = docTypeConfig[doc.docType] || { bg: 'bg-muted/50', text: 'text-muted-foreground', icon: FileText, badgeBg: 'bg-muted/50', badgeText: 'text-muted-foreground', label: doc.docType?.replace('_', ' ') || 'Doc' };
                                      const DtIcon = dtConfig.icon;

                                      // OCR status badge
                                      const ocrStatusBadge = (() => {
                                        if (doc.ocrStatus === 'completed') return <Badge className="text-[7px] px-1 py-0 border-0 bg-emerald-50 text-emerald-600 h-3.5"><CheckCircle2 className="h-1.5 w-1.5 mr-0.5" /> OCR done</Badge>;
                                        if (doc.ocrStatus === 'processing' || isOcrLoading) return <Badge className="text-[7px] px-1 py-0 border-0 bg-sky-50 text-sky-600 h-3.5 animate-pulse"><ScanSearch className="h-1.5 w-1.5 mr-0.5" /> Scanning...</Badge>;
                                        if (doc.ocrStatus === 'failed') return <Badge className="text-[7px] px-1 py-0 border-0 bg-rose-50 text-rose-600 h-3.5"><XCircle className="h-1.5 w-1.5 mr-0.5" /> OCR failed</Badge>;
                                        return <Badge className="text-[7px] px-1 py-0 border-0 bg-amber-50 text-amber-600 h-3.5">OCR pending</Badge>;
                                      })();

                                      // AI Review status badge
                                      const aiStatusBadge = (() => {
                                        if (doc.aiReviewStatus === 'completed') return <Badge className="text-[7px] px-1 py-0 border-0 bg-purple-50 text-purple-600 h-3.5"><CheckCircle2 className="h-1.5 w-1.5 mr-0.5" /> Reviewed</Badge>;
                                        if (doc.aiReviewStatus === 'processing' || isReviewLoading) return <Badge className="text-[7px] px-1 py-0 border-0 bg-purple-50 text-purple-600 h-3.5 animate-pulse"><Brain className="h-1.5 w-1.5 mr-0.5" /> Reviewing...</Badge>;
                                        if (doc.aiReviewStatus === 'failed') return <Badge className="text-[7px] px-1 py-0 border-0 bg-rose-50 text-rose-600 h-3.5"><XCircle className="h-1.5 w-1.5 mr-0.5" /> Review failed</Badge>;
                                        return <Badge className="text-[7px] px-1 py-0 border-0 bg-amber-50 text-amber-600 h-3.5">Review pending</Badge>;
                                      })();

                                      return (
                                        <div key={doc.id} className={`bg-muted/20 rounded-xl overflow-hidden ${isFullyProcessed ? 'ring-1 ring-emerald-200/50' : ''}`}>
                                          {/* Document row */}
                                          <div className="p-2.5 flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                              <div className={`p-1.5 rounded-lg flex-shrink-0 ${dtConfig.bg}`}>
                                                <DtIcon className={`h-3.5 w-3.5 ${dtConfig.text}`} />
                                              </div>
                                              <div className="min-w-0">
                                                <p className="text-xs font-medium truncate">{doc.fileName}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                  {/* Doc type badge */}
                                                  <Badge className={`text-[8px] px-1 py-0 border-0 ${dtConfig.badgeBg} ${dtConfig.badgeText} h-3.5`}>
                                                    {dtConfig.label}
                                                  </Badge>
                                                  {/* Processing pipeline indicator */}
                                                  <div className="flex items-center gap-0.5">
                                                    {/* Step 1: Upload */}
                                                    <div className="flex items-center">
                                                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" title="Uploaded" />
                                                    </div>
                                                    {/* Step 2: OCR */}
                                                    <div className={`h-3 w-0.5 ${doc.ocrStatus === 'completed' ? 'bg-emerald-300' : doc.ocrStatus === 'processing' ? 'bg-sky-300 animate-pulse' : 'bg-muted-foreground/20'}`} />
                                                    <div className="flex items-center" title={doc.ocrStatus === 'completed' ? 'OCR Complete' : doc.ocrStatus === 'processing' ? 'OCR Processing...' : doc.ocrStatus === 'failed' ? 'OCR Failed' : 'OCR Pending'}>
                                                      {doc.ocrStatus === 'completed' ? (
                                                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 flex items-center justify-center">
                                                          <CheckCircle2 className="h-1.5 w-1.5 text-white" />
                                                        </div>
                                                      ) : doc.ocrStatus === 'processing' || isOcrLoading ? (
                                                        <div className="h-2.5 w-2.5 rounded-full bg-sky-400 animate-pulse flex items-center justify-center">
                                                          <Loader2 className="h-1.5 w-1.5 text-white animate-spin" />
                                                        </div>
                                                      ) : doc.ocrStatus === 'failed' ? (
                                                        <div className="h-2.5 w-2.5 rounded-full bg-rose-400 flex items-center justify-center">
                                                          <XCircle className="h-1.5 w-1.5 text-white" />
                                                        </div>
                                                      ) : (
                                                        <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
                                                      )}
                                                    </div>
                                                    {/* Step 3: AI Review */}
                                                    <div className={`h-3 w-0.5 ${doc.aiReviewStatus === 'completed' ? 'bg-emerald-300' : doc.aiReviewStatus === 'processing' ? 'bg-purple-300 animate-pulse' : 'bg-muted-foreground/20'}`} />
                                                    <div className="flex items-center" title={doc.aiReviewStatus === 'completed' ? 'AI Review Complete' : doc.aiReviewStatus === 'processing' ? 'AI Reviewing...' : doc.aiReviewStatus === 'failed' ? 'AI Review Failed' : 'AI Review Pending'}>
                                                      {doc.aiReviewStatus === 'completed' ? (
                                                        <div className="h-2.5 w-2.5 rounded-full bg-purple-400 flex items-center justify-center">
                                                          <CheckCircle2 className="h-1.5 w-1.5 text-white" />
                                                        </div>
                                                      ) : doc.aiReviewStatus === 'processing' || isReviewLoading ? (
                                                        <div className="h-2.5 w-2.5 rounded-full bg-purple-400 animate-pulse flex items-center justify-center">
                                                          <Loader2 className="h-1.5 w-1.5 text-white animate-spin" />
                                                        </div>
                                                      ) : doc.aiReviewStatus === 'failed' ? (
                                                        <div className="h-2.5 w-2.5 rounded-full bg-rose-400 flex items-center justify-center">
                                                          <XCircle className="h-1.5 w-1.5 text-white" />
                                                        </div>
                                                      ) : (
                                                        <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
                                                      )}
                                                    </div>
                                                  </div>
                                                  {/* Status badges */}
                                                  {ocrStatusBadge}
                                                  {aiStatusBadge}
                                                  {isFullyProcessed && (
                                                    <Badge className="text-[7px] px-1 py-0 border-0 bg-emerald-50 text-emerald-600 h-3.5">
                                                      <CheckCircle2 className="h-1.5 w-1.5 mr-0.5" /> Processed
                                                    </Badge>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                              {/* Re-run OCR button */}
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 px-1.5 text-[9px] text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded"
                                                disabled={isOcrLoading || doc.ocrStatus === 'processing'}
                                                onClick={(e) => { e.stopPropagation(); handleRunOcr(doc.id); }}
                                                title={doc.ocrStatus === 'completed' ? 'Re-run OCR' : doc.ocrStatus === 'none' ? 'Run OCR' : 'OCR in progress'}
                                              >
                                                {isOcrLoading || doc.ocrStatus === 'processing' ? (
                                                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                                ) : (
                                                  <ScanSearch className="h-2.5 w-2.5" />
                                                )}
                                              </Button>
                                              {/* AI Review button */}
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 px-1.5 text-[9px] text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded"
                                                disabled={isReviewLoading || doc.aiReviewStatus === 'processing' || (doc.ocrStatus !== 'completed' && doc.aiReviewStatus !== 'completed')}
                                                onClick={(e) => { e.stopPropagation(); handleRunReview(doc.id); }}
                                                title={doc.ocrStatus !== 'completed' && doc.aiReviewStatus !== 'completed' ? 'Run OCR first' : 'Run AI Review'}
                                              >
                                                {isReviewLoading || doc.aiReviewStatus === 'processing' ? (
                                                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                                ) : (
                                                  <Brain className="h-2.5 w-2.5" />
                                                )}
                                              </Button>
                                              {/* View OCR text */}
                                              {doc.ocrStatus === 'completed' && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-5 px-1.5 text-[9px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                                  onClick={(e) => { e.stopPropagation(); handleViewOcr(doc.id); }}
                                                  title="View extracted text"
                                                >
                                                  <Eye className="h-2.5 w-2.5" />
                                                </Button>
                                              )}
                                              {/* View AI Review */}
                                              {doc.aiReviewStatus === 'completed' && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-5 px-1.5 text-[9px] text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Load review data if not cached
                                                    if (!docReview[doc.id]) {
                                                      api.get(`/document-review/${doc.id}`).then(res => {
                                                        if (res.success) {
                                                          let rd = res.data?.aiReview || {};
                                                          if (typeof rd === 'string') {
                                                            try { rd = JSON.parse(rd); } catch { rd = { summary: rd }; }
                                                          }
                                                          setDocReview(prev => ({ ...prev, [doc.id]: rd as AIReviewData }));
                                                        }
                                                      });
                                                    }
                                                    setReviewDialogDocId(doc.id);
                                                    setReviewDialogOpen(true);
                                                  }}
                                                  title="View AI review report"
                                                >
                                                  <BarChart3 className="h-2.5 w-2.5" />
                                                </Button>
                                              )}
                                              {/* Submit Link button */}
                                              {doc.submitUrl && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-5 px-1.5 text-[9px] text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded"
                                                  onClick={(e) => { e.stopPropagation(); window.open(doc.submitUrl, '_blank'); }}
                                                  title={`Submit at ${doc.submitUrl}`}
                                                >
                                                  <ExternalLink className="h-2.5 w-2.5 mr-0.5" /> Submit
                                                </Button>
                                              )}
                                              {/* AI Extract button */}
                                              {doc.ocrStatus === 'completed' && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className={`h-5 px-1.5 text-[9px] rounded ${showExtract.has(doc.id) ? 'text-emerald-600 bg-emerald-50' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'}`}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowExtract(prev => {
                                                      const s = new Set(prev);
                                                      if (s.has(doc.id)) s.delete(doc.id);
                                                      else s.add(doc.id);
                                                      return s;
                                                    });
                                                  }}
                                                  title="AI Extract - Extract specific information"
                                                >
                                                  <Sparkles className="h-2.5 w-2.5" />
                                                </Button>
                                              )}
                                              {/* Remove document button */}
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-rose-500 hover:bg-rose-50 rounded"
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  if (!confirm(`Delete "${doc.fileName}"? This cannot be undone.`)) return;
                                                  try {
                                                    const res = await api.delete(`/documents/${doc.id}`);
                                                    if (res.success) {
                                                      toast.success('Document deleted');
                                                      loadBids();
                                                    } else {
                                                      toast.error('Failed to delete document');
                                                    }
                                                  } catch {
                                                    toast.error('Failed to delete document');
                                                  }
                                                }}
                                                title="Delete document"
                                              >
                                                <Trash2 className="h-2.5 w-2.5" />
                                              </Button>
                                            </div>
                                          </div>

                                          {/* Expanded OCR text */}
                                          {isDocExpanded && (
                                            <div className="px-3 pb-3 animate-[fadeIn_0.2s_ease-out]">
                                              <div className="p-3 bg-emerald-50/30 border border-emerald-100 rounded-lg">
                                                <div className="flex items-center justify-between mb-1.5">
                                                  <div className="flex items-center gap-1.5">
                                                    <ScanSearch className="h-3 w-3 text-emerald-600" />
                                                    <p className="text-[10px] font-semibold text-emerald-700">OCR Extracted Text</p>
                                                  </div>
                                                  {doc.ocrProcessedAt && (
                                                    <span className="text-[8px] text-muted-foreground">
                                                      {new Date(doc.ocrProcessedAt).toLocaleString()}
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="max-h-48 overflow-y-auto text-[11px] text-foreground/80 whitespace-pre-wrap bg-white/60 p-3 rounded border border-emerald-100/50 leading-relaxed">
                                                  {docOcrText[doc.id] || 'Loading...'}
                                                </div>
                                                {/* Quick AI Review from OCR view */}
                                                {doc.aiReviewStatus !== 'completed' && !isReviewLoading && (
                                                  <Button
                                                    size="sm"
                                                    className="mt-2 gradient-purple text-white rounded-lg text-[10px] h-7 px-3 hover:opacity-90"
                                                    onClick={(e) => { e.stopPropagation(); handleRunReview(doc.id); }}
                                                  >
                                                    <Brain className="h-3 w-3 mr-1" /> Run AI Review on this text
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                          {/* AI Extract Panel */}
                                          {showExtract.has(doc.id) && (
                                            <div className="px-3 pb-3 animate-[fadeIn_0.2s_ease-out]">
                                              <div className="p-3 bg-emerald-50/30 border border-emerald-100 rounded-lg">
                                                <div className="flex items-center gap-1.5 mb-2">
                                                  <Sparkles className="h-3 w-3 text-emerald-600" />
                                                  <p className="text-[10px] font-semibold text-emerald-700">AI Prompt Writer - Extract Information</p>
                                                </div>
                                                <p className="text-[9px] text-muted-foreground mb-2">Ask AI to extract any kind of information from this document</p>
                                                <div className="flex gap-2">
                                                  <input
                                                    type="text"
                                                    placeholder="e.g., Extract all financial figures, List contract terms, Find deadline dates..."
                                                    value={extractPrompt[doc.id] || ''}
                                                    onChange={(e) => {
                                                      e.stopPropagation();
                                                      setExtractPrompt(prev => ({ ...prev, [doc.id]: e.target.value }));
                                                    }}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') { e.stopPropagation(); handleAiExtract(doc.id); }
                                                    }}
                                                    className="flex-1 h-7 px-2 text-[11px] bg-white border border-emerald-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                                    onClick={(e) => e.stopPropagation()}
                                                  />
                                                  <Button
                                                    size="sm"
                                                    className="h-7 px-3 text-[10px] gradient-emerald text-white rounded-lg hover:opacity-90"
                                                    disabled={extractLoading.has(doc.id) || !extractPrompt[doc.id]?.trim()}
                                                    onClick={(e) => { e.stopPropagation(); handleAiExtract(doc.id); }}
                                                  >
                                                    {extractLoading.has(doc.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                                                    Extract
                                                  </Button>
                                                </div>
                                                {/* Quick prompt suggestions */}
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                  {[
                                                    'Extract key financial figures',
                                                    'List all deadlines and dates',
                                                    'Summarize main requirements',
                                                    'Extract contact information',
                                                    'Identify risks and compliance issues',
                                                  ].map(suggestion => (
                                                    <button
                                                      key={suggestion}
                                                      onClick={(e) => { e.stopPropagation(); setExtractPrompt(prev => ({ ...prev, [doc.id]: suggestion })); }}
                                                      className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/80 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                                    >
                                                      {suggestion}
                                                    </button>
                                                  ))}
                                                </div>
                                                {/* Extract results */}
                                                {extractResults[doc.id] && (
                                                  <div className="mt-3 p-3 bg-white/80 border border-emerald-200 rounded-lg">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                      <p className="text-[10px] font-semibold text-emerald-700">Extracted Information</p>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-4 px-1 text-[8px]"
                                                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(extractResults[doc.id]); toast.success('Copied to clipboard'); }}
                                                      >
                                                        <Copy className="h-2.5 w-2.5" />
                                                      </Button>
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto text-[11px] text-foreground/80 whitespace-pre-wrap leading-relaxed">
                                                      {extractResults[doc.id]}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div
                                    className="text-center py-6 bg-muted/20 rounded-xl border-2 border-dashed border-muted/30 cursor-pointer hover:border-sky-300 hover:bg-sky-50/20 transition-all"
                                    onClick={(e) => { e.stopPropagation(); setDocUploadBidId(bid.id); }}
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('border-sky-400', 'bg-sky-50/30'); }}
                                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('border-sky-400', 'bg-sky-50/30'); }}
                                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('border-sky-400', 'bg-sky-50/30'); handleDocDrop(bid.id, e.dataTransfer.files); }}
                                  >
                                    <CloudUpload className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                                    <p className="text-[11px] text-muted-foreground font-medium">Drop documents here or click to upload</p>
                                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">OCR & AI Review will run automatically</p>
                                  </div>
                                )}
                              </div>

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

                                {/* Sign Bid */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 transition-all"
                                  onClick={(e) => { e.stopPropagation(); setSelectedBidId(bid.id); setStampSelectorOpen(true); }}>
                                  <FileSignature className="h-3.5 w-3.5 mr-1.5" /> {bidSignatures[bid.id] ? 'Signed' : 'Sign Bid'}
                                </Button>

                                {/* View Tender */}
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

                                {/* Contractor: Withdraw */}
                                {user?.role === 'user' && bid.status === 'pending_review' && !bidIsDrafted && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl text-muted-foreground hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all"
                                    onClick={(e) => { e.stopPropagation(); handleStatusUpdate(bid.id, 'rejected'); }}>
                                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Withdraw
                                  </Button>
                                )}

                                {/* Mark as Draft - for pending_review bids with incomplete data (heuristic drafts) */}
                                {user?.role === 'user' && bid.status === 'pending_review' && bidIsDrafted && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl border-sky-200 text-sky-600 hover:bg-sky-50 hover:text-sky-700 transition-all"
                                    onClick={(e) => { e.stopPropagation(); handleMarkAsDraft(bid.id); }}>
                                    <PenLine className="h-3.5 w-3.5 mr-1.5" /> Save as Draft
                                  </Button>
                                )}

                                {/* Submit Draft - for drafted bids (proper database status) */}
                                {bid.status === 'drafted' && (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      className="gradient-emerald text-white rounded-xl hover:opacity-90 premium-shadow transition-all hover:-translate-y-0.5"
                                      onClick={(e) => { e.stopPropagation(); handleSubmitDraft(bid.id); }}>
                                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Submit Bid
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all"
                                      disabled={withdrawingBidId === bid.id}
                                      onClick={(e) => { e.stopPropagation(); handleWithdrawBid(bid.id); }}>
                                      {withdrawingBidId === bid.id ? (
                                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                      )}
                                      Withdraw Bid
                                    </Button>
                                  </div>
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
      ))}

      {/* See More / Load More bids */}
      {activeTab !== 'saved' && !loading && filteredBids.length > visibleCount && (
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

      {/* AI Review Detail Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-50">
                <Brain className="h-4 w-4 text-purple-600" />
              </div>
              AI Document Review
            </DialogTitle>
          </DialogHeader>
          {reviewDialogData ? (
            <div className="space-y-5 pt-2">
              {/* Score cards */}
              <div className="grid grid-cols-3 gap-3">
                {reviewDialogData.complianceScore !== undefined && (
                  <div className={`p-3 rounded-xl text-center ${getScoreBg(reviewDialogData.complianceScore)}`}>
                    <p className={`text-2xl font-bold ${getScoreColor(reviewDialogData.complianceScore)}`}>
                      {reviewDialogData.complianceScore}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Compliance</p>
                  </div>
                )}
                {reviewDialogData.completenessScore !== undefined && (
                  <div className={`p-3 rounded-xl text-center ${getScoreBg(reviewDialogData.completenessScore)}`}>
                    <p className={`text-2xl font-bold ${getScoreColor(reviewDialogData.completenessScore)}`}>
                      {reviewDialogData.completenessScore}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Completeness</p>
                  </div>
                )}
                {reviewDialogData.riskLevel && (
                  <div className="p-3 rounded-xl text-center bg-muted/30">
                    <Badge className={`${getRiskColor(reviewDialogData.riskLevel)} text-xs px-2 py-0.5`}>
                      {reviewDialogData.riskLevel.toUpperCase()}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1.5">Risk Level</p>
                  </div>
                )}
              </div>

              {/* Summary */}
              {reviewDialogData.summary && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Summary</h4>
                  <p className="text-sm text-foreground/80 bg-muted/30 p-3 rounded-lg">{reviewDialogData.summary}</p>
                </div>
              )}

              {/* Findings */}
              {reviewDialogData.findings && reviewDialogData.findings.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Findings</h4>
                  <div className="space-y-2">
                    {reviewDialogData.findings.map((f, i) => {
                      const isPositive = f.type === 'positive';
                      const isWarning = f.type === 'warning';
                      const icon = isPositive ? <ThumbsUp className="h-3.5 w-3.5" /> : isWarning ? <AlertTriangle className="h-3.5 w-3.5" /> : <ThumbsDown className="h-3.5 w-3.5" />;
                      const colorClass = isPositive ? 'text-emerald-600 bg-emerald-50' : isWarning ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50';
                      const borderClass = isPositive ? 'border-emerald-100' : isWarning ? 'border-amber-100' : 'border-rose-100';
                      return (
                        <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border ${borderClass}`}>
                          <div className={`p-1 rounded ${colorClass} flex-shrink-0 mt-0.5`}>{icon}</div>
                          <div className="min-w-0">
                            {f.title && <p className="text-xs font-medium">{f.title}</p>}
                            <p className="text-xs text-muted-foreground">{f.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {reviewDialogData.strengths && reviewDialogData.strengths.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3 text-emerald-600" /> Strengths
                  </h4>
                  <ul className="space-y-1">
                    {reviewDialogData.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-emerald-700 flex items-start gap-1.5">
                        <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" /> <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {reviewDialogData.weaknesses && reviewDialogData.weaknesses.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <ThumbsDown className="h-3 w-3 text-rose-600" /> Weaknesses
                  </h4>
                  <ul className="space-y-1">
                    {reviewDialogData.weaknesses.map((w, i) => (
                      <li key={i} className="text-xs text-rose-700 flex items-start gap-1.5">
                        <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" /> <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing Elements */}
              {reviewDialogData.missingElements && reviewDialogData.missingElements.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <AlertOctagon className="h-3 w-3 text-amber-600" /> Missing Elements
                  </h4>
                  <ul className="space-y-1">
                    {reviewDialogData.missingElements.map((m, i) => (
                      <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                        <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" /> <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {reviewDialogData.recommendations && reviewDialogData.recommendations.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-sky-600" /> Recommendations
                  </h4>
                  <ul className="space-y-1">
                    {reviewDialogData.recommendations.map((r, i) => (
                      <li key={i} className="text-xs text-sky-700 flex items-start gap-1.5">
                        <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" /> <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading review data...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
