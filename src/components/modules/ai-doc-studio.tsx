'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api, type Document } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Type, Image as ImageIcon, Table, Minus, Pen, Stamp, FileSignature,
  Eraser, Undo2, Redo2, Save, Download, Printer, ZoomIn, ZoomOut,
  Sparkles, FileText, PenTool, Search, Users, X, Plus, ChevronDown,
  Check, Copy, Clock, Shield, Target, DollarSign, Star, TrendingUp,
  Award, Zap, AlertTriangle, CheckCircle2, XCircle,
  Upload, Bot, Eye, ExternalLink, RefreshCw, FileUp, Loader2, ChevronRight, FileSearch, Link2, Trash2, MessageSquare, FileDown,
} from 'lucide-react';
import { useStampSignature, STAMP_TEMPLATES, type SavedSignature } from '@/components/stamp-signature';
import dynamic from 'next/dynamic';
const AgentChatView = dynamic(() => import('./agent-chat').then(m => m.AgentChatView), { ssr: false });
/* ══════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════ */

type RibbonTab = 'home' | 'insert' | 'review' | 'ai-tools' | 'sign' | 'doc-review' | 'ai-extract' | 'agent';
type AITool = 'tender-builder' | 'bid-builder' | 'requirement-analyzer' | 'applicant-analyzer';

interface TenderOption {
  id: string;
  title: string;
  scope?: string;
  budgetMin?: number;
  budgetMax?: number;
  categoryTags?: string;
  requiredDocs?: string;
  deadline?: string;
  _count?: { bids: number };
}

// SavedSignature type is imported from shared stamp-signature component

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════ */

const CATEGORIES = [
  'Construction', 'IT', 'Supply', 'Consulting', 'Engineering',
  'Architecture', 'Electrical', 'Plumbing', 'HVAC', 'Logistics',
  'Healthcare', 'Education', 'Finance', 'Agriculture', 'Telecommunications',
];

const COMMON_SKILLS = [
  'Project Management', 'Construction', 'Engineering', 'IT Solutions',
  'Consulting', 'Architecture', 'Electrical Work', 'Plumbing',
  'HVAC', 'Logistics', 'Healthcare', 'Education', 'Finance',
  'Agriculture', 'Telecommunications', 'Web Development', 'Software',
  'Design', 'Research', 'Training', 'Maintenance', 'Procurement',
  'Supply Chain', 'Quality Assurance', 'Safety Management',
];

const FONT_FAMILIES = ['Arial', 'Times New Roman', 'Courier New', 'Calibri', 'Georgia', 'Verdana'];
const FONT_SIZES = ['10', '11', '12', '14', '16', '18', '20', '24', '28', '36'];
const TEXT_COLORS = ['#000000', '#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c'];
const HIGHLIGHT_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff', '#fed7aa'];
const ZOOM_LEVELS = [75, 100, 125, 150];

const AI_TOOLS: { id: AITool; label: string; icon: React.ElementType }[] = [
  { id: 'tender-builder', label: 'Tender Builder', icon: FileText },
  { id: 'bid-builder', label: 'Bid Proposal', icon: PenTool },
  { id: 'requirement-analyzer', label: 'Req Analyzer', icon: Search },
  { id: 'applicant-analyzer', label: 'Applicant Rank', icon: Users },
];

const DOC_TYPE_OPTIONS = [
  { value: 'external_doc', label: 'External Document' },
  { value: 'business_license', label: 'Business License' },
  { value: 'tax_clearance', label: 'Tax Clearance' },
  { value: 'technical_proposal', label: 'Technical Proposal' },
  { value: 'financial_proposal', label: 'Financial Proposal' },
  { value: 'timeline_doc', label: 'Timeline Document' },
  { value: 'bid_attachment', label: 'Bid Attachment' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'other', label: 'Other' },
];

const PROMPT_SUGGESTIONS: Record<string, string> = {
  external_doc: 'Check if this document meets Ethiopian procurement law requirements and international standards',
  business_license: 'Verify if this business license is valid, complete, and meets procurement requirements',
  tax_clearance: 'Review this tax clearance document for completeness and validity',
  technical_proposal: 'Evaluate this technical proposal against standard procurement evaluation criteria',
  financial_proposal: 'Review this financial proposal for completeness, accuracy, and compliance',
  timeline_doc: 'Analyze this timeline document for feasibility and compliance with deadline requirements',
  bid_attachment: 'Review this bid attachment for completeness and compliance with tender requirements',
  portfolio: 'Evaluate this portfolio for relevant experience and capability demonstration',
  certificate: 'Verify this certificate for authenticity, validity, and relevance to procurement requirements',
  other: 'Review this document for completeness, accuracy, and compliance with applicable standards',
};

// STAMP_TEMPLATES imported from shared stamp-signature component

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */

