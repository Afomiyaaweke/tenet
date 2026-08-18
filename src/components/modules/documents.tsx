'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store';
import { api, Document } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  FileText, Upload, CheckCircle2, Clock, XCircle, Shield,
  Briefcase, Receipt, FolderOpen, Award, File, ArrowRight,
  Search, Filter, CloudUpload, FileUp, Trash2, Eye,
  Stamp, FileSignature, X, Languages,
  ScanSearch, Brain, Loader2, AlertTriangle, ChevronDown, ChevronUp,
  ThumbsUp, ThumbsDown, AlertOctagon, BarChart3, Sparkles,
} from 'lucide-react';
import { useStampSignature, StampSignatureSelector, type SavedSignature } from '@/components/stamp-signature';
import { InlineTranslator } from '@/components/translator';

// ─── Helpers ────────────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
}

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

export function DocumentsView() {
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState('business_license');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stampSelectorOpen, setStampSelectorOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docStamps, setDocStamps] = useState<Record<string, SavedSignature[]>>({});
  const stampSigHook = useStampSignature();
  const [translateDocId, setTranslateDocId] = useState<string | null>(null);

  // OCR & AI Review state
  const [ocrLoading, setOcrLoading] = useState<Set<string>>(new Set());
  const [reviewLoading, setReviewLoading] = useState<Set<string>>(new Set());
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [expandedType, setExpandedType] = useState<'ocr' | 'review' | null>(null);
  const [docOcrText, setDocOcrText] = useState<Record<string, string>>({});
  const [docReview, setDocReview] = useState<Record<string, AIReviewData>>({});
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewDialogDocId, setReviewDialogDocId] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/documents');
    if (res.success) setDocuments(res.data);
    setLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { loadDocs(); }, [loadDocs]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0] || selectedFile;
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);
    formData.append('userId', user?.id || '');
    const res = await api.upload('/documents', formData);
    if (res.success) {
      toast.success('Document uploaded');
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
      loadDocs();
    } else toast.error(res.error || 'Upload failed');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PDF, JPEG, and PNG files are allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be under 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  // ── OCR Processing ──
  const handleRunOcr = useCallback(async (docId: string) => {
    setOcrLoading(prev => new Set(prev).add(docId));
    try {
      await api.post(`/document-ocr/${docId}`);
      // Poll for completion
      const poll = async (attempts = 0): Promise<void> => {
        if (attempts > 30) {
          toast.error('OCR processing timed out');
          setOcrLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
          return;
        }
        await new Promise(r => setTimeout(r, 2000));
        const res = await api.get(`/document-ocr/${docId}`);
        if (res.success && res.data?.ocrStatus === 'completed') {
          setOcrLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
          setDocOcrText(prev => ({ ...prev, [docId]: res.data.ocrText || '' }));
          loadDocs();
          toast.success('OCR completed - text extracted successfully');
        } else if (res.success && res.data?.ocrStatus === 'failed') {
          setOcrLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
          toast.error('OCR processing failed');
          loadDocs();
        } else {
          await poll(attempts + 1);
        }
      };
      poll();
    } catch {
      setOcrLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
      toast.error('Failed to start OCR');
    }
  }, [loadDocs]);

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
      // Poll for completion
      const poll = async (attempts = 0): Promise<void> => {
        if (attempts > 30) {
          toast.error('AI Review processing timed out');
          setReviewLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
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
          loadDocs();
          toast.success('AI Review completed');
        } else if (pollRes.success && pollRes.data?.aiReviewStatus === 'failed') {
          setReviewLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
          toast.error('AI Review processing failed');
          loadDocs();
        } else {
          await poll(attempts + 1);
        }
      };
      poll();
    } catch {
      setReviewLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
      toast.error('Failed to start AI Review');
    }
  }, [loadDocs]);

  // ── View OCR/Review detail ──
  const handleToggleExpand = useCallback(async (docId: string, type: 'ocr' | 'review') => {
    if (expandedDocId === docId && expandedType === type) {
      setExpandedDocId(null);
      setExpandedType(null);
      return;
    }
    setExpandedDocId(docId);
    setExpandedType(type);
    try {
      if (type === 'ocr' && !docOcrText[docId]) {
        const res = await api.get(`/document-ocr/${docId}`);
        if (res.success) {
          setDocOcrText(prev => ({ ...prev, [docId]: res.data?.ocrText || '' }));
        }
      } else if (type === 'review' && !docReview[docId]) {
        const res = await api.get(`/document-review/${docId}`);
        if (res.success) {
          let reviewData = res.data?.aiReview || {};
          if (typeof reviewData === 'string') {
            try { reviewData = JSON.parse(reviewData); } catch { reviewData = { summary: reviewData }; }
          }
          setDocReview(prev => ({ ...prev, [docId]: reviewData as AIReviewData }));
        }
      }
    } catch {
      toast.error('Failed to load document details');
    }
  }, [expandedDocId, expandedType, docOcrText, docReview]);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-rose-600" />;
      default: return <Clock className="h-4 w-4 text-amber-600" />;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
      case 'rejected': return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
      default: return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
    }
  };

  const statusDot = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500';
      case 'rejected': return 'bg-rose-500';
      default: return 'bg-amber-500';
    }
  };

  const ocrStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'processing': return 'bg-sky-100 text-sky-700 animate-pulse';
      case 'failed': return 'bg-rose-100 text-rose-700';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const reviewStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'processing': return 'bg-sky-100 text-sky-700 animate-pulse';
      case 'failed': return 'bg-rose-100 text-rose-700';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const docTypeConfig = (type: string) => {
    switch (type) {
      case 'business_license': return { icon: Briefcase, bg: 'bg-emerald-50', color: 'text-emerald-600', label: 'Business License' };
      case 'tax_clearance': return { icon: Receipt, bg: 'bg-amber-50', color: 'text-amber-600', label: 'Tax Clearance' };
      case 'portfolio': return { icon: FolderOpen, bg: 'bg-teal-50', color: 'text-teal-600', label: 'Portfolio' };
      case 'certificate': return { icon: Award, bg: 'bg-purple-50', color: 'text-purple-600', label: 'Certificate' };
      case 'bid_attachment': return { icon: FileText, bg: 'bg-sky-50', color: 'text-sky-600', label: 'Bid Document' };
      default: return { icon: File, bg: 'bg-muted/50', color: 'text-muted-foreground', label: type.replace('_', ' ') };
    }
  };

  const pendingCount = documents.filter(d => d.status === 'pending').length;
  const approvedCount = documents.filter(d => d.status === 'approved').length;
  const rejectedCount = documents.filter(d => d.status === 'rejected').length;
  const ocrCompletedCount = documents.filter(d => d.ocrStatus === 'completed').length;
  const reviewCompletedCount = documents.filter(d => d.aiReviewStatus === 'completed').length;

  // ── Filtered Docs ──
  const filteredDocs = documents.filter(d => {
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesType = typeFilter === 'all' || d.docType === typeFilter;
    return matchesStatus && matchesType;
  });

  // ── Review dialog data ──
  const reviewDialogData = reviewDialogDocId ? docReview[reviewDialogDocId] : null;
  const reviewDialogDoc = documents.find(d => d.id === reviewDialogDocId);

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

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl gradient-teal shadow-md flex-shrink-0 shadow-teal-200/40">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            <span className="text-gradient-emerald">Document</span> Vault
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">Upload, OCR scan, and AI-review your documents</p>
        </div>
      </div>

      {/* Verification Status */}
      <div>
        <Card className="premium-shadow-lg rounded-xl border-0 bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`p-3 rounded-2xl flex-shrink-0 ${user?.profile?.verified ? 'gradient-emerald' : 'gradient-amber'}`}>
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">{user?.profile?.verified ? 'Verified Account' : 'Verification Pending'}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {user?.profile?.verified
                  ? 'Your account is verified. You can submit bids.'
                  : 'Upload your documents for admin review to get verified.'}
              </p>
            </div>
            <div className="ml-auto flex-shrink-0">
              {user?.profile?.verified ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-0 rounded-lg hover:bg-emerald-100">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 border-0 rounded-lg hover:bg-amber-100">
                  <Clock className="h-3 w-3 mr-1" /> Pending
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Summary */}
      {!loading && documents.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { count: pendingCount, label: 'Pending', icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600' },
            { count: approvedCount, label: 'Approved', icon: CheckCircle2, bg: 'bg-emerald-50', color: 'text-emerald-600' },
            { count: rejectedCount, label: 'Rejected', icon: XCircle, bg: 'bg-rose-50', color: 'text-rose-600' },
            { count: ocrCompletedCount, label: 'OCR Done', icon: ScanSearch, bg: 'bg-sky-50', color: 'text-sky-600' },
            { count: reviewCompletedCount, label: 'AI Reviewed', icon: Brain, bg: 'bg-purple-50', color: 'text-purple-600' },
          ].map(stat => (
            <div className="hover:-translate-y-[3px] transition-all duration-200" key={stat.label}>
              <Card className="premium-shadow rounded-xl border-0 bg-card transition-all duration-200 h-full">
                <CardContent className="p-3 flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${stat.bg} flex-shrink-0`}>
                    <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{stat.count}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Upload Section with Drag-Drop */}
      <div>
        <Card className="premium-shadow rounded-xl border-0 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-emerald">
                <Upload className="h-3.5 w-3.5 text-white" />
              </div>
              Upload Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drag-drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
                isDragging
                  ? 'border-emerald-400 bg-emerald-50/50 scale-[1.01]'
                  : 'border-border/60 bg-muted/20 hover:border-emerald-300 hover:bg-primary/10'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className={`p-3 rounded-2xl transition-colors ${isDragging ? 'gradient-emerald' : 'bg-emerald-50'}`}>
                  <CloudUpload className={`h-6 w-6 ${isDragging ? 'text-white' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">PDF, JPEG, PNG - Max 10MB</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-primary/10"
                  onClick={() => fileRef.current?.click()}
                >
                  <FileUp className="h-3.5 w-3.5 mr-1" /> Or browse files
                </Button>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setSelectedFile(f);
                  }} />
              </div>
            </div>

            {/* Selected file preview */}
            {selectedFile && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 animate-[fadeIn_0.3s_ease-out]">
                <div className="p-2 rounded-lg bg-emerald-100 flex-shrink-0">
                  <FileText className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{getFileExtension(selectedFile.name)} &middot; {formatFileSize(selectedFile.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  onClick={() => { setSelectedFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Type selector + Upload button */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Type</label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="rounded-xl bg-muted/50 border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business_license">Business License</SelectItem>
                    <SelectItem value="tax_clearance">Tax Clearance</SelectItem>
                    <SelectItem value="portfolio">Portfolio</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full gradient-emerald hover:opacity-90 text-white rounded-xl premium-shadow transition-all hover:-translate-y-0.5"
                  onClick={handleUpload}
                  disabled={!selectedFile}
                >
                  <Upload className="h-4 w-4 mr-2" /> Upload Document
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <div>
        <Card className="premium-shadow rounded-xl border-0 bg-card">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg gradient-teal">
                  <FolderOpen className="h-3.5 w-3.5 text-white" />
                </div>
                My Documents
                <Badge className="text-[10px] px-1.5 py-0 border-0 bg-teal-50 text-teal-700 font-medium hover:bg-teal-50">
                  {filteredDocs.length} of {documents.length}
                </Badge>
              </CardTitle>
              {/* Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="h-7 text-xs rounded-lg bg-muted/50 border border-border/60 px-2 focus:ring-primary focus:outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="business_license">Business License</option>
                  <option value="tax_clearance">Tax Clearance</option>
                  <option value="portfolio">Portfolio</option>
                  <option value="certificate">Certificate</option>
                  <option value="bid_attachment">Bid Document</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="h-7 text-xs rounded-lg bg-muted/50 border border-border/60 px-2 focus:ring-primary focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-3 rounded-2xl gradient-teal w-fit mx-auto mb-4">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <p className="text-sm font-medium">{statusFilter !== 'all' || typeFilter !== 'all' ? 'No documents match your filters' : 'No documents uploaded yet'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {statusFilter !== 'all' || typeFilter !== 'all' ? 'Try changing your filter settings' : 'Upload your first document to get started'}
                </p>
                {(statusFilter !== 'all' || typeFilter !== 'all') && (
                  <Button variant="ghost" size="sm" className="text-xs mt-2 text-emerald-600 hover:text-emerald-700" onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}>
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              filteredDocs.map((doc) => {
                  const dtConfig = docTypeConfig(doc.docType);
                  const DtIcon = dtConfig.icon;
                  const isOcrLoading = ocrLoading.has(doc.id);
                  const isReviewLoading = reviewLoading.has(doc.id);
                  const isExpanded = expandedDocId === doc.id;
                  return (
                    <div key={doc.id}>
                      {/* Main document row */}
                      <div className="p-3.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors animate-[fadeIn_0.3s_ease-out]">
                        {/* Top row: doc info + action buttons */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`p-2 rounded-lg ${dtConfig.bg} flex-shrink-0`}>
                              <DtIcon className={`h-4 w-4 ${dtConfig.color}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`h-1.5 w-1.5 rounded-full ${statusDot(doc.status)}`} />
                                <p className="text-sm font-medium">{dtConfig.label}</p>
                                {/* OCR status indicator */}
                                {doc.ocrStatus === 'completed' && (
                                  <Badge className="text-[9px] px-1 py-0 border-0 bg-emerald-50 text-emerald-600 hover:bg-emerald-50 h-4">
                                    <ScanSearch className="h-2.5 w-2.5 mr-0.5" /> OCR
                                  </Badge>
                                )}
                                {doc.ocrStatus === 'processing' && (
                                  <Badge className="text-[9px] px-1 py-0 border-0 bg-sky-50 text-sky-600 hover:bg-sky-50 h-4 animate-pulse">
                                    <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" /> OCR
                                  </Badge>
                                )}
                                {doc.ocrStatus === 'failed' && (
                                  <Badge className="text-[9px] px-1 py-0 border-0 bg-rose-50 text-rose-600 hover:bg-rose-50 h-4">
                                    <XCircle className="h-2.5 w-2.5 mr-0.5" /> OCR
                                  </Badge>
                                )}
                                {/* AI Review status indicator */}
                                {doc.aiReviewStatus === 'completed' && (
                                  <Badge className="text-[9px] px-1 py-0 border-0 bg-purple-50 text-purple-600 hover:bg-purple-50 h-4">
                                    <Brain className="h-2.5 w-2.5 mr-0.5" /> Reviewed
                                  </Badge>
                                )}
                                {doc.aiReviewStatus === 'processing' && (
                                  <Badge className="text-[9px] px-1 py-0 border-0 bg-sky-50 text-sky-600 hover:bg-sky-50 h-4 animate-pulse">
                                    <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" /> Reviewing
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {doc.fileName} &middot; {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                              {doc.reviewNotes && (
                                <p className="text-xs mt-1 flex items-center gap-1">
                                  {doc.status === 'approved' ? (
                                    <span className="text-emerald-600 flex items-center gap-1"><Eye className="h-3 w-3" /> {doc.reviewNotes}</span>
                                  ) : doc.status === 'rejected' ? (
                                    <span className="text-rose-600 flex items-center gap-1"><Eye className="h-3 w-3" /> {doc.reviewNotes}</span>
                                  ) : (
                                    <span className="text-amber-600 flex items-center gap-1"><Eye className="h-3 w-3" /> {doc.reviewNotes}</span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                            {/* OCR button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg"
                              disabled={isOcrLoading || doc.ocrStatus === 'processing'}
                              onClick={() => handleRunOcr(doc.id)}
                            >
                              {isOcrLoading || doc.ocrStatus === 'processing' ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <ScanSearch className="h-3 w-3 mr-1" />
                              )}
                              {doc.ocrStatus === 'completed' ? 'Re-OCR' : doc.ocrStatus === 'processing' ? 'OCR...' : 'OCR'}
                            </Button>
                            {/* AI Review button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg"
                              disabled={isReviewLoading || doc.aiReviewStatus === 'processing' || (doc.ocrStatus !== 'completed' && doc.aiReviewStatus !== 'completed')}
                              onClick={() => handleRunReview(doc.id)}
                              title={doc.ocrStatus !== 'completed' && doc.aiReviewStatus !== 'completed' ? 'Run OCR first' : 'Run AI Review'}
                            >
                              {isReviewLoading || doc.aiReviewStatus === 'processing' ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Brain className="h-3 w-3 mr-1" />
                              )}
                              {doc.aiReviewStatus === 'completed' ? 'Re-Review' : doc.aiReviewStatus === 'processing' ? 'Reviewing' : 'AI Review'}
                            </Button>
                            {/* View OCR */}
                            {doc.ocrStatus === 'completed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                                onClick={() => handleToggleExpand(doc.id, 'ocr')}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                OCR Text
                                {isExpanded && expandedType === 'ocr' ? <ChevronUp className="h-2.5 w-2.5 ml-0.5" /> : <ChevronDown className="h-2.5 w-2.5 ml-0.5" />}
                              </Button>
                            )}
                            {/* View Review */}
                            {doc.aiReviewStatus === 'completed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg"
                                onClick={() => { setReviewDialogDocId(doc.id); setReviewDialogOpen(true); }}
                              >
                                <BarChart3 className="h-3 w-3 mr-1" />
                                Review
                              </Button>
                            )}
                            {/* Sign & Stamp button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg"
                              onClick={() => { setSelectedDocId(doc.id); setStampSelectorOpen(true); }}
                            >
                              <Stamp className="h-3 w-3 mr-1" /> Stamp
                            </Button>
                            {/* Translate button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg"
                              onClick={() => setTranslateDocId(translateDocId === doc.id ? null : doc.id)}
                            >
                              <Languages className="h-3 w-3 mr-1" /> {translateDocId === doc.id ? 'Hide' : 'Translate'}
                            </Button>
                            {/* Status badge */}
                            <Badge className={`text-[10px] px-1.5 py-0 border-0 rounded-lg ${statusBadge(doc.status)} flex-shrink-0`}>{doc.status}</Badge>
                          </div>
                        </div>

                        {/* Applied stamps for this document */}
                        {docStamps[doc.id] && docStamps[doc.id].length > 0 && (
                          <div className="flex items-center gap-2 mt-2 ml-11">
                            {docStamps[doc.id].map((stamp, sIdx) => (
                              <div key={`${stamp.id}-${sIdx}`} className="flex items-center gap-1.5 p-1 bg-orange-50/50 border border-orange-100 rounded-lg">
                                <div className="w-6 h-5 bg-white rounded overflow-hidden p-0.5">
                                  <img src={stamp.dataUrl} alt={stamp.label} className="max-w-full max-h-full object-contain" />
                                </div>
                                <span className="text-[9px] text-orange-700 font-medium">{stamp.label}</span>
                                <button
                                  className="h-3.5 w-3.5 rounded-full hover:bg-orange-100 flex items-center justify-center"
                                  onClick={() => setDocStamps(prev => ({
                                    ...prev,
                                    [doc.id]: (prev[doc.id] || []).filter((_, i) => i !== sIdx),
                                  }))}
                                >
                                  <X className="h-2.5 w-2.5 text-orange-400" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Inline translator for this document */}
                        {translateDocId === doc.id && (
                          <div className="ml-11 mt-2">
                            <InlineTranslator text={`Document: ${doc.fileName}\nType: ${doc.docType}\nStatus: ${doc.status}${doc.reviewNotes ? '\nReview: ' + doc.reviewNotes : ''}${docOcrText[doc.id] ? '\nOCR Text: ' + docOcrText[doc.id].substring(0, 500) : ''}`} />
                          </div>
                        )}

                        {/* Expanded OCR text */}
                        {isExpanded && expandedType === 'ocr' && (
                          <div className="mt-3 ml-0 p-3 bg-emerald-50/30 border border-emerald-100 rounded-lg animate-[fadeIn_0.2s_ease-out]">
                            <div className="flex items-center gap-2 mb-2">
                              <ScanSearch className="h-4 w-4 text-emerald-600" />
                              <p className="text-xs font-semibold text-emerald-700">Extracted Text (OCR)</p>
                              {doc.ocrProcessedAt && (
                                <span className="text-[9px] text-muted-foreground">
                                  Processed {new Date(doc.ocrProcessedAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <div className="max-h-64 overflow-y-auto text-xs text-foreground/80 whitespace-pre-wrap bg-white/60 p-3 rounded-lg border border-emerald-100/50 leading-relaxed">
                              {docOcrText[doc.id] || 'Loading...'}
                            </div>
                          </div>
                        )}

                        {/* Expanded AI Review inline (brief) */}
                        {isExpanded && expandedType === 'review' && docReview[doc.id] && (
                          <div className="mt-3 ml-0 p-3 bg-purple-50/30 border border-purple-100 rounded-lg animate-[fadeIn_0.2s_ease-out]">
                            <div className="flex items-center gap-2 mb-2">
                              <Brain className="h-4 w-4 text-purple-600" />
                              <p className="text-xs font-semibold text-purple-700">AI Review Summary</p>
                            </div>
                            <p className="text-xs text-foreground/70">{docReview[doc.id]?.summary || 'No summary available'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Review Detail Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-50">
                <Brain className="h-4 w-4 text-purple-600" />
              </div>
              AI Document Review
              {reviewDialogDoc && (
                <span className="text-sm font-normal text-muted-foreground">
                  - {reviewDialogDoc.fileName}
                </span>
              )}
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
                        <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{s}</span>
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
                        <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{w}</span>
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
                        <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{m}</span>
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
                        <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{r}</span>
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
        onClose={() => { setStampSelectorOpen(false); setSelectedDocId(null); }}
        onSelect={(item) => {
          if (selectedDocId) {
            setDocStamps(prev => ({
              ...prev,
              [selectedDocId]: [...(prev[selectedDocId] || []), item],
            }));
            toast.success(`${item.label} applied to document`);
          }
          setStampSelectorOpen(false);
          setSelectedDocId(null);
        }}
        title="Select Stamp or Signature for Document"
      />
    </div>
  );
}
