'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import {
  Plus,
  Trash2,
  Send,
  Brain,
  Wrench,
  ChevronDown,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Bot,
  User,
  Clock,
  Sparkles,
  Search,
  FileUp,
  X,
  Pencil,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  Sheet,
  BookOpen,
  Target,
  Shield,
  Zap,
  FileDown,
  MessageSquare,
  FolderOpen,
  TrendingUp,
  Award,
  DollarSign,
  Percent,
  ChartColumn,
  Globe,
  Calendar,
  Building2,
  Hash,
  AlertCircle,
  Paperclip,
  FilePlus2,
  Gavel,
  Image as ImageIcon,
} from 'lucide-react';
import { useNavStore } from '@/store';
import { type Tender, type Bid } from '@/lib/api';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

/* ══════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════ */

interface AgentSession {
  id: string;
  title: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { documents: number; messages: number; analyses: number; artifacts: number };
}

interface AgentDocument {
  id: string;
  filename: string;
  filetype: string;
  filepath: string;
  fileSize: number;
  pageCount: number;
  category: string;
  status: 'processing' | 'indexed' | 'uploaded' | 'error';
  summary?: string;
  createdAt: string;
}

interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  events?: string;
  citations?: string;
  intent?: string;
  confidence?: number;
  createdAt: string;
}

interface AgentAnalysis {
  id: string;
  type: string;
  title: string;
  content: string;
  createdAt: string;
}

interface AgentArtifact {
  id: string;
  type: 'excel' | 'docx';
  title: string;
  filename: string;
  filepath: string;
  meta?: string;
  createdAt: string;
}

interface Citation {
  docId: string;
  filename: string;
  page: number;
}

type AgentEventType =
  | 'intent'
  | 'thinking_start'
  | 'thinking_delta'
  | 'thinking_end'
  | 'plan'
  | 'tool_call_start'
  | 'tool_call_progress'
  | 'tool_call_result'
  | 'tool_call_end'
  | 'answer_start'
  | 'answer_delta'
  | 'answer_end'
  | 'citations'
  | 'confidence'
  | 'error'
  | 'done';

interface AgentStreamEvent {
  type: AgentEventType;
  data: any;
}

interface ToolCallState {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'error';
  progress?: number;
  progressText?: string;
  result?: any;
}

interface PlanStep {
  step: number;
  description: string;
  status: 'pending' | 'running' | 'completed';
}

interface StreamingMessage {
  thinking: string;
  isThinkingOpen: boolean;
  plan: PlanStep[];
  toolCalls: ToolCallState[];
  answer: string;
  citations: Citation[];
  confidence: number | null;
  intent: string | null;
  error: string | null;
}

type ChartMode = 'prices' | 'scores' | 'confidence';
type DocCategory = 'tender' | 'submission' | 'reference' | 'support';

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getConfidenceColor(confidence: number | null): string {
  if (confidence === null) return 'text-muted-foreground';
  const pct = confidence * 100;
  if (pct > 70) return 'text-emerald-600';
  if (pct > 40) return 'text-amber-600';
  return 'text-red-500';
}

function getConfidenceBg(confidence: number | null): string {
  if (confidence === null) return 'bg-muted';
  const pct = confidence * 100;
  if (pct > 70) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (pct > 40) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
}

function getConfidenceLabel(confidence: number | null): string {
  if (confidence === null) return '—';
  return `${(confidence * 100).toFixed(0)}%`;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'indexed':
      return <CheckCircle2 className="size-3.5 text-emerald-500" />;
    case 'processing':
      return <Loader2 className="size-3.5 text-amber-500 animate-spin" />;
    case 'error':
      return <XCircle className="size-3.5 text-red-500" />;
    default:
      return <Clock className="size-3.5 text-muted-foreground" />;
  }
}

function getToolIcon(name: string) {
  if (name.includes('extract') || name.includes('analysis')) return <Search className="size-4 text-violet-500" />;
  if (name.includes('excel') || name.includes('export')) return <FileSpreadsheet className="size-4 text-emerald-500" />;
  if (name.includes('docx') || name.includes('doc') || name.includes('compliance')) return <FileText className="size-4 text-blue-500" />;
  if (name.includes('compare')) return <ChartColumn className="size-4 text-amber-500" />;
  return <Wrench className="size-4 text-muted-foreground" />;
}

const ACCEPTED_FILE_TYPES = '.pdf,.docx,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.tif';

const CHART_COLORS = [
  '#0d9488', '#059669', '#0891b2', '#0284c7', '#7c3aed',
  '#c026d3', '#db2777', '#e11d48', '#ea580c', '#ca8a04',
];

/* ══════════════════════════════════════════════════════════════
   AGENT CHAT VIEW
   ══════════════════════════════════════════════════════════════ */