// ── Export helpers ──
function exportAsTxt(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAsPdf(title: string, content: string, filename: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 20px; color: #059669; border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 16px; }
  .meta { font-size: 12px; color: #6b7280; margin-bottom: 20px; }
  pre { white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.5; background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; }
  .prompt-label { font-size: 11px; font-weight: 600; color: #059669; margin-top: 12px; margin-bottom: 4px; }
  .prompt-text { font-size: 12px; color: #374151; font-style: italic; margin-bottom: 16px; }
</style></head><body>
<h1>${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
<div class="meta">Exported on ${new Date().toLocaleString()}</div>
<pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    // Fallback: download as HTML
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace('.pdf', '.html');
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function exportExtractAsPdf(title: string, prompt: string, content: string, filename: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 20px; color: #059669; border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 16px; }
  .meta { font-size: 12px; color: #6b7280; margin-bottom: 20px; }
  .prompt-label { font-size: 11px; font-weight: 600; color: #059669; margin-top: 12px; margin-bottom: 4px; }
  .prompt-text { font-size: 12px; color: #374151; font-style: italic; margin-bottom: 16px; background: #f0fdf4; padding: 10px; border-radius: 6px; border: 1px solid #bbf7d0; }
  .result-label { font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 4px; }
  pre { white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.5; background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; }
</style></head><body>
<h1>${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
<div class="meta">Exported on ${new Date().toLocaleString()}</div>
<div class="prompt-label">Extraction Prompt:</div>
<div class="prompt-text">${prompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
<div class="result-label">Extraction Result:</div>
<pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace('.pdf', '.html');
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// generateSeal is now handled by useStampSignature hook's generateStamp method

function formatAIResultToHTML(data: Record<string, unknown>): string {
  let html = '';
  for (const [key, value] of Object.entries(data)) {
    const title = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    const formattedContent = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^[-*•]\s+(.*)/gm, '<li>$1</li>')
      .replace(/^(\d+)[.)]\s+(.*)/gm, '<li>$2</li>')
      .replace(/^#{1,3}\s+(.*)/gm, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');
    html += `<h2 style="font-size:16px;font-weight:700;margin:16px 0 8px;color:#059669;border-bottom:1px solid #d1fae5;padding-bottom:4px;">${title}</h2>`;
    html += `<p>${formattedContent}</p>`;
  }
  return html;
}

function getFileExtBadge(fileName: string): { color: string; label: string } {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  const map: Record<string, { color: string; label: string }> = {
    pdf: { color: 'bg-rose-100 text-rose-700', label: 'PDF' },
    docx: { color: 'bg-blue-100 text-blue-700', label: 'DOCX' },
    doc: { color: 'bg-blue-100 text-blue-700', label: 'DOC' },
    txt: { color: 'bg-gray-100 text-gray-700', label: 'TXT' },
    jpg: { color: 'bg-amber-100 text-amber-700', label: 'JPG' },
    jpeg: { color: 'bg-amber-100 text-amber-700', label: 'JPEG' },
    png: { color: 'bg-emerald-100 text-emerald-700', label: 'PNG' },
  };
  return map[ext] || { color: 'bg-gray-100 text-gray-600', label: ext.toUpperCase() };
}

// Signature loading/saving is now handled by useStampSignature hook

/* ══════════════════════════════════════════════════════════════
   SKILL TAG SELECTOR
   ══════════════════════════════════════════════════════════════ */

function SkillTagSelector({ selected, onChange }: { selected: string[]; onChange: (s: string[]) => void }) {
  const toggle = (skill: string) => {
    if (selected.includes(skill)) onChange(selected.filter(s => s !== skill));
    else onChange([...selected, skill]);
  };
  return (
    <div className="flex flex-wrap gap-1">
      {COMMON_SKILLS.map(skill => (
        <button key={skill} type="button" onClick={() => toggle(skill)}
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border ${
            selected.includes(skill)
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : 'bg-muted/50 text-muted-foreground border-border hover:border-emerald-300'
          }`}>
          {skill}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */

export function AIDocStudio() {
  /* ── State ── */
  const { viewParams } = useNavStore();
  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ribbonTab, setRibbonTab] = useState<RibbonTab>('home');
  const [docTitle, setDocTitle] = useState('Untitled Document');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [zoom, setZoom] = useState(100);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // AI Tools panel
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [activeAITool, setActiveAITool] = useState<AITool>('tender-builder');
  const [aiLoading, setAiLoading] = useState(false);

  // Sign panel - use shared hook
  const stampSigHook = useStampSignature();
  const { savedItems: savedSignatures, addSignature, removeItem: deleteSignature, uploadFromFile, generateStamp } = stampSigHook;
  const [drawDialogOpen, setDrawDialogOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [placementMode, setPlacementMode] = useState(false);
  const [placementDataUrl, setPlacementDataUrl] = useState('');

  // Tender list for some tools
  const [tenders, setTenders] = useState<TenderOption[]>([]);

  // Doc Review state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('external_doc');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [ocrStatusMap, setOcrStatusMap] = useState<Record<string, { loading: boolean; text?: string }>>({});
  const [reviewStatusMap, setReviewStatusMap] = useState<Record<string, { loading: boolean; result?: string }>>({});
  const [reviewPrompts, setReviewPrompts] = useState<Record<string, string>>({});
  const [submitUrls, setSubmitUrls] = useState<Record<string, string>>({});
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  // AI Extract state
  const [extractPrompt, setExtractPrompt] = useState<Record<string, string>>({});
  const [extractLoading, setExtractLoading] = useState<Set<string>>(new Set());
  const [extractResults, setExtractResults] = useState<Record<string, string>>({});
  const [showExtract, setShowExtract] = useState<Set<string>>(new Set());
  // AI Extract tab: per-document extraction history (allows multiple extractions with different prompts)
  const [extractHistory, setExtractHistory] = useState<Record<string, Array<{ prompt: string; result: string; timestamp: string }>>>({});

  const { user } = useAuthStore();

  /* ── Load tenders ── */
  useEffect(() => {
    api.get('/tenders', { status: 'open', limit: '50' }).then(res => {
      if (res.success) setTenders(res.data || []);
    }).catch(() => {});
  }, []);

  /* ── Auto-open bid builder or Agent tab when navigated from "Start Bid Application" ── */
  useEffect(() => {
    if (viewParams?.tenderId) {
      setBidSelectedTender(viewParams.tenderId);
      // Populate bid form from tender data once tenders are loaded
      const t = tenders.find(t => t.id === viewParams.tenderId);
      if (t) {
        setBidForm(prev => ({
          ...prev, tenderTitle: t.title, scope: t.scope || '',
          budgetRange: t.budgetMin && t.budgetMax ? `${t.budgetMin} - ${t.budgetMax} ETB` : '',
          category: t.categoryTags || '',
        }));
      }
    }
    // If openAgent flag is set, switch to Agent tab (takes priority over bid-builder)
    if (viewParams?.openAgent === 'true') {
      setRibbonTab('agent');
    } else if (viewParams?.tenderId) {
      setActiveAITool('bid-builder');
      setAiPanelOpen(true);
    }
  }, [viewParams, tenders]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Load documents for review ── */
  const loadDocuments = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await api.get('/documents');
      if (res.success && res.data) {
        setDocuments(res.data);
        // Initialize prompts/urls from loaded data
        const prompts: Record<string, string> = {};
        const urls: Record<string, string> = {};
        for (const doc of res.data as Document[]) {
          if (doc.aiReviewPrompt) prompts[doc.id] = doc.aiReviewPrompt;
          if (doc.submitUrl) urls[doc.id] = doc.submitUrl;
        }
        setReviewPrompts(prev => ({ ...prev, ...prompts }));
        setSubmitUrls(prev => ({ ...prev, ...urls }));
      }
    } catch {
      // ignore
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ribbonTab === 'doc-review') {
      loadDocuments();
    }
  }, [ribbonTab, loadDocuments]);

  /* ── Word count ── */
  const updateCounts = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const text = el.innerText || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
    setCharCount(text.length);
  }, []);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const observer = new MutationObserver(updateCounts);
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [updateCounts]);

  /* ── Format commands ── */
  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value || undefined);
    editorRef.current?.focus();
    setSaveStatus('unsaved');
    updateCounts();
  };

  const handleDocChange = () => {
    setSaveStatus('unsaved');
    updateCounts();
  };

  /* ── Save ── */
  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      toast.success('Document saved');
    }, 600);
  };

  /* ── Insert helpers ── */
  const insertTable = (rows: number, cols: number) => {
    let html = '<table style="border-collapse:collapse;width:100%;margin:8px 0;">';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        html += '<td style="border:1px solid #d1d5db;padding:6px 8px;min-width:60px;">&nbsp;</td>';
      }
      html += '</tr>';
    }
    html += '</table>';
    document.execCommand('insertHTML', false, html);
    editorRef.current?.focus();
    setSaveStatus('unsaved');
  };

  const insertImageFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        document.execCommand('insertHTML', false, `<img src="${dataUrl}" style="max-width:100%;height:auto;margin:8px 0;" />`);
        editorRef.current?.focus();
        setSaveStatus('unsaved');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const insertDateTime = () => {
    const now = new Date();
    const str = now.toLocaleString();
    document.execCommand('insertText', false, str);
    editorRef.current?.focus();
    setSaveStatus('unsaved');
  };

  const insertPageBreak = () => {
    document.execCommand('insertHTML', false, '<div style="page-break-after:always;border-top:2px dashed #d1d5db;margin:16px 0;padding-top:4px;text-align:center;color:#9ca3af;font-size:10px;">--- Page Break ---</div>');
    editorRef.current?.focus();
    setSaveStatus('unsaved');
  };

  const insertPageNumber = () => {
    document.execCommand('insertHTML', false, '<span style="color:#6b7280;font-size:11px;">[Page 1]</span>');
    editorRef.current?.focus();
    setSaveStatus('unsaved');
  };

  /* ── Signature Drawing ── */
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const endDraw = () => { setIsDrawing(false); };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const saveDrawnSignature = () => {
    const dataUrl = canvasRef.current?.toDataURL('image/png');
    if (dataUrl) {
      const sigCount = savedSignatures.filter(s => s.type === 'signature').length + 1;
      addSignature(dataUrl, `Signature ${sigCount}`, 'signature');
      toast.success('Signature saved');
      setDrawDialogOpen(false);
      clearCanvas();
    }
  };

  const uploadSignature = () => {
    uploadFromFile('signature');
  };

  const addStamp = (text: string) => {
    const dataUrl = generateStamp(text);
    addSignature(dataUrl, `${text} Stamp`, 'stamp');
    toast.success(`${text} stamp created`);
  };

  const startPlacement = (dataUrl: string) => {
    setPlacementDataUrl(dataUrl);
    setPlacementMode(true);
    toast.info('Click on the document to place the signature/stamp');
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placementMode || !placementDataUrl) return;
    e.preventDefault();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.collapse(false);
      const img = document.createElement('img');
      img.src = placementDataUrl;
      img.setAttribute('data-signature', 'true');
      img.style.maxHeight = '80px';
      img.style.margin = '4px';
      img.style.cursor = 'pointer';
      img.onclick = () => {
        if (confirm('Remove this signature/stamp?')) {
          img.remove();
          setSaveStatus('unsaved');
          updateCounts();
        }
      };
      range.insertNode(img);
      range.collapse(false);
    } else {
      document.execCommand('insertHTML', false,
        `<img src="${placementDataUrl}" data-signature="true" style="max-height:80px;margin:4px;cursor:pointer;" onclick="if(confirm('Remove?'))this.remove()" />`
      );
    }
    setPlacementMode(false);
    setPlacementDataUrl('');
    setSaveStatus('unsaved');
    updateCounts();
  };

  // deleteSignature is now provided by useStampSignature hook as removeItem

  /* ── AI Generation ── */
  const setDocumentContent = (html: string) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
      setSaveStatus('unsaved');
      updateCounts();
    }
  };

  /* ════════════════════════════════════════════════════════════
     DOC REVIEW: Upload
     ════════════════════════════════════════════════════════════ */
  const handleFileUpload = async (files: FileList | File[]) => {
    const file = files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', uploadDocType);
      const res = await api.upload('/documents', formData);
      if (res.success) {
        toast.success(`"${file.name}" uploaded successfully`);
        loadDocuments();
      } else {
        toast.error(res.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  /* ════════════════════════════════════════════════════════════
     DOC REVIEW: OCR
     ════════════════════════════════════════════════════════════ */
  const triggerOCR = async (docId: string) => {
    setOcrStatusMap(prev => ({ ...prev, [docId]: { loading: true } }));
    try {
      const res = await api.post(`/document-ocr/${docId}`);
      if (res.success) {
        toast.success('OCR processing started');
        // Poll for completion
        pollOCRStatus(docId);
      } else {
        toast.error(res.error || 'OCR failed');
        setOcrStatusMap(prev => ({ ...prev, [docId]: { loading: false } }));
      }
    } catch {
      toast.error('OCR request failed');
      setOcrStatusMap(prev => ({ ...prev, [docId]: { loading: false } }));
    }
  };

  const pollOCRStatus = async (docId: string) => {
    let attempts = 0;
    const maxAttempts = 30;
    const poll = async () => {
      try {
        const res = await api.get(`/document-ocr/${docId}`);
        if (res.success && res.data) {
          const status = res.data.ocrStatus;
          if (status === 'completed') {
            setOcrStatusMap(prev => ({ ...prev, [docId]: { loading: false, text: res.data.ocrText } }));
            toast.success('OCR completed');
            // Refresh document list
            loadDocuments();
            return;
          } else if (status === 'failed') {
            setOcrStatusMap(prev => ({ ...prev, [docId]: { loading: false } }));
            toast.error('OCR failed');
            return;
          }
        }
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setOcrStatusMap(prev => ({ ...prev, [docId]: { loading: false } }));
          toast.info('OCR is taking longer than expected. Check back later.');
        }
      } catch {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        }
      }
    };
    setTimeout(poll, 2000);
  };

  /* ════════════════════════════════════════════════════════════
     DOC REVIEW: AI Review
     ════════════════════════════════════════════════════════════ */
  const triggerReview = async (docId: string) => {
    const prompt = reviewPrompts[docId]?.trim() || '';
    setReviewStatusMap(prev => ({ ...prev, [docId]: { loading: true } }));
    try {
      const res = await api.post(`/document-review/${docId}`, prompt ? { prompt } : {}, { timeout: 55_000 });
      if (res.success) {
        toast.success('AI Review started');
        pollReviewStatus(docId);
      } else {
        toast.error(res.error || 'AI Review failed');
        setReviewStatusMap(prev => ({ ...prev, [docId]: { loading: false } }));
      }
    } catch {
      toast.error('AI Review request failed');
      setReviewStatusMap(prev => ({ ...prev, [docId]: { loading: false } }));
    }
  };

  const pollReviewStatus = async (docId: string) => {
    let attempts = 0;
    const maxAttempts = 40;
    const poll = async () => {
      try {
        const res = await api.get(`/document-review/${docId}`);
        if (res.success && res.data) {
          const status = res.data.aiReviewStatus;
          if (status === 'completed') {
            setReviewStatusMap(prev => ({ ...prev, [docId]: { loading: false, result: res.data.aiReview } }));
            toast.success('AI Review completed');
            loadDocuments();
            return;
          } else if (status === 'failed') {
            setReviewStatusMap(prev => ({ ...prev, [docId]: { loading: false } }));
            toast.error('AI Review failed');
            return;
          }
        }
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        } else {
          setReviewStatusMap(prev => ({ ...prev, [docId]: { loading: false } }));
          toast.info('AI Review is taking longer than expected. Check back later.');
        }
      } catch {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 4000);
        }
      }
    };
    setTimeout(poll, 3000);
  };

  /* ════════════════════════════════════════════════════════════
     DOC REVIEW: Submit URL
     ════════════════════════════════════════════════════════════ */
  const saveSubmitUrl = async (docId: string) => {
    const url = submitUrls[docId]?.trim() || '';
    try {
      const res = await api.patch(`/documents/${docId}`, { submitUrl: url || null });
      if (res.success) {
        toast.success(url ? 'Submit URL saved' : 'Submit URL removed');
      } else {
        toast.error(res.error || 'Failed to save URL');
      }
    } catch {
      toast.error('Failed to save URL');
    }
  };

  const openSubmitUrl = (docId: string) => {
    const url = submitUrls[docId];
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  /* ════════════════════════════════════════════════════════════
     DOC REVIEW: Save prompt
     ════════════════════════════════════════════════════════════ */
  const saveReviewPrompt = async (docId: string) => {
    const prompt = reviewPrompts[docId]?.trim() || '';
    try {
      await api.patch(`/documents/${docId}`, { aiReviewPrompt: prompt || null });
    } catch {
      // silent fail for prompt save
    }
  };

  /* ════════════════════════════════════════════════════════════
     DOC REVIEW: AI Extract
     ════════════════════════════════════════════════════════════ */
  const handleAiExtract = useCallback(async (docId: string) => {
    const prompt = extractPrompt[docId]?.trim();
    if (!prompt) {
      toast.error('Please enter a prompt');
      return;
    }
    setExtractLoading(prev => new Set(prev).add(docId));
    try {
      const res = await api.post('/documents/ai-extract', { documentId: docId, prompt });
      if (res.success) {
        const extractedInfo = res.data.extractedInfo;
        setExtractResults(prev => ({ ...prev, [docId]: extractedInfo }));
        setExtractHistory(prev => ({
          ...prev,
          [docId]: [...(prev[docId] || []), { prompt, result: extractedInfo, timestamp: new Date().toLocaleString() }],
        }));
        toast.success('Information extracted successfully');
      } else {
        toast.error(res.error || 'Extraction failed');
      }
    } catch {
      toast.error('Extraction failed');
    } finally {
      setExtractLoading(prev => { const s = new Set(prev); s.delete(docId); return s; });
    }
  }, [extractPrompt]);

  /* ════════════════════════════════════════════════════════════
     RIBBON: HOME TAB
     ════════════════════════════════════════════════════════════ */
  const HomeRibbon = () => (
    <div className="flex items-center gap-1 flex-wrap px-2 py-1.5">
      {/* Undo / Redo */}
      <RibbonBtn icon={Undo2} title="Undo" onClick={() => handleFormat('undo')} />
      <RibbonBtn icon={Redo2} title="Redo" onClick={() => handleFormat('redo')} />
      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Heading */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1 h-7 px-2 text-xs border border-border rounded hover:bg-muted transition-colors">
            <Type className="h-3.5 w-3.5" />
            Heading
            <ChevronDown className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-1" align="start">
          {['Normal', 'H1', 'H2', 'H3'].map(h => (
            <button key={h} onClick={() => handleFormat('formatBlock', h === 'Normal' ? '<p>' : `<${h.toLowerCase()}>`)}
              className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-muted transition-colors"
              style={h !== 'Normal' ? { fontSize: h === 'H1' ? 18 : h === 'H2' ? 16 : 14, fontWeight: 700 } : {}}>
              {h}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Font Family */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1 h-7 px-2 text-xs border border-border rounded hover:bg-muted transition-colors max-w-[110px]">
            <span className="truncate">Font</span>
            <ChevronDown className="h-3 w-3 flex-shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start">
          {FONT_FAMILIES.map(f => (
            <button key={f} onClick={() => handleFormat('fontName', f)}
              className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-muted transition-colors"
              style={{ fontFamily: f }}>
              {f}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Font Size */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1 h-7 px-2 text-xs border border-border rounded hover:bg-muted transition-colors">
            <span>Size</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-32 p-1" align="start">
          {FONT_SIZES.map(s => (
            <button key={s} onClick={() => handleFormat('fontSize', s)}
              className="w-full text-left px-3 py-1 text-xs rounded hover:bg-muted transition-colors">
              {s}pt
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Bold / Italic / Underline */}
      <RibbonBtn icon={Bold} title="Bold (Ctrl+B)" onClick={() => handleFormat('bold')} />
      <RibbonBtn icon={Italic} title="Italic (Ctrl+I)" onClick={() => handleFormat('italic')} />
      <RibbonBtn icon={Underline} title="Underline (Ctrl+U)" onClick={() => handleFormat('underline')} />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text Color */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="h-7 w-7 rounded border border-border hover:bg-muted transition-colors flex items-center justify-center" title="Text Color">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold leading-none">A</span>
              <div className="w-4 h-1 rounded-sm mt-0.5" style={{ backgroundColor: '#000000' }} />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {TEXT_COLORS.map(c => (
              <button key={c} onClick={() => handleFormat('foreColor', c)}
                className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Highlight */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="h-7 w-7 rounded border border-border hover:bg-muted transition-colors flex items-center justify-center" title="Highlight">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold leading-none bg-yellow-200 px-0.5">A</span>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {HIGHLIGHT_COLORS.map(c => (
              <button key={c} onClick={() => handleFormat('hiliteColor', c)}
                className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Alignment */}
      <RibbonBtn icon={AlignLeft} title="Align Left" onClick={() => handleFormat('justifyLeft')} />
      <RibbonBtn icon={AlignCenter} title="Align Center" onClick={() => handleFormat('justifyCenter')} />
      <RibbonBtn icon={AlignRight} title="Align Right" onClick={() => handleFormat('justifyRight')} />
      <RibbonBtn icon={AlignJustify} title="Justify" onClick={() => handleFormat('justifyFull')} />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists */}
      <RibbonBtn icon={List} title="Bullet List" onClick={() => handleFormat('insertUnorderedList')} />
      <RibbonBtn icon={ListOrdered} title="Numbered List" onClick={() => handleFormat('insertOrderedList')} />
    </div>
  );

  /* ════════════════════════════════════════════════════════════
     RIBBON: INSERT TAB
     ════════════════════════════════════════════════════════════ */
  const InsertRibbon = () => (
    <div className="flex items-center gap-1 flex-wrap px-2 py-1.5">
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1 h-7 px-2 text-xs border border-border rounded hover:bg-muted transition-colors">
            <Table className="h-3.5 w-3.5" /> Table <ChevronDown className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-36 p-1" align="start">
          <button onClick={() => insertTable(2, 2)} className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-muted">2 x 2</button>
          <button onClick={() => insertTable(3, 3)} className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-muted">3 x 3</button>
          <button onClick={() => insertTable(4, 4)} className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-muted">4 x 4</button>
        </PopoverContent>
      </Popover>
      <RibbonBtn icon={Minus} title="Horizontal Rule" onClick={() => handleFormat('insertHorizontalRule')} />
      <RibbonBtn icon={ImageIcon} title="Insert Image" onClick={insertImageFromFile} />
      <RibbonBtn icon={Clock} title="Insert Date/Time" onClick={insertDateTime} />
      <RibbonBtn icon={FileText} title="Page Break" onClick={insertPageBreak} />
      <RibbonBtn icon={Type} title="Page Number" onClick={insertPageNumber} />
    </div>
  );

  /* ════════════════════════════════════════════════════════════
     RIBBON: REVIEW TAB
     ════════════════════════════════════════════════════════════ */
  const ReviewRibbon = () => (
    <div className="flex items-center gap-3 px-2 py-1.5 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5" />
        <span>Words: <strong className="text-foreground">{wordCount}</strong></span>
      </div>
      <div className="flex items-center gap-1.5">
        <Type className="h-3.5 w-3.5" />
        <span>Chars: <strong className="text-foreground">{charCount}</strong></span>
      </div>
      <Separator orientation="vertical" className="h-6" />
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toast.info('Spell check coming soon')}>
        <Check className="h-3.5 w-3.5 mr-1" /> Spell Check
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <div className="text-[11px]">
        <span className="text-muted-foreground">Author: </span>
        <strong className="text-foreground">{user?.profile?.fullName || 'Unknown'}</strong>
      </div>
      <div className="text-[11px]">
        <span className="text-muted-foreground">Created: </span>
        <strong className="text-foreground">{new Date().toLocaleDateString()}</strong>
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════════════════
     RIBBON: AI TOOLS TAB
     ════════════════════════════════════════════════════════════ */
  const AIToolsRibbon = () => (
    <div className="flex items-center gap-2 px-2 py-1.5">
      {AI_TOOLS.map(tool => {
        const Icon = tool.icon;
        const isActive = aiPanelOpen && activeAITool === tool.id;
        return (
          <button key={tool.id} onClick={() => { setActiveAITool(tool.id); setAiPanelOpen(true); }}
            className={`flex items-center gap-1.5 h-7 px-3 text-xs rounded border transition-colors ${
              isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'border-border hover:bg-muted text-foreground'
            }`}>
            <Icon className="h-3.5 w-3.5" />
            {tool.label}
          </button>
        );
      })}
    </div>
  );

  /* ════════════════════════════════════════════════════════════
     RIBBON: SIGN TAB
     ════════════════════════════════════════════════════════════ */
  const SignRibbon = () => (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDrawDialogOpen(true)}>
        <Pen className="h-3.5 w-3.5 mr-1" /> Draw Signature
      </Button>
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={uploadSignature}>
        <ImageIcon className="h-3.5 w-3.5 mr-1" /> Upload Signature
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1 h-7 px-2 text-xs border border-border rounded hover:bg-muted transition-colors">
            <Stamp className="h-3.5 w-3.5" /> Add Stamp <ChevronDown className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-1" align="start">
          {STAMP_TEMPLATES.map(st => (
            <button key={st.text} onClick={() => addStamp(st.text)}
              className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-muted transition-colors">
              {st.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
      <Separator orientation="vertical" className="h-6" />
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <FileSignature className="h-3.5 w-3.5" />
        Saved: {savedSignatures.length}
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════════════════
     RIBBON: DOC REVIEW TAB
     ════════════════════════════════════════════════════════════ */
  const DocReviewRibbon = () => (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => fileInputRef.current?.click()}>
        <FileUp className="h-3.5 w-3.5 mr-1" /> Upload Document
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <Select value={uploadDocType} onValueChange={setUploadDocType}>
        <SelectTrigger className="h-7 text-xs w-[160px] border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DOC_TYPE_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Separator orientation="vertical" className="h-6" />
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={loadDocuments}>
        <RefreshCw className={`h-3.5 w-3.5 mr-1 ${docsLoading ? 'animate-spin' : ''}`} /> Refresh
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <FileSearch className="h-3.5 w-3.5" />
        {documents.length} document{documents.length !== 1 ? 's' : ''}
      </div>
    </div>
  );

  const AIExtractRibbon = () => (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => fileInputRef.current?.click()}>
        <FileUp className="h-3.5 w-3.5 mr-1" /> Upload Document
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={loadDocuments}>
        <RefreshCw className={`h-3.5 w-3.5 mr-1 ${docsLoading ? 'animate-spin' : ''}`} /> Refresh
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        Extract info from {documents.filter(d => d.ocrStatus === 'completed').length} OCR-ready document{documents.filter(d => d.ocrStatus === 'completed').length !== 1 ? 's' : ''}
      </div>
    </div>
  );

  const AgentRibbon = () => <div className="px-3 py-2 text-xs text-muted-foreground">AI Tender Agent — Upload documents, analyze tenders, extract bidders, generate compliance docs</div>;

  const RIBBON_MAP: Record<RibbonTab, () => React.JSX.Element> = {
    home: HomeRibbon,
    insert: InsertRibbon,
    review: ReviewRibbon,
    'ai-tools': AIToolsRibbon,
    sign: SignRibbon,
    'doc-review': DocReviewRibbon,
    'ai-extract': AIExtractRibbon,
    agent: AgentRibbon,
  };

  /* ════════════════════════════════════════════════════════════
     AI TOOL FORMS (for right panel)
     ════════════════════════════════════════════════════════════ */

  /* -- Tender Builder Form -- */
  const [tenderForm, setTenderForm] = useState({
    title: '', category: '', location: '', budgetMin: '', budgetMax: '',
    deadline: '', description: '', notes: '',
  });
  const updateTenderField = (f: string, v: string) => setTenderForm(prev => ({ ...prev, [f]: v }));

  const generateTender = async () => {
    if (!tenderForm.title || !tenderForm.category || !tenderForm.description) {
      toast.error('Please fill in Title, Category, and Description');
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.post('/ai/tender-prep', {
        title: tenderForm.title, category: tenderForm.category, location: tenderForm.location,
        budgetMin: tenderForm.budgetMin, budgetMax: tenderForm.budgetMax, deadline: tenderForm.deadline,
        description: tenderForm.description, notes: tenderForm.notes,
        skills: user?.profile?.skillTags || '', userName: user?.profile?.fullName || '',
      });
      if (res.success && res.data) {
        setDocumentContent(formatAIResultToHTML(res.data));
        toast.success('Tender document generated!');
      } else { toast.error(res.error || 'Failed to generate'); }
    } catch { toast.error('AI generation failed'); }
    finally { setAiLoading(false); }
  };

  /* -- Bid Builder Form -- */
  const [bidForm, setBidForm] = useState({
    tenderTitle: '', scope: '', budgetRange: '', category: '',
    companyName: '', experience: '', proposedBudget: '', proposedTimeline: '', notes: '',
  });
  const [bidSelectedTender, setBidSelectedTender] = useState('');
  const [bidSkills, setBidSkills] = useState<string[]>([]);
  const updateBidField = (f: string, v: string) => setBidForm(prev => ({ ...prev, [f]: v }));

  const selectBidTender = (tenderId: string) => {
    setBidSelectedTender(tenderId);
    const t = tenders.find(t => t.id === tenderId);
    if (t) {
      setBidForm(prev => ({
        ...prev, tenderTitle: t.title, scope: t.scope || '',
        budgetRange: t.budgetMin && t.budgetMax ? `${t.budgetMin} - ${t.budgetMax} ETB` : '',
        category: t.categoryTags || '',
      }));
    }
  };

  const generateBid = async () => {
    if (!bidForm.tenderTitle && !bidSelectedTender) {
      toast.error('Please select a tender or enter details'); return;
    }
    setAiLoading(true);
    try {
      const res = await api.post('/ai/bid-prep', {
        tenderId: bidSelectedTender || undefined, tenderTitle: bidForm.tenderTitle,
        scope: bidForm.scope, budgetRange: bidForm.budgetRange, category: bidForm.category,
        skills: bidSkills.join(', '), companyName: bidForm.companyName, experience: bidForm.experience,
        proposedBudget: bidForm.proposedBudget, proposedTimeline: bidForm.proposedTimeline,
        notes: bidForm.notes, userName: user?.profile?.fullName || '', userSkills: user?.profile?.skillTags || '',
      });
      if (res.success && res.data) {
        setDocumentContent(formatAIResultToHTML(res.data));
        toast.success('Bid proposal generated!');
      } else { toast.error(res.error || 'Failed to generate'); }
    } catch { toast.error('AI generation failed'); }
    finally { setAiLoading(false); }
  };

  /* -- Requirement Analyzer Form -- */
  const [reqForm, setReqForm] = useState({
    tenderTitle: '', scope: '', budget: '', category: '', requiredDocs: '', deadline: '',
  });
  const [reqSelectedTender, setReqSelectedTender] = useState('');
  const [reqSkills, setReqSkills] = useState<string[]>([]);
  const updateReqField = (f: string, v: string) => setReqForm(prev => ({ ...prev, [f]: v }));

  const selectReqTender = (tenderId: string) => {
    setReqSelectedTender(tenderId);
    const t = tenders.find(t => t.id === tenderId);
    if (t) {
      setReqForm({
        tenderTitle: t.title, scope: t.scope || '',
        budget: t.budgetMin && t.budgetMax ? `${t.budgetMin} - ${t.budgetMax} ETB` : '',
        category: t.categoryTags || '', requiredDocs: t.requiredDocs || '',
        deadline: t.deadline ? new Date(t.deadline).toISOString().split('T')[0] : '',
      });
    }
  };

  const generateReq = async () => {
    if (!reqForm.tenderTitle && !reqSelectedTender) {
      toast.error('Please select a tender or enter details'); return;
    }
    setAiLoading(true);
    try {
      const res = await api.post('/ai/analyze-requirements', {
        tenderId: reqSelectedTender || undefined, tenderTitle: reqForm.tenderTitle,
        scope: reqForm.scope, budget: reqForm.budget, category: reqForm.category,
        requiredDocs: reqForm.requiredDocs, deadline: reqForm.deadline,
        skills: reqSkills.join(', '), userName: user?.profile?.fullName || '',
        userSkills: user?.profile?.skillTags || '',
      });
      if (res.success && res.data) {
        setDocumentContent(formatAIResultToHTML(res.data as Record<string, unknown>));
        toast.success('Requirements analyzed!');
      } else { toast.error(res.error || 'Failed to analyze'); }
    } catch { toast.error('AI analysis failed'); }
    finally { setAiLoading(false); }
  };

  /* -- Applicant Analyzer Form -- */
  const [appSelectedTender, setAppSelectedTender] = useState('');

  const generateApplicant = async () => {
    if (!appSelectedTender) { toast.error('Please select a tender'); return; }
    setAiLoading(true);
    try {
      const res = await api.post('/ai/analyze-applicants', { tenderId: appSelectedTender });
      if (res.success && res.data) {
        const d = res.data as Record<string, unknown>;
        let html = '';
        if (d.summary) {
          const s = d.summary as Record<string, unknown>;
          html += `<h2 style="font-size:16px;font-weight:700;margin:16px 0 8px;color:#059669;border-bottom:1px solid #d1fae5;padding-bottom:4px;">Summary</h2>`;
          html += `<p>Total Bids: <strong>${s.totalBids ?? 0}</strong> | Average Score: <strong>${s.averageScore ?? 0}</strong></p>`;
        }
        if (d.applicants && Array.isArray(d.applicants)) {
          html += `<h2 style="font-size:16px;font-weight:700;margin:16px 0 8px;color:#059669;border-bottom:1px solid #d1fae5;padding-bottom:4px;">Ranked Applicants</h2>`;
          for (const a of d.applicants as Record<string, unknown>[]) {
            html += `<div style="margin:8px 0;padding:8px;border:1px solid #e5e7eb;border-radius:6px;">
              <strong>#${a.rank} ${a.name}</strong> (${a.company}) - Score: <strong>${a.overallScore}</strong>
              <br/>Technical: ${a.technicalScore}% | Financial: ${a.financialScore}%
              <br/>Risk: ${a.riskLevel} | Recommendation: ${a.recommendation}
            </div>`;
          }
        }
        if (d.budgetAnalysis) html += formatAIResultToHTML({ budgetAnalysis: d.budgetAnalysis });
        if (d.riskSummary) html += formatAIResultToHTML({ riskSummary: d.riskSummary });
        if (d.finalRecommendation) html += formatAIResultToHTML({ finalRecommendation: d.finalRecommendation });
        setDocumentContent(html || '<p>No results</p>');
        toast.success('Applicants analyzed!');
      } else { toast.error(res.error || 'Failed to analyze'); }
    } catch { toast.error('AI analysis failed'); }
    finally { setAiLoading(false); }
  };

  /* ── AI Panel Content ── */
  const AIPanelContent = () => {
    const formClass = "h-8 text-xs bg-muted/50 border-border/50";
    return (
      <ScrollArea className="h-full">
        <div className="p-3 space-y-3">
          {/* Close button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold">AI Assistant</span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setAiPanelOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Tool selector */}
          <div className="flex flex-wrap gap-1">
            {AI_TOOLS.map(tool => {
              const Icon = tool.icon;
              const isActive = activeAITool === tool.id;
              return (
                <button key={tool.id} onClick={() => setActiveAITool(tool.id)}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border transition-colors ${
                    isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'border-border text-muted-foreground hover:bg-muted'
                  }`}>
                  <Icon className="h-3 w-3" /> {tool.label}
                </button>
              );
            })}
          </div>

          <Separator />

          {/* Tender Builder Form */}
          {activeAITool === 'tender-builder' && (
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tender Builder</Label>
              <div><Label className="text-[10px]">Title *</Label><Input placeholder="Tender title" value={tenderForm.title} onChange={e => updateTenderField('title', e.target.value)} className={formClass} /></div>
              <div><Label className="text-[10px]">Category *</Label>
                <Select value={tenderForm.category} onValueChange={v => updateTenderField('category', v)}>
                  <SelectTrigger className="h-8 text-xs bg-muted/50 border-border/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-[10px]">Location</Label><Input placeholder="e.g., Addis Ababa" value={tenderForm.location} onChange={e => updateTenderField('location', e.target.value)} className={formClass} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px]">Budget Min</Label><Input type="number" placeholder="0" value={tenderForm.budgetMin} onChange={e => updateTenderField('budgetMin', e.target.value)} className={formClass} /></div>
                <div><Label className="text-[10px]">Budget Max</Label><Input type="number" placeholder="0" value={tenderForm.budgetMax} onChange={e => updateTenderField('budgetMax', e.target.value)} className={formClass} /></div>
              </div>
              <div><Label className="text-[10px]">Deadline</Label><Input type="date" value={tenderForm.deadline} onChange={e => updateTenderField('deadline', e.target.value)} className={formClass} /></div>
              <div><Label className="text-[10px]">Description *</Label><Textarea placeholder="Scope and requirements..." value={tenderForm.description} onChange={e => updateTenderField('description', e.target.value)} className="min-h-[60px] text-xs bg-muted/50 border-border/50 resize-none" /></div>
              <div><Label className="text-[10px]">Notes</Label><Textarea placeholder="Optional notes..." value={tenderForm.notes} onChange={e => updateTenderField('notes', e.target.value)} className="min-h-[40px] text-xs bg-muted/50 border-border/50 resize-none" /></div>
              <GenerateButton onClick={generateTender} loading={aiLoading} />
            </div>
          )}

          {/* Bid Builder Form */}
          {activeAITool === 'bid-builder' && (
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Bid Proposal</Label>
              <div><Label className="text-[10px]">Select Tender</Label>
                <Select value={bidSelectedTender} onValueChange={selectBidTender}>
                  <SelectTrigger className="h-8 text-xs bg-muted/50 border-border/50"><SelectValue placeholder="Choose tender" /></SelectTrigger>
                  <SelectContent>{tenders.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Separator />
              <p className="text-[9px] text-muted-foreground uppercase">Or enter manually</p>
              <div><Label className="text-[10px]">Tender Title</Label><Input value={bidForm.tenderTitle} onChange={e => updateBidField('tenderTitle', e.target.value)} className={formClass} /></div>
              <div><Label className="text-[10px]">Scope</Label><Textarea value={bidForm.scope} onChange={e => updateBidField('scope', e.target.value)} className="min-h-[50px] text-xs bg-muted/50 border-border/50 resize-none" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px]">Budget Range</Label><Input value={bidForm.budgetRange} onChange={e => updateBidField('budgetRange', e.target.value)} className={formClass} /></div>
                <div><Label className="text-[10px]">Category</Label>
                  <Select value={bidForm.category} onValueChange={v => updateBidField('category', v)}>
                    <SelectTrigger className="h-8 text-xs bg-muted/50 border-border/50"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label className="text-[10px]">Your Skills</Label><SkillTagSelector selected={bidSkills} onChange={setBidSkills} /></div>
              <div><Label className="text-[10px]">Company</Label><Input value={bidForm.companyName} onChange={e => updateBidField('companyName', e.target.value)} className={formClass} /></div>
              <div><Label className="text-[10px]">Experience</Label><Textarea value={bidForm.experience} onChange={e => updateBidField('experience', e.target.value)} className="min-h-[50px] text-xs bg-muted/50 border-border/50 resize-none" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px]">Proposed Budget</Label><Input type="number" value={bidForm.proposedBudget} onChange={e => updateBidField('proposedBudget', e.target.value)} className={formClass} /></div>
                <div><Label className="text-[10px]">Timeline</Label><Input value={bidForm.proposedTimeline} onChange={e => updateBidField('proposedTimeline', e.target.value)} className={formClass} /></div>
              </div>
              <GenerateButton onClick={generateBid} loading={aiLoading} />
            </div>
          )}

          {/* Requirement Analyzer Form */}
          {activeAITool === 'requirement-analyzer' && (
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Requirement Analyzer</Label>
              <div><Label className="text-[10px]">Select Tender</Label>
                <Select value={reqSelectedTender} onValueChange={selectReqTender}>
                  <SelectTrigger className="h-8 text-xs bg-muted/50 border-border/50"><SelectValue placeholder="Choose tender" /></SelectTrigger>
                  <SelectContent>{tenders.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Separator />
              <p className="text-[9px] text-muted-foreground uppercase">Or enter manually</p>
              <div><Label className="text-[10px]">Tender Title</Label><Input value={reqForm.tenderTitle} onChange={e => updateReqField('tenderTitle', e.target.value)} className={formClass} /></div>
              <div><Label className="text-[10px]">Scope</Label><Textarea value={reqForm.scope} onChange={e => updateReqField('scope', e.target.value)} className="min-h-[50px] text-xs bg-muted/50 border-border/50 resize-none" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px]">Budget</Label><Input value={reqForm.budget} onChange={e => updateReqField('budget', e.target.value)} className={formClass} /></div>
                <div><Label className="text-[10px]">Category</Label><Input value={reqForm.category} onChange={e => updateReqField('category', e.target.value)} className={formClass} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px]">Required Docs</Label><Input value={reqForm.requiredDocs} onChange={e => updateReqField('requiredDocs', e.target.value)} className={formClass} /></div>
                <div><Label className="text-[10px]">Deadline</Label><Input type="date" value={reqForm.deadline} onChange={e => updateReqField('deadline', e.target.value)} className={formClass} /></div>
              </div>
              <div><Label className="text-[10px]">Your Skills</Label><SkillTagSelector selected={reqSkills} onChange={setReqSkills} /></div>
              <GenerateButton onClick={generateReq} loading={aiLoading} />
            </div>
          )}

          {/* Applicant Analyzer Form */}
          {activeAITool === 'applicant-analyzer' && (
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Applicant Analyzer</Label>
              <div><Label className="text-[10px]">Select Your Tender</Label>
                <Select value={appSelectedTender} onValueChange={setAppSelectedTender}>
                  <SelectTrigger className="h-8 text-xs bg-muted/50 border-border/50"><SelectValue placeholder="Choose tender" /></SelectTrigger>
                  <SelectContent>{tenders.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <GenerateButton onClick={generateApplicant} loading={aiLoading} disabled={!appSelectedTender} />
            </div>
          )}
        </div>
      </ScrollArea>
    );
  };

  /* ════════════════════════════════════════════════════════════
     DOC REVIEW MAIN CONTENT
     ════════════════════════════════════════════════════════════ */
  const DocReviewContent = () => {
    const selectedDoc = documents.find(d => d.id === selectedDocId);
    const expandedDoc = documents.find(d => d.id === expandedDocId);

    return (
      <div className="flex-1 flex overflow-hidden bg-muted/30">
        {/* Left: Document List */}
        <div className="w-[380px] border-r border-border/60 bg-card flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-border/40">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <FileSearch className="h-4 w-4 text-emerald-600" />
              Document Vault
            </h3>

            {/* Upload Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer ${
                dragOver
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-border/60 hover:border-emerald-300 hover:bg-muted/30'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-1">
                  <Loader2 className="h-6 w-6 text-emerald-600 animate-spin" />
                  <p className="text-xs text-muted-foreground">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Drag & drop or click to upload
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">
                    PDF, DOCX, DOC, TXT, JPG, PNG
                  </p>
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png"
              className="hidden"
              onChange={e => {
                if (e.target.files) handleFileUpload(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {/* Document List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1.5">
              {docsLoading ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs">No documents uploaded yet</p>
                  <p className="text-[10px] mt-1">Upload a document to start reviewing</p>
                </div>
              ) : (
                documents.map(doc => {
                  const extBadge = getFileExtBadge(doc.fileName);
                  const isOcrLoading = ocrStatusMap[doc.id]?.loading;
                  const isReviewLoading = reviewStatusMap[doc.id]?.loading;
                  const ocrDone = doc.ocrStatus === 'completed';
                  const reviewDone = doc.aiReviewStatus === 'completed';
                  const isSelected = selectedDocId === doc.id;
                  const isExpanded = expandedDocId === doc.id;

                  return (
                    <div
                      key={doc.id}
                      className={`rounded-lg border p-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-300 bg-emerald-50/30 shadow-sm'
                          : 'border-border/40 hover:border-emerald-200 hover:bg-muted/20'
                      }`}
                      onClick={() => setSelectedDocId(doc.id)}
                    >
                      {/* Doc Header */}
                      <div className="flex items-start gap-2">
                        <div className="p-1.5 rounded bg-muted/50 flex-shrink-0">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium truncate">{doc.fileName}</p>
                            <Badge className={`text-[9px] px-1 py-0 border-0 ${extBadge.color}`}>
                              {extBadge.label}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {DOC_TYPE_OPTIONS.find(o => o.value === doc.docType)?.label || doc.docType}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-50"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm(`Delete "${doc.fileName}"? This cannot be undone.`)) return;
                            const res = await api.delete(`/documents/${doc.id}`);
                            if (res.success) {
                              toast.success('Document deleted');
                              loadDocuments();
                            } else {
                              toast.error(res.error || 'Failed to delete');
                            }
                          }}
                          title="Delete document"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <button
                          onClick={e => { e.stopPropagation(); setExpandedDocId(isExpanded ? null : doc.id); }}
                          className="p-0.5 hover:bg-muted rounded transition-colors"
                        >
                          <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                      </div>

                      {/* Status Row */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {/* OCR Status */}
                        <div className="flex items-center gap-1">
                          {doc.ocrStatus === 'completed' ? (
                            <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> OCR
                            </Badge>
                          ) : doc.ocrStatus === 'processing' ? (
                            <Badge className="text-[9px] px-1.5 py-0 bg-amber-100 text-amber-700 border-0 hover:bg-amber-100">
                              <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" /> OCR
                            </Badge>
                          ) : doc.ocrStatus === 'failed' ? (
                            <Badge className="text-[9px] px-1.5 py-0 bg-rose-100 text-rose-700 border-0 hover:bg-rose-100">
                              <XCircle className="h-2.5 w-2.5 mr-0.5" /> OCR
                            </Badge>
                          ) : (
                            <Badge className="text-[9px] px-1.5 py-0 bg-gray-100 text-gray-600 border-0 hover:bg-gray-100">
                              OCR
                            </Badge>
                          )}
                        </div>

                        {/* AI Review Status */}
                        <div className="flex items-center gap-1">
                          {doc.aiReviewStatus === 'completed' ? (
                            <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100">
                              <Sparkles className="h-2.5 w-2.5 mr-0.5" /> Reviewed
                            </Badge>
                          ) : doc.aiReviewStatus === 'processing' ? (
                            <Badge className="text-[9px] px-1.5 py-0 bg-amber-100 text-amber-700 border-0 hover:bg-amber-100">
                              <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" /> Reviewing
                            </Badge>
                          ) : doc.aiReviewStatus === 'failed' ? (
                            <Badge className="text-[9px] px-1.5 py-0 bg-rose-100 text-rose-700 border-0 hover:bg-rose-100">
                              <XCircle className="h-2.5 w-2.5 mr-0.5" /> Review
                            </Badge>
                          ) : (
                            <Badge className="text-[9px] px-1.5 py-0 bg-gray-100 text-gray-600 border-0 hover:bg-gray-100">
                              AI Review
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="mt-2.5 space-y-2 border-t border-border/30 pt-2.5" onClick={e => e.stopPropagation()}>
                          {/* Action Buttons Row */}
                          <div className="flex items-center gap-1.5">
                            {/* OCR Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] px-2"
                              disabled={isOcrLoading || doc.ocrStatus === 'processing' || doc.ocrStatus === 'completed'}
                              onClick={() => triggerOCR(doc.id)}
                            >
                              {isOcrLoading || doc.ocrStatus === 'processing' ? (
                                <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> OCR...</>
                              ) : doc.ocrStatus === 'completed' ? (
                                <><CheckCircle2 className="h-3 w-3 mr-1" /> OCR Done</>
                              ) : (
                                <><Eye className="h-3 w-3 mr-1" /> Run OCR</>
                              )}
                            </Button>

                            {/* AI Review Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] px-2"
                              disabled={isReviewLoading || doc.aiReviewStatus === 'processing' || !ocrDone}
                              onClick={() => triggerReview(doc.id)}
                              title={!ocrDone ? 'Run OCR first' : 'Run AI Review'}
                            >
                              {isReviewLoading || doc.aiReviewStatus === 'processing' ? (
                                <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Review...</>
                              ) : doc.aiReviewStatus === 'completed' ? (
                                <><Sparkles className="h-3 w-3 mr-1" /> Re-Review</>
                              ) : (
                                <><Sparkles className="h-3 w-3 mr-1" /> AI Review</>
                              )}
                            </Button>
                          </div>

                          {!ocrDone && (
                            <p className="text-[10px] text-amber-600 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Run OCR first before AI Review
                            </p>
                          )}

                          {/* Custom Review Prompt */}
                          <div>
                            <Label className="text-[10px] font-medium flex items-center gap-1 mb-1">
                              <Bot className="h-3 w-3" /> Review Instructions
                            </Label>
                            <Textarea
                              placeholder={PROMPT_SUGGESTIONS[doc.docType] || 'Enter custom review instructions...'}
                              value={reviewPrompts[doc.id] || ''}
                              onChange={e => setReviewPrompts(prev => ({ ...prev, [doc.id]: e.target.value }))}
                              onBlur={() => saveReviewPrompt(doc.id)}
                              className="min-h-[60px] text-[11px] bg-muted/30 border-border/50 resize-none"
                            />
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                              Leave empty for default procurement review
                            </p>
                          </div>

                          {/* Submit URL */}
                          <div>
                            <Label className="text-[10px] font-medium flex items-center gap-1 mb-1">
                              <Link2 className="h-3 w-3" /> Submit URL
                            </Label>
                            <div className="flex items-center gap-1.5">
                              <Input
                                placeholder="Enter external submission URL"
                                value={submitUrls[doc.id] || ''}
                                onChange={e => setSubmitUrls(prev => ({ ...prev, [doc.id]: e.target.value }))}
                                onBlur={() => saveSubmitUrl(doc.id)}
                                className="h-6 text-[11px] bg-muted/30 border-border/50 flex-1"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2 flex-shrink-0"
                                disabled={!submitUrls[doc.id]?.trim()}
                                onClick={() => openSubmitUrl(doc.id)}
                                title="Open submit URL"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Submit Document Button */}
                          {submitUrls[doc.id]?.trim() && (
                            <Button
                              size="sm"
                              className="h-7 text-[10px] w-full gradient-emerald text-white border-0 hover:opacity-90"
                              onClick={() => openSubmitUrl(doc.id)}
                            >
                              <ExternalLink className="h-3 w-3 mr-1.5" />
                              Submit Document
                            </Button>
                          )}

                          {/* AI Extract Section */}
                          {ocrDone && (
                            <div className="border-t border-border/30 pt-2">
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] px-2"
                                  onClick={() => {
                                    setShowExtract(prev => {
                                      const s = new Set(prev);
                                      if (s.has(doc.id)) s.delete(doc.id);
                                      else s.add(doc.id);
                                      return s;
                                    });
                                  }}
                                >
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  {showExtract.has(doc.id) ? 'Hide Extract' : 'AI Extract'}
                                </Button>
                              </div>

                              {showExtract.has(doc.id) && (
                                <div className="mt-2 space-y-1.5">
                                  <Input
                                    placeholder="What do you want to extract?"
                                    value={extractPrompt[doc.id] || ''}
                                    onChange={e => setExtractPrompt(prev => ({ ...prev, [doc.id]: e.target.value }))}
                                    className="h-6 text-[11px] bg-muted/30 border-border/50"
                                    onKeyDown={e => { if (e.key === 'Enter') handleAiExtract(doc.id); }}
                                  />
                                  {/* Quick prompt suggestions */}
                                  <div className="flex flex-wrap gap-1">
                                    {[
                                      'Extract financial figures',
                                      'List deadlines',
                                      'Summarize requirements',
                                      'Find contact info',
                                      'Identify compliance issues',
                                    ].map(suggestion => (
                                      <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => setExtractPrompt(prev => ({ ...prev, [doc.id]: suggestion }))}
                                        className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                      >
                                        {suggestion}
                                      </button>
                                    ))}
                                  </div>
                                  <Button
                                    size="sm"
                                    className="h-6 text-[10px] px-2 w-full gradient-emerald text-white border-0 hover:opacity-90"
                                    disabled={extractLoading.has(doc.id) || !extractPrompt[doc.id]?.trim()}
                                    onClick={() => handleAiExtract(doc.id)}
                                  >
                                    {extractLoading.has(doc.id) ? (
                                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Extracting...</>
                                    ) : (
                                      <><MessageSquare className="h-3 w-3 mr-1" /> Extract</>
                                    )}
                                  </Button>
                                  {extractResults[doc.id] && (
                                    <div className="rounded border border-border/40 bg-muted/20 overflow-hidden">
                                      <div className="flex items-center justify-between px-2 py-1 border-b border-border/30">
                                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Extracted Info</span>
                                        <div className="flex items-center gap-0.5">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 text-[9px] px-1"
                                            onClick={() => {
                                              navigator.clipboard.writeText(extractResults[doc.id]);
                                              toast.success('Copied to clipboard');
                                            }}
                                          >
                                            <Copy className="h-2.5 w-2.5 mr-0.5" /> Copy
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 text-[9px] px-1"
                                            onClick={() => {
                                              const safeName = (doc.fileName || 'extract').replace(/\.[^.]+$/, '');
                                              exportAsTxt(
                                                `Document: ${doc.fileName}\nPrompt: ${extractPrompt[doc.id] || ''}\n\n---\n\n${extractResults[doc.id]}`,
                                                `${safeName}-extract.txt`
                                              );
                                              toast.success('Exported as TXT');
                                            }}
                                            title="Export as TXT"
                                          >
                                            <FileDown className="h-2.5 w-2.5" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 text-[9px] px-1"
                                            onClick={() => {
                                              const safeName = (doc.fileName || 'extract').replace(/\.[^.]+$/, '');
                                              exportExtractAsPdf(
                                                `${safeName} - AI Extract`,
                                                extractPrompt[doc.id] || '',
                                                extractResults[doc.id],
                                                `${safeName}-extract.pdf`
                                              );
                                              toast.success('Export as PDF - use print dialog');
                                            }}
                                            title="Export as PDF"
                                          >
                                            <Download className="h-2.5 w-2.5" />
                                          </Button>
                                        </div>
                                      </div>
                                      <ScrollArea className="max-h-[150px]">
                                        <pre className="p-2 text-[10px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                                          {extractResults[doc.id]}
                                        </pre>
                                      </ScrollArea>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Document Detail / Results */}
        <div className="flex-1 overflow-auto bg-muted/30">
          {selectedDoc ? (
            <div className="p-4 space-y-4 max-w-3xl mx-auto">
              {/* Document Header */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/40">
                <div className="p-3 rounded-xl gradient-emerald shadow-sm">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold truncate">{selectedDoc.fileName}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {DOC_TYPE_OPTIONS.find(o => o.value === selectedDoc.docType)?.label || selectedDoc.docType} · Uploaded {new Date(selectedDoc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getFileExtBadge(selectedDoc.fileName).label && (
                    <Badge className={`text-xs px-2 py-0.5 border-0 ${getFileExtBadge(selectedDoc.fileName).color}`}>
                      {getFileExtBadge(selectedDoc.fileName).label}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Status Cards */}
              <div className="grid grid-cols-3 gap-3">
                {/* OCR Status Card */}
                <div className={`p-3 rounded-lg border ${
                  selectedDoc.ocrStatus === 'completed' ? 'border-emerald-200 bg-emerald-50/30' :
                  selectedDoc.ocrStatus === 'processing' ? 'border-amber-200 bg-amber-50/30' :
                  selectedDoc.ocrStatus === 'failed' ? 'border-rose-200 bg-rose-50/30' :
                  'border-border/40 bg-card'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">OCR</span>
                    {selectedDoc.ocrStatus === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : selectedDoc.ocrStatus === 'processing' ? (
                      <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs font-medium capitalize">{selectedDoc.ocrStatus === 'none' ? 'Not Started' : selectedDoc.ocrStatus}</p>
                  {selectedDoc.ocrProcessedAt && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(selectedDoc.ocrProcessedAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* AI Review Status Card */}
                <div className={`p-3 rounded-lg border ${
                  selectedDoc.aiReviewStatus === 'completed' ? 'border-emerald-200 bg-emerald-50/30' :
                  selectedDoc.aiReviewStatus === 'processing' ? 'border-amber-200 bg-amber-50/30' :
                  selectedDoc.aiReviewStatus === 'failed' ? 'border-rose-200 bg-rose-50/30' :
                  'border-border/40 bg-card'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AI Review</span>
                    {selectedDoc.aiReviewStatus === 'completed' ? (
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                    ) : selectedDoc.aiReviewStatus === 'processing' ? (
                      <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                    ) : (
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs font-medium capitalize">{selectedDoc.aiReviewStatus === 'none' ? 'Not Started' : selectedDoc.aiReviewStatus}</p>
                  {selectedDoc.aiReviewProcessedAt && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(selectedDoc.aiReviewProcessedAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Submit Status Card */}
                <div className={`p-3 rounded-lg border ${
                  selectedDoc.submitUrl ? 'border-teal-200 bg-teal-50/30' : 'border-border/40 bg-card'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Submit</span>
                    {selectedDoc.submitUrl ? (
                      <ExternalLink className="h-4 w-4 text-teal-600" />
                    ) : (
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs font-medium">{selectedDoc.submitUrl ? 'URL Set' : 'No URL'}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={selectedDoc.ocrStatus === 'processing' || selectedDoc.ocrStatus === 'completed'}
                  onClick={() => triggerOCR(selectedDoc.id)}
                >
                  {ocrStatusMap[selectedDoc.id]?.loading || selectedDoc.ocrStatus === 'processing' ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Processing OCR...</>
                  ) : selectedDoc.ocrStatus === 'completed' ? (
                    <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> OCR Complete</>
                  ) : (
                    <><Eye className="h-3.5 w-3.5 mr-1.5" /> Run OCR</>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={
                    selectedDoc.aiReviewStatus === 'processing' ||
                    !ocrDone
                  }
                  onClick={() => triggerReview(selectedDoc.id)}
                  title={!ocrDone ? 'Run OCR first' : 'Run AI Review with custom prompt'}
                >
                  {reviewStatusMap[selectedDoc.id]?.loading || selectedDoc.aiReviewStatus === 'processing' ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> AI Reviewing...</>
                  ) : selectedDoc.aiReviewStatus === 'completed' ? (
                    <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Re-Run AI Review</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Run AI Review</>
                  )}
                </Button>
                {selectedDoc.submitUrl && (
                  <Button
                    size="sm"
                    className="h-8 text-xs gradient-emerald text-white border-0 hover:opacity-90"
                    onClick={() => openSubmitUrl(selectedDoc.id)}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Submit Document
                  </Button>
                )}
              </div>

              {/* OCR Text Display */}
              {(selectedDoc.ocrStatus === 'completed' || ocrStatusMap[selectedDoc.id]?.text) && (
                <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-border/30 bg-muted/20">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-emerald-600" />
                      Extracted Text (OCR)
                    </h4>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() => {
                          const text = selectedDoc.ocrText || ocrStatusMap[selectedDoc.id]?.text || '';
                          navigator.clipboard.writeText(text);
                          toast.success('OCR text copied');
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" /> Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() => {
                          const text = selectedDoc.ocrText || ocrStatusMap[selectedDoc.id]?.text || '';
                          const safeName = (selectedDoc.fileName || 'ocr-text').replace(/\.[^.]+$/, '');
                          exportAsTxt(text, `${safeName}-ocr.txt`);
                          toast.success('Exported as TXT');
                        }}
                      >
                        <FileDown className="h-3 w-3 mr-1" /> TXT
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() => {
                          const text = selectedDoc.ocrText || ocrStatusMap[selectedDoc.id]?.text || '';
                          const safeName = (selectedDoc.fileName || 'ocr-text').replace(/\.[^.]+$/, '');
                          exportAsPdf(`${safeName} - OCR Text`, text, `${safeName}-ocr.pdf`);
                          toast.success('Export as PDF - use print dialog');
                        }}
                      >
                        <Download className="h-3 w-3 mr-1" /> PDF
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="max-h-[200px]">
                    <pre className="p-3 text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                      {selectedDoc.ocrText || ocrStatusMap[selectedDoc.id]?.text || 'No text extracted'}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {/* AI Review Result Display */}
              {(selectedDoc.aiReviewStatus === 'completed' || reviewStatusMap[selectedDoc.id]?.result) && (
                <ReviewResultDisplay
                  reviewJson={selectedDoc.aiReview || reviewStatusMap[selectedDoc.id]?.result || ''}
                  prompt={selectedDoc.aiReviewPrompt || reviewPrompts[selectedDoc.id] || ''}
                />
              )}

              {/* AI Extract Panel */}
              {ocrDone && (
                <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-border/30 bg-muted/20">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                      AI Prompt Writer - Extract Information
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => {
                        setShowExtract(prev => {
                          const s = new Set(prev);
                          if (s.has(selectedDoc.id)) s.delete(selectedDoc.id);
                          else s.add(selectedDoc.id);
                          return s;
                        });
                      }}
                    >
                      {showExtract.has(selectedDoc.id) ? <><ChevronDown className="h-3 w-3 mr-1" /> Hide</> : <><ChevronRight className="h-3 w-3 mr-1" /> Open</>}
                    </Button>
                  </div>

                  {showExtract.has(selectedDoc.id) && (
                    <div className="p-3 space-y-2.5">
                      <div>
                        <Label className="text-[10px] font-medium flex items-center gap-1 mb-1">
                          <MessageSquare className="h-3 w-3" /> What do you want to extract?
                        </Label>
                        <div className="flex items-center gap-1.5">
                          <Input
                            placeholder="e.g., Extract all financial figures, List deadlines, Find contact info..."
                            value={extractPrompt[selectedDoc.id] || ''}
                            onChange={e => setExtractPrompt(prev => ({ ...prev, [selectedDoc.id]: e.target.value }))}
                            className="h-7 text-xs bg-muted/30 border-border/50 flex-1"
                            onKeyDown={e => { if (e.key === 'Enter') handleAiExtract(selectedDoc.id); }}
                          />
                          <Button
                            size="sm"
                            className="h-7 text-xs gradient-emerald text-white border-0 hover:opacity-90 px-3 flex-shrink-0"
                            disabled={extractLoading.has(selectedDoc.id) || !extractPrompt[selectedDoc.id]?.trim()}
                            onClick={() => handleAiExtract(selectedDoc.id)}
                          >
                            {extractLoading.has(selectedDoc.id) ? (
                              <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Extracting...</>
                            ) : (
                              <><Sparkles className="h-3.5 w-3.5 mr-1" /> Extract</>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Quick Prompt Suggestions */}
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Quick Prompts</p>
                        <div className="flex flex-wrap gap-1">
                          {[
                            'Extract financial figures',
                            'List deadlines',
                            'Summarize requirements',
                            'Find contact info',
                            'Identify compliance issues',
                          ].map(suggestion => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => setExtractPrompt(prev => ({ ...prev, [selectedDoc.id]: suggestion }))}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border ${
                                extractPrompt[selectedDoc.id] === suggestion
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                  : 'bg-muted/50 text-muted-foreground border-border/50 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Extract Results */}
                      {extractResults[selectedDoc.id] && (
                        <div className="rounded-lg border border-border/40 bg-muted/20 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Extracted Information</span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 text-[10px] px-1.5"
                                onClick={() => {
                                  navigator.clipboard.writeText(extractResults[selectedDoc.id]);
                                  toast.success('Copied to clipboard');
                                }}
                              >
                                <Copy className="h-3 w-3 mr-0.5" /> Copy
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 text-[10px] px-1.5"
                                onClick={() => {
                                  const safeName = (selectedDoc.fileName || 'extract').replace(/\.[^.]+$/, '');
                                  const prompt = extractPrompt[selectedDoc.id] || '';
                                  exportAsTxt(
                                    `Document: ${selectedDoc.fileName}\nPrompt: ${prompt}\n\n---\n\n${extractResults[selectedDoc.id]}`,
                                    `${safeName}-extract.txt`
                                  );
                                  toast.success('Exported as TXT');
                                }}
                              >
                                <FileDown className="h-3 w-3 mr-0.5" /> TXT
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 text-[10px] px-1.5"
                                onClick={() => {
                                  const safeName = (selectedDoc.fileName || 'extract').replace(/\.[^.]+$/, '');
                                  const prompt = extractPrompt[selectedDoc.id] || '';
                                  exportExtractAsPdf(
                                    `${safeName} - AI Extract`,
                                    prompt,
                                    extractResults[selectedDoc.id],
                                    `${safeName}-extract.pdf`
                                  );
                                  toast.success('Export as PDF - use print dialog');
                                }}
                              >
                                <Download className="h-3 w-3 mr-0.5" /> PDF
                              </Button>
                            </div>
                          </div>
                          <ScrollArea className="max-h-[300px]">
                            <pre className="p-3 text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                              {extractResults[selectedDoc.id]}
                            </pre>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Remove Document */}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-rose-500 hover:bg-rose-50"
                  onClick={async () => {
                    if (!confirm(`Delete "${selectedDoc.fileName}"? This cannot be undone.`)) return;
                    const res = await api.delete(`/documents/${selectedDoc.id}`);
                    if (res.success) {
                      toast.success('Document deleted');
                      setSelectedDocId(null);
                      loadDocuments();
                    } else {
                      toast.error(res.error || 'Failed to delete');
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Document
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Bot className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Select a document to review</p>
              <p className="text-xs mt-1">Upload and select a document from the vault to begin</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ════════════════════════════════════════════════════════════
     AI EXTRACT TAB CONTENT
     ════════════════════════════════════════════════════════════ */
  const AIExtractContent = () => {
    const ocrReadyDocs = documents.filter(d => d.ocrStatus === 'completed');
    const [localSelectedDocId, setLocalSelectedDocId] = useState<string | null>(null);
    const [extractUploading, setExtractUploading] = useState(false);
    const [extractUploadProgress, setExtractUploadProgress] = useState('');
    const extractFileRef = useRef<HTMLInputElement>(null);
    const selectedDoc = localSelectedDocId ? documents.find(d => d.id === localSelectedDocId) : null;
    const docHistory = localSelectedDocId ? (extractHistory[localSelectedDocId] || []) : [];

    const handleExtractUpload = async (file: File) => {
      setExtractUploading(true);
      setExtractUploadProgress('Uploading...');
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('docType', 'external_doc');
        formData.append('autoOcr', 'true');
        setExtractUploadProgress('Uploading document...');
        const res = await api.upload('/documents', formData);
        if (res.success) {
          setExtractUploadProgress('Starting OCR...');
          toast.success(`"${file.name}" uploaded - OCR processing started`);
          loadDocuments();
          // Trigger OCR and poll
          const newDocId = res.data?.id;
          if (newDocId) {
            const ocrRes = await api.post(`/document-ocr/${newDocId}`);
            if (ocrRes.success) {
              setExtractUploadProgress('OCR processing...');
              // Poll for OCR completion
              let attempts = 0;
              const maxAttempts = 30;
              const poll = async () => {
                try {
                  const pollRes = await api.get(`/document-ocr/${newDocId}`);
                  if (pollRes.success && pollRes.data?.ocrStatus === 'completed') {
                    setExtractUploadProgress('');
                    setExtractUploading(false);
                    toast.success('OCR completed - document ready for extraction');
                    loadDocuments();
                    setLocalSelectedDocId(newDocId);
                    return;
                  } else if (pollRes.success && pollRes.data?.ocrStatus === 'failed') {
                    setExtractUploadProgress('');
                    setExtractUploading(false);
                    toast.error('OCR processing failed');
                    loadDocuments();
                    return;
                  }
                  attempts++;
                  if (attempts < maxAttempts) {
                    setTimeout(poll, 2000);
                  } else {
                    setExtractUploadProgress('');
                    setExtractUploading(false);
                    toast.info('OCR is taking longer than expected. Check back later.');
                  }
                } catch {
                  attempts++;
                  if (attempts < maxAttempts) setTimeout(poll, 3000);
                }
              };
              setTimeout(poll, 2000);
            } else {
              setExtractUploading(false);
              setExtractUploadProgress('');
              toast.error('Failed to start OCR');
            }
          }
        } else {
          toast.error(res.error || 'Upload failed');
          setExtractUploading(false);
          setExtractUploadProgress('');
        }
      } catch {
        toast.error('Upload failed');
        setExtractUploading(false);
        setExtractUploadProgress('');
      }
    };

    return (
      <div className="flex-1 flex overflow-hidden bg-muted/30">
        {/* Left: OCR-Ready Document List */}
        <div className="w-[320px] border-r border-border/60 bg-card flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-border/40">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              AI Extract
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">
              Ask AI to extract specific information from your OCR-processed documents
            </p>
          </div>

          {/* PDF Upload Area */}
          <div className="p-2 border-b border-border/30">
            <input
              ref={extractFileRef}
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 10 * 1024 * 1024) {
                    toast.error('File too large. Maximum 10MB.');
                    return;
                  }
                  handleExtractUpload(file);
                  if (extractFileRef.current) extractFileRef.current.value = '';
                }
              }}
            />
            <div
              className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all ${
                extractUploading
                  ? 'border-emerald-300 bg-emerald-50/30'
                  : 'border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/20'
              }`}
              onClick={() => !extractUploading && extractFileRef.current?.click()}
            >
              {extractUploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-5 w-5 text-emerald-600 animate-spin mb-1.5" />
                  <p className="text-[10px] font-medium text-emerald-700">{extractUploadProgress || 'Processing...'}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Please wait</p>
                </div>
              ) : (
                <>
                  <Upload className="h-5 w-5 text-emerald-500 mx-auto mb-1.5" />
                  <p className="text-[10px] font-semibold text-emerald-700 mb-0.5">Upload PDF for Extraction</p>
                  <p className="text-[8px] text-muted-foreground">PDF, DOC, DOCX, PNG, JPG · Max 10MB</p>
                  <p className="text-[7px] text-emerald-600/60 mt-1">Auto OCR → Ready to extract</p>
                </>
              )}
            </div>
          </div>

          <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
            {docsLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : ocrReadyDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FileSearch className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">No OCR-ready documents</p>
                <p className="text-[10px] mt-1">Upload & run OCR on documents first</p>
              </div>
            ) : (
              ocrReadyDocs.map(doc => {
                const isSelected = localSelectedDocId === doc.id;
                const extBadge = getFileExtBadge(doc.fileName);
                return (
                  <div
                    key={doc.id}
                    className={`rounded-lg border p-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50/30 shadow-sm'
                        : 'border-border/40 hover:border-emerald-200 hover:bg-muted/20'
                    }`}
                    onClick={() => setLocalSelectedDocId(doc.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-muted/50 flex-shrink-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium truncate">{doc.fileName}</p>
                          {extBadge.label && (
                            <Badge className={`text-[9px] px-1 py-0 border-0 ${extBadge.color}`}>
                              {extBadge.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {DOC_TYPE_OPTIONS.find(o => o.value === doc.docType)?.label || doc.docType}
                          {extractHistory[doc.id]?.length ? ` · ${extractHistory[doc.id].length} extraction${extractHistory[doc.id].length > 1 ? 's' : ''}` : ''}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-50"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm(`Delete "${doc.fileName}"? This cannot be undone.`)) return;
                          const res = await api.delete(`/documents/${doc.id}`);
                          if (res.success) {
                            toast.success('Document deleted');
                            if (localSelectedDocId === doc.id) setLocalSelectedDocId(null);
                            loadDocuments();
                          } else {
                            toast.error(res.error || 'Failed to delete');
                          }
                        }}
                        title="Delete document"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Extract Interface */}
        <div className="flex-1 overflow-auto bg-muted/30">
          {selectedDoc ? (
            <div className="p-4 space-y-4 max-w-3xl mx-auto">
              {/* Document Header */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/40">
                <div className="p-3 rounded-xl gradient-emerald shadow-sm">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold truncate">{selectedDoc.fileName}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {DOC_TYPE_OPTIONS.find(o => o.value === selectedDoc.docType)?.label || selectedDoc.docType} · OCR Completed
                  </p>
                </div>
                <Badge className="text-xs px-2 py-0.5 border-0 bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> OCR Ready
                </Badge>
              </div>

              {/* Extract Prompt Input */}
              <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
                <div className="p-3 border-b border-border/30 bg-muted/20">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    Ask AI to Extract Information
                  </h4>
                </div>
                <div className="p-3 space-y-2.5">
                  <div>
                    <Label className="text-[10px] font-medium flex items-center gap-1 mb-1">
                      <MessageSquare className="h-3 w-3" /> Your extraction prompt
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        placeholder="e.g., Extract all financial figures, List deadlines, Find contact info..."
                        value={extractPrompt[selectedDoc.id] || ''}
                        onChange={e => setExtractPrompt(prev => ({ ...prev, [selectedDoc.id]: e.target.value }))}
                        className="h-8 text-xs bg-muted/30 border-border/50 flex-1"
                        onKeyDown={e => { if (e.key === 'Enter') handleAiExtract(selectedDoc.id); }}
                      />
                      <Button
                        size="sm"
                        className="h-8 text-xs gradient-emerald text-white border-0 hover:opacity-90 px-4 flex-shrink-0"
                        disabled={extractLoading.has(selectedDoc.id) || !extractPrompt[selectedDoc.id]?.trim()}
                        onClick={() => handleAiExtract(selectedDoc.id)}
                      >
                        {extractLoading.has(selectedDoc.id) ? (
                          <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Extracting...</>
                        ) : (
                          <><Sparkles className="h-3.5 w-3.5 mr-1" /> Extract</>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Quick Prompt Suggestions */}
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Quick Prompts</p>
                    <div className="flex flex-wrap gap-1">
                      {[
                        'Extract financial figures',
                        'List all deadlines and dates',
                        'Summarize key requirements',
                        'Find contact information',
                        'Identify compliance issues',
                        'What is the total budget?',
                        'List all contract terms',
                        'Extract scope of work',
                      ].map(suggestion => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setExtractPrompt(prev => ({ ...prev, [selectedDoc.id]: suggestion }))}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border ${
                            extractPrompt[selectedDoc.id] === suggestion
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                              : 'bg-muted/50 text-muted-foreground border-border/50 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Extraction History */}
              {docHistory.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                    <Clock className="h-3.5 w-3.5" /> Extraction History ({docHistory.length})
                  </h4>
                  {[...docHistory].reverse().map((entry, idx) => (
                    <div key={idx} className="rounded-xl border border-border/40 bg-card overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-muted/20">
                        <div className="flex items-center gap-2 min-w-0">
                          <Sparkles className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                          <span className="text-[10px] font-medium text-emerald-700 truncate">{entry.prompt}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[9px] text-muted-foreground">{entry.timestamp}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 text-[9px] px-1"
                            onClick={() => {
                              navigator.clipboard.writeText(entry.result);
                              toast.success('Copied to clipboard');
                            }}
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 text-[9px] px-1"
                            onClick={() => {
                              const safeName = (selectedDoc.fileName || 'extract').replace(/\.[^.]+$/, '');
                              exportAsTxt(
                                `Document: ${selectedDoc.fileName}\nPrompt: ${entry.prompt}\n\n---\n\n${entry.result}`,
                                `${safeName}-extract-${idx + 1}.txt`
                              );
                              toast.success('Exported as TXT');
                            }}
                            title="Export as TXT"
                          >
                            <FileDown className="h-2.5 w-2.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 text-[9px] px-1"
                            onClick={() => {
                              const safeName = (selectedDoc.fileName || 'extract').replace(/\.[^.]+$/, '');
                              exportExtractAsPdf(
                                `${safeName} - AI Extract`,
                                entry.prompt,
                                entry.result,
                                `${safeName}-extract-${idx + 1}.pdf`
                              );
                              toast.success('Export as PDF - use print dialog');
                            }}
                            title="Export as PDF"
                          >
                            <Download className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                      <ScrollArea className="max-h-[250px]">
                        <pre className="p-3 text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                          {entry.result}
                        </pre>
                      </ScrollArea>
                    </div>
                  ))}
                </div>
              )}

              {/* Latest extraction loading */}
              {extractLoading.has(selectedDoc.id) && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-6 flex flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mb-3" />
                  <p className="text-sm font-medium text-emerald-700">Extracting information...</p>
                  <p className="text-[10px] text-muted-foreground mt-1">AI is reading your document and answering your prompt</p>
                </div>
              )}

              {/* OCR Text Preview */}
              <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b border-border/30 bg-muted/20">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-emerald-600" />
                    OCR Text Source
                  </h4>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => {
                        const text = selectedDoc.ocrText || '';
                        navigator.clipboard.writeText(text);
                        toast.success('OCR text copied');
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => {
                        const text = selectedDoc.ocrText || '';
                        const safeName = (selectedDoc.fileName || 'ocr-text').replace(/\.[^.]+$/, '');
                        exportAsTxt(text, `${safeName}-ocr.txt`);
                        toast.success('Exported as TXT');
                      }}
                    >
                      <FileDown className="h-3 w-3 mr-1" /> TXT
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => {
                        const text = selectedDoc.ocrText || '';
                        const safeName = (selectedDoc.fileName || 'ocr-text').replace(/\.[^.]+$/, '');
                        exportAsPdf(`${safeName} - OCR Text`, text, `${safeName}-ocr.pdf`);
                        toast.success('Export as PDF - use print dialog');
                      }}
                    >
                      <Download className="h-3 w-3 mr-1" /> PDF
                    </Button>
                  </div>
                </div>
                <ScrollArea className="max-h-[150px]">
                  <pre className="p-3 text-[10px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                    {selectedDoc.ocrText || 'No OCR text available'}
                  </pre>
                </ScrollArea>
              </div>

              {/* Delete Document */}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-rose-500 hover:bg-rose-50"
                  onClick={async () => {
                    if (!confirm(`Delete "${selectedDoc.fileName}"? This cannot be undone.`)) return;
                    const res = await api.delete(`/documents/${selectedDoc.id}`);
                    if (res.success) {
                      toast.success('Document deleted');
                      setLocalSelectedDocId(null);
                      loadDocuments();
                    } else {
                      toast.error(res.error || 'Failed to delete');
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Document
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Select a document to extract info</p>
              <p className="text-xs mt-1">Choose an OCR-ready document from the left panel</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════ */
  const ActiveRibbon = RIBBON_MAP[ribbonTab];

  // Check if ocrDone for the selected doc
  const ocrDone = selectedDocId ? (documents.find(d => d.id === selectedDocId)?.ocrStatus === 'completed') : false;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-muted/30 view-enter">
      {/* ── Title Bar ── */}
      <div className="flex items-center h-10 px-3 bg-card border-b border-border/60 flex-shrink-0 gap-2">
        {/* Left: Logo + Doc Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded gradient-emerald flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <Input value={docTitle} onChange={e => { setDocTitle(e.target.value); setSaveStatus('unsaved'); }}
            className="h-7 text-sm font-medium border-0 bg-transparent focus:bg-muted/50 px-1 max-w-[240px]" />
        </div>
        {/* Center: Save status */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {saveStatus === 'saved' && <><Check className="h-3 w-3 text-emerald-600" /> Saved</>}
          {saveStatus === 'saving' && <><span className="animate-pulse">Saving...</span></>}
          {saveStatus === 'unsaved' && <><span className="text-amber-600">Unsaved</span></>}
        </div>
        {/* Right: Actions */}
        <div className="flex items-center gap-1 flex-1 justify-end">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleSave}>
            <Save className="h-3.5 w-3.5 mr-1" /> Save
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toast.info('PDF export coming soon')}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1" /> Print
          </Button>
        </div>
      </div>

      {/* ── Ribbon Tabs ── */}
      <div className="flex items-center h-8 bg-card border-b border-border/40 px-2 flex-shrink-0 gap-0.5">
        {(['home', 'insert', 'review', 'ai-tools', 'agent', 'sign', 'doc-review', 'ai-extract'] as RibbonTab[]).map(tab => (
          <button key={tab} onClick={() => setRibbonTab(tab)}
            className={`px-3 py-1 text-xs font-medium rounded-t transition-colors flex items-center gap-1 ${
              ribbonTab === tab
                ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}>
            {tab === 'ai-tools' ? <><Sparkles className="h-3 w-3" /> AI Tools</> :
             tab === 'agent' ? <><Bot className="h-3 w-3" /> AI Agent</> :
             tab === 'sign' ? <><Pen className="h-3 w-3" /> Sign</> :
             tab === 'doc-review' ? <><Bot className="h-3 w-3" /> Doc Review</> :
             tab === 'ai-extract' ? <><MessageSquare className="h-3 w-3" /> AI Extract</> :
             tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Ribbon Controls ── */}
      <div className="bg-card border-b border-border/40 flex-shrink-0 min-h-[40px]">
        <ActiveRibbon />
      </div>

      {/* ── Main Area ── */}
      {ribbonTab === 'agent' ? (
        <div className="flex-1 overflow-hidden">
          <AgentChatView />
        </div>
      ) : ribbonTab === 'doc-review' ? (
        <DocReviewContent />
      ) : ribbonTab === 'ai-extract' ? (
        <AIExtractContent />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Document Canvas Area */}
          <div className="flex-1 overflow-auto bg-muted/60 p-6" onClick={() => { if (placementMode) { /* handled by editor click */ } }}>
            <div className="flex justify-center" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
              <div
                className="bg-white shadow-lg relative"
                style={{ width: 794, minHeight: 1123, padding: '72px 72px 96px 72px' }}
              >
                {/* Document Header */}
                <div className="border-b-2 border-emerald-600 pb-3 mb-6" style={{ fontFamily: 'Arial, sans-serif' }}>
                  <div className="text-center">
                    <p className="text-[11px] tracking-[0.3em] text-emerald-700 font-bold uppercase">TenetBid Procurement Platform</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">Professional Document</p>
                  </div>
                </div>

                {/* Editable Area */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleDocChange}
                  onClick={handleCanvasClick}
                  className="outline-none min-h-[800px] text-[13px] leading-[1.6] text-gray-800"
                  style={{ fontFamily: 'Arial, sans-serif', cursor: placementMode ? 'crosshair' : 'text' }}
                  data-placeholder="Start typing or use AI tools to generate content..."
                />

                {/* Document Footer */}
                <div className="absolute bottom-8 left-0 right-0 text-center">
                  <div className="border-t border-gray-200 pt-2">
                    <p className="text-[10px] text-gray-400">Page 1 of 1</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: AI Assistant */}
          {aiPanelOpen && (
              <div
 className="border-l border-border/60 bg-card flex-shrink-0 overflow-hidden transition-[width] duration-700" style={{ width: 350 }}
 >
                <AIPanelContent />
              </div>
            )}
        </div>
      )}

      {/* ── Status Bar ── */}
      {ribbonTab !== 'doc-review' && ribbonTab !== 'ai-extract' && ribbonTab !== 'agent' && (
        <div className="flex items-center h-6 px-3 bg-card border-t border-border/40 text-[10px] text-muted-foreground flex-shrink-0">
          <div className="flex-1">Page 1 of 1</div>
          <div className="flex items-center gap-3">
            <span>{wordCount} words</span>
            <span>{charCount} chars</span>
          </div>
          <div className="flex-1 flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => setZoom(Math.max(75, zoom - 25))}>
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Select value={String(zoom)} onValueChange={v => setZoom(Number(v))}>
              <SelectTrigger className="h-4 w-14 text-[10px] border-0 p-0 bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ZOOM_LEVELS.map(z => <SelectItem key={z} value={String(z)}>{z}%</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => setZoom(Math.min(150, zoom + 25))}>
              <ZoomIn className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Signature Drawing Dialog ── */}
      <Dialog open={drawDialogOpen} onOpenChange={setDrawDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pen className="h-4 w-4 text-emerald-600" /> Draw Your Signature
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                width={460}
                height={200}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                className="w-full cursor-crosshair touch-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={clearCanvas} className="text-xs">
                <Eraser className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDrawDialogOpen(false)} className="text-xs">Cancel</Button>
                <Button size="sm" onClick={saveDrawnSignature}
                  className="text-xs gradient-emerald text-white border-0 premium-shadow hover:opacity-90">
                  <Check className="h-3.5 w-3.5 mr-1" /> Save Signature
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Signature Gallery (shows when Sign tab is active) ── */}
      {ribbonTab === 'sign' && savedSignatures.length > 0 && (
          <div
 className="absolute bottom-7 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg shadow-xl p-3 z-50 max-w-[600px] animate-[fadeIn_0.3s_ease-out]"
 >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold">Saved Signatures &amp; Stamps</span>
              <span className="text-[10px] text-muted-foreground">Click to place on document</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {savedSignatures.map(sig => (
                <div key={sig.id} className="flex flex-col items-center gap-1 flex-shrink-0 group relative">
                  <button onClick={() => startPlacement(sig.dataUrl)}
                    className="w-20 h-16 border border-border rounded hover:border-emerald-400 transition-colors overflow-hidden bg-white p-1">
                    <img src={sig.dataUrl} alt={sig.label} className="max-w-full max-h-full object-contain" />
                  </button>
                  <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">{sig.label}</span>
                  <button onClick={() => deleteSignature(sig.id)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
</div>
  );
}

/* ══════════════════════════════════════════════════════════════
   REVIEW RESULT DISPLAY COMPONENT
   ══════════════════════════════════════════════════════════════ */

function formatReviewAsText(review: Record<string, unknown>, prompt: string): string {
  const complianceScore = typeof review.complianceScore === 'number' ? review.complianceScore : null;
  const completenessScore = typeof review.completenessScore === 'number' ? review.completenessScore : null;
  const riskLevel = typeof review.riskLevel === 'string' ? review.riskLevel : null;
  const findings = Array.isArray(review.findings) ? review.findings : [];
  const strengths = Array.isArray(review.strengths) ? review.strengths : [];
  const weaknesses = Array.isArray(review.weaknesses) ? review.weaknesses : [];
  const missingElements = Array.isArray(review.missingElements) ? review.missingElements : [];
  const recommendations = Array.isArray(review.recommendations) ? review.recommendations : [];
  const overallAssessment = typeof review.overallAssessment === 'string' ? review.overallAssessment : null;
  const summary = typeof review.summary === 'string' ? review.summary : null;

  const lines: string[] = [];
  lines.push('AI Review Report');
  lines.push('================');
  if (complianceScore !== null) lines.push(`Compliance Score: ${complianceScore}/100`);
  if (completenessScore !== null) lines.push(`Completeness Score: ${completenessScore}/100`);
  if (riskLevel) lines.push(`Risk Level: ${riskLevel.toUpperCase()}`);
  lines.push('');

  if (overallAssessment || summary) {
    lines.push('Overall Assessment:');
    lines.push(overallAssessment || summary || '');
    lines.push('');
  }

  if (findings.length > 0) {
    lines.push('Key Findings:');
    findings.forEach((f) => {
      const finding = f as Record<string, string>;
      const type = finding.type ? finding.type.toUpperCase() : 'INFO';
      const category = finding.title || finding.category || '';
      const desc = finding.description || '';
      lines.push(`- [${type}] ${category}${desc ? ': ' + desc : ''}`);
    });
    lines.push('');
  }

  if (strengths.length > 0) {
    lines.push('Strengths:');
    strengths.forEach((s) => lines.push(`- ${String(s)}`));
    lines.push('');
  }

  if (weaknesses.length > 0) {
    lines.push('Weaknesses:');
    weaknesses.forEach((w) => lines.push(`- ${String(w)}`));
    lines.push('');
  }

  if (missingElements.length > 0) {
    lines.push('Missing Elements:');
    missingElements.forEach((m) => lines.push(`- ${String(m)}`));
    lines.push('');
  }

  if (recommendations.length > 0) {
    lines.push('Recommendations:');
    recommendations.forEach((r) => lines.push(`- ${String(r)}`));
    lines.push('');
  }

  if (prompt) {
    lines.push('Custom Review Prompt:');
    lines.push(`"${prompt}"`);
  }

  return lines.join('\n');
}

function ReviewResultDisplay({ reviewJson, prompt }: { reviewJson: string; prompt: string }) {
  let review: Record<string, unknown> = {};
  try {
    review = JSON.parse(reviewJson);
  } catch {
    // If not JSON, display as raw text
    return (
      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        <div className="p-3 border-b border-border/30 bg-muted/20 flex items-center justify-between">
          <h4 className="text-xs font-semibold flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            AI Review Result
          </h4>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px]"
              onClick={() => {
                navigator.clipboard.writeText(reviewJson);
                toast.success('Review result copied');
              }}
            >
              <Copy className="h-3 w-3 mr-1" /> Copy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px]"
              onClick={() => {
                exportAsTxt(reviewJson, 'ai-review-result.txt');
                toast.success('Exported as TXT');
              }}
            >
              <FileDown className="h-3 w-3 mr-1" /> TXT
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px]"
              onClick={() => {
                exportAsPdf('AI Review Result', reviewJson, 'ai-review-result.pdf');
                toast.success('Export as PDF - use print dialog');
              }}
            >
              <Download className="h-3 w-3 mr-1" /> PDF
            </Button>
          </div>
        </div>
        <ScrollArea className="max-h-[400px]">
          <div className="p-3 text-xs whitespace-pre-wrap">{reviewJson}</div>
        </ScrollArea>
      </div>
    );
  }

  const complianceScore = typeof review.complianceScore === 'number' ? review.complianceScore : null;
  const completenessScore = typeof review.completenessScore === 'number' ? review.completenessScore : null;
  const riskLevel = typeof review.riskLevel === 'string' ? review.riskLevel : null;
  const findings = Array.isArray(review.findings) ? review.findings : [];
  const strengths = Array.isArray(review.strengths) ? review.strengths : [];
  const weaknesses = Array.isArray(review.weaknesses) ? review.weaknesses : [];
  const missingElements = Array.isArray(review.missingElements) ? review.missingElements : [];
  const recommendations = Array.isArray(review.recommendations) ? review.recommendations : [];
  const overallAssessment = typeof review.overallAssessment === 'string' ? review.overallAssessment : null;
  const summary = typeof review.summary === 'string' ? review.summary : null;

  const riskColorMap: Record<string, string> = {
    low: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-rose-100 text-rose-700',
    critical: 'bg-rose-200 text-rose-800',
  };

  const findingIconMap: Record<string, React.ElementType> = {
    positive: CheckCircle2,
    negative: XCircle,
    warning: AlertTriangle,
  };
  const findingColorMap: Record<string, string> = {
    positive: 'text-emerald-600',
    negative: 'text-rose-600',
    warning: 'text-amber-600',
  };
  const findingBgMap: Record<string, string> = {
    positive: 'bg-emerald-50',
    negative: 'bg-rose-50',
    warning: 'bg-amber-50',
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
      <div className="p-3 border-b border-border/30 bg-muted/20 flex items-center justify-between">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          AI Review Result
        </h4>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px]"
            onClick={() => {
              const text = formatReviewAsText(review, prompt);
              navigator.clipboard.writeText(text);
              toast.success('Review result copied');
            }}
          >
            <Copy className="h-3 w-3 mr-1" /> Copy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px]"
            onClick={() => {
              const text = formatReviewAsText(review, prompt);
              exportAsTxt(text, 'ai-review-result.txt');
              toast.success('Exported as TXT');
            }}
          >
            <FileDown className="h-3 w-3 mr-1" /> TXT
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px]"
            onClick={() => {
              const text = formatReviewAsText(review, prompt);
              exportAsPdf('AI Review Result', text, 'ai-review-result.pdf');
              toast.success('Export as PDF - use print dialog');
            }}
          >
            <Download className="h-3 w-3 mr-1" /> PDF
          </Button>
          {prompt && (
            <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100">
              Custom Prompt
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Score Cards */}
        <div className="grid grid-cols-3 gap-3">
          {complianceScore !== null && (
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold" style={{ color: complianceScore >= 70 ? '#10b981' : complianceScore >= 40 ? '#f59e0b' : '#ef4444' }}>
                {complianceScore}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Compliance</p>
            </div>
          )}
          {completenessScore !== null && (
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold" style={{ color: completenessScore >= 70 ? '#10b981' : completenessScore >= 40 ? '#f59e0b' : '#ef4444' }}>
                {completenessScore}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Completeness</p>
            </div>
          )}
          {riskLevel && (
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <Badge className={`text-xs px-3 py-1 border-0 ${riskColorMap[riskLevel] || 'bg-gray-100 text-gray-700'}`}>
                {riskLevel.toUpperCase()}
              </Badge>
              <p className="text-[10px] text-muted-foreground mt-1">Risk Level</p>
            </div>
          )}
        </div>

        {/* Overall Assessment */}
        {(overallAssessment || summary) && (
          <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 mb-1">Overall Assessment</p>
            <p className="text-xs text-foreground leading-relaxed">{overallAssessment || summary}</p>
          </div>
        )}

        {/* Findings */}
        {findings.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Key Findings</p>
            <div className="space-y-1.5">
              {findings.map((f, i) => {
                const finding = f as Record<string, string>;
                const Icon = findingIconMap[finding.type] || AlertTriangle;
                const color = findingColorMap[finding.type] || 'text-muted-foreground';
                const bg = findingBgMap[finding.type] || 'bg-muted/50';
                return (
                  <div key={i} className={`flex items-start gap-2 p-2 rounded ${bg}`}>
                    <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${color}`} />
                    <div>
                      <p className="text-xs font-medium">{finding.title || finding.category}</p>
                      <p className="text-[11px] text-muted-foreground">{finding.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses in 2 columns */}
        <div className="grid grid-cols-2 gap-3">
          {strengths.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Strengths
              </p>
              <ul className="space-y-1">
                {strengths.map((s, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                    <Check className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{String(s)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {weaknesses.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 mb-1.5 flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Weaknesses
              </p>
              <ul className="space-y-1">
                {weaknesses.map((w, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                    <X className="h-3 w-3 text-rose-500 mt-0.5 flex-shrink-0" />
                    <span>{String(w)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Missing Elements */}
        {missingElements.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-1.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Missing Elements
            </p>
            <ul className="space-y-1">
              {missingElements.map((m, i) => (
                <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                  <Minus className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>{String(m)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-600 mb-1.5 flex items-center gap-1">
              <Zap className="h-3 w-3" /> Recommendations
            </p>
            <ul className="space-y-1">
              {recommendations.map((r, i) => (
                <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                  <ChevronRight className="h-3 w-3 text-teal-500 mt-0.5 flex-shrink-0" />
                  <span>{String(r)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Custom Prompt Used */}
        {prompt && (
          <div className="p-2 rounded bg-muted/30 border border-border/30">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Custom Review Prompt</p>
            <p className="text-[11px] text-muted-foreground italic">&ldquo;{prompt}&rdquo;</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SMALL UTILITY COMPONENTS
   ══════════════════════════════════════════════════════════════ */

function RibbonBtn({ icon: Icon, title, onClick }: { icon: React.ElementType; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title}
      className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-foreground">
      <Icon className="h-4 w-4" />
    </button>
  );
}

function GenerateButton({ onClick, loading, disabled }: { onClick: () => void; loading: boolean; disabled?: boolean }) {
  return (
    <Button onClick={onClick} disabled={loading || disabled}
      className="w-full gradient-emerald text-white border-0 premium-shadow hover:opacity-90 h-9 text-xs">
      {loading ? (
        <><span
 className="inline-block"><Sparkles className="h-3.5 w-3.5 mr-1.5" /></span>Generating...</>
      ) : (
        <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Generate with AI</>
      )}
    </Button>
  );
}
