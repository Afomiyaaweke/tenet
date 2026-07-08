'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';
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
} from 'lucide-react';
import { useStampSignature, STAMP_TEMPLATES, type SavedSignature } from '@/components/stamp-signature';
/* ══════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════ */

type RibbonTab = 'home' | 'insert' | 'review' | 'ai-tools' | 'sign';
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

// STAMP_TEMPLATES imported from shared stamp-signature component

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */

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
  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const { user } = useAuthStore();

  /* ── Load tenders ── */
  useEffect(() => {
    api.get('/tenders', { status: 'open', limit: '50' }).then(res => {
      if (res.success) setTenders(res.data || []);
    }).catch(() => {});
  }, []);

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

  const RIBBON_MAP: Record<RibbonTab, () => React.JSX.Element> = {
    home: HomeRibbon,
    insert: InsertRibbon,
    review: ReviewRibbon,
    'ai-tools': AIToolsRibbon,
    sign: SignRibbon,
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
              <strong>#${a.rank} ${a.name}</strong> (${a.company}) — Score: <strong>${a.overallScore}</strong>
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
     RENDER
     ════════════════════════════════════════════════════════════ */
  const ActiveRibbon = RIBBON_MAP[ribbonTab];

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
        {(['home', 'insert', 'review', 'ai-tools', 'sign'] as RibbonTab[]).map(tab => (
          <button key={tab} onClick={() => setRibbonTab(tab)}
            className={`px-3 py-1 text-xs font-medium rounded-t transition-colors ${
              ribbonTab === tab
                ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}>
            {tab === 'ai-tools' ? 'AI Tools' : tab === 'sign' ? 'Sign' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Ribbon Controls ── */}
      <div className="bg-card border-b border-border/40 flex-shrink-0 min-h-[40px]">
        <ActiveRibbon />
      </div>

      {/* ── Main Area ── */}
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
                  <p className="text-[11px] tracking-[0.3em] text-emerald-700 font-bold uppercase">Tenet Tender Ecosystem</p>
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

      {/* ── Status Bar ── */}
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
