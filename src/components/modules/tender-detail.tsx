'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api, Tender, Bid, BidAnalysis, BidAnalysisResult } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  ArrowLeft, MapPin, Calendar, DollarSign, Tag, FileText, Gavel, Clock, Users,
  ChevronDown, ChevronUp, Award, AlertCircle, CheckCircle, X, ArrowRight,
  Briefcase, TrendingUp, Timer, CircleDot, Eye, Building2,
  ListChecks, FileStack, CircleCheck, Target, Ban, GitCompareArrows,
  Sparkles, BarChart3, ShieldAlert, ShieldCheck, ShieldQuestion,
  TrendingDown, Loader2, BrainCircuit, AlertTriangle, Lightbulb,
  FileCheck, Wallet, Clock3, ClipboardCheck, Stamp, FileSignature, Languages, Upload,
  Download, FileDown, ExternalLink, Globe2, FileSpreadsheet, Copy,
} from 'lucide-react';
import { useStampSignature, StampSignatureSelector, type SavedSignature } from '@/components/stamp-signature';
import { InlineTranslator, TranslatorPanel } from '@/components/translator';

type DetailTab = 'overview' | 'bids' | 'documents' | 'ai-overview' | 'analysis';

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function parseBidAnalysis(analysis: BidAnalysis): BidAnalysisResult | null {
  try {
    return {
      summary: JSON.parse(analysis.summary || '{}'),
      applicants: JSON.parse(analysis.rankings || '[]'),
      budgetAnalysis: analysis.budgetAnalysis || '',
      riskSummary: analysis.riskSummary || '',
      finalRecommendation: analysis.recommendation || '',
    };
  } catch {
    return null;
  }
}

function ScoreBar({ score, label }: { score: number; label?: string }) {
  const colorClass = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 80 ? 'text-emerald-700' : score >= 60 ? 'text-amber-700' : 'text-red-700';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      {label && <span className="text-[10px] text-muted-foreground w-12 shrink-0">{label}</span>}
      <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
        <div
 className={`h-full rounded-full ${colorClass} transition-[width] duration-700`} style={{ width: `${Math.min(score, 100)}%` }}
 />
      </div>
      <span className={`text-xs font-semibold ${textColor} w-8 text-right`}>{score}</span>
    </div>
  );
}

function RiskBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const config = {
    low: { className: 'bg-emerald-100 text-emerald-700', icon: ShieldCheck },
    medium: { className: 'bg-amber-100 text-amber-700', icon: ShieldQuestion },
    high: { className: 'bg-red-100 text-red-700', icon: ShieldAlert },
  };
  const c = config[level];
  const Icon = c.icon;
  return (
    <Badge className={`text-[10px] px-2 py-0.5 border-0 rounded-lg ${c.className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </Badge>
  );
}

export function TenderDetailView({ tenderId, initialTab }: { tenderId?: string; initialTab?: DetailTab }) {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const [tender, setTender] = useState<Tender | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBid, setShowBid] = useState(false);
  const [createdBidId, setCreatedBidId] = useState<string | null>(null);
  const [bidDocFiles, setBidDocFiles] = useState<{
    technical: File | null;
    financial: File | null;
    timeline: File | null;
  }>({ technical: null, financial: null, timeline: null });
  const [uploadProgress, setUploadProgress] = useState<{
    technical: 'idle' | 'uploading' | 'done' | 'error';
    financial: 'idle' | 'uploading' | 'done' | 'error';
    timeline: 'idle' | 'uploading' | 'done' | 'error';
  }>({ technical: 'idle', financial: 'idle', timeline: 'idle' });
  const [submittingBid, setSubmittingBid] = useState(false);
  const [hasBid, setHasBid] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab && initialTab !== 'overview' ? initialTab : 'overview');
  const [stampSelectorOpen, setStampSelectorOpen] = useState(false);
  const [appliedStamps, setAppliedStamps] = useState<SavedSignature[]>([]);
  const stampSigHook = useStampSignature();

  // Bid Analysis state (for tender creators)
  const [analyses, setAnalyses] = useState<BidAnalysis[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysesLoading, setAnalysesLoading] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);

  // Requirements Analysis state (for applicants)
  const [reqAnalysis, setReqAnalysis] = useState<any>(null);
  const [reqAnalysisLoading, setReqAnalysisLoading] = useState(false);

  // AI Overview state (for all users)
  const [aiOverview, setAiOverview] = useState<any>(null);
  const [aiOverviewLoading, setAiOverviewLoading] = useState(false);

  // Source document state (download from original site)
  const [sourceContent, setSourceContent] = useState<any>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceExportingPdf, setSourceExportingPdf] = useState(false);
  const [sourceExportingCsv, setSourceExportingCsv] = useState(false);
  const [sourceExpanded, setSourceExpanded] = useState(false);

  // Extract external URL: first check direct externalUrl field, then parse from requiredDocs
  const externalSourceUrl = useMemo(() => {
    // Direct field from imported tender
    if (tender?.externalUrl) return tender.externalUrl;
    // Legacy: parse from requiredDocs (format: "Source: ... | External ID: ... | URL: https://...")
    if (!tender?.requiredDocs) return null;
    const urlMatch = tender.requiredDocs.match(/URL:\s*(https?:\/\/[^\s|]+)/i);
    if (urlMatch) return urlMatch[1];
    // Also check if requiredDocs itself is a URL
    if (tender.requiredDocs.startsWith('http')) return tender.requiredDocs;
    return null;
  }, [tender?.requiredDocs, tender?.externalUrl]);

  // Extract the external source name
  const externalSourceName = useMemo(() => {
    if (tender?.externalSource) return tender.externalSource;
    if (!tender?.requiredDocs) return 'source site';
    const sourceMatch = tender.requiredDocs.match(/Source:\s*([^|]+)/i);
    if (sourceMatch) return sourceMatch[1].trim();
    return 'source site';
  }, [tender?.requiredDocs, tender?.externalSource]);

  const isAdminOrCreator = user?.role === 'team_admin' && tender?.createdBy === user.id;
  const isCreatorOrAdmin = tender?.createdBy === user?.id || (user?.role === 'team_admin' && tender?.createdBy === user.id);
  const isApplicant = !isCreatorOrAdmin;

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

  const loadAnalyses = useCallback(async () => {
    if (!tenderId) return;
    setAnalysesLoading(true);
    const res = await api.get('/bid-analysis', { tenderId });
    if (res.success) {
      setAnalyses(res.data);
      // Auto-select the latest analysis
      if (res.data.length > 0 && !selectedAnalysisId) {
        setSelectedAnalysisId(res.data[0].id);
      }
    }
    setAnalysesLoading(false);
  }, [tenderId, selectedAnalysisId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (tenderId) void loadTender();
  }, [tenderId, loadTender]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (tenderId && activeTab === 'analysis') void loadAnalyses();
  }, [tenderId, activeTab, loadAnalyses]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleRunAnalysis = async () => {
    if (!tenderId) return;
    setAnalysisLoading(true);
    try {
      const res = await api.post('/bid-analysis', { tenderId });
      if (res.success) {
        toast.success('AI analysis completed successfully!');
        const analysesRes = await api.get('/bid-analysis', { tenderId });
        if (analysesRes.success) {
          setAnalyses(analysesRes.data);
          if (analysesRes.data.length > 0) {
            setSelectedAnalysisId(analysesRes.data[0].id);
          }
        }
      } else {
        toast.error(res.error || 'Failed to run analysis');
      }
    } catch {
      toast.error('Failed to run AI analysis. Please try again.');
    }
    setAnalysisLoading(false);
  };

  const handleAnalyzeRequirements = async () => {
    if (!tenderId) return;
    setReqAnalysisLoading(true);
    try {
      const res = await api.post('/ai/analyze-requirements', {
        tenderId,
        userName: user?.profile?.fullName || '',
        userSkills: user?.profile?.skillTags || '',
      });
      if (res.success) {
        setReqAnalysis(res.data);
        toast.success('Requirements analyzed!');
      } else {
        toast.error(res.error || 'Failed to analyze requirements');
      }
    } catch {
      toast.error('Failed to analyze requirements. Please try again.');
    }
    setReqAnalysisLoading(false);
  };

  // Export requirements as PDF
  const [exportingPdf, setExportingPdf] = useState(false);
  const handleExportPdf = async () => {
    if (!tenderId) return;
    setExportingPdf(true);
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch(`/api/tenders/${tenderId}/export-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        // Try to get error message from JSON response
        try {
          const errData = await res.json();
          throw new Error(errData.error || 'Export failed');
        } catch {
          throw new Error('Export failed');
        }
      }
      const blob = await res.blob();
      if (blob.size < 100) throw new Error('Generated PDF is empty');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tender_${tender?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Requirements'}_Export.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('PDF exported successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export PDF. Please try again.');
    }
    setExportingPdf(false);
  };

  // Fetch original requirements from source site
  const handleFetchSourceContent = async () => {
    if (!externalSourceUrl) return;
    setSourceLoading(true);
    try {
      const res = await api.post('/tenders/fetch-doc', { url: externalSourceUrl });
      if (res.success && res.data) {
        setSourceContent(res.data);
        setSourceExpanded(true);
        toast.success('Original requirements fetched from source!');
      } else {
        toast.error(res.error || 'Failed to fetch from source site');
      }
    } catch {
      toast.error('Failed to fetch from source site. Please try again.');
    }
    setSourceLoading(false);
  };

  // Export source content as PDF
  const handleExportSourcePdf = async () => {
    if (!externalSourceUrl) return;
    setSourceExportingPdf(true);
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch('/api/tenders/fetch-doc/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: externalSourceUrl, title: tender?.title }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Original_${tender?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Requirements'}_Source.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Original requirements PDF exported!');
    } catch {
      toast.error('Failed to export PDF from source. Please try again.');
    }
    setSourceExportingPdf(false);
  };

  // Export source content as CSV
  const handleExportSourceCsv = async () => {
    if (!externalSourceUrl) return;
    setSourceExportingCsv(true);
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch('/api/tenders/fetch-doc/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: externalSourceUrl, title: tender?.title }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Original_${tender?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Requirements'}_Source.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Original requirements CSV exported!');
    } catch {
      toast.error('Failed to export CSV from source. Please try again.');
    }
    setSourceExportingCsv(false);
  };

  // Download requirements data as JSON
  const [downloadingReq, setDownloadingReq] = useState(false);
  const handleDownloadRequirements = async () => {
    if (!tenderId) return;
    setDownloadingReq(true);
    try {
      const res = await api.get(`/tenders/${tenderId}/requirements`);
      if (res.success) {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Tender_${tender?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Requirements'}_Data.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Requirements data downloaded!');
      } else {
        toast.error(res.error || 'Failed to download requirements');
      }
    } catch {
      toast.error('Failed to download requirements. Please try again.');
    }
    setDownloadingReq(false);
  };

  const handleGetAIOverview = async () => {
    if (!tenderId) return;
    setAiOverviewLoading(true);
    try {
      const res = await api.get(`/tenders/${tenderId}/overview-ai`);
      if (res.success) {
        setAiOverview(res.data);
        toast.success('AI Overview generated!');
      } else {
        toast.error(res.error || 'Failed to generate AI overview');
      }
    } catch {
      toast.error('Failed to generate AI overview. Please try again.');
    }
    setAiOverviewLoading(false);
  };

  const handleSubmitBid = useCallback(async () => {
    if (!tender) return;
    setSubmittingBid(true);
    try {
      // Create the bid record with placeholder values (real content will be in uploaded documents)
      const res = await api.post('/bids', {
        tenderId: tender.id,
        technicalProposal: '',
        financialProposal: 0,
        timeline: '',
      });
      if (!res.success) {
        toast.error(res.error || 'Failed to submit bid');
        setSubmittingBid(false);
        return;
      }
      // Bid created - now show the upload area
      setCreatedBidId(res.data.id);
      setSubmittingBid(false);
      toast.success('Bid record created! Now upload your documents.');
    } catch {
      toast.error('Failed to submit bid');
      setSubmittingBid(false);
    }
  }, [tender]);

  const handleUploadDoc = useCallback(async (
    file: File,
    docType: string,
    key: 'technical' | 'financial' | 'timeline'
  ) => {
    if (!createdBidId) return;
    setUploadProgress(prev => ({ ...prev, [key]: 'uploading' }));
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);
    formData.append('autoOcr', 'true');
    formData.append('autoReview', 'true');
    try {
      const uploadRes = await api.upload(`/bids/${createdBidId}/documents`, formData);
      if (uploadRes.success) {
        setUploadProgress(prev => ({ ...prev, [key]: 'done' }));
        toast.success(`${docType === 'technical_proposal' ? 'Technical Proposal' : docType === 'financial_proposal' ? 'Financial Proposal' : 'Timeline Document'} uploaded!`);
      } else {
        setUploadProgress(prev => ({ ...prev, [key]: 'error' }));
        toast.error(uploadRes.error || 'Upload failed');
      }
    } catch {
      setUploadProgress(prev => ({ ...prev, [key]: 'error' }));
      toast.error('Upload failed - please try again');
    }
  }, [createdBidId]);

  const allUploadsDone = uploadProgress.technical === 'done' && uploadProgress.financial === 'done' && uploadProgress.timeline === 'done';

  const handleCloseBidDialog = useCallback(() => {
    if (createdBidId) {
      // Bid was already created - mark as submitted
      setHasBid(true);
    }
    setShowBid(false);
    setCreatedBidId(null);
    setBidDocFiles({ technical: null, financial: null, timeline: null });
    setUploadProgress({ technical: 'idle', financial: 'idle', timeline: 'idle' });
    loadTender();
  }, [createdBidId, loadTender]);

  const handleStatusChange = async (status: string) => {
    const res = await api.patch(`/tenders/${tenderId}/status`, { status });
    if (res.success) {
      toast.success(`Tender status updated to ${status}`);
      loadTender();
    } else {
      toast.error(res.error || 'Failed to update status');
    }
  };

  const bidStats = useMemo(() => ({
    pending: bids.filter(b => b.status === 'pending_review').length,
    shortlisted: bids.filter(b => b.status === 'shortlisted').length,
    awarded: bids.filter(b => b.status === 'awarded').length,
    rejected: bids.filter(b => b.status === 'rejected').length,
    total: bids.length,
  }), [bids]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'open': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
      case 'closed': return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
      case 'awarded': return 'bg-teal-100 text-teal-700 hover:bg-teal-100';
      case 'cancelled': return 'bg-muted text-muted-foreground hover:bg-muted';
      default: return 'bg-muted text-muted-foreground hover:bg-muted';
    }
  };

  const statusDot = (status: string) => {
    switch (status) {
      case 'open': return 'bg-emerald-500';
      case 'closed': return 'bg-rose-500';
      case 'awarded': return 'bg-teal-500';
      case 'cancelled': return 'bg-muted-foreground/50';
      default: return 'bg-muted-foreground/50';
    }
  };

  const statusAccent = (status: string) => {
    switch (status) {
      case 'open': return 'from-emerald-400 to-emerald-600';
      case 'closed': return 'from-rose-400 to-rose-600';
      case 'awarded': return 'from-teal-400 to-teal-600';
      case 'cancelled': return 'from-muted to-muted-foreground/50';
      default: return 'from-muted to-muted-foreground/50';
    }
  };

  // Get the selected analysis data
  const selectedAnalysis = useMemo(() => {
    if (!selectedAnalysisId) return null;
    return analyses.find(a => a.id === selectedAnalysisId) || null;
  }, [selectedAnalysisId, analyses]);

  const parsedAnalysis = useMemo(() => {
    if (!selectedAnalysis) return null;
    return parseBidAnalysis(selectedAnalysis);
  }, [selectedAnalysis]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto view-enter">
        <div className="h-8 bg-muted/50 rounded-xl w-1/3 animate-pulse" />
        <div className="h-1.5 bg-muted/30 rounded-xl animate-pulse" />
        <div className="h-40 bg-muted/50 rounded-xl animate-pulse premium-shadow" />
        <div className="h-20 bg-muted/50 rounded-xl animate-pulse premium-shadow" />
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="p-6 text-center view-enter">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-2xl gradient-rose opacity-20" />
          <div className="absolute inset-2 rounded-xl gradient-rose flex items-center justify-center">
            <FileText className="h-8 w-8 text-white" />
          </div>
        </div>
        <h3 className="text-lg font-semibold">Tender not found</h3>
        <p className="text-muted-foreground text-sm mt-2">The tender you&apos;re looking for doesn&apos;t exist or has been removed</p>
        <Button variant="outline" onClick={() => setView('tenders')} className="mt-4 rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tenders
        </Button>
      </div>
    );
  }

  const isOpen = tender.status === 'open';
  const deadlinePassed = new Date(tender.deadline) < new Date();
  const canBid = user?.role === 'user' && isOpen && !deadlinePassed && !hasBid;
  const days = daysUntil(tender.deadline);

  const tabs: { key: DetailTab; label: string; icon: typeof ListChecks; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: ListChecks },
    { key: 'bids', label: 'Bids', icon: Gavel, count: bids.length },
    { key: 'documents', label: 'Documents', icon: FileStack },
    { key: 'ai-overview', label: 'AI Overview', icon: Sparkles },
    ...(isCreatorOrAdmin ? [{ key: 'analysis' as DetailTab, label: 'Analysis', icon: BrainCircuit, count: analyses.length || undefined }] : []),
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto view-enter">
      {/* Back Button */}
      <div className="animate-[fadeIn_0.3s_ease-out]">
        <Button variant="ghost" onClick={() => setView('tenders')}
          className="hover:text-emerald-700 hover:bg-primary/10 transition-colors rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tenders
        </Button>
      </div>

      {/* Hero Section */}
      <div className="animate-[fadeIn_0.3s_ease-out]"
 >
        <Card className="premium-shadow-lg rounded-xl border-0 bg-card overflow-hidden">
          {/* Accent strip */}
          <div className={`h-2 bg-gradient-to-r ${statusAccent(tender.status)}`} />

          <CardContent className="p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                    tender.status === 'open' ? 'gradient-emerald' :
                    tender.status === 'awarded' ? 'gradient-teal' :
                    tender.status === 'cancelled' ? 'bg-muted' :
                    'gradient-rose'
                  }`}>
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold tracking-tight">{tender.title}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${statusDot(tender.status)}`} />
                        <Badge className={`text-xs px-2.5 py-0.5 border-0 rounded-lg ${statusBadge(tender.status)}`}>
                          {tender.status}
                        </Badge>
                      </div>
                      {tender.categoryTags.split(',').filter(Boolean).map(tag => (
                        <Badge key={tag} className="text-[10px] bg-emerald-50 text-emerald-700 border-0 rounded-lg hover:bg-primary/10">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-emerald-50/60 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-[10px] text-emerald-600 font-medium">Budget</span>
                    </div>
                    <p className="text-sm font-bold text-emerald-700">ETB {tender.budgetMin.toLocaleString()} – {tender.budgetMax.toLocaleString()}</p>
                  </div>
                  <div className="bg-amber-50/60 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Timer className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-[10px] text-amber-600 font-medium">Deadline</span>
                    </div>
                    <p className="text-sm font-bold text-amber-700">{new Date(tender.deadline).toLocaleDateString()}</p>
                    <p className={`text-[10px] font-medium mt-0.5 ${days <= 0 ? 'text-rose-600' : days <= 3 ? 'text-rose-600' : days <= 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {days <= 0 ? 'Expired' : days === 1 ? '1 day left' : `${days} days left`}
                    </p>
                  </div>
                  <div className="bg-teal-50/60 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-teal-600" />
                      <span className="text-[10px] text-teal-600 font-medium">Location</span>
                    </div>
                    <p className="text-sm font-bold text-teal-700">{tender.location}</p>
                  </div>
                  <div className="bg-purple-50/60 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Users className="h-3.5 w-3.5 text-purple-600" />
                      <span className="text-[10px] text-purple-600 font-medium">Bids</span>
                    </div>
                    <p className="text-sm font-bold text-purple-700">{tender._count?.bids || 0} received</p>
                  </div>
                </div>

                {/* Requirements - always visible while viewing the tender */}
                <div className="rounded-xl border border-teal-200/60 dark:border-teal-900/40 bg-teal-50/50 dark:bg-teal-950/20 p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/50">
                        <ListChecks className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">Tender Requirements</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {tender.requiredDocs && (
                        <span className="text-[10px] font-medium text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/50 px-2 py-0.5 rounded-full">
                          {tender.requiredDocs.split(',').filter(Boolean).length} doc{tender.requiredDocs.split(',').filter(Boolean).length === 1 ? '' : 's'}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-teal-600 hover:text-teal-800 hover:bg-teal-100"
                        onClick={handleDownloadRequirements}
                        disabled={downloadingReq}
                        title="Download requirements data"
                      >
                        {downloadingReq ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-teal-600 hover:text-teal-800 hover:bg-teal-100"
                        onClick={handleExportPdf}
                        disabled={exportingPdf}
                        title="Export as PDF"
                      >
                        {exportingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  {tender.requiredDocs ? (
                    <div className="flex flex-wrap gap-1.5">
                      {tender.requiredDocs.split(',').filter(Boolean).map((doc, idx) => (
                        <span key={`${doc}-${idx}`} className="inline-flex items-center gap-1 text-xs font-medium bg-background dark:bg-card border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 rounded-lg px-2.5 py-1">
                          <FileStack className="h-3 w-3 shrink-0" />
                          {doc.trim()}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No specific documents listed - contact the tender owner for eligibility details.</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1.5 border-t border-teal-200/50 dark:border-teal-900/30">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <CircleDot className="h-3 w-3 text-teal-500" /> Eligibility verified at bid submission
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-amber-500" /> Late or incomplete submissions are rejected
                    </span>
                  </div>
                </div>

                {/* Download Original from Source */}
                {externalSourceUrl && (
                  <div className="rounded-xl border border-sky-200/60 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/50">
                          <Globe2 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-foreground">Original from {externalSourceName}</span>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[280px] sm:max-w-md">
                            {(() => { try { return new URL(externalSourceUrl).hostname; } catch { return externalSourceUrl; } })()}
                          </p>
                        </div>
                      </div>
                      <a
                        href={externalSourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md text-sky-600 hover:text-sky-800 hover:bg-sky-100 transition-colors"
                        title="Open source site"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs border-sky-200 text-sky-700 hover:bg-sky-50 hover:text-sky-800 transition-all"
                        onClick={handleFetchSourceContent}
                        disabled={sourceLoading}
                      >
                        {sourceLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Globe2 className="h-3.5 w-3.5 mr-1.5" />}
                        {sourceContent ? 'Refresh from Source' : 'Fetch from Source'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 transition-all"
                        onClick={handleExportSourcePdf}
                        disabled={sourceExportingPdf}
                      >
                        {sourceExportingPdf ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5 mr-1.5" />}
                        Export PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 transition-all"
                        onClick={handleExportSourceCsv}
                        disabled={sourceExportingCsv}
                      >
                        {sourceExportingCsv ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />}
                        Export CSV
                      </Button>
                    </div>

                    {/* Fetched content preview */}
                    {sourceContent && sourceExpanded && (
                      <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-sky-700 dark:text-sky-300 uppercase tracking-wider">Fetched Content</span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                navigator.clipboard.writeText(sourceContent.content || '');
                                toast.success('Content copied to clipboard!');
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1" /> Copy
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                              onClick={() => setSourceExpanded(false)}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {sourceContent.title && (
                          <p className="text-sm font-semibold text-foreground">{sourceContent.title}</p>
                        )}

                        {sourceContent.deadlines && sourceContent.deadlines.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {sourceContent.deadlines.map((d: string, i: number) => (
                              <Badge key={i} className="text-[10px] bg-amber-50 text-amber-700 border-0 rounded-lg">
                                <Clock className="h-3 w-3 mr-1" /> {d}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {sourceContent.budgets && sourceContent.budgets.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {sourceContent.budgets.map((b: string, i: number) => (
                              <Badge key={i} className="text-[10px] bg-emerald-50 text-emerald-700 border-0 rounded-lg">
                                <DollarSign className="h-3 w-3 mr-1" /> {b}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {sourceContent.sections && sourceContent.sections.length > 0 && (
                          <div className="space-y-2">
                            {sourceContent.sections.map((section: { heading: string; content: string }, i: number) => (
                              <div key={i} className="bg-background dark:bg-card rounded-lg p-3 border border-border/50">
                                <p className="text-xs font-semibold text-foreground mb-1">{section.heading}</p>
                                <p className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed line-clamp-6">{section.content}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="bg-background dark:bg-card rounded-lg p-3 border border-border/50 max-h-80 overflow-y-auto">
                          <p className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed">{sourceContent.content?.slice(0, 5000)}</p>
                          {sourceContent.content?.length > 5000 && (
                            <p className="text-[10px] text-sky-600 mt-2 italic">Content truncated. Export as PDF or CSV for the full document.</p>
                          )}
                        </div>

                        <p className="text-[10px] text-muted-foreground italic">
                          Fetched at {new Date(sourceContent.fetchedAt).toLocaleString()} from {(() => { try { return new URL(externalSourceUrl).hostname; } catch { return externalSourceUrl; } })()}
                        </p>
                      </div>
                    )}

                    {/* Collapsed indicator */}
                    {sourceContent && !sourceExpanded && (
                      <button
                        className="text-[10px] text-sky-600 hover:text-sky-800 flex items-center gap-1 transition-colors"
                        onClick={() => setSourceExpanded(true)}
                      >
                        <ChevronDown className="h-3 w-3" /> Show fetched content
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0 lg:flex-col lg:items-stretch">
                {canBid && (
                  <Dialog open={showBid} onOpenChange={(open) => {
                    if (!open) {
                      handleCloseBidDialog();
                    } else {
                      setShowBid(true);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button className="gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5 w-full">
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
                        {!createdBidId ? (
                          /* ── Step 1: Create bid record ── */
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                              <div className="p-2 rounded-xl gradient-emerald flex-shrink-0">
                                <Gavel className="h-5 w-5 text-white" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-foreground">Create your bid submission</p>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                  Click the button below to create your bid record. After that, you&apos;ll be able to upload your Technical Proposal, Financial Proposal, and Timeline documents.
                                </p>
                              </div>
                            </div>

                            {/* Document requirements preview */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Required Documents</p>
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 p-2.5 bg-emerald-50/40 dark:bg-emerald-950/10 rounded-lg">
                                  <div className="p-1 rounded bg-emerald-100 dark:bg-emerald-900/50"><Briefcase className="h-3 w-3 text-emerald-600" /></div>
                                  <span className="text-xs font-medium text-foreground">Technical Proposal</span>
                                  <span className="text-[9px] text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full ml-auto">Required</span>
                                </div>
                                <div className="flex items-center gap-2 p-2.5 bg-amber-50/40 dark:bg-amber-950/10 rounded-lg">
                                  <div className="p-1 rounded bg-amber-100 dark:bg-amber-900/50"><DollarSign className="h-3 w-3 text-amber-600" /></div>
                                  <span className="text-xs font-medium text-foreground">Financial Proposal</span>
                                  <span className="text-[9px] text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full ml-auto">Required</span>
                                </div>
                                <div className="flex items-center gap-2 p-2.5 bg-sky-50/40 dark:bg-sky-950/10 rounded-lg">
                                  <div className="p-1 rounded bg-sky-100 dark:bg-sky-900/50"><Calendar className="h-3 w-3 text-sky-600" /></div>
                                  <span className="text-xs font-medium text-foreground">Timeline / Schedule</span>
                                  <span className="text-[9px] text-sky-600 bg-sky-100 dark:bg-sky-900/30 px-1.5 py-0.5 rounded-full ml-auto">Required</span>
                                </div>
                              </div>
                            </div>

                            {/* Info Notice */}
                            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
                              <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <div className="text-[11px] text-muted-foreground leading-relaxed">
                                Uploaded documents will be automatically processed via <strong>OCR</strong> for text extraction and <strong>AI Review</strong> for compliance analysis. Results appear in the Documents tab after processing.
                              </div>
                            </div>

                            <Button className="w-full gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5"
                              onClick={handleSubmitBid}
                              disabled={submittingBid}>
                              {submittingBid ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Gavel className="h-4 w-4 mr-2" />}
                              {submittingBid ? 'Creating Bid...' : 'Submit Bid'}
                            </Button>
                          </div>
                        ) : (
                          /* ── Step 2: Upload documents ── */
                          <div className="space-y-4">
                            {/* Success banner */}
                            <div className="flex items-center gap-3 p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                              <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Bid record created!</p>
                                <p className="text-[11px] text-muted-foreground">Now upload your documents to complete the submission.</p>
                              </div>
                            </div>

                            {/* Technical Proposal Upload */}
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium flex items-center gap-1.5">
                                <div className="p-1 rounded bg-emerald-50"><Briefcase className="h-3 w-3 text-emerald-600" /></div>
                                Upload Technical Proposal *
                              </Label>
                              {uploadProgress.technical === 'done' ? (
                                <div className="flex items-center gap-2 p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                  <CircleCheck className="h-4 w-4 text-emerald-600" />
                                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{bidDocFiles.technical?.name}</span>
                                  <Badge className="text-[9px] bg-emerald-100 text-emerald-600 border-0 rounded-full px-1.5 py-0 ml-auto">Uploaded</Badge>
                                </div>
                              ) : uploadProgress.technical === 'uploading' ? (
                                <div className="flex items-center gap-2 p-3 bg-emerald-50/30 rounded-xl border border-emerald-200/50">
                                  <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
                                  <span className="text-xs text-emerald-700">Uploading {bidDocFiles.technical?.name}...</span>
                                </div>
                              ) : uploadProgress.technical === 'error' ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2 p-3 bg-rose-50/30 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-800">
                                    <AlertCircle className="h-4 w-4 text-rose-500" />
                                    <span className="text-xs text-rose-600">Upload failed - please try again</span>
                                  </div>
                                  <label className="cursor-pointer block">
                                    <Button variant="outline" size="sm" className="w-full rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs" asChild>
                                      <span><Upload className="h-3 w-3 mr-1.5" /> Retry Upload</span>
                                    </Button>
                                    <input type="file" accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png" className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return; }
                                          setBidDocFiles(prev => ({ ...prev, technical: file }));
                                          handleUploadDoc(file, 'technical_proposal', 'technical');
                                        }
                                      }} />
                                  </label>
                                </div>
                              ) : (
                                <label className="cursor-pointer block">
                                  <div className="p-4 border-2 border-dashed rounded-xl text-center transition-all border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/20">
                                    <Upload className="h-5 w-5 text-emerald-400 mx-auto mb-1.5" />
                                    <p className="text-xs font-medium text-emerald-700">Upload Technical Proposal</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">PDF, DOCX, DOC, TXT, JPG, PNG (max 10MB)</p>
                                  </div>
                                  <input type="file" accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png" className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return; }
                                        setBidDocFiles(prev => ({ ...prev, technical: file }));
                                        handleUploadDoc(file, 'technical_proposal', 'technical');
                                      }
                                    }} />
                                </label>
                              )}
                            </div>

                            {/* Financial Proposal Upload */}
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium flex items-center gap-1.5">
                                <div className="p-1 rounded bg-amber-50"><DollarSign className="h-3 w-3 text-amber-600" /></div>
                                Upload Financial Proposal *
                              </Label>
                              {uploadProgress.financial === 'done' ? (
                                <div className="flex items-center gap-2 p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                  <CircleCheck className="h-4 w-4 text-amber-600" />
                                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{bidDocFiles.financial?.name}</span>
                                  <Badge className="text-[9px] bg-amber-100 text-amber-600 border-0 rounded-full px-1.5 py-0 ml-auto">Uploaded</Badge>
                                </div>
                              ) : uploadProgress.financial === 'uploading' ? (
                                <div className="flex items-center gap-2 p-3 bg-amber-50/30 rounded-xl border border-amber-200/50">
                                  <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                                  <span className="text-xs text-amber-700">Uploading {bidDocFiles.financial?.name}...</span>
                                </div>
                              ) : uploadProgress.financial === 'error' ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2 p-3 bg-rose-50/30 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-800">
                                    <AlertCircle className="h-4 w-4 text-rose-500" />
                                    <span className="text-xs text-rose-600">Upload failed - please try again</span>
                                  </div>
                                  <label className="cursor-pointer block">
                                    <Button variant="outline" size="sm" className="w-full rounded-lg border-amber-200 text-amber-700 hover:bg-amber-50 text-xs" asChild>
                                      <span><Upload className="h-3 w-3 mr-1.5" /> Retry Upload</span>
                                    </Button>
                                    <input type="file" accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png" className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return; }
                                          setBidDocFiles(prev => ({ ...prev, financial: file }));
                                          handleUploadDoc(file, 'financial_proposal', 'financial');
                                        }
                                      }} />
                                  </label>
                                </div>
                              ) : (
                                <label className="cursor-pointer block">
                                  <div className="p-4 border-2 border-dashed rounded-xl text-center transition-all border-amber-200 hover:border-amber-300 hover:bg-amber-50/20">
                                    <Upload className="h-5 w-5 text-amber-400 mx-auto mb-1.5" />
                                    <p className="text-xs font-medium text-amber-700">Upload Financial Proposal</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">PDF, DOCX, DOC, TXT, JPG, PNG (max 10MB)</p>
                                  </div>
                                  <input type="file" accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png" className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return; }
                                        setBidDocFiles(prev => ({ ...prev, financial: file }));
                                        handleUploadDoc(file, 'financial_proposal', 'financial');
                                      }
                                    }} />
                                </label>
                              )}
                            </div>

                            {/* Timeline Document Upload */}
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium flex items-center gap-1.5">
                                <div className="p-1 rounded bg-sky-50"><Calendar className="h-3 w-3 text-sky-600" /></div>
                                Upload Timeline / Schedule *
                              </Label>
                              {uploadProgress.timeline === 'done' ? (
                                <div className="flex items-center gap-2 p-3 bg-sky-50/60 dark:bg-sky-950/20 rounded-xl border border-sky-200 dark:border-sky-800">
                                  <CircleCheck className="h-4 w-4 text-sky-600" />
                                  <span className="text-xs font-medium text-sky-700 dark:text-sky-400">{bidDocFiles.timeline?.name}</span>
                                  <Badge className="text-[9px] bg-sky-100 text-sky-600 border-0 rounded-full px-1.5 py-0 ml-auto">Uploaded</Badge>
                                </div>
                              ) : uploadProgress.timeline === 'uploading' ? (
                                <div className="flex items-center gap-2 p-3 bg-sky-50/30 rounded-xl border border-sky-200/50">
                                  <Loader2 className="h-4 w-4 text-sky-600 animate-spin" />
                                  <span className="text-xs text-sky-700">Uploading {bidDocFiles.timeline?.name}...</span>
                                </div>
                              ) : uploadProgress.timeline === 'error' ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2 p-3 bg-rose-50/30 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-800">
                                    <AlertCircle className="h-4 w-4 text-rose-500" />
                                    <span className="text-xs text-rose-600">Upload failed - please try again</span>
                                  </div>
                                  <label className="cursor-pointer block">
                                    <Button variant="outline" size="sm" className="w-full rounded-lg border-sky-200 text-sky-700 hover:bg-sky-50 text-xs" asChild>
                                      <span><Upload className="h-3 w-3 mr-1.5" /> Retry Upload</span>
                                    </Button>
                                    <input type="file" accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png" className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return; }
                                          setBidDocFiles(prev => ({ ...prev, timeline: file }));
                                          handleUploadDoc(file, 'timeline_doc', 'timeline');
                                        }
                                      }} />
                                  </label>
                                </div>
                              ) : (
                                <label className="cursor-pointer block">
                                  <div className="p-4 border-2 border-dashed rounded-xl text-center transition-all border-sky-200 hover:border-sky-300 hover:bg-sky-50/20">
                                    <Upload className="h-5 w-5 text-sky-400 mx-auto mb-1.5" />
                                    <p className="text-xs font-medium text-sky-700">Upload Timeline / Schedule</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">PDF, DOCX, DOC, TXT, JPG, PNG (max 10MB)</p>
                                  </div>
                                  <input type="file" accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png" className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return; }
                                        setBidDocFiles(prev => ({ ...prev, timeline: file }));
                                        handleUploadDoc(file, 'timeline_doc', 'timeline');
                                      }
                                    }} />
                                </label>
                              )}
                            </div>

                            {/* Progress Summary */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground">Upload Progress</p>
                              <div className="flex gap-2">
                                <div className={`flex-1 h-1.5 rounded-full transition-all ${
                                  uploadProgress.technical === 'done' ? 'bg-emerald-500' :
                                  uploadProgress.technical === 'uploading' ? 'bg-emerald-300 animate-pulse' :
                                  uploadProgress.technical === 'error' ? 'bg-rose-400' : 'bg-muted'
                                }`} />
                                <div className={`flex-1 h-1.5 rounded-full transition-all ${
                                  uploadProgress.financial === 'done' ? 'bg-amber-500' :
                                  uploadProgress.financial === 'uploading' ? 'bg-amber-300 animate-pulse' :
                                  uploadProgress.financial === 'error' ? 'bg-rose-400' : 'bg-muted'
                                }`} />
                                <div className={`flex-1 h-1.5 rounded-full transition-all ${
                                  uploadProgress.timeline === 'done' ? 'bg-sky-500' :
                                  uploadProgress.timeline === 'uploading' ? 'bg-sky-300 animate-pulse' :
                                  uploadProgress.timeline === 'error' ? 'bg-rose-400' : 'bg-muted'
                                }`} />
                              </div>
                            </div>

                            {/* Completion actions */}
                            {allUploadsDone ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                                  <div>
                                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">All documents uploaded!</p>
                                    <p className="text-[11px] text-muted-foreground">Your bid is complete. Documents are being processed via OCR & AI Review.</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button className="flex-1 gradient-emerald hover:opacity-90 text-white rounded-xl"
                                    onClick={handleCloseBidDialog}>
                                    <CheckCircle className="h-4 w-4 mr-2" /> Done
                                  </Button>
                                  <Button variant="outline" className="flex-1 rounded-xl"
                                    onClick={() => { handleCloseBidDialog(); setView('bids'); }}>
                                    <ArrowRight className="h-4 w-4 mr-2" /> Go to Bids
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <Button variant="ghost" size="sm" className="text-muted-foreground text-xs rounded-lg"
                                  onClick={handleCloseBidDialog}>
                                  Upload later
                                </Button>
                                <Button variant="outline" size="sm" className="rounded-lg text-xs"
                                  onClick={() => { handleCloseBidDialog(); setView('bids'); }}>
                                  <ArrowRight className="h-3 w-3 mr-1" /> Go to Bids
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                {hasBid && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 rounded-lg hover:bg-emerald-100 py-1.5 px-3 text-sm">
                    <CheckCircle className="h-4 w-4 mr-1.5" /> Bid Submitted
                  </Badge>
                )}
                <Button
                  variant="outline"
                  className="rounded-xl border-orange-200 dark:border-orange-800/40 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all"
                  onClick={() => setActiveTab('ai-overview')}
                >
                  <Sparkles className="h-4 w-4 mr-2" /> Review with AI
                </Button>
                {(user?.role === 'team_admin' && tender.createdBy === user.id) && (
                  <div className="flex lg:flex-col gap-2">
                    {tender.status === 'open' && (
                      <Button variant="outline" size="sm" onClick={() => handleStatusChange('closed')}
                        className="rounded-xl text-xs">
                        <Ban className="h-3.5 w-3.5 mr-1.5" /> Close Tender
                      </Button>
                    )}
                    {tender.status === 'closed' && (
                      <Button variant="outline" size="sm" onClick={() => handleStatusChange('open')}
                        className="rounded-xl text-xs">
                        <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Reopen
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange('cancelled')}
                      className="rounded-xl text-xs border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                      <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="animate-[fadeIn_0.3s_ease-out]"
 >
        <Card className="premium-shadow rounded-xl border-0 bg-card">
          <CardContent className="p-1.5">
            <div className="flex gap-1 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'gradient-emerald text-white premium-shadow'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}>
                  <tab.icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0 rounded-full ${
                      activeTab === tab.key
                        ? 'bg-white/20 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
          <div
 key="overview"
 className="space-y-6 animate-[fadeIn_0.3s_ease-out]"
 >
            {/* Scope of Work */}
            <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
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
                <InlineTranslator text={tender.scope} className="mt-3" />
              </CardContent>
            </Card>

            {/* Requirements & Details Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Budget Details */}
              <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    Budget Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Minimum Budget</span>
                    <span className="text-sm font-semibold">ETB {tender.budgetMin.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Maximum Budget</span>
                    <span className="text-sm font-semibold">ETB {tender.budgetMax.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                    <div
 className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-[width] duration-700" style={{ width: '100%' }}
 />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Budget range from minimum to maximum</p>
                </CardContent>
              </Card>

              {/* Deadline & Location */}
              <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-400 to-teal-400" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-50">
                      <Calendar className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    Timeline & Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-50">
                      <Timer className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Submission Deadline</p>
                      <p className="text-sm font-semibold">{new Date(tender.deadline).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      <p className={`text-[10px] font-medium ${days <= 0 ? 'text-rose-600' : days <= 3 ? 'text-rose-600' : days <= 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {days <= 0 ? 'Deadline has passed' : days === 1 ? '1 day remaining' : `${days} days remaining`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-teal-50">
                      <MapPin className="h-4 w-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Project Location</p>
                      <p className="text-sm font-semibold">{tender.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Required Documents */}
            {tender.requiredDocs && (
              <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-teal-400 to-teal-600" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-teal-50">
                        <FileStack className="h-3.5 w-3.5 text-teal-600" />
                      </div>
                      Required Documents
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] gap-1.5 rounded-lg border-teal-200 text-teal-700 hover:bg-teal-50"
                        onClick={handleDownloadRequirements}
                        disabled={downloadingReq}
                      >
                        {downloadingReq ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] gap-1.5 rounded-lg border-teal-200 text-teal-700 hover:bg-teal-50"
                        onClick={handleExportPdf}
                        disabled={exportingPdf}
                      >
                        {exportingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />}
                        Export PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {tender.requiredDocs.split(',').filter(Boolean).map(doc => (
                      <Badge key={doc} className="text-xs bg-teal-50 text-teal-700 border-0 rounded-lg hover:bg-teal-50 py-1 px-2.5">
                        <FileStack className="h-3 w-3 mr-1.5" /> {doc.trim()}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Requirements Analyzer - only for applicants */}
            {isApplicant && tender.status === 'open' && (
              <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-orange-400 to-amber-400" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-orange-50">
                        <Sparkles className="h-3.5 w-3.5 text-orange-600" />
                      </div>
                      AI Requirements Analyzer
                    </CardTitle>
                    <Button
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all hover:-translate-y-0.5 text-xs"
                      onClick={handleAnalyzeRequirements}
                      disabled={reqAnalysisLoading}
                    >
                      {reqAnalysisLoading ? (
                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Analyzing...</>
                      ) : reqAnalysis ? (
                        <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Re-Analyze</>
                      ) : (
                        <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Analyze Requirements</>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Let AI break down the tender requirements, evaluate your fit, and give you preparation tips</p>
                </CardHeader>
                <CardContent>
                  {reqAnalysisLoading && !reqAnalysis && (
                    <div className="text-center py-8 space-y-4">
                      <div className="relative w-14 h-14 mx-auto">
                        <div className="absolute inset-0 rounded-2xl bg-orange-100 opacity-20 animate-pulse" />
                        <div className="absolute inset-2 rounded-xl bg-orange-500 flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-white animate-pulse" />
                        </div>
                      </div>
                      <h3 className="text-sm font-semibold">Analyzing tender requirements...</h3>
                      <p className="text-muted-foreground text-xs">AI is evaluating requirements, your skills match, and risk factors</p>
                      <div className="flex items-center justify-center gap-1.5 pt-2">
                        {[0, 1, 2].map(i => (
                          <div
 key={i}
 className="h-2 w-2 rounded-full bg-orange-500"
 />
                        ))}
                      </div>
                    </div>
                  )}
                  {reqAnalysis && !reqAnalysisLoading && (
                    <div
 className="space-y-4 animate-[fadeIn_0.3s_ease-out]"
 >
                      {/* Match Score + Competitiveness */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-orange-50/60 rounded-xl p-4 text-center">
                          <Target className="h-5 w-5 text-orange-600 mx-auto mb-1" />
                          <p className={`text-2xl font-bold ${
                            reqAnalysis.matchScore >= 70 ? 'text-emerald-700' : reqAnalysis.matchScore >= 40 ? 'text-amber-700' : 'text-red-700'
                          }`}>{reqAnalysis.matchScore}</p>
                          <p className="text-[10px] text-muted-foreground">Your Match Score</p>
                        </div>
                        <div className="bg-amber-50/60 rounded-xl p-4 text-center">
                          <TrendingUp className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                          <p className={`text-lg font-bold ${
                            reqAnalysis.competitivenessAssessment === 'High' ? 'text-red-700' : reqAnalysis.competitivenessAssessment === 'Medium' ? 'text-amber-700' : 'text-emerald-700'
                          }`}>{reqAnalysis.competitivenessAssessment}</p>
                          <p className="text-[10px] text-muted-foreground">Competition Level</p>
                        </div>
                      </div>

                      {/* Requirements Summary */}
                      {reqAnalysis.requirementSummary && (
                        <div className="bg-muted/30 rounded-xl p-4">
                          <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                            <ListChecks className="h-3.5 w-3.5 text-orange-600" /> Requirements Summary
                          </p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{String(reqAnalysis.requirementSummary)}</p>
                        </div>
                      )}

                      {/* Mandatory Requirements */}
                      {reqAnalysis.mandatoryRequirements && (
                        <div className="bg-red-50/50 dark:bg-red-950/20 rounded-xl p-4">
                          <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1.5 flex items-center gap-1.5">
                            <ShieldAlert className="h-3.5 w-3.5" /> Mandatory Requirements
                          </p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{reqAnalysis.mandatoryRequirements}</p>
                        </div>
                      )}

                      {/* Preferred Qualifications */}
                      {reqAnalysis.preferredQualifications && (
                        <div className="bg-teal-50/50 dark:bg-teal-950/20 rounded-xl p-4">
                          <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 mb-1.5 flex items-center gap-1.5">
                            <Award className="h-3.5 w-3.5" /> Preferred Qualifications
                          </p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{reqAnalysis.preferredQualifications}</p>
                        </div>
                      )}

                      {/* Risk Factors */}
                      {reqAnalysis.riskFactors && (
                        <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-xl p-4">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5" /> Risk Factors
                          </p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{reqAnalysis.riskFactors}</p>
                        </div>
                      )}

                      {/* Preparation Tips */}
                      {reqAnalysis.preparationTips && (
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-4">
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5 flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5" /> Preparation Tips
                          </p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{reqAnalysis.preparationTips}</p>
                        </div>
                      )}

                      {/* Recommended Actions */}
                      {reqAnalysis.recommendedActions && (
                        <div className="bg-orange-50/50 dark:bg-orange-950/20 rounded-xl p-4">
                          <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1.5 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" /> Recommended Actions
                          </p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{reqAnalysis.recommendedActions}</p>
                        </div>
                      )}

                      {/* Evaluation Breakdown */}
                      {reqAnalysis.evaluationBreakdown && (
                        <div className="bg-muted/30 rounded-xl p-4">
                          <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                            <BarChart3 className="h-3.5 w-3.5 text-orange-600" /> Evaluation Breakdown
                          </p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{reqAnalysis.evaluationBreakdown}</p>
                        </div>
                      )}

                      {/* Export Analysis */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] gap-1.5 rounded-lg"
                          onClick={() => {
                            const data = JSON.stringify(reqAnalysis, null, 2);
                            const blob = new Blob([data], { type: 'application/json' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Tender_${tender?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Analysis'}_AI_Analysis.json`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);
                            toast.success('AI analysis exported!');
                          }}
                        >
                          <Download className="h-3 w-3" /> Export Analysis
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] gap-1.5 rounded-lg"
                          onClick={handleExportPdf}
                          disabled={exportingPdf}
                        >
                          {exportingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />}
                          Export PDF
                        </Button>
                      </div>
                    </div>
                  )}
                  {!reqAnalysis && !reqAnalysisLoading && (
                    <div className="text-center py-6">
                      <div className="relative w-12 h-12 mx-auto mb-3">
                        <div className="absolute inset-0 rounded-2xl bg-orange-100 opacity-30" />
                        <div className="absolute inset-2 rounded-xl bg-orange-500/80 flex items-center justify-center">
                          <BrainCircuit className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-foreground">Get AI-powered insights</p>
                      <p className="text-xs text-muted-foreground mt-1">Analyze requirements, evaluate your match, and get preparation tips</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'bids' && (
          <div
 key="bids"
 className="space-y-4 animate-[fadeIn_0.3s_ease-out]"
 >
            {/* Bid Stats */}
            {bids.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Pending', count: bidStats.pending, bg: 'bg-amber-50/60', text: 'text-amber-600', bold: 'text-amber-700', icon: Clock },
                  { label: 'Shortlisted', count: bidStats.shortlisted, bg: 'bg-teal-50/60', text: 'text-teal-600', bold: 'text-teal-700', icon: Award },
                  { label: 'Awarded', count: bidStats.awarded, bg: 'bg-emerald-50/60', text: 'text-emerald-600', bold: 'text-emerald-700', icon: CheckCircle },
                  { label: 'Rejected', count: bidStats.rejected, bg: 'bg-rose-50/60', text: 'text-rose-600', bold: 'text-rose-700', icon: AlertCircle },
                ].map(stat => (
                  <div key={stat.label} className={`${stat.bg} rounded-xl p-3 text-center`}>
                    <stat.icon className={`h-4 w-4 ${stat.text} mx-auto mb-1`} />
                    <p className={`text-lg font-bold ${stat.bold}`}>{stat.count}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}

            {user?.role === 'team_admin' && bids.length > 0 ? (
              <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <div className="p-1.5 rounded-lg gradient-amber">
                        <Gavel className="h-3.5 w-3.5 text-white" />
                      </div>
                      Submitted Bids
                      <Badge className="bg-amber-50 text-amber-700 border-0 rounded-lg text-[10px] hover:bg-amber-50">
                        {bids.length}
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {/* Analyze Bids button for tender creators */}
                      {isAdminOrCreator && (
                        <Button
                          size="sm"
                          className="gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5 text-xs"
                          onClick={() => setActiveTab('analysis')}
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Analyze Bids
                        </Button>
                      )}
                      {bids.length >= 2 && (
                        <Button
                          size="sm"
                          className="gradient-teal hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5 text-xs"
                          onClick={() => setView('bid-compare', { tenderId: tender.id })}
                        >
                          <GitCompareArrows className="h-3.5 w-3.5 mr-1.5" /> Compare Bids
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
                    {bids.map(bid => (
                      <BidCard key={bid.id} bid={bid} onUpdate={loadTender} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : bids.length > 0 ? (
              <Card className="premium-shadow rounded-xl border-0 bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 p-4 bg-emerald-50/50 rounded-xl">
                    <div className="p-2 rounded-lg gradient-emerald">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">Your bid has been submitted</p>
                      <p className="text-xs text-emerald-600 mt-0.5">You&apos;ll be notified when the bid status changes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="premium-shadow rounded-xl border-0 bg-card">
                <CardContent className="p-12 text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-2xl gradient-amber opacity-20" />
                    <div className="absolute inset-2 rounded-xl gradient-amber flex items-center justify-center">
                      <Gavel className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">No bids yet</h3>
                  <p className="text-muted-foreground text-sm mt-1">Bids will appear here once users submit proposals</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="animate-[fadeIn_0.3s_ease-out]"
 key="documents"
 >
            <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-teal-400 to-teal-600" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg gradient-teal">
                      <FileStack className="h-3.5 w-3.5 text-white" />
                    </div>
                    Tender Documents
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 transition-all"
                    onClick={() => setStampSelectorOpen(true)}
                  >
                    <Stamp className="h-3.5 w-3.5 mr-1.5" /> Add Stamp / Sign
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {tender.requiredDocs ? (
                  <div className="space-y-3">
                    {tender.requiredDocs.split(',').filter(Boolean).map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-teal-50">
                            <FileText className="h-4 w-4 text-teal-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{doc.trim()}</p>
                            <p className="text-[10px] text-muted-foreground">Required document</p>
                          </div>
                        </div>
                        <Badge className="text-[10px] bg-amber-50 text-amber-700 border-0 rounded-lg hover:bg-amber-50">
                          Required
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="p-3 rounded-2xl bg-muted/50 w-fit mx-auto mb-4">
                      <FileStack className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-semibold">No documents specified</h3>
                    <p className="text-muted-foreground text-xs mt-1">This tender has no specific document requirements</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Applied Stamps & Signatures */}
            {appliedStamps.length > 0 && (
              <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden animate-[fadeIn_0.3s_ease-out]">
                <div className="h-1 bg-gradient-to-r from-orange-400 to-amber-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-orange-500/10">
                      <FileSignature className="h-3.5 w-3.5 text-orange-600" />
                    </div>
                    Applied Stamps & Signatures
                    <Badge className="text-[10px] px-1.5 py-0 bg-orange-50 text-orange-700 border-0 font-medium">
                      {appliedStamps.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {appliedStamps.map((item, idx) => (
                      <div key={`${item.id}-${idx}`} className="flex flex-col items-center gap-2 p-3 border border-border/60 rounded-xl bg-muted/20">
                        <div className="w-full h-16 flex items-center justify-center bg-white rounded-lg overflow-hidden p-1">
                          <img src={item.dataUrl} alt={item.label} className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium">{item.label}</p>
                          <Badge className={`text-[8px] px-1 py-0 border-0 rounded ${
                            item.type === 'signature'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-orange-50 text-orange-600'
                          }`}>
                            {item.type}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                          onClick={() => setAppliedStamps(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <X className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* AI Overview Tab - visible to ALL users */}
        {activeTab === 'ai-overview' && (
          <div
 key="ai-overview"
 className="space-y-4 animate-[fadeIn_0.3s_ease-out]"
 >
            {/* AI Overview Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex-shrink-0">
                  <Lightbulb className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">AI Tender Overview</h3>
                  <p className="text-xs text-muted-foreground">Powered by TenetBid AI - understand requirements &amp; prepare a winning bid</p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5 text-xs"
                onClick={handleGetAIOverview}
                disabled={aiOverviewLoading}
              >
                {aiOverviewLoading ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating...</>
                ) : aiOverview ? (
                  <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Regenerate</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate AI Overview</>
                )}
              </Button>
            </div>

            {/* Loading State */}
            {aiOverviewLoading && !aiOverview && (
              <Card className="premium-shadow rounded-xl border-0 bg-card">
                <CardContent className="p-12 text-center space-y-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-2xl bg-violet-500 opacity-20 animate-pulse" />
                    <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-white animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">Generating AI overview...</h3>
                  <p className="text-muted-foreground text-sm">Our AI is analyzing the tender details, requirements, and providing actionable insights for your bid.</p>
                  <div className="flex items-center justify-center gap-1.5 pt-2">
                    {[0, 1, 2].map(i => (
                      <div
 key={i}
 className="h-2 w-2 rounded-full bg-violet-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Overview Results */}
            {aiOverview && !aiOverviewLoading && (
              <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                {/* Summary */}
                {(aiOverview.summary) && (
                  <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-violet-400 to-purple-500" />
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/50">
                          <Lightbulb className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                        </div>
                        Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-xl p-4">{aiOverview.summary}</p>
                      <InlineTranslator text={String(aiOverview.summary || '')} className="mt-3" />
                    </CardContent>
                  </Card>
                )}

                {/* Translate entire AI Overview */}
                <TranslatorPanel
                  text={JSON.stringify(aiOverview, null, 2)}
                  title="Translate AI Overview"
                  className="rounded-xl"
                />

                {/* Key Requirements & Eligibility Check - side by side */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Key Requirements */}
                  {(aiOverview.keyRequirements as string[]) && (aiOverview.keyRequirements as string[]).length > 0 && (
                    <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/50">
                            <ListChecks className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          Key Requirements
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {(aiOverview.keyRequirements as string[]).map((req, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg">
                              <div className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-900/50 mt-0.5">
                                <CircleCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">{req}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Eligibility Check */}
                  {(aiOverview.eligibilityCheck as string[]) && (aiOverview.eligibilityCheck as string[]).length > 0 && (
                    <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/50">
                            <ClipboardCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          </div>
                          Eligibility Check
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {(aiOverview.eligibilityCheck as string[]).map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-2.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg">
                              <div className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/50 mt-0.5">
                                <ShieldCheck className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Budget Analysis & Timeline - side by side */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Budget Analysis */}
                  {(aiOverview.budgetAnalysis) && (
                    <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/50">
                            <Wallet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          Budget Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-emerald-50/30 dark:bg-emerald-950/20 rounded-xl p-4">{aiOverview.budgetAnalysis}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Timeline */}
                  {(aiOverview.timeline) && (
                    <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/50">
                            <Clock3 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          </div>
                          Timeline
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-amber-50/30 dark:bg-amber-950/20 rounded-xl p-4">{aiOverview.timeline}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Required Documents */}
                {(aiOverview.requiredDocuments as string[]) && (aiOverview.requiredDocuments as string[]).length > 0 && (
                  <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-teal-400 to-teal-600" />
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/50">
                          <FileCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        </div>
                        Required Documents
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {(aiOverview.requiredDocuments as string[]).map((doc, idx) => (
                          <Badge key={idx} className="text-xs bg-teal-50 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 border-0 rounded-lg hover:bg-teal-50 py-1 px-2.5">
                            <FileStack className="h-3 w-3 mr-1.5" /> {doc}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Application Tips */}
                {(aiOverview.applicationTips as string[]) && (aiOverview.applicationTips as string[]).length > 0 && (
                  <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-violet-400 to-purple-500" />
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/50">
                          <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                        </div>
                        Application Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(aiOverview.applicationTips as string[]).map((tip, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-3 bg-violet-50/50 dark:bg-violet-950/20 rounded-lg">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-200 text-[10px] font-bold shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Empty state - no overview yet */}
            {!aiOverview && !aiOverviewLoading && (
              <Card className="premium-shadow rounded-xl border-0 bg-card">
                <CardContent className="p-12 text-center">
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-2xl bg-violet-500 opacity-20" />
                    <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <Lightbulb className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">Get AI-powered insights</h3>
                  <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
                    Let AI analyze this tender&apos;s requirements, budget, timeline, and give you actionable tips to craft a competitive bid.
                  </p>
                  <Button
                    className="mt-4 bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5"
                    onClick={handleGetAIOverview}
                    disabled={aiOverviewLoading}
                  >
                    <Sparkles className="h-4 w-4 mr-2" /> Generate AI Overview
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div
 key="analysis"
 className="space-y-4 animate-[fadeIn_0.3s_ease-out]"
 >
            {/* Analysis Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl gradient-emerald flex-shrink-0">
                  <BrainCircuit className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">AI Bid Analysis</h3>
                  <p className="text-xs text-muted-foreground">Powered by TenetBid AI - rank, score, and evaluate bids automatically</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {analyses.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs"
                    onClick={loadAnalyses}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5" /> Refresh
                  </Button>
                )}
                <Button
                  size="sm"
                  className="gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5 text-xs"
                  onClick={handleRunAnalysis}
                  disabled={analysisLoading || bids.length === 0}
                >
                  {analysisLoading ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Run AI Analysis</>
                  )}
                </Button>
              </div>
            </div>

            {/* No bids message */}
            {bids.length === 0 && (
              <Card className="premium-shadow rounded-xl border-0 bg-card">
                <CardContent className="p-12 text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-2xl gradient-amber opacity-20" />
                    <div className="absolute inset-2 rounded-xl gradient-amber flex items-center justify-center">
                      <Gavel className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">No bids to analyze</h3>
                  <p className="text-muted-foreground text-sm mt-1">AI analysis requires at least one submitted bid on this tender</p>
                </CardContent>
              </Card>
            )}

            {/* Analysis loading */}
            {analysisLoading && (
              <div className="animate-[fadeIn_0.3s_ease-out]">
                <Card className="premium-shadow rounded-xl border-0 bg-card">
                  <CardContent className="p-12 text-center space-y-4">
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 rounded-2xl gradient-emerald opacity-20 animate-pulse" />
                      <div className="absolute inset-2 rounded-xl gradient-emerald flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-white animate-pulse" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold">Analyzing bids with AI...</h3>
                    <p className="text-muted-foreground text-sm">This may take a moment. Our AI is evaluating each bid&apos;s technical merit, financial competitiveness, and risk profile.</p>
                    <div className="flex items-center justify-center gap-1.5 pt-2">
                      {[0, 1, 2].map(i => (
                        <div
 key={i}
 className="h-2 w-2 rounded-full bg-emerald-500"
 />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Previous analyses selector */}
            {analyses.length > 1 && !analysisLoading && (
              <Card className="premium-shadow rounded-xl border-0 bg-card">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Previous Analyses</p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {analyses.map((a, idx) => (
                      <button
                        key={a.id}
                        onClick={() => setSelectedAnalysisId(a.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          selectedAnalysisId === a.id
                            ? 'gradient-emerald text-white premium-shadow'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <BarChart3 className="h-3 w-3" />
                        <span>Analysis {analyses.length - idx}</span>
                        <span className={selectedAnalysisId === a.id ? 'text-white/70' : 'text-muted-foreground'}>
                          {new Date(a.createdAt).toLocaleDateString()}
                        </span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analysis Results */}
            {parsedAnalysis && !analysisLoading && (
              <div
 className="space-y-4 animate-[fadeIn_0.3s_ease-out]"
 >
                {/* Summary Card */}
                <div>
                  <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <div className="p-1.5 rounded-lg gradient-emerald">
                          <BarChart3 className="h-3.5 w-3.5 text-white" />
                        </div>
                        Analysis Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="bg-emerald-50/60 rounded-xl p-4 text-center">
                          <Users className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                          <p className="text-2xl font-bold text-emerald-700">{parsedAnalysis.summary.totalBids}</p>
                          <p className="text-[10px] text-muted-foreground">Total Bids</p>
                        </div>
                        <div className="bg-teal-50/60 rounded-xl p-4 text-center">
                          <TrendingUp className="h-5 w-5 text-teal-600 mx-auto mb-1" />
                          <p className="text-2xl font-bold text-teal-700">{parsedAnalysis.summary.averageScore}</p>
                          <p className="text-[10px] text-muted-foreground">Average Score</p>
                        </div>
                        <div className="bg-amber-50/60 rounded-xl p-4 text-center col-span-2 sm:col-span-1">
                          <DollarSign className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                          <p className="text-sm font-bold text-amber-700 leading-snug">Budget Analysis</p>
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-3">{parsedAnalysis.budgetAnalysis}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Risk Summary */}
                {parsedAnalysis.riskSummary && (
                  <div>
                    <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-amber-400 to-rose-400" />
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-amber-50">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          </div>
                          Risk Assessment
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-xl p-4">
                          {parsedAnalysis.riskSummary}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Rankings Table */}
                {parsedAnalysis.applicants.length > 0 && (
                  <div>
                    <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-teal-400 to-emerald-400" />
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <div className="p-1.5 rounded-lg gradient-teal">
                            <Award className="h-3.5 w-3.5 text-white" />
                          </div>
                          Applicant Rankings
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">Rank</TableHead>
                                <TableHead>Applicant</TableHead>
                                <TableHead className="text-center">Overall</TableHead>
                                <TableHead className="text-center">Technical</TableHead>
                                <TableHead className="text-center">Financial</TableHead>
                                <TableHead className="text-center">Risk</TableHead>
                                <TableHead>Key Points</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {parsedAnalysis.applicants.map((applicant) => (
                                <TableRow key={applicant.rank}>
                                  <TableCell>
                                    <div className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                                      applicant.rank === 1 ? 'gradient-emerald text-white' :
                                      applicant.rank === 2 ? 'bg-teal-100 text-teal-700' :
                                      applicant.rank === 3 ? 'bg-amber-100 text-amber-700' :
                                      'bg-muted text-muted-foreground'
                                    }`}>
                                      {applicant.rank}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="text-sm font-medium">{applicant.name}</p>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <Building2 className="h-3 w-3 text-muted-foreground" />
                                        <p className="text-[11px] text-muted-foreground">{applicant.company}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <ScoreBar score={applicant.overallScore} />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <ScoreBar score={applicant.technicalScore} />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <ScoreBar score={applicant.financialScore} />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <RiskBadge level={applicant.riskLevel} />
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1.5 max-w-[220px]">
                                      {/* Strengths */}
                                      {applicant.strengths.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {applicant.strengths.map((s, i) => (
                                            <span key={i} className="inline-flex items-center text-[10px] font-medium bg-emerald-50 text-emerald-700 rounded-md px-1.5 py-0.5">
                                              <CheckCircle className="h-2.5 w-2.5 mr-0.5" />{s}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      {/* Weaknesses */}
                                      {applicant.weaknesses.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {applicant.weaknesses.map((w, i) => (
                                            <span key={i} className="inline-flex items-center text-[10px] font-medium bg-rose-50 text-rose-700 rounded-md px-1.5 py-0.5">
                                              <TrendingDown className="h-2.5 w-2.5 mr-0.5" />{w}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Recommendation Card */}
                {parsedAnalysis.finalRecommendation && (
                  <div>
                    <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <div className="p-1.5 rounded-lg gradient-emerald">
                            <Target className="h-3.5 w-3.5 text-white" />
                          </div>
                          Final Recommendation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-4 border border-emerald-200/50 dark:border-emerald-800/30">
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{parsedAnalysis.finalRecommendation}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Analysis metadata */}
                {selectedAnalysis && (
                  <div>
                    <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                      <span>Analysis run on {new Date(selectedAnalysis.createdAt).toLocaleString()}</span>
                      {analyses.length > 1 && (
                        <button
                          onClick={() => setSelectedAnalysisId(null)}
                          className="hover:text-foreground transition-colors"
                        >
                          View all analyses
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No analysis yet */}
            {analyses.length === 0 && !analysisLoading && bids.length > 0 && (
              <div className="animate-[fadeIn_0.3s_ease-out]">
                <Card className="premium-shadow rounded-xl border-0 bg-card">
                  <CardContent className="p-12 text-center">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      <div className="absolute inset-0 rounded-2xl gradient-emerald opacity-20" />
                      <div className="absolute inset-2 rounded-xl gradient-emerald flex items-center justify-center">
                        <BrainCircuit className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold">No analysis yet</h3>
                    <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
                      Click &quot;Run AI Analysis&quot; to automatically evaluate and rank all {bids.length} bid{bids.length !== 1 ? 's' : ''} submitted on this tender.
                    </p>
                    <Button
                      className="mt-4 gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5"
                      onClick={handleRunAnalysis}
                      disabled={analysisLoading}
                    >
                      <Sparkles className="h-4 w-4 mr-2" /> Run AI Analysis
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
        
        {/* Stamp & Signature Selector Dialog */}
        <StampSignatureSelector
          hook={stampSigHook}
          open={stampSelectorOpen}
          onClose={() => setStampSelectorOpen(false)}
          onSelect={(item) => {
            setAppliedStamps(prev => [...prev, item]);
            toast.success(`${item.label} applied to tender`);
            setStampSelectorOpen(false);
          }}
          title="Select Stamp or Signature for Tender"
        />
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
      default: return 'bg-muted text-muted-foreground hover:bg-muted';
    }
  };

  const bidStatusDot = (status: string) => {
    switch (status) {
      case 'awarded': return 'bg-emerald-500';
      case 'rejected': return 'bg-rose-500';
      case 'shortlisted': return 'bg-teal-500';
      case 'pending_review': return 'bg-amber-500';
      default: return 'bg-muted-foreground/50';
    }
  };

  const companyName = bid.user?.company?.name;
  const jobTitle = bid.user?.profile?.jobTitle;

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
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              {jobTitle && <span>{jobTitle}</span>}
              {companyName && (
                <>
                  {jobTitle && <span className="text-muted-foreground/50">&middot;</span>}
                  <span className="inline-flex items-center gap-0.5">
                    <Building2 className="h-3 w-3" /> {companyName}
                  </span>
                </>
              )}
              {!jobTitle && !companyName && <span>Submitted {new Date(bid.createdAt).toLocaleDateString()}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Badge className="text-xs border-0 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-primary/10">
            <DollarSign className="h-3 w-3 mr-1" /> {bid.financialProposal > 0 ? `ETB ${bid.financialProposal.toLocaleString()}` : 'See document'}
          </Badge>
          <Badge className="text-xs border-0 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-50">
            <Clock className="h-3 w-3 mr-1" /> {bid.timeline.startsWith('Uploaded via document') || bid.timeline.includes('submitted via document') ? 'See document' : bid.timeline}
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
          <div
 className="overflow-hidden animate-[fadeIn_0.3s_ease-out]"
 >
            <div className="mt-3 pt-3 border-t border-border/40 space-y-4">
              {/* Technical Proposal */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg gradient-emerald">
                    <Briefcase className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Technical Proposal</p>
                </div>
                <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-xl p-4 leading-relaxed">{bid.technicalProposal.startsWith('Uploaded via document') || bid.technicalProposal.includes('submitted via document') ? <span className="italic text-muted-foreground">See uploaded Technical Proposal document</span> : bid.technicalProposal}</p>
              </div>

              {/* Admin Actions */}
              {(user?.role === 'team_admin') && bid.status === 'pending_review' && (
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
              {(user?.role === 'team_admin') && bid.status === 'shortlisted' && (
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
          </div>
        )}
</div>
  );
}
