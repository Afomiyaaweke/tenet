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
  Hourglass,
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

type SortField = keyof ApplicantRow;
type SortDir = 'asc' | 'desc';
type ViewMode = 'table' | 'cards';

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
  // Tender Info
  { key: 'tenderTitle', label: 'Tender', group: 'Tender', width: '220px', sortable: true, defaultVisible: true },
  { key: 'tenderStatus', label: 'T. Status', group: 'Tender', width: '100px', sortable: true, defaultVisible: false },
  { key: 'tenderBudgetMin', label: 'Budget Min', group: 'Tender', width: '120px', sortable: true, defaultVisible: false },
  { key: 'tenderBudgetMax', label: 'Budget Max', group: 'Tender', width: '120px', sortable: true, defaultVisible: false },
  { key: 'tenderDeadline', label: 'Deadline', group: 'Tender', width: '120px', sortable: true, defaultVisible: false },
  { key: 'tenderLocation', label: 'T. Location', group: 'Tender', width: '120px', sortable: true, defaultVisible: false },
  { key: 'categoryTags', label: 'Categories', group: 'Tender', width: '150px', sortable: false, defaultVisible: false },
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

const TENDER_STATUS_CONFIG: Record<string, { className: string; label: string }> = {
  draft: { className: 'bg-gray-100 text-gray-700', label: 'Draft' },
  open: { className: 'bg-emerald-100 text-emerald-700', label: 'Open' },
  closed: { className: 'bg-amber-100 text-amber-700', label: 'Closed' },
  awarded: { className: 'bg-blue-100 text-blue-700', label: 'Awarded' },
  cancelled: { className: 'bg-red-100 text-red-700', label: 'Cancelled' },
};

// ─── Main Component ───────────────────────────────────────────────────

