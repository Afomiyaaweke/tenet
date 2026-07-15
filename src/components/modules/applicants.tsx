'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Users, Building2, DollarSign, FileSearch, Download, Search,
  ArrowUpDown, ArrowUp, ArrowDown, Filter, Eye, ChevronDown,
  ChevronUp, ChevronLeft, ChevronRight, Briefcase, MapPin,
  Phone, Mail, Clock, ShieldCheck, ShieldAlert, ShieldQuestion,
  Gavel, FileSpreadsheet, LayoutGrid, List, TrendingUp,
  Calendar, Tag, CheckCircle, XCircle, CircleDot, Award,
  Ban, ClipboardCheck, MoreHorizontal, ExternalLink, Sparkles,
  RefreshCw, Columns3, CheckSquare, Square, Timer, Lock,
  Hourglass, ArrowLeft,
  FileText, ScanSearch, Brain, Upload, FileCheck, FileX,
  Loader2, AlertTriangle, X, CheckCircle2, Info, ThumbsUp,
  ThumbsDown, AlertOctagon, BarChart3, FolderOpen,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────

interface ApplicantRow {
  id: string;
  tenderId: string;
  tenderTitle: string;
  tenderStatus: string;
  tenderBudgetMin: number;
  tenderBudgetMax: number;
  tenderDeadline: string;
  tenderLocation: string;
  categoryTags: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  applicantJobTitle: string;
  applicantLocation: string;
  applicantSkills: string;
  applicantVerified: boolean;
  applicantLicense: string;
  applicantTin: string;
  companyId: string;
  companyName: string;
  companyIndustry: string;
  companyVerified: boolean;
  companyRegistration: string;
  companyTin: string;
  companyCity: string;
  companyCountry: string;
  financialProposal: number;
  timeline: string;
  technicalProposal: string;
  attachments: string;
  bidStatus: string;
  rejectionNote: string;
  submittedAt: string;
  documents: Array<{
    id: string;
    fileName: string;
    docType: string;
    fileUrl: string;
    status: string;
    ocrStatus: string;
    ocrProcessedAt: string | null;
    aiReviewStatus: string;
    aiReviewProcessedAt: string | null;
    createdAt: string;
  }>;
  requiredDocs: string;
}

interface ApplicantMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  statusCounts: Record<string, number>;
  totalBudgetSum: number;
  uniqueTenders: number;
  uniqueCompanies: number;
}

interface TenderInfo {
  id: string;
  title: string;
  deadline: string;
  status: string;
  bidCount: number;
}

interface PublishedTenderInfo {
  id: string;
  title: string;
  deadline: string;
  status: string;
  budgetMin: number;
  budgetMax: number;
  categoryTags: string;
  location: string;
  createdAt: string;
  bidCount: number;
  isClosed: boolean;
  applicantCount: number;
}

type SortField = keyof ApplicantRow;
type SortDir = 'asc' | 'desc';
type ViewMode = 'table' | 'cards';
type NavView = 'dashboard' | 'tenders' | 'live-tenders' | 'tender-detail' | 'tender-compare' | 'bid-compare' | 'bid-analysis' | 'bids' | 'applicants' | 'projects' | 'project-detail' | 'chat' | 'finance' | 'events' | 'profile' | 'company-settings' | 'documents' | 'agent' | 'staff' | 'contact-us' | 'privacy-policy' | 'admin';

// ─── Column definitions ───────────────────────────────────────────────

interface ColumnDef {
  key: keyof ApplicantRow;
  label: string;
  group: string;
  width?: string;
  sortable?: boolean;
  defaultVisible?: boolean;
}