export function AgentChatView() {
  const isMobile = useIsMobile();
  const { token } = useAuthStore();

  // --- Session State ---
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  // --- Document State ---
  const [documents, setDocuments] = useState<AgentDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docCategory, setDocCategory] = useState<DocCategory>('tender');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  // --- Chat State ---
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMsg, setStreamingMsg] = useState<StreamingMessage | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Analysis State ---
  const [analysis, setAnalysis] = useState<AgentAnalysis | null>(null);
  const [artifacts, setArtifacts] = useState<AgentArtifact[]>([]);
  const [chartMode, setChartMode] = useState<ChartMode>('prices');
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // --- Compliance Doc State ---
  const [applicantName, setApplicantName] = useState('');
  const [prepareLoading, setPrepareLoading] = useState(false);
  const [showPrepareDialog, setShowPrepareDialog] = useState(false);

  // --- Import Dialog State ---
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importTab, setImportTab] = useState<'local' | 'tenders' | 'live' | 'bids'>('local');
  const [importTenders, setImportTenders] = useState<Tender[]>([]);
  const [importBids, setImportBids] = useState<Bid[]>([]);
  const [importLiveTenders, setImportLiveTenders] = useState<Tender[]>([]);
  const [importSearch, setImportSearch] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId),
    [sessions, selectedSessionId]
  );

  /* ────────────────────────────────────────────────────────────
     DATA FETCHING
     ──────────────────────────────────────────────────────────── */

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await api.get('/agent-sessions');
      if (res.success) setSessions(res.data);
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const fetchDocuments = useCallback(async (sessionId: string) => {
    setDocsLoading(true);
    try {
      const res = await api.get(`/agent-sessions/${sessionId}/documents`);
      if (res.success) setDocuments(res.data);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setDocsLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (sessionId: string) => {
    setMessagesLoading(true);
    try {
      const res = await api.get(`/agent-sessions/${sessionId}`);
      if (res.success && res.data?.messages) {
        setMessages(res.data.messages);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const fetchAnalysisAndArtifacts = useCallback(async (sessionId: string) => {
    setAnalysisLoading(true);
    try {
      const sessionRes = await api.get(`/agent-sessions/${sessionId}`);
      if (sessionRes.success) {
        const latest = sessionRes.data?.analyses?.[0] ?? null;
        setAnalysis(latest);
        setArtifacts(sessionRes.data?.artifacts ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Auto-create session with tender description when navigated from "Start Bid Application"
  const initialMessageSent = useRef(false);
  // Capture the structured tender form (if provided when navigating here) so it
  // can be sent with every message — the agent then "sees" the tender's title,
  // scope, budget, deadline and required docs as authoritative context.
  const tenderRef = useRef<{
    id?: string;
    title?: string;
    scope?: string;
    location?: string;
    deadline?: string;
    budgetMin?: number | null;
    budgetMax?: number | null;
    currency?: string;
    categoryTags?: string;
    requiredDocs?: string;
  } | null>(null);
  useEffect(() => {
    const { viewParams } = useNavStore.getState();
    const agentMsg = viewParams?.agentMessage as string | undefined;
    const tenderParam = viewParams?.tender as typeof tenderRef.current | undefined;
    if (tenderParam) tenderRef.current = tenderParam;
    if (agentMsg && !initialMessageSent.current) {
      initialMessageSent.current = true;
      // Create a new session, then send the tender description as the first message
      (async () => {
        const sessionId = await createSession('Tender Analysis');
        if (sessionId) {
          await sendMessage(agentMsg);
          // Clear the param so it doesn't re-trigger on re-render
          useNavStore.getState().setView('ai-doc-studio', {
            ...viewParams,
            agentMessage: undefined,
            openAgent: undefined,
          });
        }
      })();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedSessionId) {
      setDocuments([]);
      setMessages([]);
      setAnalysis(null);
      setArtifacts([]);
      return;
    }
    fetchDocuments(selectedSessionId);
    fetchMessages(selectedSessionId);
    fetchAnalysisAndArtifacts(selectedSessionId);
  }, [selectedSessionId, fetchDocuments, fetchMessages, fetchAnalysisAndArtifacts]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingMsg]);

  /* ────────────────────────────────────────────────────────────
     SESSION ACTIONS
     ──────────────────────────────────────────────────────────── */

  const createSession = async (title?: string) => {
    try {
      const res = await api.post('/agent-sessions', { title: title || 'New Tender Review' });
      if (res.success) {
        setSessions((prev) => [res.data, ...prev]);
        setSelectedSessionId(res.data.id);
        toast.success('Session created');
        return res.data.id;
      }
    } catch {
      toast.error('Failed to create session');
    }
    return null;
  };

  const renameSession = async (id: string, title: string) => {
    try {
      const res = await api.patch(`/agent-sessions/${id}`, { title });
      if (res.success) {
        setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
        setEditingTitle(null);
      }
    } catch {
      toast.error('Failed to rename session');
    }
  };

  const deleteSession = async (id: string) => {
    try {
      const res = await api.delete(`/agent-sessions/${id}`);
      if (res.success) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        if (selectedSessionId === id) setSelectedSessionId(null);
        setDeleteConfirmId(null);
        toast.success('Session deleted');
      }
    } catch {
      toast.error('Failed to delete session');
    }
  };

  /* ────────────────────────────────────────────────────────────
     DOCUMENT ACTIONS
     ──────────────────────────────────────────────────────────── */

  const uploadFiles = async (files: FileList | File[], category?: DocCategory) => {
    if (!selectedSessionId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const allowed = ['pdf', 'docx', 'xlsx', 'txt', 'csv', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif'];
        if (!allowed.includes(ext || '')) {
          toast.error(`Unsupported file type: .${ext}`);
          continue;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category || docCategory);
        const res = await api.upload(`/agent-sessions/${selectedSessionId}/documents`, formData);
        if (res.success) {
          setDocuments((prev) => [res.data, ...prev]);
          toast.success(`Uploaded: ${file.name}`);
        } else {
          toast.error(res.error || `Upload failed: ${file.name}`);
        }
      }
    } catch {
      toast.error('Upload error');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    try {
      const res = await api.delete(`/agent-sessions/${selectedSessionId}/documents`);
      if (res.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        toast.success('Document removed');
      }
    } catch {
      toast.error('Failed to remove document');
    }
  };

  const runAnalysis = async () => {
    if (!selectedSessionId) return;
    setAnalysisLoading(true);
    try {
      const res = await api.post(`/agent-sessions/${selectedSessionId}/analyze`);
      if (res.success) {
        toast.success('Analysis complete');
        await fetchAnalysisAndArtifacts(selectedSessionId);
        await fetchDocuments(selectedSessionId);
      } else {
        toast.error(res.error || 'Analysis failed');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Analysis failed');
    } finally {
      setAnalysisLoading(false);
    }
  };

  /* ────────────────────────────────────────────────────────────
     IMPORT DIALOG ACTIONS
     ──────────────────────────────────────────────────────────── */

  const openImportDialog = async () => {
    // Ensure we have a session
    let sessionId = selectedSessionId;
    if (!sessionId) {
      sessionId = await createSession('New Tender Review');
      if (!sessionId) return;
    }
    setShowImportDialog(true);
    setImportSearch('');
    setImportLoading(true);
    setImportTab('local');

    // Fetch tenders, bids, and live tenders in parallel
    try {
      const [tendersRes, bidsRes, liveRes] = await Promise.all([
        api.get('/tenders').catch(() => ({ success: false })),
        api.get('/bids').catch(() => ({ success: false })),
        api.get('/live-tenders/saved').catch(() => ({ success: false })),
      ]);
      if (tendersRes.success) setImportTenders(tendersRes.data || []);
      if (bidsRes.success) setImportBids(bidsRes.data || []);
      if (liveRes.success) setImportLiveTenders(liveRes.data || []);
    } catch {
      // Silently fail
    } finally {
      setImportLoading(false);
    }
  };

  const importDocumentsFromTender = async (tenderId: string) => {
    if (!selectedSessionId) return;
    setImportLoading(true);
    try {
      const tenderRes = await api.get(`/tenders/${tenderId}`);
      if (!tenderRes.success || !tenderRes.data?.documents?.length) {
        toast.error('No documents found on this tender');
        setImportLoading(false);
        return;
      }
      const tender = tenderRes.data;
      let imported = 0;
      for (const doc of tender.documents) {
        const res = await api.post(`/agent-sessions/${selectedSessionId}/documents/import`, {
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          category: 'tender',
        });
        if (res.success) {
          setDocuments((prev) => [res.data, ...prev]);
          imported++;
        }
      }
      if (imported > 0) {
        toast.success(`Imported ${imported} document${imported > 1 ? 's' : ''}`);
        setShowImportDialog(false);
      } else {
        toast.error('Failed to import documents');
      }
    } catch {
      toast.error('Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const importDocumentsFromBid = async (bidId: string) => {
    if (!selectedSessionId) return;
    setImportLoading(true);
    try {
      const bidRes = await api.get(`/bids/${bidId}`);
      if (!bidRes.success || !bidRes.data?.documents?.length) {
        toast.error('No documents found on this bid');
        setImportLoading(false);
        return;
      }
      const bid = bidRes.data;
      let imported = 0;
      for (const doc of bid.documents) {
        const res = await api.post(`/agent-sessions/${selectedSessionId}/documents/import`, {
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          category: 'submission',
        });
        if (res.success) {
          setDocuments((prev) => [res.data, ...prev]);
          imported++;
        }
      }
      if (imported > 0) {
        toast.success(`Imported ${imported} document${imported > 1 ? 's' : ''}`);
        setShowImportDialog(false);
      } else {
        toast.error('Failed to import documents');
      }
    } catch {
      toast.error('Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const importDocumentsFromLiveTender = async (tenderId: string) => {
    if (!selectedSessionId) return;
    setImportLoading(true);
    try {
      const tender = importLiveTenders.find((t) => t.id === tenderId);
      if (!tender) {
        toast.error('Tender not found');
        setImportLoading(false);
        return;
      }
      // For live tenders, use documentUrl or externalUrl
      const docUrl = (tender as any).documentUrl || tender.externalUrl;
      if (!docUrl) {
        toast.error('No documents available for this tender');
        setImportLoading(false);
        return;
      }
      const res = await api.post(`/agent-sessions/${selectedSessionId}/documents/import`, {
        fileUrl: docUrl,
        fileName: `${tender.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}.pdf`,
        category: 'tender',
      });
      if (res.success) {
        setDocuments((prev) => [res.data, ...prev]);
        toast.success('Document imported');
        setShowImportDialog(false);
      } else {
        toast.error(res.error || 'Failed to import');
      }
    } catch {
      toast.error('Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  /* ────────────────────────────────────────────────────────────
     COMPLIANCE DOC GENERATION
     ──────────────────────────────────────────────────────────── */

  const prepareComplianceDoc = async () => {
    if (!selectedSessionId || !applicantName.trim()) return;
    setPrepareLoading(true);
    try {
      const res = await api.post(`/agent-sessions/${selectedSessionId}/prepare`, {
        applicantName: applicantName.trim(),
      });
      if (res.success) {
        toast.success('Compliance document generated');
        await fetchAnalysisAndArtifacts(selectedSessionId);
        setShowPrepareDialog(false);
        setApplicantName('');
      } else {
        toast.error(res.error || 'Failed to generate document');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate document');
    } finally {
      setPrepareLoading(false);
    }
  };

  /* ────────────────────────────────────────────────────────────
     STREAMING CHAT
     ──────────────────────────────────────────────────────────── */

  const sendMessage = async (text: string) => {
    if (!selectedSessionId || !text.trim() || isStreaming) return;

    const userMsg: AgentMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsStreaming(true);

    const initialStreaming: StreamingMessage = {
      thinking: '',
      isThinkingOpen: true,
      plan: [],
      toolCalls: [],
      answer: '',
      citations: [],
      confidence: null,
      intent: null,
      error: null,
    };
    setStreamingMsg(initialStreaming);

    try {
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`/api/agent-sessions/${selectedSessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text.trim(), history, tender: tenderRef.current || undefined }),
      });

      if (!res.ok || !res.body) {
        throw new Error('Failed to connect to agent');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event: AgentStreamEvent = JSON.parse(line);
            setStreamingMsg((prev) => {
              if (!prev) return prev;
              return applyEvent(prev, event);
            });
          } catch {
            // ignore parse errors in stream
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const event: AgentStreamEvent = JSON.parse(buffer);
          setStreamingMsg((prev) => {
            if (!prev) return prev;
            return applyEvent(prev, event);
          });
        } catch {
          // ignore
        }
      }

      // Reload messages from server after stream completes
      await fetchMessages(selectedSessionId);
    } catch (err: any) {
      toast.error(err?.message || 'Agent communication error');
      setStreamingMsg((prev) => prev ? { ...prev, error: err?.message || 'Connection error' } : prev);
    } finally {
      setIsStreaming(false);
      setStreamingMsg(null);
    }
  };

  const applyEvent = (msg: StreamingMessage, event: AgentStreamEvent): StreamingMessage => {
    const updated = { ...msg };

    switch (event.type) {
      case 'thinking_start':
        updated.thinking = '';
        updated.isThinkingOpen = true;
        break;
      case 'thinking_delta':
        updated.thinking += event.data?.text || '';
        break;
      case 'thinking_end':
        updated.isThinkingOpen = false;
        break;
      case 'plan':
        if (Array.isArray(event.data?.steps)) {
          updated.plan = event.data.steps.map((s: any, i: number) => ({
            step: i + 1,
            description: typeof s === 'string' ? s : s.description || '',
            status: 'pending' as const,
          }));
        }
        break;
      case 'tool_call_start':
        updated.toolCalls = [
          ...updated.toolCalls,
          {
            id: event.data?.id || `tool-${Date.now()}`,
            name: event.data?.name || 'Tool',
            status: 'running',
            progress: 0,
            progressText: event.data?.description || '',
          },
        ];
        // Mark current plan step as running
        if (updated.plan.length > 0) {
          const runningIdx = updated.plan.findIndex((s) => s.status === 'pending');
          if (runningIdx >= 0) {
            updated.plan = updated.plan.map((s, i) =>
              i === runningIdx ? { ...s, status: 'running' as const } : s
            );
          }
        }
        break;
      case 'tool_call_progress': {
        const tcIdx = updated.toolCalls.length - 1;
        if (tcIdx >= 0) {
          updated.toolCalls = updated.toolCalls.map((tc, i) =>
            i === tcIdx
              ? {
                  ...tc,
                  progress: event.data?.progress ?? tc.progress,
                  progressText: event.data?.text || tc.progressText,
                }
              : tc
          );
        }
        break;
      }
      case 'tool_call_result': {
        const rIdx = updated.toolCalls.length - 1;
        if (rIdx >= 0) {
          updated.toolCalls = updated.toolCalls.map((tc, i) =>
            i === rIdx
              ? { ...tc, status: 'completed' as const, result: event.data?.result }
              : tc
          );
        }
        // Mark current plan step as completed
        if (updated.plan.length > 0) {
          const runIdx = updated.plan.findIndex((s) => s.status === 'running');
          if (runIdx >= 0) {
            updated.plan = updated.plan.map((s, i) =>
              i === runIdx ? { ...s, status: 'completed' as const } : s
            );
          }
        }
        break;
      }
      case 'tool_call_end':
        // no-op; already handled by tool_call_result
        break;
      case 'answer_start':
        updated.answer = '';
        break;
      case 'answer_delta':
        updated.answer += event.data?.text || '';
        break;
      case 'answer_end':
        break;
      case 'citations':
        if (Array.isArray(event.data?.citations)) {
          updated.citations = event.data.citations;
        }
        break;
      case 'confidence':
        updated.confidence = event.data?.score ?? null;
        break;
      case 'intent':
        updated.intent = event.data?.intent || null;
        break;
      case 'error':
        updated.error = event.data?.message || 'Unknown error';
        break;
      case 'done':
        break;
    }

    return updated;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  /* ────────────────────────────────────────────────────────────
     ANALYSIS DATA PARSING
     ──────────────────────────────────────────────────────────── */

  const analysisData = useMemo(() => {
    if (!analysis) return null;
    try {
      return JSON.parse(analysis.content);
    } catch {
      return null;
    }
  }, [analysis]);

  const bidderChartData = useMemo(() => {
    if (!analysisData?.bidders) return [];
    return analysisData.bidders.map((b: any, idx: number) => ({
      name: b.name?.value || b.name || `Bidder ${idx + 1}`,
      bidPrice: b.bidPrice?.raw ?? b.bidPrice ?? null,
      technicalScore: b.technicalScore?.raw ?? b.technicalScore ?? null,
      commercialScore: b.commercialScore?.raw ?? b.commercialScore ?? null,
      totalScore: b.totalScore?.raw ?? b.totalScore ?? null,
      confidence: b.confidence ?? null,
      compliance: b.compliance?.value ?? b.compliance ?? null,
      rank: b.rank?.value ?? b.rank ?? null,
    }));
  }, [analysisData]);

  const metadata = analysisData?.metadata || {};
  const keyTerms: Array<{ term: string; description: string; category: string }> =
    analysisData?.keyTerms || [];
  const gapWarnings: string[] = analysisData?.gapWarnings || analysisData?.gaps || [];
  const overallConfidence = analysisData?.overallConfidence ?? null;

  /* ────────────────────────────────────────────────────────────
     RENDER: SESSION SIDEBAR
     ──────────────────────────────────────────────────────────── */

  const renderSessionSidebar = () => (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Sessions</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7" onClick={() => createSession()}>
              <Plus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Tender Review</TooltipContent>
        </Tooltip>
      </div>
      <Separator />

      {/* Session List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sessionsLoading ? (
            <>
              <Skeleton className="h-14 w-full rounded-md" />
              <Skeleton className="h-14 w-full rounded-md" />
              <Skeleton className="h-14 w-full rounded-md" />
            </>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center">
              <FolderOpen className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-2 text-xs text-muted-foreground">No sessions yet</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'group relative flex flex-col gap-0.5 rounded-lg px-3 py-2 cursor-pointer transition-colors',
                  'hover:bg-accent/50',
                  selectedSessionId === session.id
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground'
                )}
                onClick={() => {
                  if (editingTitle !== session.id) setSelectedSessionId(session.id);
                }}
              >
                <div className="flex items-center justify-between gap-1">
                  {editingTitle === session.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <Input
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') renameSession(session.id, editTitleValue);
                          if (e.key === 'Escape') setEditingTitle(null);
                        }}
                        className="h-6 text-xs"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-5"
                        onClick={() => renameSession(session.id, editTitleValue)}
                      >
                        <Check className="size-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium truncate flex-1">
                        {session.title}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTitle(session.id);
                            setEditTitleValue(session.title);
                          }}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-5 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(session.id);
                          }}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                {session.summary && (
                  <span className="text-[11px] text-muted-foreground line-clamp-2">
                    {session.summary}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground/70">
                  {formatRelativeTime(session.updatedAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Documents Section */}
      {selectedSessionId && (
        <>
          <Separator />
          <div className="flex flex-col gap-2 p-3 max-h-[40%]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground">Documents</h3>
              <Select value={docCategory} onValueChange={(v) => setDocCategory(v as DocCategory)}>
                <SelectTrigger size="sm" className="h-6 w-28 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tender">Tender Result</SelectItem>
                  <SelectItem value="submission">Submission</SelectItem>
                  <SelectItem value="reference">Reference</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Drop Zone */}
            <div
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-3 transition-colors cursor-pointer',
                isDragOver
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/20'
                  : 'border-muted-foreground/20 hover:border-muted-foreground/40'
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    uploadFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
              {uploading ? (
                <Loader2 className="size-5 animate-spin text-teal-500" />
              ) : (
                <FileUp className="size-5 text-muted-foreground/60" />
              )}
              <span className="text-[10px] text-muted-foreground text-center">
                {uploading ? 'Uploading...' : 'Drop files or click to upload'}
              </span>
              <span className="text-[9px] text-muted-foreground/50">
                PDF, DOCX, XLSX, TXT, CSV
              </span>
            </div>

            {/* Document List */}
            <ScrollArea className="flex-1">
              <div className="space-y-1">
                {docsLoading ? (
                  <>
                    <Skeleton className="h-8 w-full rounded" />
                    <Skeleton className="h-8 w-full rounded" />
                  </>
                ) : documents.length === 0 ? (
                  <p className="py-2 text-[10px] text-center text-muted-foreground">
                    Upload tender documents to begin analysis
                  </p>
                ) : (
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/30"
                    >
                      {getStatusIcon(doc.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate">{doc.filename}</p>
                        <p className="text-[9px] text-muted-foreground">
                          {doc.pageCount > 0 ? `${doc.pageCount} pg` : formatFileSize(doc.fileSize)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0">
                        {doc.category}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-4 opacity-0 group-hover:opacity-100 text-destructive"
                        onClick={() => deleteDocument(doc.id)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Analyze Button */}
            {documents.length > 0 && (
              <Button
                size="sm"
                className="w-full text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                onClick={runAnalysis}
                disabled={analysisLoading}
              >
                {analysisLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                Analyze Tender
              </Button>
            )}
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              This will permanently delete this session and all its documents, messages, and analysis data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteSession(deleteConfirmId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  /* ────────────────────────────────────────────────────────────
     RENDER: CHAT MESSAGE
     ──────────────────────────────────────────────────────────── */

  const renderChatMessage = (msg: AgentMessage) => {
    if (msg.role === 'user') {
      return (
        <div key={msg.id} className="flex justify-end gap-2 px-4">
          <div className="max-w-[75%] rounded-2xl rounded-br-md bg-gradient-to-br from-teal-500 to-teal-700 text-white px-4 py-2.5 shadow-sm">
            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            <span className="block mt-1 text-[10px] text-teal-100/70 text-right">
              {formatRelativeTime(msg.createdAt)}
            </span>
          </div>
        </div>
      );
    }

    // Assistant message
    let parsedEvents: AgentStreamEvent[] = [];
    try {
      parsedEvents = msg.events ? JSON.parse(msg.events) : [];
    } catch {
      // ignore
    }

    let parsedCitations: Citation[] = [];
    try {
      parsedCitations = msg.citations ? JSON.parse(msg.citations) : [];
    } catch {
      // ignore
    }

    const thinkingText = msg.thinking || '';
    const planSteps: PlanStep[] = [];
    const toolCalls: ToolCallState[] = [];
    let toolIdx = 0;

    for (const ev of parsedEvents) {
      if (ev.type === 'plan' && Array.isArray(ev.data?.steps)) {
        ev.data.steps.forEach((s: any, si: number) => {
          planSteps.push({
            step: si + 1,
            description: typeof s === 'string' ? s : s.description || '',
            status: 'completed',
          });
        });
      }
      if (ev.type === 'tool_call_start') {
        toolCalls.push({
          id: ev.data?.id || `tc-${toolIdx++}`,
          name: ev.data?.name || 'Tool',
          status: 'completed',
        });
      }
    }

    return (
      <div key={msg.id} className="flex gap-2 px-4">
        <div className="shrink-0 mt-1">
          <div className="size-7 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Bot className="size-4 text-violet-600 dark:text-violet-400" />
          </div>
        </div>
        <div className="max-w-[85%] space-y-2">
          {/* Thinking */}
          {thinkingText && (
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Brain className="size-3.5 text-violet-400" />
                <span>Thinking...</span>
                <ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 rounded-lg bg-muted/50 border border-muted px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {thinkingText}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Plan Steps */}
          {planSteps.length > 0 && (
            <div className="space-y-1">
              {planSteps.map((step) => (
                <div key={step.step} className="flex items-center gap-2 text-xs">
                  <div className={cn(
                    'size-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                    step.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    step.status === 'running' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {step.status === 'completed' ? <Check className="size-3" /> : step.step}
                  </div>
                  <span className={cn(
                    step.status === 'completed' ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {step.description}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tool Calls */}
          {toolCalls.length > 0 && (
            <div className="space-y-1.5">
              {toolCalls.map((tc) => (
                <Collapsible key={tc.id} defaultOpen={false}>
                  <CollapsibleTrigger className="flex items-center gap-2 rounded-lg border border-muted bg-muted/30 px-2.5 py-1.5 text-xs hover:bg-muted/50 transition-colors w-full">
                    {getToolIcon(tc.name)}
                    <span className="font-medium">{tc.name}</span>
                    {tc.status === 'completed' && <CheckCircle2 className="size-3 text-emerald-500 ml-auto" />}
                    {tc.status === 'running' && <Loader2 className="size-3 animate-spin text-amber-500 ml-auto" />}
                    {tc.status === 'error' && <XCircle className="size-3 text-red-500 ml-auto" />}
                    <ChevronRight className="size-3 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-1 rounded-lg border border-muted bg-muted/20 px-3 py-2 text-xs">
                      {tc.result ? (
                        <pre className="whitespace-pre-wrap text-muted-foreground max-h-32 overflow-y-auto">
                          {typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-muted-foreground">Completed</span>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}

          {/* Answer */}
          {msg.content && (
            <div className="rounded-2xl rounded-tl-md bg-muted/40 px-4 py-2.5 prose prose-sm dark:prose-invert max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-a:text-foreground prose-strong:text-foreground">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          )}

          {/* Confidence */}
          {msg.confidence !== null && msg.confidence !== undefined && (
            <Badge className={cn('text-[10px] gap-1', getConfidenceBg(msg.confidence))}>
              <Target className="size-3" />
              {getConfidenceLabel(msg.confidence)} confidence
            </Badge>
          )}

          {/* Citations */}
          {parsedCitations.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {parsedCitations.map((c, i) => (
                <Badge key={i} variant="outline" className="text-[9px] gap-1">
                  <BookOpen className="size-2.5" />
                  {c.filename} p.{c.page}
                </Badge>
              ))}
            </div>
          )}

          <span className="block text-[10px] text-muted-foreground/60">
            {formatRelativeTime(msg.createdAt)}
          </span>
        </div>
      </div>
    );
  };

  /* ────────────────────────────────────────────────────────────
     RENDER: STREAMING MESSAGE
     ──────────────────────────────────────────────────────────── */

  const renderStreamingMessage = () => {
    if (!streamingMsg) return null;

    return (
      <div className="flex gap-2 px-4">
        <div className="shrink-0 mt-1">
          <div className="size-7 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Bot className="size-4 text-violet-600 dark:text-violet-400" />
          </div>
        </div>
        <div className="max-w-[85%] space-y-2">
          {/* Thinking */}
          {streamingMsg.thinking && (
            <Collapsible open={streamingMsg.isThinkingOpen} onOpenChange={(open) => {
              setStreamingMsg((prev) => prev ? { ...prev, isThinkingOpen: open } : prev);
            }}>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Brain className="size-3.5 text-violet-400 animate-pulse" />
                <span>Thinking...</span>
                <ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 rounded-lg bg-muted/50 border border-muted px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {streamingMsg.thinking}
                  <span className="animate-pulse">▌</span>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Plan Steps */}
          {streamingMsg.plan.length > 0 && (
            <div className="space-y-1">
              {streamingMsg.plan.map((step) => (
                <div key={step.step} className="flex items-center gap-2 text-xs">
                  <div className={cn(
                    'size-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                    step.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    step.status === 'running' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {step.status === 'completed' ? <Check className="size-3" /> :
                     step.status === 'running' ? <Loader2 className="size-3 animate-spin" /> :
                     step.step}
                  </div>
                  <span className={cn(
                    step.status === 'completed' ? 'text-foreground' :
                    step.status === 'running' ? 'text-foreground font-medium' :
                    'text-muted-foreground'
                  )}>
                    {step.description}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tool Calls */}
          {streamingMsg.toolCalls.length > 0 && (
            <div className="space-y-1.5">
              {streamingMsg.toolCalls.map((tc, i) => (
                <Collapsible key={tc.id} defaultOpen={tc.status === 'running'}>
                  <CollapsibleTrigger className="flex items-center gap-2 rounded-lg border border-muted bg-muted/30 px-2.5 py-1.5 text-xs hover:bg-muted/50 transition-colors w-full">
                    {getToolIcon(tc.name)}
                    <span className="font-medium">{tc.name}</span>
                    {tc.progressText && (
                      <span className="text-muted-foreground truncate flex-1">{tc.progressText}</span>
                    )}
                    {tc.status === 'completed' && <CheckCircle2 className="size-3 text-emerald-500 ml-auto shrink-0" />}
                    {tc.status === 'running' && <Loader2 className="size-3 animate-spin text-amber-500 ml-auto shrink-0" />}
                    {tc.status === 'error' && <XCircle className="size-3 text-red-500 ml-auto shrink-0" />}
                    <ChevronRight className="size-3 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-90 shrink-0" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-1 rounded-lg border border-muted bg-muted/20 px-3 py-2 text-xs">
                      {tc.progress !== undefined && tc.progress > 0 && tc.status === 'running' && (
                        <div className="mb-2">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-amber-500 transition-all"
                              style={{ width: `${tc.progress}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground">{tc.progress}%</span>
                        </div>
                      )}
                      {tc.result ? (
                        <pre className="whitespace-pre-wrap text-muted-foreground max-h-32 overflow-y-auto">
                          {typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-muted-foreground">Running...</span>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}

          {/* Answer */}
          {streamingMsg.answer && (
            <div className="rounded-2xl rounded-tl-md bg-muted/40 px-4 py-2.5 prose prose-sm dark:prose-invert max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-a:text-foreground prose-strong:text-foreground">
              <ReactMarkdown>{streamingMsg.answer}</ReactMarkdown>
              <span className="animate-pulse text-foreground">▌</span>
            </div>
          )}

          {/* Confidence */}
          {streamingMsg.confidence !== null && (
            <Badge className={cn('text-[10px] gap-1', getConfidenceBg(streamingMsg.confidence))}>
              <Target className="size-3" />
              {getConfidenceLabel(streamingMsg.confidence)} confidence
            </Badge>
          )}

          {/* Citations */}
          {streamingMsg.citations.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {streamingMsg.citations.map((c, i) => (
                <Badge key={i} variant="outline" className="text-[9px] gap-1">
                  <BookOpen className="size-2.5" />
                  {c.filename} p.{c.page}
                </Badge>
              ))}
            </div>
          )}

          {/* Error */}
          {streamingMsg.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="inline size-3 mr-1" />
              {streamingMsg.error}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ────────────────────────────────────────────────────────────
     RENDER: CHAT PANEL
     ──────────────────────────────────────────────────────────── */

  const renderChatPanel = () => {
    if (!selectedSessionId) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center space-y-3">
            <Bot className="mx-auto size-12 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold text-muted-foreground">
              Select or create a session to start
            </h3>
            <p className="text-sm text-muted-foreground/60">
              Choose a session from the sidebar or create a new tender review
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col">
        {/* Chat Header */}
        <div className="flex items-center gap-2 border-b px-4 py-2.5">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            >
              {leftPanelCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </Button>
          )}
          <Bot className="size-5 text-violet-500" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold truncate">
              {selectedSession?.title || 'AI Agent'}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {isStreaming ? (
                <span className="text-amber-500 flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" /> Processing...
                </span>
              ) : (
                'Tender Review Assistant'
              )}
            </p>
          </div>
          {streamingMsg?.intent && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Zap className="size-3" />
              {streamingMsg.intent}
            </Badge>
          )}
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1">
          <div className="py-4 space-y-4" ref={scrollAreaRef}>
            {messagesLoading ? (
              <div className="space-y-4 px-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-2">
                    <Skeleton className="size-7 rounded-full" />
                    <Skeleton className="h-16 w-64 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 && !isStreaming ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <MessageSquare className="size-10 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">
                  Start a conversation with the AI Agent
                </p>
                <p className="text-xs text-muted-foreground/50">
                  Upload documents and ask questions about your tender
                </p>
              </div>
            ) : (
              messages.map(renderChatMessage)
            )}
            {renderStreamingMessage()}
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        <div className="flex gap-1.5 px-4 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="text-[11px] gap-1 h-7"
            onClick={() => sendMessage('Analyze the tender documents I have uploaded')}
            disabled={isStreaming || documents.length === 0}
          >
            <Sparkles className="size-3" />
            Analyze Tender
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[11px] gap-1 h-7"
            onClick={() => sendMessage('Extract the analysis results to Excel')}
            disabled={isStreaming || !analysis}
          >
            <FileSpreadsheet className="size-3" />
            Extract to Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[11px] gap-1 h-7"
            onClick={() => setShowPrepareDialog(true)}
            disabled={isStreaming || !analysis}
          >
            <FileDown className="size-3" />
            Generate Compliance Doc
          </Button>
        </div>

        {/* Input Area */}
        <div className="border-t px-4 py-3">
          <div className="flex gap-1.5 items-end">
            <div className="flex gap-1 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 rounded-xl text-muted-foreground hover:text-foreground"
                    onClick={() => createSession()}
                    title="New Session"
                  >
                    <Plus className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New Session</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 rounded-xl text-muted-foreground hover:text-foreground"
                    onClick={() => chatFileInputRef.current?.click()}
                    title="Upload File"
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upload File (PDF, DOCX, XLSX, Images)</TooltipContent>
              </Tooltip>
              <input
                ref={chatFileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES}
                className="hidden"
                onChange={handleChatFileUpload}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 rounded-xl text-muted-foreground hover:text-foreground"
                    onClick={openImportDialog}
                    title="Import from Tenders/Bids"
                  >
                    <FilePlus2 className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Import from Tenders / Bids</TooltipContent>
              </Tooltip>
            </div>
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your tender documents..."
              className="min-h-[40px] max-h-32 resize-none text-sm flex-1"
              disabled={isStreaming}
              rows={1}
            />
            <Button
              size="icon"
              className="shrink-0 size-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isStreaming}
            >
              {isStreaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  /* ────────────────────────────────────────────────────────────
     RENDER: ANALYSIS PANEL
     ──────────────────────────────────────────────────────────── */

  const renderAnalysisPanel = () => {
    if (!selectedSessionId) {
      return (
        <div className="flex h-full items-center justify-center p-4">
          <div className="text-center space-y-2">
            <ChartColumn className="mx-auto size-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">Select a session</p>
          </div>
        </div>
      );
    }

    if (analysisLoading && !analysis) {
      return (
        <div className="p-4 space-y-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      );
    }

    if (!analysis) {
      return (
        <div className="flex h-full items-center justify-center p-4">
          <div className="text-center space-y-3">
            <Sparkles className="mx-auto size-8 text-muted-foreground/30" />
            <h4 className="text-sm font-medium text-muted-foreground">
              Run analysis to see extraction results
            </h4>
            <Button
              size="sm"
              className="text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
              onClick={runAnalysis}
              disabled={analysisLoading || documents.length === 0}
            >
              {analysisLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              Analyze
            </Button>
          </div>
        </div>
      );
    }

    return (
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          {/* Summary Card */}
          <Card>
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="size-4 text-teal-500" />
                Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/50 px-2.5 py-1.5">
                  <p className="text-[10px] text-muted-foreground">Bidders</p>
                  <p className="text-lg font-bold">{bidderChartData.length}</p>
                </div>
                <div className="rounded-lg bg-muted/50 px-2.5 py-1.5">
                  <p className="text-[10px] text-muted-foreground">Confidence</p>
                  <p className={cn('text-lg font-bold', getConfidenceColor(overallConfidence))}>
                    {overallConfidence !== null ? `${(overallConfidence * 100).toFixed(0)}%` : '—'}
                  </p>
                </div>
              </div>
              {gapWarnings.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-3.5" />
                  {gapWarnings.length} gap warning{gapWarnings.length > 1 ? 's' : ''}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bidder Comparison Chart */}
          {bidderChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2 px-4 pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Bidder Comparison</CardTitle>
                  <div className="flex gap-0.5">
                    {([
                      { mode: 'prices' as ChartMode, icon: DollarSign, label: 'Prices' },
                      { mode: 'scores' as ChartMode, icon: TrendingUp, label: 'Scores' },
                      { mode: 'confidence' as ChartMode, icon: Percent, label: 'Conf.' },
                    ]).map(({ mode, icon: Icon, label }) => (
                      <Tooltip key={mode}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={chartMode === mode ? 'default' : 'ghost'}
                            size="icon"
                            className={cn(
                              'size-7',
                              chartMode === mode && 'bg-teal-600 hover:bg-teal-700 text-white'
                            )}
                            onClick={() => setChartMode(mode)}
                          >
                            <Icon className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{label}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={bidderChartData}
                      margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
                      <RechartsTooltip
                        contentStyle={{
                          fontSize: 11,
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                        }}
                      />
                      {chartMode === 'prices' && (
                        <Bar dataKey="bidPrice" name="Bid Price" radius={[4, 4, 0, 0]}>
                          {bidderChartData.map((_: any, idx: number) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      )}
                      {chartMode === 'scores' && (
                        <>
                          <Bar dataKey="technicalScore" name="Technical" fill="#0d9488" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="commercialScore" name="Commercial" fill="#0891b2" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="totalScore" name="Total" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                        </>
                      )}
                      {chartMode === 'confidence' && (
                        <Bar dataKey="confidence" name="Confidence" radius={[4, 4, 0, 0]}>
                          {bidderChartData.map((entry: any, idx: number) => {
                            const c = entry.confidence ?? 0;
                            const fill = c > 0.7 ? '#059669' : c > 0.4 ? '#ca8a04' : '#dc2626';
                            return <Cell key={idx} fill={fill} />;
                          })}
                        </Bar>
                      )}
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary Stats */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {chartMode === 'prices' && (() => {
                    const prices = bidderChartData
                      .map((b: any) => b.bidPrice)
                      .filter((p: any) => p !== null && p !== undefined) as number[];
                    return prices.length > 0 ? (
                      <>
                        <div className="text-[10px] text-muted-foreground">
                          Lowest: <span className="font-medium text-foreground">{Math.min(...prices).toLocaleString()}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Highest: <span className="font-medium text-foreground">{Math.max(...prices).toLocaleString()}</span>
                        </div>
                      </>
                    ) : null;
                  })()}
                  {chartMode === 'scores' && (() => {
                    const scores = bidderChartData
                      .map((b: any) => b.totalScore)
                      .filter((s: any) => s !== null && s !== undefined) as number[];
                    return scores.length > 0 ? (
                      <div className="col-span-2 text-[10px] text-muted-foreground">
                        Top Score: <span className="font-medium text-foreground">{Math.max(...scores).toFixed(1)}</span>
                      </div>
                    ) : null;
                  })()}
                  {chartMode === 'confidence' && overallConfidence !== null && (
                    <div className="col-span-2 text-[10px] text-muted-foreground">
                      Overall: <span className={cn('font-medium', getConfidenceColor(overallConfidence))}>
                        {(overallConfidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tender Metadata */}
          <Card>
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sheet className="size-4 text-blue-500" />
                Tender Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-1.5">
                {metadata.title?.value && (
                  <MetaRow icon={<FileText className="size-3" />} label="Title" value={metadata.title.value} />
                )}
                {metadata.tenderNumber?.value && (
                  <MetaRow icon={<Hash className="size-3" />} label="Number" value={metadata.tenderNumber.value} />
                )}
                {metadata.issuingAuthority?.value && (
                  <MetaRow icon={<Building2 className="size-3" />} label="Authority" value={metadata.issuingAuthority.value} />
                )}
                {metadata.publishedDate?.value && (
                  <MetaRow icon={<Calendar className="size-3" />} label="Published" value={metadata.publishedDate.value} />
                )}
                {metadata.closingDate?.value && (
                  <MetaRow icon={<Calendar className="size-3" />} label="Closing" value={metadata.closingDate.value} />
                )}
                {metadata.estimatedValue?.raw != null && (
                  <MetaRow
                    icon={<DollarSign className="size-3" />}
                    label="Est. Value"
                    value={metadata.estimatedValue.raw.toLocaleString()}
                  />
                )}
                {metadata.category?.value && (
                  <MetaRow icon={<Globe className="size-3" />} label="Category" value={metadata.category.value} />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Key Terms */}
          {keyTerms.length > 0 && (
            <Card>
              <CardHeader className="pb-2 px-4 pt-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="size-4 text-amber-500" />
                  Key Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <ScrollArea className="max-h-48">
                  <div className="space-y-1.5">
                    {keyTerms.map((kt, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 mt-0.5">
                          {kt.category}
                        </Badge>
                        <div className="min-w-0">
                          <p className="font-medium">{kt.term}</p>
                          {kt.description && (
                            <p className="text-muted-foreground text-[10px] line-clamp-2">{kt.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Gap Warnings */}
          {gapWarnings.length > 0 && (
            <Card>
              <CardHeader className="pb-2 px-4 pt-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-500" />
                  Gap Warnings
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="space-y-1.5">
                  {gapWarnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="size-3 shrink-0 mt-0.5" />
                      <span>{typeof warning === 'string' ? warning : String(warning)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Artifacts */}
          <Card>
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileDown className="size-4 text-emerald-500" />
                Artifacts
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              {artifacts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No artifacts generated yet
                </p>
              ) : (
                artifacts.map((art) => (
                  <div
                    key={art.id}
                    className="flex items-center gap-2 rounded-lg border border-muted px-3 py-2 hover:bg-accent/30 transition-colors"
                  >
                    {art.type === 'excel' ? (
                      <FileSpreadsheet className="size-4 text-emerald-500" />
                    ) : (
                      <FileText className="size-4 text-blue-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{art.title}</p>
                      <p className="text-[10px] text-muted-foreground">{art.filename}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="size-7" asChild>
                      <a href={art.filepath} download>
                        <Download className="size-3.5" />
                      </a>
                    </Button>
                  </div>
                ))
              )}

              <Separator />

              {/* Prepare Compliance Doc */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1.5"
                  onClick={() => setShowPrepareDialog(true)}
                  disabled={!analysis}
                >
                  <Shield className="size-3.5" />
                  Prepare Compliance Doc
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    );
  };

  /* ────────────────────────────────────────────────────────────
     RENDER: IMPORT DIALOG
     ──────────────────────────────────────────────────────────── */

  const renderImportDialog = () => {
    const filteredTenders = importTenders.filter((t) =>
      t.title.toLowerCase().includes(importSearch.toLowerCase())
    );
    const filteredBids = importBids.filter((b) =>
      (b.tender?.title || '').toLowerCase().includes(importSearch.toLowerCase())
    );
    const filteredLive = importLiveTenders.filter((t) =>
      t.title.toLowerCase().includes(importSearch.toLowerCase())
    );

    return (
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus2 className="size-5 text-teal-500" />
              Import Documents
            </DialogTitle>
            <DialogDescription>
              Upload local files or import from your tenders and bids.
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search tenders or bids..."
              className="pl-9"
              value={importSearch}
              onChange={(e) => setImportSearch(e.target.value)}
            />
          </div>

          {/* Tabs */}
          <Tabs value={importTab} onValueChange={(v) => setImportTab(v as any)} className="flex-1 min-h-0">
            <TabsList className="w-full">
              <TabsTrigger value="local" className="flex-1 gap-1 text-xs">
                <Upload className="size-3" /> Local Files
              </TabsTrigger>
              <TabsTrigger value="tenders" className="flex-1 gap-1 text-xs">
                <FileText className="size-3" /> My Tenders
              </TabsTrigger>
              <TabsTrigger value="live" className="flex-1 gap-1 text-xs">
                <Globe className="size-3" /> Live Tenders
              </TabsTrigger>
              <TabsTrigger value="bids" className="flex-1 gap-1 text-xs">
                <Gavel className="size-3" /> Bids
              </TabsTrigger>
            </TabsList>

            {/* Local Files Tab */}
            <TabsContent value="local" className="flex-1 min-h-0 mt-2">
              <div
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
                  uploading
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/20'
                    : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                )}
                onClick={() => {
                  if (!uploading && selectedSessionId) fileInputRef.current?.click();
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED_FILE_TYPES}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      uploadFiles(e.target.files);
                      e.target.value = '';
                      setShowImportDialog(false);
                    }
                  }}
                />
                {uploading ? (
                  <Loader2 className="size-8 animate-spin text-teal-500" />
                ) : (
                  <>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <FileUp className="size-8" />
                      <ImageIcon className="size-8" />
                      <FileText className="size-8" />
                    </div>
                    <p className="text-sm font-medium">Click to upload files</p>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOCX, XLSX, TXT, CSV, Images (JPG, PNG, WebP)
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                      Images will be processed with AI OCR
                    </p>
                  </>
                )}
              </div>
            </TabsContent>

            {/* My Tenders Tab */}
            <TabsContent value="tenders" className="flex-1 min-h-0 mt-2">
              {importLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTenders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <FolderOpen className="size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {importSearch ? 'No tenders match your search' : 'No tenders yet'}
                  </p>
                  {!importSearch && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs mt-1"
                      onClick={() => {
                        setShowImportDialog(false);
                        useNavStore.getState().setView('tenders');
                      }}
                    >
                      Go to Tenders
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-1.5">
                    {filteredTenders.map((tender) => (
                      <div
                        key={tender.id}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-accent/30 transition-colors"
                      >
                        <FileText className="size-4 text-teal-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{tender.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {tender._count?.bids ? `${tender._count.bids} bid(s)` : 'No bids'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="text-xs shrink-0 bg-teal-600 hover:bg-teal-700 text-white h-7"
                          onClick={() => importDocumentsFromTender(tender.id)}
                          disabled={importLoading}
                        >
                          {importLoading ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
                          Import
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* Live Tenders Tab */}
            <TabsContent value="live" className="flex-1 min-h-0 mt-2">
              {importLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredLive.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Globe className="size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {importSearch ? 'No live tenders match your search' : 'No saved live tenders'}
                  </p>
                  {!importSearch && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs mt-1"
                      onClick={() => {
                        setShowImportDialog(false);
                        useNavStore.getState().setView('live-tenders');
                      }}
                    >
                      Go to Live Tenders
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-1.5">
                    {filteredLive.map((tender) => (
                      <div
                        key={tender.id}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-accent/30 transition-colors"
                      >
                        <Globe className="size-4 text-blue-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{tender.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {(tender as any).externalSource || 'External source'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="text-xs shrink-0 bg-teal-600 hover:bg-teal-700 text-white h-7"
                          onClick={() => importDocumentsFromLiveTender(tender.id)}
                          disabled={importLoading}
                        >
                          {importLoading ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
                          Import
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* Bids Tab */}
            <TabsContent value="bids" className="flex-1 min-h-0 mt-2">
              {importLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredBids.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Gavel className="size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {importSearch ? 'No bids match your search' : 'No bids yet'}
                  </p>
                  {!importSearch && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs mt-1"
                      onClick={() => {
                        setShowImportDialog(false);
                        useNavStore.getState().setView('bids');
                      }}
                    >
                      Go to Bids
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-1.5">
                    {filteredBids.map((bid) => (
                      <div
                        key={bid.id}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-accent/30 transition-colors"
                      >
                        <Gavel className="size-4 text-amber-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {bid.tender?.title || `Bid ${bid.id.slice(0, 8)}`}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Status: {bid.status} {bid.user?.profile?.fullName ? `· ${bid.user.profile.fullName}` : ''}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="text-xs shrink-0 bg-teal-600 hover:bg-teal-700 text-white h-7"
                          onClick={() => importDocumentsFromBid(bid.id)}
                          disabled={importLoading}
                        >
                          {importLoading ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
                          Import
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  };

  /* ────────────────────────────────────────────────────────────
     RENDER: MAIN LAYOUT
     ──────────────────────────────────────────────────────────── */

  // Mobile: single panel with collapsible sidebar
  if (isMobile) {
    return (
      <div className="flex h-full flex-col">
        <Tooltip>
          <TooltipContent />
        </Tooltip>

        {/* Mobile sidebar overlay */}
        {!leftPanelCollapsed && (
          <div className="absolute inset-0 z-50 flex">
            <div className="w-64 bg-background border-r shadow-lg">
              {renderSessionSidebar()}
            </div>
            <div
              className="flex-1 bg-black/30"
              onClick={() => setLeftPanelCollapsed(true)}
            />
          </div>
        )}

        {/* Main content: chat + analysis */}
        <Tabs defaultValue="chat" className="flex-1 flex flex-col">
          <div className="border-b px-2">
            <TabsList className="w-full">
              <TabsTrigger value="chat" className="flex-1 gap-1">
                <MessageSquare className="size-3" /> Chat
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex-1 gap-1">
                <ChartColumn className="size-3" /> Analysis
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="chat" className="flex-1 m-0">
            {renderChatPanel()}
          </TabsContent>
          <TabsContent value="analysis" className="flex-1 m-0">
            {renderAnalysisPanel()}
          </TabsContent>
        </Tabs>

        {/* Prepare Compliance Dialog */}
        <Dialog open={showPrepareDialog} onOpenChange={setShowPrepareDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Compliance Document</DialogTitle>
              <DialogDescription>
                Enter applicant details to generate a compliance document based on the analysis results.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Applicant Name *</label>
                <Input
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Company or individual name"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowPrepareDialog(false)}>
                Cancel
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white"
                onClick={prepareComplianceDoc}
                disabled={!applicantName.trim() || prepareLoading}
              >
                {prepareLoading ? <Loader2 className="size-4 animate-spin mr-1" /> : <FileDown className="size-4 mr-1" />}
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {renderImportDialog()}
      </div>
    );
  }

  // Desktop: 3-panel resizable layout
  return (
    <div className="flex h-full flex-col">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel: Sessions & Documents */}
        <ResizablePanel defaultSize={18} minSize={14} maxSize={28}>
          {renderSessionSidebar()}
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center Panel: Chat */}
        <ResizablePanel defaultSize={52} minSize={35}>
          {renderChatPanel()}
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel: Analysis & Artifacts */}
        <ResizablePanel defaultSize={30} minSize={22} maxSize={42}>
          {renderAnalysisPanel()}
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Prepare Compliance Dialog */}
      <Dialog open={showPrepareDialog} onOpenChange={setShowPrepareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Compliance Document</DialogTitle>
            <DialogDescription>
              Enter applicant details to generate a compliance document based on the analysis results.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Applicant Name *</label>
              <Input
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="Company or individual name"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPrepareDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={prepareComplianceDoc}
              disabled={!applicantName.trim() || prepareLoading}
            >
              {prepareLoading ? <Loader2 className="size-4 animate-spin mr-1" /> : <FileDown className="size-4 mr-1" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {renderImportDialog()}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════════════════════ */

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-muted-foreground w-16 shrink-0">{label}</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}