export function ApplicantsView() {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const [rows, setRows] = useState<ApplicantRow[]>([]);
  const [meta, setMeta] = useState<ApplicantMeta | null>(null);
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

      const res = await api.get('/applicants', params);
      if (res.success) {
        setRows(res.data);
        setMeta(res.meta);
        setOpenTenders(res.openTenders || []);
        setClosedTenders(res.closedTenders || []);
      }
    } catch (err) {
      console.error('Fetch applicants error:', err);
      toast.error('Failed to load applicants');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, tenderFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        // Escape CSV
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

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30">
            <FileSpreadsheet className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">My Applicants</h1>
            <p className="text-sm text-muted-foreground">
              {totalApplicants > 0
                ? `${totalApplicants} applicant${totalApplicants !== 1 ? 's' : ''} across ${uniqueTenders} closed tender${uniqueTenders !== 1 ? 's' : ''}`
                : openTenders.length > 0
                  ? `${openTenders.length} tender${openTenders.length !== 1 ? 's' : ''} still accepting bids`
                  : 'Applicants for your published tenders'
              }
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

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-background border-orange-200/50 dark:border-orange-800/30">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Applicants</p>
              <p className="text-lg font-bold">{totalApplicants}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background border-emerald-200/50 dark:border-emerald-800/30">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Bid Value</p>
              <p className="text-lg font-bold">{formatCurrency(totalBudget)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background border-blue-200/50 dark:border-blue-800/30">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileSearch className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tenders</p>
              <p className="text-lg font-bold">{uniqueTenders}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-background border-violet-200/50 dark:border-violet-800/30">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Building2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Companies</p>
              <p className="text-lg font-bold">{uniqueCompanies}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info banner: explain visibility rules */}
      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/30">
        <CardContent className="p-3 flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Applicants are visible only after the tender deadline closes</p>
            <p className="text-xs text-amber-700/70 dark:text-amber-400/60 mt-0.5">
              To protect bid integrity, applicant details remain sealed while your tender is still accepting bids.
              {closedTenders.length > 0 && ` You have ${closedTenders.length} closed tender${closedTenders.length !== 1 ? 's' : ''} with visible applicants.`}
              {openTenders.length > 0 && ` ${openTenders.length} tender${openTenders.length !== 1 ? 's' : ''} still open.`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Open tenders still accepting bids */}
      {openTenders.length > 0 && (
        <Card className="border-amber-200/60 dark:border-amber-800/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Hourglass className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-semibold">Tenders Still Accepting Bids</h3>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {openTenders.length} open
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Applicant details will be revealed here once each tender's deadline passes.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {openTenders.map(tender => {
                const daysLeft = daysUntil(tender.deadline);
                const urgency = daysLeft <= 3 ? 'text-red-600 bg-red-50 dark:bg-red-950/30' : daysLeft <= 7 ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30';
                return (
                  <div
                    key={tender.id}
                    className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setView('tender-detail', { id: tender.id })}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{tender.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-[9px] px-1.5 py-0 border-0 rounded-md ${urgency}`}>
                          <Timer className="h-3 w-3 mr-0.5" />
                          {daysLeft <= 0 ? 'Closing today' : `${daysLeft}d left`}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          Deadline: {formatDate(tender.deadline)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        <Users className="h-3 w-3 mr-0.5" />
                        {tender.bidCount} bid{tender.bidCount !== 1 ? 's' : ''}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status filter pills */}
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

      {/* Toolbar: search, view mode, column picker */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search applicants, companies, tenders..."
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
              {['Applicant', 'Company', 'Tender', 'Bid'].map(group => (
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

      {/* Main content */}
      {loading && !rows.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading applicants...</p>
        </div>
      ) : !rows.length ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4">
            <div className="p-4 rounded-2xl bg-muted/50">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">No Applicants Visible Yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your filters or search'
                  : closedTenders.length === 0 && openTenders.length > 0
                    ? 'Your tenders are still accepting bids. Applicants will appear here once the deadline closes.'
                    : closedTenders.length > 0
                      ? 'No bids were submitted on your closed tenders yet.'
                      : 'Applicants for your published tenders will appear here after the deadline closes.'}
              </p>
            </div>
            <Button variant="outline" onClick={() => setView('tenders')}>
              <FileSearch className="h-4 w-4 mr-2" />
              View My Tenders
            </Button>
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
                        group === 'Tender' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {group === 'Applicant' && <Users className="h-3 w-3" />}
                        {group === 'Company' && <Building2 className="h-3 w-3" />}
                        {group === 'Tender' && <FileSearch className="h-3 w-3" />}
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
                  const tenderCfg = TENDER_STATUS_CONFIG[row.tenderStatus] || TENDER_STATUS_CONFIG.open;
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

                  {/* Tender title */}
                  <p className="text-xs font-medium text-primary mb-3 line-clamp-2 cursor-pointer hover:underline"
                    onClick={() => setView('tender-detail', { id: row.tenderId })}
                  >
                    {row.tenderTitle}
                  </p>

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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setView('tender-detail', { id: row.tenderId })}
                    >
                      View Tender <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
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

function CellRenderer({ row, col, setView }: { row: ApplicantRow; col: ColumnDef; setView: (v: string, p?: Record<string, string>) => void }) {
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

    case 'tenderTitle':
      return (
        <span
          className="text-primary font-medium truncate cursor-pointer hover:underline block"
          onClick={() => setView('tender-detail', { id: row.tenderId })}
        >
          {String(val)}
        </span>
      );

    case 'tenderStatus': {
      const cfg = TENDER_STATUS_CONFIG[String(val)] || TENDER_STATUS_CONFIG.open;
      return <Badge className={`text-[9px] px-1.5 py-0 border-0 rounded-md ${cfg.className}`}>{cfg.label}</Badge>;
    }

    case 'tenderBudgetMin':
    case 'tenderBudgetMax':
      return <span className="font-mono text-xs">{typeof val === 'number' ? formatCurrency(val) : '—'}</span>;

    case 'tenderDeadline': {
      if (!val) return <span>—</span>;
      const days = daysUntil(String(val));
      const color = days <= 0 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-emerald-600';
      return (
        <div className="flex flex-col">
          <span className="text-xs">{formatDate(String(val))}</span>
          <span className={`text-[10px] font-medium ${color}`}>
            {days <= 0 ? 'Expired' : `${days}d left`}
          </span>
        </div>
      );
    }

    case 'applicantLocation':
    case 'tenderLocation':
      return (
        <div className="flex items-center gap-1 min-w-0">
          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="truncate">{String(val) || '—'}</span>
        </div>
      );

    case 'categoryTags':
      return (
        <div className="flex flex-wrap gap-0.5">
          {String(val).split(',').filter(Boolean).slice(0, 3).map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-[9px] px-1 py-0">
              {tag.trim()}
            </Badge>
          ))}
        </div>
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

    default:
      return <span className="truncate">{String(val ?? '—')}</span>;
  }
}

// ─── Expanded row detail panel ────────────────────────────────────────

function ExpandedRowDetail({ row, setView }: { row: ApplicantRow; setView: (v: string, p?: Record<string, string>) => void }) {
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
    </div>
  );
}