const COLUMNS: ColumnDef[] = [
  // Applicant Info
  { key: 'applicantName', label: 'Applicant', group: 'Applicant', width: '180px', sortable: true, defaultVisible: true },
  { key: 'applicantEmail', label: 'Email', group: 'Applicant', width: '200px', sortable: true, defaultVisible: true },
  { key: 'applicantPhone', label: 'Phone', group: 'Applicant', width: '130px', sortable: false, defaultVisible: false },
  { key: 'applicantJobTitle', label: 'Job Title', group: 'Applicant', width: '140px', sortable: true, defaultVisible: false },
  { key: 'applicantLocation', label: 'Location', group: 'Applicant', width: '120px', sortable: true, defaultVisible: false },
  { key: 'applicantSkills', label: 'Skills', group: 'Applicant', width: '180px', sortable: false, defaultVisible: false },
  { key: 'applicantVerified', label: 'Verified', group: 'Applicant', width: '80px', sortable: true, defaultVisible: true },
  { key: 'applicantLicense', label: 'License #', group: 'Applicant', width: '120px', sortable: false, defaultVisible: false },
  { key: 'applicantTin', label: 'TIN', group: 'Applicant', width: '120px', sortable: false, defaultVisible: false },
  // Company Info
  { key: 'companyName', label: 'Company', group: 'Company', width: '180px', sortable: true, defaultVisible: true },
  { key: 'companyIndustry', label: 'Industry', group: 'Company', width: '120px', sortable: true, defaultVisible: false },
  { key: 'companyVerified', label: 'Co. Verified', group: 'Company', width: '100px', sortable: true, defaultVisible: false },
  { key: 'companyRegistration', label: 'Reg. #', group: 'Company', width: '120px', sortable: false, defaultVisible: false },
  { key: 'companyTin', label: 'Co. TIN', group: 'Company', width: '120px', sortable: false, defaultVisible: false },
  { key: 'companyCity', label: 'City', group: 'Company', width: '100px', sortable: true, defaultVisible: false },
  { key: 'companyCountry', label: 'Country', group: 'Company', width: '100px', sortable: true, defaultVisible: false },
  // Bid Details
  { key: 'financialProposal', label: 'Bid Amount', group: 'Bid', width: '130px', sortable: true, defaultVisible: true },
  { key: 'timeline', label: 'Timeline', group: 'Bid', width: '100px', sortable: true, defaultVisible: true },
  { key: 'bidStatus', label: 'Status', group: 'Bid', width: '120px', sortable: true, defaultVisible: true },
  { key: 'submittedAt', label: 'Submitted', group: 'Bid', width: '130px', sortable: true, defaultVisible: true },
  { key: 'technicalProposal', label: 'Technical', group: 'Bid', width: '200px', sortable: false, defaultVisible: false },
  { key: 'rejectionNote', label: 'Rejection Note', group: 'Bid', width: '180px', sortable: false, defaultVisible: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const STATUS_CONFIG: Record<string, { className: string; icon: React.ElementType; label: string }> = {
  pending_review: { className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: Clock, label: 'Pending Review' },
  shortlisted: { className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: ClipboardCheck, label: 'Shortlisted' },
  awarded: { className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', icon: Award, label: 'Awarded' },
  rejected: { className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: Ban, label: 'Rejected' },
};

const TENDER_STATUS_CONFIG: Record<string, { className: string; label: string; icon: React.ElementType }> = {
  draft: { className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Draft', icon: FileText },
  open: { className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'Open', icon: CheckCircle },
  closed: { className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Closed', icon: Lock },
  awarded: { className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', label: 'Awarded', icon: Award },
  cancelled: { className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Cancelled', icon: XCircle },
};

// ─── Main Component ───────────────────────────────────────────────────

export function ApplicantsView() {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const [rows, setRows] = useState<ApplicantRow[]>([]);
  const [meta, setMeta] = useState<ApplicantMeta | null>(null);
  const [publishedTenders, setPublishedTenders] = useState<PublishedTenderInfo[]>([]);
  const [openTenders, setOpenTenders] = useState<TenderInfo[]>([]);
  const [closedTenders, setClosedTenders] = useState<TenderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tenderFilter, setTenderFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('submittedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() =>
    new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
  );
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // ─── Selected tender for detail view ────────────────────────────
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [selectedTenderInfo, setSelectedTenderInfo] = useState<PublishedTenderInfo | null>(null);

  // ─── Document / OCR / AI Review state ───────────────────────────
  const [docUploadBidId, setDocUploadBidId] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState<Set<string>>(new Set());
  const [reviewLoading, setReviewLoading] = useState<Set<string>>(new Set());
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [viewingDocType, setViewingDocType] = useState<'ocr' | 'review'>('ocr');
  const [docOcrText, setDocOcrText] = useState<Record<string, string>>({});
  const [docReview, setDocReview] = useState<Record<string, Record<string, unknown>>>({});

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(PAGE_SIZE),
      };
      if (search) params.search = search;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (tenderFilter && tenderFilter !== 'all') params.tenderId = tenderFilter;
      // If a specific tender is selected, filter by it
      if (selectedTenderId) params.tenderId = selectedTenderId;

      const res = await api.get('/applicants', params);
      if (res.success) {
        setRows(res.data);
        setMeta(res.meta);
        setOpenTenders(res.openTenders || []);
        setClosedTenders(res.closedTenders || []);
        setPublishedTenders(res.publishedTenders || []);
      }
    } catch (err) {
      console.error('Fetch applicants error:', err);
      toast.error('Failed to load applicants');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, tenderFilter, selectedTenderId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When selecting a tender, set the info
  useEffect(() => {
    if (selectedTenderId && publishedTenders.length > 0) {
      const info = publishedTenders.find(t => t.id === selectedTenderId);
      if (info) setSelectedTenderInfo(info);
    } else {
      setSelectedTenderInfo(null);
    }
  }, [selectedTenderId, publishedTenders]);

  // Handle tender click → show applicants
  const handleTenderClick = (tenderId: string) => {
    setSelectedTenderId(tenderId);
    setTenderFilter(tenderId);
    setStatusFilter('all');
    setSearch('');
    setPage(1);
    setExpandedRow(null);
  };

  // Back to tenders list
  const handleBackToTenders = () => {
    setSelectedTenderId(null);
    setSelectedTenderInfo(null);
    setTenderFilter('all');
    setStatusFilter('all');
    setSearch('');
    setPage(1);
    setExpandedRow(null);
  };

  // ─── Document handlers ──────────────────────────────────────────
  const handleDocUpload = useCallback(async (bidId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', 'bid_attachment');
    formData.append('autoOcr', 'true');
    try {
      const res = await api.upload(`/bids/${bidId}/documents`, formData);
      if (res.success) {
        toast.success('Document uploaded successfully');
        fetchData();
      } else {
        toast.error(res.message || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setDocUploadBidId(null);
    }
  }, [fetchData]);

  const handleRunOcr = useCallback(async (docId: string) => {
    setOcrLoading(prev => new Set(prev).add(docId));
    try {
      await api.post(`/document-ocr/${docId}`);
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
          fetchData();
          toast.success('OCR completed');
        } else if (res.success && res.data?.ocrStatus === 'failed') {
          setOcrLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
          toast.error('OCR processing failed');
          fetchData();
        } else {
          await poll(attempts + 1);
        }
      };
      poll();
    } catch {
      setOcrLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
      toast.error('Failed to start OCR');
    }
  }, [fetchData]);

  const handleRunReview = useCallback(async (docId: string) => {
    setReviewLoading(prev => new Set(prev).add(docId));
    try {
      await api.post(`/document-review/${docId}`);
      const poll = async (attempts = 0): Promise<void> => {
        if (attempts > 30) {
          toast.error('AI Review processing timed out');
          setReviewLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
          return;
        }
        await new Promise(r => setTimeout(r, 2000));
        const res = await api.get(`/document-review/${docId}`);
        if (res.success && res.data?.aiReviewStatus === 'completed') {
          setReviewLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
          let reviewData = res.data.aiReview || {};
          if (typeof reviewData === 'string') {
            try { reviewData = JSON.parse(reviewData); } catch { reviewData = { summary: reviewData }; }
          }
          setDocReview(prev => ({ ...prev, [docId]: reviewData }));
          fetchData();
          toast.success('AI Review completed');
        } else if (res.success && res.data?.aiReviewStatus === 'failed') {
          setReviewLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
          toast.error('AI Review processing failed');
          fetchData();
        } else {
          await poll(attempts + 1);
        }
      };
      poll();
    } catch {
      setReviewLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
      toast.error('Failed to start AI Review');
    }
  }, [fetchData]);

  const handleViewDocDetail = useCallback(async (docId: string, type: 'ocr' | 'review') => {
    if (viewingDocId === docId && viewingDocType === type) {
      setViewingDocId(null);
      return;
    }
    setViewingDocId(docId);
    setViewingDocType(type);
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
            try {
              reviewData = JSON.parse(reviewData);
            } catch {
              reviewData = { summary: reviewData };
            }
          }
          setDocReview(prev => ({ ...prev, [docId]: reviewData }));
        }
      }
    } catch {
      toast.error('Failed to load document details');
    }
  }, [viewingDocId, viewingDocType, docOcrText, docReview]);

  const closeDocDetail = useCallback(() => {
    setViewingDocId(null);
  }, []);

  // Get unique tenders for filter dropdown (from closedTenders API data)
  const tenderOptions = useMemo(() => {
    return closedTenders.map(t => [t.id, t.title] as [string, string]);
  }, [closedTenders]);

  // Sorted rows (client-side sorting on current page)
  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        cmp = Number(aVal) - Number(bVal);
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortField, sortDir]);

  // Visible columns
  const activeColumns = useMemo(
    () => COLUMNS.filter(c => visibleColumns.has(c.key)),
    [visibleColumns]
  );

  // Column groups
  const columnGroups = useMemo(() => {
    const groups: Record<string, ColumnDef[]> = {};
    activeColumns.forEach(c => {
      if (!groups[c.group]) groups[c.group] = [];
      groups[c.group].push(c);
    });
    return groups;
  }, [activeColumns]);

  // Toggle column visibility
  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Sort icon
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  // Export CSV
  const exportCSV = () => {
    if (!rows.length) return;
    const headers = activeColumns.map(c => c.label);
    const csvRows = rows.map(row =>
      activeColumns.map(c => {
        let val = row[c.key];
        if (typeof val === 'boolean') val = val ? 'Yes' : 'No';
        if (typeof val === 'number') val = val.toLocaleString();
        val = String(val || '');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    );
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `applicants-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Spreadsheet exported successfully');
  };

  // Stats
  const statusCounts = meta?.statusCounts || {};
  const totalApplicants = meta?.total || 0;
  const totalBudget = meta?.totalBudgetSum || 0;
  const uniqueTenders = meta?.uniqueTenders || 0;
  const uniqueCompanies = meta?.uniqueCompanies || 0;

  // Published tenders stats
  const totalPublishedTenders = publishedTenders.length;
  const totalBidsAcrossTenders = publishedTenders.reduce((sum, t) => sum + t.bidCount, 0);
  const openTenderCount = publishedTenders.filter(t => !t.isClosed).length;
  const closedTenderCount = publishedTenders.filter(t => t.isClosed).length;

  // ─── Render ───────────────────────────────────────────────────────

  // If a tender is selected, show the applicant detail view
  if (selectedTenderId && selectedTenderInfo) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6">
        {/* Header with back button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={handleBackToTenders}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <Gavel className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{selectedTenderInfo.title}</h1>
              <p className="text-sm text-muted-foreground">
                {rows.length} applicant{rows.length !== 1 ? 's' : ''} for this <span className="text-emerald-600 dark:text-emerald-400 font-medium">Published Tender</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!rows.length}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Tender summary card */}
        <Card className="border-emerald-200/60 dark:border-emerald-800/30 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/10 dark:to-background">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              <div>
                <span className="text-xs text-muted-foreground">Status</span>
                <div className="mt-1">
                  {(() => {
                    const cfg = TENDER_STATUS_CONFIG[selectedTenderInfo.status] || TENDER_STATUS_CONFIG.open;
                    const Icon = cfg.icon;
                    return <Badge className={`text-[10px] px-2 py-0.5 border-0 rounded-lg ${cfg.className}`}><Icon className="h-3 w-3 mr-1" />{cfg.label}</Badge>;
                  })()}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Budget</span>
                <p className="text-sm font-semibold">{formatCurrency(selectedTenderInfo.budgetMin)} – {formatCurrency(selectedTenderInfo.budgetMax)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Deadline</span>
                <p className="text-sm font-semibold">{formatDate(selectedTenderInfo.deadline)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Location</span>
                <p className="text-sm font-medium">{selectedTenderInfo.location || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Total Bids</span>
                <p className="text-sm font-semibold">{selectedTenderInfo.bidCount}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Category</span>
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {selectedTenderInfo.categoryTags.split(',').filter(Boolean).slice(0, 3).map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">{tag.trim()}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applicant visibility info */}
        {!selectedTenderInfo.isClosed && (
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/30">
            <CardContent className="p-3 flex items-start gap-3">
              <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Applicant details are sealed while this Published Tender is still open</p>
                <p className="text-xs text-amber-700/70 dark:text-amber-400/60 mt-0.5">
                  To protect bid integrity, applicant details will be revealed once the deadline passes on {formatDate(selectedTenderInfo.deadline)}.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status filter pills */}
        {selectedTenderInfo.isClosed && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground mr-1">Status:</span>
            {[
              { key: 'all', label: 'All', count: totalApplicants },
              { key: 'pending_review', label: 'Pending', count: statusCounts.pending_review || 0 },
              { key: 'shortlisted', label: 'Shortlisted', count: statusCounts.shortlisted || 0 },
              { key: 'awarded', label: 'Awarded', count: statusCounts.awarded || 0 },
              { key: 'rejected', label: 'Rejected', count: statusCounts.rejected || 0 },
            ].map(s => (
              <Button
                key={s.key}
                variant={statusFilter === s.key ? 'default' : 'outline'}
                size="sm"
                className={`h-7 text-xs ${statusFilter === s.key ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => { setStatusFilter(s.key); setPage(1); }}
              >
                {s.label}
                <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                  {s.count}
                </Badge>
              </Button>
            ))}
          </div>
        )}

        {/* Toolbar: search, view mode, column picker */}
        {selectedTenderInfo.isClosed && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search applicants, companies..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex items-center border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-3 rounded-none"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-3 rounded-none"
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>

              {/* Column picker */}
              <DropdownMenu open={columnMenuOpen} onOpenChange={setColumnMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Columns3 className="h-4 w-4 mr-1" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
                  {['Applicant', 'Company', 'Bid'].map(group => (
                    <div key={group}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group}</div>
                      {COLUMNS.filter(c => c.group === group).map(c => (
                        <DropdownMenuItem
                          key={c.key}
                          className="flex items-center gap-2 cursor-pointer"
                          onSelect={(e) => { e.preventDefault(); toggleColumn(c.key); }}
                        >
                          {visibleColumns.has(c.key)
                            ? <CheckSquare className="h-3.5 w-3.5 text-primary" />
                            : <Square className="h-3.5 w-3.5 text-muted-foreground" />
                          }
                          <span className="text-sm">{c.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ))}
                  <div className="border-t mt-1 pt-1 px-2 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs flex-1"
                      onClick={() => setVisibleColumns(new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key)))}
                    >
                      Reset
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs flex-1"
                      onClick={() => setVisibleColumns(new Set(COLUMNS.map(c => c.key)))}
                    >
                      Show All
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* Main content */}
        {loading && !rows.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading applicants...</p>
          </div>
        ) : !selectedTenderInfo.isClosed ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-4">
              <div className="p-4 rounded-2xl bg-muted/50">
                <Lock className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">Applicants Not Yet Visible</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This Published Tender is still accepting bids. Applicant details will be revealed after the deadline on {formatDate(selectedTenderInfo.deadline)}.
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                  <Users className="h-3 w-3 mr-1" />
                  {selectedTenderInfo.bidCount} bid{selectedTenderInfo.bidCount !== 1 ? 's' : ''} submitted
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                  <Timer className="h-3 w-3 mr-1" />
                  {(() => { const d = daysUntil(selectedTenderInfo.deadline); return d <= 0 ? 'Closing today' : `${d} day${d !== 1 ? 's' : ''} remaining`; })()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ) : !rows.length ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-4">
              <div className="p-4 rounded-2xl bg-muted/50">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">No Applicants for This Published Tender</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {search || statusFilter !== 'all'
                    ? 'Try adjusting your filters or search'
                    : 'No bids were submitted for this tender before the deadline closed.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          /* ─── Spreadsheet Table View ─── */
          <Card className="overflow-hidden border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[800px]">
                {/* Column group headers */}
                <thead>
                  {/* Group row */}
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground w-10">#</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-muted-foreground w-10"></th>
                    {Object.entries(columnGroups).map(([group, cols]) => (
                      <th
                        key={group}
                        colSpan={cols.length}
                        className="px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider border-l border-border"
                      >
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${
                          group === 'Applicant' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          group === 'Company' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' :
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                          {group === 'Applicant' && <Users className="h-3 w-3" />}
                          {group === 'Company' && <Building2 className="h-3 w-3" />}
                          {group === 'Bid' && <Gavel className="h-3 w-3" />}
                          {group}
                        </span>
                      </th>
                    ))}
                  </tr>
                  {/* Column headers row */}
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground w-10">#</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-muted-foreground w-10"></th>
                    {activeColumns.map(col => (
                      <th
                        key={col.key}
                        className={`px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground border-l border-border ${col.sortable ? 'cursor-pointer hover:bg-muted/80 select-none' : ''}`}
                        style={{ width: col.width, minWidth: col.width }}
                        onClick={() => col.sortable && handleSort(col.key)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {col.sortable && <SortIcon field={col.key} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, idx) => {
                    const isExpanded = expandedRow === row.id;
                    const bidCfg = STATUS_CONFIG[row.bidStatus] || STATUS_CONFIG.pending_review;
                    const BidStatusIcon = bidCfg.icon;

                    return (
                      <tr
                        key={row.id}
                        className={`border-b transition-colors hover:bg-muted/30 ${isExpanded ? 'bg-muted/20' : ''} ${row.bidStatus === 'awarded' ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : ''}`}
                      >
                        {/* Row number */}
                        <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">
                          {(page - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        {/* Expand toggle */}
                        <td className="px-1 py-2.5 text-center">
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : row.id)}
                            className="p-0.5 rounded hover:bg-muted/80 transition-colors"
                          >
                            {isExpanded
                              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            }
                          </button>
                        </td>
                        {/* Data cells */}
                        {activeColumns.map(col => (
                          <td
                            key={col.key}
                            className="px-3 py-2.5 border-l border-border text-xs"
                            style={{ maxWidth: col.width }}
                          >
                            <CellRenderer row={row} col={col} setView={setView} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expanded row detail */}
            {expandedRow && sortedRows.find(r => r.id === expandedRow) && (
              <ExpandedRowDetail
                row={sortedRows.find(r => r.id === expandedRow)!}
                setView={setView}
                docUploadBidId={docUploadBidId}
                ocrLoading={ocrLoading}
                reviewLoading={reviewLoading}
                viewingDocId={viewingDocId}
                viewingDocType={viewingDocType}
                docOcrText={docOcrText}
                docReview={docReview}
                onUploadDoc={handleDocUpload}
                onSetDocUploadBidId={setDocUploadBidId}
                onRunOcr={handleRunOcr}
                onRunReview={handleRunReview}
                onViewDocDetail={handleViewDocDetail}
                onCloseDocDetail={closeDocDetail}
              />
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Showing {rows.length} of {totalApplicants} applicants
                {meta?.totalPages && meta.totalPages > 1 && ` · Page ${page} of ${meta.totalPages}`}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium px-2">{page}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={!meta || page >= meta.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          /* ─── Card View ─── */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {sortedRows.map((row) => {
              const bidCfg = STATUS_CONFIG[row.bidStatus] || STATUS_CONFIG.pending_review;
              const BidStatusIcon = bidCfg.icon;
              return (
                <Card key={row.id} className={`overflow-hidden hover:shadow-md transition-shadow ${row.bidStatus === 'awarded' ? 'border-emerald-300 dark:border-emerald-700' : ''}`}>
                  <CardContent className="p-4">
                    {/* Header: applicant + status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-200 to-orange-400 dark:from-orange-800 dark:to-orange-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {row.applicantName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-sm truncate">{row.applicantName}</p>
                            {row.applicantVerified && <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{row.companyName}</p>
                        </div>
                      </div>
                      <Badge className={`text-[10px] px-2 py-0.5 border-0 rounded-lg shrink-0 ${bidCfg.className}`}>
                        <BidStatusIcon className="h-3 w-3 mr-1" />
                        {bidCfg.label}
                      </Badge>
                    </div>

                    {/* Detail grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
                      <div>
                        <span className="text-muted-foreground">Bid Amount</span>
                        <p className="font-semibold">{formatCurrency(row.financialProposal)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Timeline</span>
                        <p className="font-semibold">{row.timeline}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Submitted</span>
                        <p>{formatDate(row.submittedAt)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Location</span>
                        <p className="truncate">{row.applicantLocation || row.tenderLocation}</p>
                      </div>
                    </div>

                    {/* Skills */}
                    {row.applicantSkills && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {row.applicantSkills.split(',').slice(0, 4).map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {skill.trim()}
                          </Badge>
                        ))}
                        {row.applicantSkills.split(',').length > 4 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            +{row.applicantSkills.split(',').length - 4}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-1.5">
                        {row.companyVerified && (
                          <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-0">
                            <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />Verified Co.
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Default view: Published Tenders list ─────────────────────────
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <FolderOpen className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Published Tenders</h1>
            <p className="text-sm text-muted-foreground">
              {totalPublishedTenders > 0
                ? `${totalPublishedTenders} published tender${totalPublishedTenders !== 1 ? 's' : ''} · ${totalBidsAcrossTenders} total bid${totalBidsAcrossTenders !== 1 ? 's' : ''} received`
                : 'Your published tenders and their applicants'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background border-emerald-200/50 dark:border-emerald-800/30">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <FileSearch className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Published Tenders</p>
              <p className="text-lg font-bold">{totalPublishedTenders}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-background border-orange-200/50 dark:border-orange-800/30">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Bids</p>
              <p className="text-lg font-bold">{totalBidsAcrossTenders}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-background border-amber-200/50 dark:border-amber-800/30">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Hourglass className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Still Open</p>
              <p className="text-lg font-bold">{openTenderCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal-50 to-white dark:from-teal-950/30 dark:to-background border-teal-200/50 dark:border-teal-800/30">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
              <Lock className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Closed</p>
              <p className="text-lg font-bold">{closedTenderCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info banner */}
      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/30">
        <CardContent className="p-3 flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Applicant details are visible only after the Published Tender deadline closes</p>
            <p className="text-xs text-amber-700/70 dark:text-amber-400/60 mt-0.5">
              To protect bid integrity, applicant details remain sealed while your tender is still accepting bids.
              Click on a closed tender to view its applicants.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading && !publishedTenders.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading published tenders...</p>
        </div>
      ) : !publishedTenders.length ? (
        /* Empty state */
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4">
            <div className="p-4 rounded-2xl bg-muted/50">
              <FolderOpen className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">No Published Tenders Yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create and publish tenders to start receiving bids from applicants.
              </p>
            </div>
            <Button variant="outline" onClick={() => setView('tenders')}>
              <FileSearch className="h-4 w-4 mr-2" />
              Create a Tender
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* ─── Published Tenders Grid ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {publishedTenders.map(tender => {
            const cfg = TENDER_STATUS_CONFIG[tender.status] || TENDER_STATUS_CONFIG.open;
            const StatusIcon = cfg.icon;
            const daysLeft = daysUntil(tender.deadline);
            const isOpen = !tender.isClosed;
            const urgencyClass = isOpen
              ? (daysLeft <= 3 ? 'border-red-200 dark:border-red-800/50' : daysLeft <= 7 ? 'border-amber-200 dark:border-amber-800/50' : 'border-emerald-200 dark:border-emerald-800/50')
              : 'border-border';

            return (
              <Card
                key={tender.id}
                className={`overflow-hidden hover:shadow-md transition-all cursor-pointer group ${urgencyClass} ${
                  tender.status === 'awarded' ? 'border-blue-200 dark:border-blue-800/50' : ''
                }`}
                onClick={() => handleTenderClick(tender.id)}
              >
                <CardContent className="p-4">
                  {/* Header: title + status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-2">
                      <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {tender.title}
                      </h3>
                    </div>
                    <Badge className={`text-[10px] px-2 py-0.5 border-0 rounded-lg shrink-0 ${cfg.className}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {cfg.label}
                    </Badge>
                  </div>

                  {/* Budget */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold">
                      {formatCurrency(tender.budgetMin)} – {formatCurrency(tender.budgetMax)}
                    </span>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{tender.location || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{formatDate(tender.deadline)}</span>
                    </div>
                  </div>

                  {/* Deadline countdown for open tenders */}
                  {isOpen && (
                    <div className="mb-3">
                      <Badge className={`text-[9px] px-2 py-0.5 border-0 rounded-md ${
                        daysLeft <= 3 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                        daysLeft <= 7 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      }`}>
                        <Timer className="h-3 w-3 mr-1" />
                        {daysLeft <= 0 ? 'Closing today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                      </Badge>
                    </div>
                  )}

                  {/* Category tags */}
                  {tender.categoryTags && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {tender.categoryTags.split(',').filter(Boolean).slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">
                          <Tag className="h-2.5 w-2.5 mr-0.5" />
                          {tag.trim()}
                        </Badge>
                      ))}
                      {tender.categoryTags.split(',').filter(Boolean).length > 3 && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                          +{tender.categoryTags.split(',').filter(Boolean).length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Footer: bid count + action */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                        <Users className="h-3 w-3 mr-1" />
                        {tender.applicantCount || tender.bidCount} bid{((tender.applicantCount || tender.bidCount) !== 1) ? 's' : ''}
                      </Badge>
                      {tender.isClosed && (tender.applicantCount || tender.bidCount) > 0 && (
                        <Badge className="text-[9px] px-1.5 py-0 bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border-0">
                          <Eye className="h-2.5 w-2.5 mr-0.5" />
                          View applicants
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-0.5 text-[9px] text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 h-5 px-1"
                        onClick={(e) => { e.stopPropagation(); setView('bids', { tenderId: tender.id }); }}
                      >
                        <Gavel className="h-2.5 w-2.5" />
                        Track Bids
                      </Button>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Cell renderer ────────────────────────────────────────────────────

function CellRenderer({ row, col, setView }: { row: ApplicantRow; col: ColumnDef; setView: (v: NavView, p?: Record<string, string>) => void }) {
  const val = row[col.key];

  switch (col.key) {
    case 'applicantName':
      return (
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-orange-200 to-orange-400 dark:from-orange-800 dark:to-orange-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
            {String(val).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-medium truncate">{String(val)}</span>
              {row.applicantVerified && <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />}
            </div>
            <span className="text-[10px] text-muted-foreground truncate block">{row.applicantJobTitle}</span>
          </div>
        </div>
      );

    case 'applicantEmail':
      return (
        <div className="flex items-center gap-1.5 min-w-0">
          <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="truncate text-muted-foreground">{String(val)}</span>
        </div>
      );

    case 'applicantPhone':
      return (
        <div className="flex items-center gap-1.5 min-w-0">
          <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="truncate">{String(val) || '—'}</span>
        </div>
      );

    case 'applicantVerified':
    case 'companyVerified':
      return val
        ? <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-0 rounded-md"><ShieldCheck className="h-3 w-3 mr-0.5" />Yes</Badge>
        : <Badge className="text-[9px] px-1.5 py-0 bg-gray-100 text-gray-500 border-0 rounded-md">No</Badge>;

    case 'companyName':
      return (
        <div className="flex items-center gap-1.5 min-w-0">
          <Building2 className="h-3 w-3 text-violet-500 shrink-0" />
          <span className="font-medium truncate">{String(val) || 'Individual'}</span>
        </div>
      );

    case 'companyIndustry':
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          <Briefcase className="h-2.5 w-2.5 mr-0.5" />
          {String(val) || '—'}
        </Badge>
      );

    case 'financialProposal':
      return (
        <span className="font-semibold font-mono">
          {typeof val === 'number' ? formatCurrency(val) : '—'}
        </span>
      );

    case 'timeline':
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0"><Clock className="h-2.5 w-2.5 mr-0.5" />{String(val)}</Badge>;

    case 'bidStatus': {
      const cfg = STATUS_CONFIG[String(val)] || STATUS_CONFIG.pending_review;
      const Icon = cfg.icon;
      return (
        <Badge className={`text-[9px] px-2 py-0.5 border-0 rounded-lg ${cfg.className}`}>
          <Icon className="h-3 w-3 mr-1" />
          {cfg.label}
        </Badge>
      );
    }

    case 'submittedAt':
      return <span className="text-muted-foreground">{formatDate(String(val))}</span>;

    case 'technicalProposal':
      return (
        <span className="truncate text-muted-foreground block" style={{ maxWidth: '200px' }}>
          {String(val) ? String(val).substring(0, 80) + (String(val).length > 80 ? '...' : '') : '—'}
        </span>
      );

    case 'applicantSkills':
      return (
        <div className="flex flex-wrap gap-0.5">
          {String(val).split(',').filter(Boolean).slice(0, 3).map((skill, i) => (
            <Badge key={i} variant="secondary" className="text-[9px] px-1 py-0">
              {skill.trim()}
            </Badge>
          ))}
          {String(val).split(',').filter(Boolean).length > 3 && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0">+{String(val).split(',').filter(Boolean).length - 3}</Badge>
          )}
        </div>
      );

    case 'rejectionNote':
      return val
        ? <span className="text-red-600 dark:text-red-400 truncate block" style={{ maxWidth: '180px' }}>{String(val)}</span>
        : <span className="text-muted-foreground">—</span>;

    case 'applicantLicense':
    case 'applicantTin':
    case 'companyRegistration':
    case 'companyTin':
      return <span className="font-mono text-xs text-muted-foreground">{String(val) || '—'}</span>;

    case 'companyCity':
    case 'companyCountry':
      return <span className="truncate">{String(val) || '—'}</span>;

    case 'applicantLocation':
      return (
        <div className="flex items-center gap-1 min-w-0">
          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="truncate">{String(val) || '—'}</span>
        </div>
      );

    default:
      return <span className="truncate">{String(val ?? '—')}</span>;
  }
}

// ─── Status badge helpers ─────────────────────────────────────────────

function OcrStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Badge className="text-[9px] px-1.5 py-0 border-0 rounded-md bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"><CheckCircle2 className="h-3 w-3 mr-0.5" />OCR Done</Badge>;
    case 'processing':
      return <Badge className="text-[9px] px-1.5 py-0 border-0 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><Loader2 className="h-3 w-3 mr-0.5 animate-spin" />Processing</Badge>;
    case 'failed':
      return <Badge className="text-[9px] px-1.5 py-0 border-0 rounded-md bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"><FileX className="h-3 w-3 mr-0.5" />Failed</Badge>;
    default:
      return <Badge className="text-[9px] px-1.5 py-0 border-0 rounded-md bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">No OCR</Badge>;
  }
}

function ReviewStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Badge className="text-[9px] px-1.5 py-0 border-0 rounded-md bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"><CheckCircle2 className="h-3 w-3 mr-0.5" />Reviewed</Badge>;
    case 'processing':
      return <Badge className="text-[9px] px-1.5 py-0 border-0 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><Loader2 className="h-3 w-3 mr-0.5 animate-spin" />Analyzing</Badge>;
    case 'failed':
      return <Badge className="text-[9px] px-1.5 py-0 border-0 rounded-md bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"><FileX className="h-3 w-3 mr-0.5" />Failed</Badge>;
    default:
      return <Badge className="text-[9px] px-1.5 py-0 border-0 rounded-md bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">No Review</Badge>;
  }
}

function AssessmentBadge({ assessment }: { assessment: string }) {
  switch (assessment) {
    case 'approved':
      return <Badge className="text-[10px] px-2 py-0.5 border-0 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><ThumbsUp className="h-3 w-3 mr-0.5" />Approved</Badge>;
    case 'conditionally_approved':
      return <Badge className="text-[10px] px-2 py-0.5 border-0 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><AlertTriangle className="h-3 w-3 mr-0.5" />Conditional</Badge>;
    case 'rejected':
      return <Badge className="text-[10px] px-2 py-0.5 border-0 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"><ThumbsDown className="h-3 w-3 mr-0.5" />Rejected</Badge>;
    case 'needs_clarification':
      return <Badge className="text-[10px] px-2 py-0.5 border-0 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"><Info className="h-3 w-3 mr-0.5" />Needs Clarification</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px]">{assessment}</Badge>;
  }
}

function RiskBadge({ level }: { level: string }) {
  switch (level) {
    case 'low':
      return <Badge className="text-[9px] px-1.5 py-0 border-0 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Low Risk</Badge>;
    case 'medium':
      return <Badge className="text-[9px] px-1.5 py-0 border-0 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Medium Risk</Badge>;
    case 'high':
      return <Badge className="text-[9px] px-1.5 py-0 border-0 rounded-md bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">High Risk</Badge>;
    case 'critical':
      return <Badge className="text-[9px] px-1.5 py-0 border-0 rounded-md bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200 font-bold">Critical Risk</Badge>;
    default:
      return <Badge variant="secondary" className="text-[9px]">{level}</Badge>;
  }
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const color = clampedScore < 40 ? 'bg-red-500' : clampedScore < 70 ? 'bg-amber-500' : 'bg-emerald-500';
  const textColor = clampedScore < 40 ? 'text-red-600 dark:text-red-400' : clampedScore < 70 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${textColor}`}>{clampedScore}%</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${clampedScore}%` }} />
      </div>
    </div>
  );
}

// ─── Document Detail Panel ───────────────────────────────────────────

interface DocumentDetailPanelProps {
  docId: string;
  type: 'ocr' | 'review';
  ocrText: string | undefined;
  reviewData: Record<string, unknown> | undefined;
  onClose: () => void;
}

function DocumentDetailPanel({ docId, type, ocrText, reviewData, onClose }: DocumentDetailPanelProps) {
  if (type === 'ocr') {
    return (
      <Card className="border-teal-200 dark:border-teal-800/50 bg-teal-50/30 dark:bg-teal-950/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ScanSearch className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <h5 className="text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wider">OCR Extracted Text</h5>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border bg-white dark:bg-background p-3 text-xs whitespace-pre-wrap font-mono leading-relaxed custom-scrollbar">
            {ocrText || 'No OCR text available. Run OCR first to extract text from this document.'}
          </div>
        </CardContent>
      </Card>
    );
  }

  // AI Review panel
  const review = reviewData as Record<string, unknown> | undefined;
  const overallAssessment = String(review?.overallAssessment || '');
  const complianceScore = Number(review?.complianceScore ?? 0);
  const completenessScore = Number(review?.completenessScore ?? 0);
  const riskLevel = String(review?.riskLevel || '');
  const findings = Array.isArray(review?.findings) ? (review.findings as Array<Record<string, string>>) : [];
  const strengths = Array.isArray(review?.strengths) ? (review.strengths as string[]) : [];
  const weaknesses = Array.isArray(review?.weaknesses) ? (review.weaknesses as string[]) : [];
  const missingElements = Array.isArray(review?.missingElements) ? (review.missingElements as string[]) : [];
  const recommendations = Array.isArray(review?.recommendations) ? (review.recommendations as string[]) : [];
  const summary = String(review?.summary || '');

  return (
    <Card className="border-violet-200 dark:border-violet-800/50 bg-violet-50/30 dark:bg-violet-950/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <h5 className="text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wider">AI Document Review</h5>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Assessment & Risk */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {overallAssessment && <AssessmentBadge assessment={overallAssessment} />}
          {riskLevel && <RiskBadge level={riskLevel} />}
        </div>

        {/* Score bars */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <ScoreBar label="Compliance" score={complianceScore} />
          <ScoreBar label="Completeness" score={completenessScore} />
        </div>

        {/* Findings */}
        {findings.length > 0 && (
          <div className="mb-3">
            <h6 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <AlertOctagon className="h-3 w-3" /> Findings
            </h6>
            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
              {findings.map((f, i) => {
                const severityColor =
                  f.severity === 'critical' ? 'border-red-400 bg-red-50 dark:bg-red-950/20' :
                  f.severity === 'high' ? 'border-red-300 bg-red-50/50 dark:bg-red-950/10' :
                  f.severity === 'medium' ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/10' :
                  'border-blue-300 bg-blue-50/50 dark:bg-blue-950/10';
                const severityBadge =
                  f.severity === 'critical' ? 'bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200' :
                  f.severity === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                  f.severity === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
                return (
                  <div key={i} className={`text-[10px] p-1.5 rounded border ${severityColor}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Badge className={`text-[8px] px-1 py-0 border-0 rounded ${severityBadge}`}>{f.severity}</Badge>
                      <span className="font-medium">{f.category}</span>
                    </div>
                    <p className="text-muted-foreground">{f.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Strengths, Weaknesses, Missing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          {strengths.length > 0 && (
            <div>
              <h6 className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" /> Strengths
              </h6>
              <ul className="space-y-0.5 max-h-24 overflow-y-auto custom-scrollbar">
                {strengths.map((s, i) => <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 mt-0.5 shrink-0" />{s}</li>)}
              </ul>
            </div>
          )}
          {weaknesses.length > 0 && (
            <div>
              <h6 className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <ThumbsDown className="h-3 w-3" /> Weaknesses
              </h6>
              <ul className="space-y-0.5 max-h-24 overflow-y-auto custom-scrollbar">
                {weaknesses.map((w, i) => <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1"><AlertTriangle className="h-2.5 w-2.5 text-amber-500 mt-0.5 shrink-0" />{w}</li>)}
              </ul>
            </div>
          )}
          {missingElements.length > 0 && (
            <div>
              <h6 className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <FileX className="h-3 w-3" /> Missing
              </h6>
              <ul className="space-y-0.5 max-h-24 overflow-y-auto custom-scrollbar">
                {missingElements.map((m, i) => <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1"><X className="h-2.5 w-2.5 text-red-500 mt-0.5 shrink-0" />{m}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mb-3">
            <h6 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <BarChart3 className="h-3 w-3" /> Recommendations
            </h6>
            <ul className="space-y-0.5 max-h-24 overflow-y-auto custom-scrollbar">
              {recommendations.map((r, i) => <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1"><ChevronRight className="h-2.5 w-2.5 text-violet-500 mt-0.5 shrink-0" />{r}</li>)}
            </ul>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className="p-2 rounded-lg bg-violet-100/50 dark:bg-violet-900/20 border border-violet-200/50 dark:border-violet-800/30">
            <h6 className="text-[10px] font-semibold text-violet-700 dark:text-violet-300 mb-0.5">Summary</h6>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{summary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Expanded row detail panel ────────────────────────────────────────

interface ExpandedRowDetailProps {
  row: ApplicantRow;
  setView: (v: NavView, p?: Record<string, string>) => void;
  docUploadBidId: string | null;
  ocrLoading: Set<string>;
  reviewLoading: Set<string>;
  viewingDocId: string | null;
  viewingDocType: 'ocr' | 'review';
  docOcrText: Record<string, string>;
  docReview: Record<string, Record<string, unknown>>;
  onUploadDoc: (bidId: string, file: File) => void;
  onSetDocUploadBidId: (bidId: string | null) => void;
  onRunOcr: (docId: string) => void;
  onRunReview: (docId: string) => void;
  onViewDocDetail: (docId: string, type: 'ocr' | 'review') => void;
  onCloseDocDetail: () => void;
}

function ExpandedRowDetail({
  row, setView,
  docUploadBidId, ocrLoading, reviewLoading,
  viewingDocId, viewingDocType, docOcrText, docReview,
  onUploadDoc, onSetDocUploadBidId, onRunOcr, onRunReview, onViewDocDetail, onCloseDocDetail,
}: ExpandedRowDetailProps) {
  return (
    <div className="border-t bg-muted/10 px-6 py-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Applicant details */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-orange-500" /> Applicant Details
          </h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Full Name</span>
              <span className="font-medium">{row.applicantName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{row.applicantEmail}</span>
            </div>
            {row.applicantPhone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{row.applicantPhone}</span>
              </div>
            )}
            {row.applicantJobTitle && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Job Title</span>
                <span>{row.applicantJobTitle}</span>
              </div>
            )}
            {row.applicantLocation && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location</span>
                <span>{row.applicantLocation}</span>
              </div>
            )}
            {row.applicantLicense && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">License #</span>
                <span className="font-mono">{row.applicantLicense}</span>
              </div>
            )}
            {row.applicantTin && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">TIN</span>
                <span className="font-mono">{row.applicantTin}</span>
              </div>
            )}
          </div>
        </div>

        {/* Company details */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-violet-500" /> Company Details
          </h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company</span>
              <span className="font-medium">{row.companyName}</span>
            </div>
            {row.companyIndustry && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Industry</span>
                <span>{row.companyIndustry}</span>
              </div>
            )}
            {row.companyRegistration && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registration</span>
                <span className="font-mono">{row.companyRegistration}</span>
              </div>
            )}
            {row.companyTin && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Company TIN</span>
                <span className="font-mono">{row.companyTin}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">City / Country</span>
              <span>{[row.companyCity, row.companyCountry].filter(Boolean).join(', ') || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Verified</span>
              {row.companyVerified
                ? <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-0"><ShieldCheck className="h-3 w-3 mr-0.5" />Yes</Badge>
                : <span className="text-muted-foreground">No</span>
              }
            </div>
          </div>
        </div>

        {/* Bid details */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Gavel className="h-3.5 w-3.5 text-emerald-500" /> Bid Details
          </h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bid Amount</span>
              <span className="font-semibold">{formatCurrency(row.financialProposal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Timeline</span>
              <span>{row.timeline}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span>{row.bidStatus.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted</span>
              <span>{formatDate(row.submittedAt)}</span>
            </div>
            {row.rejectionNote && (
              <div>
                <span className="text-muted-foreground">Rejection Note</span>
                <p className="text-red-600 dark:text-red-400 mt-0.5 text-[11px]">{row.rejectionNote}</p>
              </div>
            )}
          </div>
          <div className="mt-3 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs w-full"
              onClick={() => setView('tender-detail', { id: row.tenderId })}
            >
              <FileSearch className="h-3 w-3 mr-1" />
              View Tender Detail
            </Button>
          </div>
        </div>
      </div>

      {/* Skills bar */}
      {row.applicantSkills && (
        <div className="mt-4 pt-3 border-t">
          <span className="text-xs text-muted-foreground mr-2">Skills:</span>
          {row.applicantSkills.split(',').filter(Boolean).map((skill, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0.5 mr-1">
              {skill.trim()}
            </Badge>
          ))}
        </div>
      )}

      {/* Technical proposal excerpt */}
      {row.technicalProposal && (
        <div className="mt-3 pt-3 border-t">
          <span className="text-xs text-muted-foreground">Technical Proposal:</span>
          <p className="text-xs mt-1 text-muted-foreground line-clamp-3 whitespace-pre-wrap">
            {row.technicalProposal}
          </p>
        </div>
      )}

      {/* ─── Documents & AI Review Section ─── */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            Documents & AI Review
            {row.requiredDocs && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ml-1">
                Required: {row.requiredDocs}
              </Badge>
            )}
          </h4>
          <div className="relative">
            <input
              type="file"
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadDoc(row.id, file);
                e.target.value = '';
              }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            />
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onSetDocUploadBidId(row.id)}>
              <Upload className="h-3 w-3 mr-1" />
              Upload Document
            </Button>
          </div>
        </div>

        {row.documents && row.documents.length > 0 ? (
          <div className="space-y-2">
            {row.documents.map((doc) => (
              <div key={doc.id} className="rounded-lg border bg-card p-3">
                {/* Document header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{doc.fileName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-[8px] px-1 py-0">{doc.docType}</Badge>
                        <span className="text-[9px] text-muted-foreground">{formatDate(doc.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <OcrStatusBadge status={doc.ocrStatus} />
                    <ReviewStatusBadge status={doc.aiReviewStatus} />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2 border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-300 dark:hover:bg-teal-950/20"
                    disabled={ocrLoading.has(doc.id) || doc.ocrStatus === 'processing'}
                    onClick={() => onRunOcr(doc.id)}
                  >
                    {ocrLoading.has(doc.id) || doc.ocrStatus === 'processing'
                      ? <><Loader2 className="h-3 w-3 mr-0.5 animate-spin" />Running OCR</>
                      : <><ScanSearch className="h-3 w-3 mr-0.5" />Run OCR</>
                    }
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2 border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/20"
                    disabled={
                      reviewLoading.has(doc.id) ||
                      doc.aiReviewStatus === 'processing' ||
                      doc.ocrStatus !== 'completed'
                    }
                    onClick={() => onRunReview(doc.id)}
                  >
                    {reviewLoading.has(doc.id) || doc.aiReviewStatus === 'processing'
                      ? <><Loader2 className="h-3 w-3 mr-0.5 animate-spin" />Analyzing</>
                      : <><Brain className="h-3 w-3 mr-0.5" />AI Review</>
                    }
                  </Button>
                  {doc.ocrStatus === 'completed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400"
                      onClick={() => onViewDocDetail(doc.id, 'ocr')}
                    >
                      <Eye className="h-3 w-3 mr-0.5" />
                      View OCR Text
                    </Button>
                  )}
                  {doc.aiReviewStatus === 'completed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2 text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400"
                      onClick={() => onViewDocDetail(doc.id, 'review')}
                    >
                      <FileCheck className="h-3 w-3 mr-0.5" />
                      View AI Review
                    </Button>
                  )}
                </div>

                {/* Slide-down detail panel */}
                {viewingDocId === doc.id && (
                  <div className="mt-3">
                    <DocumentDetailPanel
                      docId={doc.id}
                      type={viewingDocType}
                      ocrText={docOcrText[doc.id]}
                      reviewData={docReview[doc.id]}
                      onClose={onCloseDocDetail}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center">
            <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground">No documents uploaded yet</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              Upload bid documents to run OCR extraction and AI review
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
