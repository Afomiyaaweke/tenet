'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  FileText, PenTool, Search, Users, Copy, Check, Sparkles,
  AlertTriangle, CheckCircle2, XCircle, Star, TrendingUp,
  Shield, Clock, DollarSign, Target, Zap, Award, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ──────────────────────── Types ──────────────────────── */

type ToolTab = 'tender-builder' | 'bid-builder' | 'requirement-analyzer' | 'applicant-analyzer';

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

/* ──────────────────────── Constants ──────────────────────── */

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

const TOOL_TABS: { id: ToolTab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'tender-builder', label: 'Tender Builder', icon: FileText, desc: 'Create professional tender documents with AI' },
  { id: 'bid-builder', label: 'Bid Proposal', icon: PenTool, desc: 'Write compelling bid proposals with AI' },
  { id: 'requirement-analyzer', label: 'Req Analyzer', icon: Search, desc: 'Understand what a tender requires' },
  { id: 'applicant-analyzer', label: 'Applicant Rank', icon: Users, desc: 'Score and rank bid applicants' },
];

/* ──────────────────────── Helpers ──────────────────────── */

function formatSectionContent(content: string): React.ReactNode {
  const lines = content.split('\n');
  return lines.map((line, i) => {
    const bulletMatch = line.match(/^[\s]*[-*•]\s+(.*)/);
    if (bulletMatch) {
      return (
        <div key={i} className="flex items-start gap-2 ml-2">
          <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
          <span>{formatInline(bulletMatch[1])}</span>
        </div>
      );
    }
    const numberedMatch = line.match(/^[\s]*(\d+)[.)]\s+(.*)/);
    if (numberedMatch) {
      return (
        <div key={i} className="flex items-start gap-2 ml-2">
          <span className="text-emerald-600 font-semibold flex-shrink-0">{numberedMatch[1]}.</span>
          <span>{formatInline(numberedMatch[2])}</span>
        </div>
      );
    }
    if (line.trim() === '') return <div key={i} className="h-2" />;
    const headingMatch = line.match(/^#{1,3}\s+(.*)/);
    if (headingMatch) {
      return <div key={i} className="font-semibold text-foreground mt-2">{headingMatch[1]}</div>;
    }
    return <div key={i}>{formatInline(line)}</div>;
  });
}

function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) parts.push(<span key={`t-${key++}`}>{remaining.slice(0, boldMatch.index)}</span>);
      parts.push(<strong key={`b-${key++}`} className="font-semibold text-foreground">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
    } else {
      parts.push(<span key={`t-${key++}`}>{remaining}</span>);
      break;
    }
  }
  return <>{parts}</>;
}

function scoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-rose-600';
}

function scoreBg(score: number): string {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}

function getRiskBadge(risk: string): { color: string; Icon: React.ElementType } {
  switch (risk?.toLowerCase()) {
    case 'low': return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', Icon: CheckCircle2 };
    case 'medium': return { color: 'bg-amber-100 text-amber-700 border-amber-200', Icon: AlertTriangle };
    case 'high': return { color: 'bg-rose-100 text-rose-700 border-rose-200', Icon: XCircle };
    default: return { color: 'bg-muted text-foreground border-border', Icon: Shield };
  }
}

/* ──────────────────────── Copy Button ──────────────────────── */

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy}
      className="h-7 text-xs gap-1 text-muted-foreground hover:text-emerald-600 hover:bg-primary/10">
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}

/* ──────────────────────── Skill Tags ──────────────────────── */

function SkillTagSelector({ selected, onChange }: { selected: string[]; onChange: (s: string[]) => void }) {
  const toggle = (skill: string) => {
    if (selected.includes(skill)) {
      onChange(selected.filter(s => s !== skill));
    } else {
      onChange([...selected, skill]);
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {COMMON_SKILLS.map(skill => (
        <button key={skill} type="button" onClick={() => toggle(skill)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 border ${
            selected.includes(skill)
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 premium-shadow'
              : 'bg-muted/50 text-muted-foreground border-border hover:border-emerald-300 hover:text-emerald-600'
          }`}>
          {skill}
        </button>
      ))}
    </div>
  );
}

/* ──────────────────────── Doc Section Card ──────────────────────── */

function DocSectionCard({ title, icon: Icon, content, rawText }: {
  title: string;
  icon: React.ElementType;
  content: string;
  rawText: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="border border-emerald-100/60 bg-card premium-shadow overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-emerald flex items-center justify-center">
                <Icon className="h-3.5 w-3.5 text-white" />
              </div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            </div>
            <CopyBtn text={rawText} />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm leading-relaxed text-muted-foreground space-y-1">
            {formatSectionContent(content)}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ──────────────────────── Loading Skeleton ──────────────────────── */

function GeneratingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3 mb-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-xl gradient-emerald flex items-center justify-center"
        >
          <Sparkles className="h-4 w-4 text-white" />
        </motion.div>
        <div>
          <p className="text-sm font-semibold text-foreground">Generating with AI...</p>
          <p className="text-xs text-muted-foreground">This may take a moment</p>
        </div>
      </div>
      {[1, 2, 3].map(i => (
        <Card key={i} className="border-emerald-100/40">
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TOOL 1: TENDER BUILDER
   ══════════════════════════════════════════════════════════════ */

function TenderBuilderTool() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const [form, setForm] = useState({
    title: '', category: '', location: '', budgetMin: '', budgetMax: '',
    deadline: '', description: '', notes: '',
  });

  const updateField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleGenerate = async () => {
    if (!form.title || !form.category || !form.description) {
      toast.error('Please fill in Title, Category, and Description');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/ai/tender-prep', {
        title: form.title,
        category: form.category,
        location: form.location,
        budgetMin: form.budgetMin,
        budgetMax: form.budgetMax,
        deadline: form.deadline,
        description: form.description,
        notes: form.notes,
        skills: user?.profile?.skillTags || '',
        userName: user?.profile?.fullName || '',
      });
      if (res.success) {
        setResult(res.data);
        toast.success('Tender document generated!');
      } else {
        toast.error(res.error || 'Failed to generate tender document');
      }
    } catch {
      toast.error('AI generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fullDoc = result ? Object.entries(result).map(([k, v]) => `## ${k.replace(/([A-Z])/g, ' $1').trim()}\n${v}`).join('\n\n') : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="space-y-4">
        <Card className="border-emerald-100/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-emerald flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Tender Builder</CardTitle>
                <p className="text-xs text-muted-foreground">Create professional tender documents with AI</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Title *</Label>
              <Input placeholder="e.g., Office Building Construction" value={form.title}
                onChange={e => updateField('title', e.target.value)}
                className="h-9 text-sm bg-muted/50 border-border/50 focus:border-primary" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Category *</Label>
              <Select value={form.category} onValueChange={v => updateField('category', v)}>
                <SelectTrigger className="h-9 text-sm bg-muted/50 border-border/50 w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Location</Label>
              <Input placeholder="e.g., Addis Ababa" value={form.location}
                onChange={e => updateField('location', e.target.value)}
                className="h-9 text-sm bg-muted/50 border-border/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Budget Min (ETB)</Label>
                <Input type="number" placeholder="0" value={form.budgetMin}
                  onChange={e => updateField('budgetMin', e.target.value)}
                  className="h-9 text-sm bg-muted/50 border-border/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Budget Max (ETB)</Label>
                <Input type="number" placeholder="0" value={form.budgetMax}
                  onChange={e => updateField('budgetMax', e.target.value)}
                  className="h-9 text-sm bg-muted/50 border-border/50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Deadline</Label>
              <Input type="date" value={form.deadline}
                onChange={e => updateField('deadline', e.target.value)}
                className="h-9 text-sm bg-muted/50 border-border/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Brief Description *</Label>
              <Textarea placeholder="Describe the tender scope, objectives, and requirements..."
                value={form.description} onChange={e => updateField('description', e.target.value)}
                className="min-h-[80px] text-sm bg-muted/50 border-border/50 resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Additional Notes (optional)</Label>
              <Textarea placeholder="Any special requirements or conditions..."
                value={form.notes} onChange={e => updateField('notes', e.target.value)}
                className="min-h-[60px] text-sm bg-muted/50 border-border/50 resize-none" />
            </div>
            <Button onClick={handleGenerate} disabled={loading}
              className="w-full gradient-emerald text-white border-0 premium-shadow hover:opacity-90 h-10">
              {loading ? (
                <><motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="inline-block"><Sparkles className="h-4 w-4 mr-2" /></motion.span>Generating...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Generate with AI</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Result */}
      <div>
        {loading ? <GeneratingSkeleton /> : result ? (
          <ScrollArea className="max-h-[calc(100vh-12rem)]">
            <div className="space-y-4 pr-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <h3 className="font-semibold text-sm">Generated Document</h3>
                </div>
                <CopyBtn text={fullDoc} label="Copy Full Doc" />
              </div>

              {result.scopeOfWork && (
                <DocSectionCard title="Scope of Work" icon={Target} content={result.scopeOfWork} rawText={result.scopeOfWork} />
              )}
              {result.requiredDocuments && (
                <DocSectionCard title="Required Documents" icon={FileText} content={result.requiredDocuments} rawText={result.requiredDocuments} />
              )}
              {result.evaluationCriteria && (
                <DocSectionCard title="Evaluation Criteria" icon={Star} content={result.evaluationCriteria} rawText={result.evaluationCriteria} />
              )}
              {result.deliverables && (
                <DocSectionCard title="Deliverables" icon={CheckCircle2} content={result.deliverables} rawText={result.deliverables} />
              )}
              {result.timeline && (
                <DocSectionCard title="Timeline" icon={Clock} content={result.timeline} rawText={result.timeline} />
              )}
              {result.termsAndConditions && (
                <DocSectionCard title="Terms & Conditions" icon={Shield} content={result.termsAndConditions} rawText={result.termsAndConditions} />
              )}
              {result.categoryTags && (
                <DocSectionCard title="Category Tags" icon={Zap} content={result.categoryTags} rawText={result.categoryTags} />
              )}

              <div className="flex gap-2 pt-2">
                <Button className="flex-1 gradient-emerald text-white border-0 premium-shadow hover:opacity-90"
                  onClick={() => toast.success('Tender draft saved! Go to Tenders to finalize.')}>
                  Use This to Create Tender
                </Button>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-[400px] text-center p-6">
            <div className="w-16 h-16 rounded-2xl gradient-emerald flex items-center justify-center premium-shadow mb-4">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Tender Document Builder</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Fill in the form and click Generate to create a professional tender document with AI assistance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TOOL 2: BID PROPOSAL BUILDER
   ══════════════════════════════════════════════════════════════ */

function BidBuilderTool() {
  const { user } = useAuthStore();
  const [tenders, setTenders] = useState<TenderOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const [selectedTender, setSelectedTender] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [form, setForm] = useState({
    tenderTitle: '', scope: '', budgetRange: '', category: '',
    companyName: '', experience: '', proposedBudget: '', proposedTimeline: '', notes: '',
  });

  useEffect(() => {
    api.get('/tenders', { status: 'open', limit: '50' }).then(res => {
      if (res.success) setTenders(res.data || []);
    }).catch(() => {});
  }, []);

  const updateField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSelectTender = (tenderId: string) => {
    setSelectedTender(tenderId);
    const tender = tenders.find(t => t.id === tenderId);
    if (tender) {
      setForm(prev => ({
        ...prev,
        tenderTitle: tender.title,
        scope: tender.scope || '',
        budgetRange: tender.budgetMin && tender.budgetMax ? `${tender.budgetMin} - ${tender.budgetMax} ETB` : '',
        category: tender.categoryTags || '',
      }));
    }
  };

  const handleGenerate = async () => {
    if (!form.tenderTitle && !selectedTender) {
      toast.error('Please select a tender or enter tender details');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/ai/bid-prep', {
        tenderId: selectedTender || undefined,
        tenderTitle: form.tenderTitle,
        scope: form.scope,
        budgetRange: form.budgetRange,
        category: form.category,
        skills: skills.join(', '),
        companyName: form.companyName,
        experience: form.experience,
        proposedBudget: form.proposedBudget,
        proposedTimeline: form.proposedTimeline,
        notes: form.notes,
        userName: user?.profile?.fullName || '',
        userSkills: user?.profile?.skillTags || '',
      });
      if (res.success) {
        setResult(res.data);
        toast.success('Bid proposal generated!');
      } else {
        toast.error(res.error || 'Failed to generate proposal');
      }
    } catch {
      toast.error('AI generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fullDoc = result ? Object.entries(result).map(([k, v]) => `## ${k.replace(/([A-Z])/g, ' $1').trim()}\n${v}`).join('\n\n') : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Card className="border-emerald-100/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-emerald flex items-center justify-center">
                <PenTool className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Bid Proposal Builder</CardTitle>
                <p className="text-xs text-muted-foreground">Write compelling bid proposals with AI</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Select Tender</Label>
              <Select value={selectedTender} onValueChange={handleSelectTender}>
                <SelectTrigger className="h-9 text-sm bg-muted/50 border-border/50 w-full">
                  <SelectValue placeholder="Choose a tender (auto-fills fields)" />
                </SelectTrigger>
                <SelectContent>
                  {tenders.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-1" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Or enter manually</p>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tender Title</Label>
              <Input placeholder="Enter tender title" value={form.tenderTitle}
                onChange={e => updateField('tenderTitle', e.target.value)}
                className="h-9 text-sm bg-muted/50 border-border/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Scope</Label>
              <Textarea placeholder="Tender scope description" value={form.scope}
                onChange={e => updateField('scope', e.target.value)}
                className="min-h-[60px] text-sm bg-muted/50 border-border/50 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Budget Range</Label>
                <Input placeholder="e.g., 500K - 1M ETB" value={form.budgetRange}
                  onChange={e => updateField('budgetRange', e.target.value)}
                  className="h-9 text-sm bg-muted/50 border-border/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Category</Label>
                <Select value={form.category} onValueChange={v => updateField('category', v)}>
                  <SelectTrigger className="h-9 text-sm bg-muted/50 border-border/50 w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="my-1" />

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Your Skills</Label>
              <SkillTagSelector selected={skills} onChange={setSkills} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Company Name</Label>
              <Input placeholder="Your company name" value={form.companyName}
                onChange={e => updateField('companyName', e.target.value)}
                className="h-9 text-sm bg-muted/50 border-border/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Your Experience</Label>
              <Textarea placeholder="Relevant experience and past projects..."
                value={form.experience} onChange={e => updateField('experience', e.target.value)}
                className="min-h-[60px] text-sm bg-muted/50 border-border/50 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Proposed Budget (ETB)</Label>
                <Input type="number" placeholder="0" value={form.proposedBudget}
                  onChange={e => updateField('proposedBudget', e.target.value)}
                  className="h-9 text-sm bg-muted/50 border-border/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Proposed Timeline</Label>
                <Input placeholder="e.g., 6 months" value={form.proposedTimeline}
                  onChange={e => updateField('proposedTimeline', e.target.value)}
                  className="h-9 text-sm bg-muted/50 border-border/50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Additional Notes (optional)</Label>
              <Textarea placeholder="Any additional information..."
                value={form.notes} onChange={e => updateField('notes', e.target.value)}
                className="min-h-[50px] text-sm bg-muted/50 border-border/50 resize-none" />
            </div>
            <Button onClick={handleGenerate} disabled={loading}
              className="w-full gradient-emerald text-white border-0 premium-shadow hover:opacity-90 h-10">
              {loading ? (
                <><motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="inline-block"><Sparkles className="h-4 w-4 mr-2" /></motion.span>Generating...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Generate Proposal</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        {loading ? <GeneratingSkeleton /> : result ? (
          <ScrollArea className="max-h-[calc(100vh-12rem)]">
            <div className="space-y-4 pr-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <h3 className="font-semibold text-sm">Generated Bid Proposal</h3>
                </div>
                <CopyBtn text={fullDoc} label="Copy Full Proposal" />
              </div>

              {result.technicalProposal && (
                <DocSectionCard title="Technical Proposal" icon={Target} content={result.technicalProposal} rawText={result.technicalProposal} />
              )}
              {result.methodology && (
                <DocSectionCard title="Methodology" icon={TrendingUp} content={result.methodology} rawText={result.methodology} />
              )}
              {result.teamStructure && (
                <DocSectionCard title="Team Structure" icon={Users} content={result.teamStructure} rawText={result.teamStructure} />
              )}
              {result.riskMitigation && (
                <DocSectionCard title="Risk Mitigation" icon={Shield} content={result.riskMitigation} rawText={result.riskMitigation} />
              )}
              {result.valueAddition && (
                <DocSectionCard title="Value Addition" icon={Star} content={result.valueAddition} rawText={result.valueAddition} />
              )}
              {result.budgetJustification && (
                <DocSectionCard title="Budget Justification" icon={DollarSign} content={result.budgetJustification} rawText={result.budgetJustification} />
              )}
              {result.complianceNotes && (
                <DocSectionCard title="Compliance Notes" icon={CheckCircle2} content={result.complianceNotes} rawText={result.complianceNotes} />
              )}

              <div className="flex gap-2 pt-2">
                <Button className="flex-1 gradient-emerald text-white border-0 premium-shadow hover:opacity-90"
                  onClick={() => toast.success('Bid submitted! Check your Bids section for status.')}>
                  Submit This Bid
                </Button>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-[400px] text-center p-6">
            <div className="w-16 h-16 rounded-2xl gradient-emerald flex items-center justify-center premium-shadow mb-4">
              <PenTool className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Bid Proposal Builder</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Select a tender or enter details, then generate a professional bid proposal with AI.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TOOL 3: REQUIREMENT ANALYZER
   ══════════════════════════════════════════════════════════════ */

function RequirementAnalyzerTool() {
  const { user } = useAuthStore();
  const [tenders, setTenders] = useState<TenderOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [selectedTender, setSelectedTender] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [form, setForm] = useState({
    tenderTitle: '', scope: '', budget: '', category: '',
    requiredDocs: '', deadline: '',
  });

  useEffect(() => {
    api.get('/tenders', { status: 'open', limit: '50' }).then(res => {
      if (res.success) setTenders(res.data || []);
    }).catch(() => {});
  }, []);

  const updateField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSelectTender = (tenderId: string) => {
    setSelectedTender(tenderId);
    const tender = tenders.find(t => t.id === tenderId);
    if (tender) {
      setForm({
        tenderTitle: tender.title,
        scope: tender.scope || '',
        budget: tender.budgetMin && tender.budgetMax ? `${tender.budgetMin} - ${tender.budgetMax} ETB` : '',
        category: tender.categoryTags || '',
        requiredDocs: tender.requiredDocs || '',
        deadline: tender.deadline ? new Date(tender.deadline).toISOString().split('T')[0] : '',
      });
    }
  };

  const handleAnalyze = async () => {
    if (!form.tenderTitle && !selectedTender) {
      toast.error('Please select a tender or enter tender details');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/ai/analyze-requirements', {
        tenderId: selectedTender || undefined,
        tenderTitle: form.tenderTitle,
        scope: form.scope,
        budget: form.budget,
        category: form.category,
        requiredDocs: form.requiredDocs,
        deadline: form.deadline,
        skills: skills.join(', '),
        userName: user?.profile?.fullName || '',
        userSkills: user?.profile?.skillTags || '',
      });
      if (res.success) {
        setResult(res.data);
        toast.success('Requirements analyzed!');
      } else {
        toast.error(res.error || 'Failed to analyze requirements');
      }
    } catch {
      toast.error('AI analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const matchScore = typeof result?.matchScore === 'number' ? result.matchScore : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Card className="border-emerald-100/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-emerald flex items-center justify-center">
                <Search className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Requirement Analyzer</CardTitle>
                <p className="text-xs text-muted-foreground">Understand what a tender requires</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Select Tender</Label>
              <Select value={selectedTender} onValueChange={handleSelectTender}>
                <SelectTrigger className="h-9 text-sm bg-muted/50 border-border/50 w-full">
                  <SelectValue placeholder="Choose a tender (auto-fills)" />
                </SelectTrigger>
                <SelectContent>
                  {tenders.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-1" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Or enter manually</p>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tender Title</Label>
              <Input placeholder="Enter tender title" value={form.tenderTitle}
                onChange={e => updateField('tenderTitle', e.target.value)}
                className="h-9 text-sm bg-muted/50 border-border/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Scope</Label>
              <Textarea placeholder="Tender scope" value={form.scope}
                onChange={e => updateField('scope', e.target.value)}
                className="min-h-[60px] text-sm bg-muted/50 border-border/50 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Budget</Label>
                <Input placeholder="e.g., 1M ETB" value={form.budget}
                  onChange={e => updateField('budget', e.target.value)}
                  className="h-9 text-sm bg-muted/50 border-border/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Category</Label>
                <Input placeholder="e.g., Construction" value={form.category}
                  onChange={e => updateField('category', e.target.value)}
                  className="h-9 text-sm bg-muted/50 border-border/50" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Required Docs</Label>
                <Input placeholder="e.g., License, TIN" value={form.requiredDocs}
                  onChange={e => updateField('requiredDocs', e.target.value)}
                  className="h-9 text-sm bg-muted/50 border-border/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Deadline</Label>
                <Input type="date" value={form.deadline}
                  onChange={e => updateField('deadline', e.target.value)}
                  className="h-9 text-sm bg-muted/50 border-border/50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Your Skills</Label>
              <SkillTagSelector selected={skills} onChange={setSkills} />
            </div>
            <Button onClick={handleAnalyze} disabled={loading}
              className="w-full gradient-emerald text-white border-0 premium-shadow hover:opacity-90 h-10">
              {loading ? (
                <><motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="inline-block"><Sparkles className="h-4 w-4 mr-2" /></motion.span>Analyzing...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Analyze Requirements</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        {loading ? <GeneratingSkeleton /> : result ? (
          <ScrollArea className="max-h-[calc(100vh-12rem)]">
            <div className="space-y-4 pr-2">
              {/* Match Score */}
              {matchScore !== null && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  <Card className="border-emerald-100/60 bg-gradient-to-br from-emerald-50 to-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm font-semibold">Match Analysis</span>
                        </div>
                        <span className={`text-2xl font-bold ${scoreColor(matchScore)}`}>{matchScore}%</span>
                      </div>
                      <Progress value={matchScore} className="h-2.5" />
                      <p className="text-xs text-muted-foreground mt-2">
                        {matchScore >= 75 ? 'Excellent match! Your skills align well with this tender.' :
                         matchScore >= 50 ? 'Good match. Consider strengthening some areas.' :
                         'Low match. You may need additional qualifications.'}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Competitiveness Assessment */}
              {result.competitivenessAssessment && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-emerald-100/60">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-semibold">Competitiveness Assessment</span>
                      </div>
                      <Badge className={`${String(result.competitivenessAssessment).toLowerCase().includes('high') ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : String(result.competitivenessAssessment).toLowerCase().includes('medium') ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-rose-100 text-rose-700 border-rose-200'} border text-xs font-semibold`}>
                        {String(result.competitivenessAssessment)}
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {result.requirementSummary && (
                <DocSectionCard title="Requirement Summary" icon={FileText} content={String(result.requirementSummary)} rawText={String(result.requirementSummary)} />
              )}
              {result.mandatoryRequirements && (
                <DocSectionCard title="Mandatory Requirements" icon={CheckCircle2} content={String(result.mandatoryRequirements)} rawText={String(result.mandatoryRequirements)} />
              )}
              {result.preferredQualifications && (
                <DocSectionCard title="Preferred Qualifications" icon={Star} content={String(result.preferredQualifications)} rawText={String(result.preferredQualifications)} />
              )}
              {result.requiredDocuments && (
                <DocSectionCard title="Required Documents" icon={FileText} content={String(result.requiredDocuments)} rawText={String(result.requiredDocuments)} />
              )}
              {result.evaluationBreakdown && (
                <DocSectionCard title="Evaluation Breakdown" icon={TrendingUp} content={String(result.evaluationBreakdown)} rawText={String(result.evaluationBreakdown)} />
              )}

              {result.riskFactors && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-amber-200/60 bg-amber-50/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-semibold">Risk Factors</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {formatSectionContent(String(result.riskFactors))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {result.preparationTips && (
                <DocSectionCard title="Preparation Tips" icon={Zap} content={String(result.preparationTips)} rawText={String(result.preparationTips)} />
              )}
              {result.recommendedActions && (
                <DocSectionCard title="Recommended Actions" icon={ChevronRight} content={String(result.recommendedActions)} rawText={String(result.recommendedActions)} />
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-[400px] text-center p-6">
            <div className="w-16 h-16 rounded-2xl gradient-emerald flex items-center justify-center premium-shadow mb-4">
              <Search className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Requirement Analyzer</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Select a tender and analyze its requirements, risks, and your match score.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TOOL 4: APPLICANT ANALYZER
   ══════════════════════════════════════════════════════════════ */

interface ApplicantResult {
  summary: { totalBids: number; averageScore: number };
  applicants: Array<{
    rank: number; name: string; company: string; overallScore: number;
    technicalScore: number; financialScore: number;
    strengths: string[]; weaknesses: string[];
    recommendation: string; riskLevel: string;
  }>;
  budgetAnalysis: string;
  riskSummary: string;
  finalRecommendation: string;
}

function ApplicantAnalyzerTool() {
  const [tenders, setTenders] = useState<TenderOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApplicantResult | null>(null);
  const [selectedTender, setSelectedTender] = useState('');

  useEffect(() => {
    api.get('/tenders', { limit: '50' }).then(res => {
      if (res.success) setTenders(res.data || []);
    }).catch(() => {});
  }, []);

  const selectedTenderData = tenders.find(t => t.id === selectedTender);

  const handleAnalyze = async () => {
    if (!selectedTender) {
      toast.error('Please select a tender');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/ai/analyze-applicants', { tenderId: selectedTender });
      if (res.success) {
        setResult(res.data);
        toast.success('Applicants analyzed!');
      } else {
        toast.error(res.error || 'Failed to analyze applicants');
      }
    } catch {
      toast.error('AI analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Card className="border-emerald-100/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-emerald flex items-center justify-center">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Applicant Analyzer</CardTitle>
                <p className="text-xs text-muted-foreground">Score and rank bid applicants</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Select Your Tender</Label>
              <Select value={selectedTender} onValueChange={setSelectedTender}>
                <SelectTrigger className="h-9 text-sm bg-muted/50 border-border/50 w-full">
                  <SelectValue placeholder="Choose a tender to analyze bids" />
                </SelectTrigger>
                <SelectContent>
                  {tenders.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedTenderData && (
              <Card className="bg-muted/40 border-0">
                <CardContent className="p-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Category:</span> <span className="font-medium">{selectedTenderData.categoryTags}</span></div>
                    <div><span className="text-muted-foreground">Bids:</span> <span className="font-medium">{selectedTenderData._count?.bids ?? 0}</span></div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button onClick={handleAnalyze} disabled={loading || !selectedTender}
              className="w-full gradient-emerald text-white border-0 premium-shadow hover:opacity-90 h-10">
              {loading ? (
                <><motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="inline-block"><Sparkles className="h-4 w-4 mr-2" /></motion.span>Analyzing...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Analyze Applicants</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        {loading ? <GeneratingSkeleton /> : result ? (
          <ScrollArea className="max-h-[calc(100vh-12rem)]">
            <div className="space-y-4 pr-2">
              {/* Summary */}
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="border-emerald-100/60 bg-gradient-to-br from-emerald-50 to-white">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-semibold">Summary</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-card rounded-xl premium-shadow">
                        <p className="text-2xl font-bold text-emerald-600">{result.summary.totalBids}</p>
                        <p className="text-xs text-muted-foreground">Total Bids</p>
                      </div>
                      <div className="text-center p-3 bg-card rounded-xl premium-shadow">
                        <p className={`text-2xl font-bold ${scoreColor(result.summary.averageScore)}`}>{result.summary.averageScore}</p>
                        <p className="text-xs text-muted-foreground">Avg Score</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Ranked Applicants */}
              {result.applicants?.map((applicant, idx) => {
                const risk = getRiskBadge(applicant.riskLevel);
                const RiskIcon = risk.Icon;
                return (
                  <motion.div key={idx} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}>
                    <Card className={`border ${applicant.rank === 1 ? 'border-emerald-200 bg-emerald-50/20' : 'border-border/40'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                              applicant.rank === 1 ? 'bg-emerald-500' : applicant.rank === 2 ? 'bg-amber-500' : 'bg-muted-foreground/50'
                            }`}>
                              #{applicant.rank}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{applicant.name}</p>
                              <p className="text-xs text-muted-foreground">{applicant.company}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${risk.color} border text-[10px] font-semibold`}>
                              <RiskIcon className="h-3 w-3 mr-0.5" />
                              {applicant.riskLevel}
                            </Badge>
                            <span className={`text-lg font-bold ${scoreColor(applicant.overallScore)}`}>
                              {applicant.overallScore}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-muted-foreground">Technical</span>
                              <span className={`font-medium ${scoreColor(applicant.technicalScore)}`}>{applicant.technicalScore}%</span>
                            </div>
                            <Progress value={applicant.technicalScore} className="h-1.5" />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-muted-foreground">Financial</span>
                              <span className={`font-medium ${scoreColor(applicant.financialScore)}`}>{applicant.financialScore}%</span>
                            </div>
                            <Progress value={applicant.financialScore} className="h-1.5" />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-2">
                          {applicant.strengths?.map((s, i) => (
                            <Badge key={i} className="bg-emerald-100 text-emerald-700 border-emerald-200 border text-[10px] font-medium">
                              {s}
                            </Badge>
                          ))}
                          {applicant.weaknesses?.map((w, i) => (
                            <Badge key={`w-${i}`} className="bg-amber-100 text-amber-700 border-amber-200 border text-[10px] font-medium">
                              {w}
                            </Badge>
                          ))}
                        </div>

                        <p className="text-xs text-muted-foreground">{applicant.recommendation}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}

              {result.budgetAnalysis && (
                <DocSectionCard title="Budget Analysis" icon={DollarSign} content={String(result.budgetAnalysis)} rawText={String(result.budgetAnalysis)} />
              )}

              {result.riskSummary && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-amber-200/60 bg-amber-50/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-semibold">Risk Summary</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {formatSectionContent(String(result.riskSummary))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {result.finalRecommendation && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-white">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-semibold">Final Recommendation</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {formatSectionContent(String(result.finalRecommendation))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-[400px] text-center p-6">
            <div className="w-16 h-16 rounded-2xl gradient-emerald flex items-center justify-center premium-shadow mb-4">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Applicant Analyzer</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Select one of your tenders to analyze and rank the submitted bids.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT: AI DOC STUDIO
   ══════════════════════════════════════════════════════════════ */

export function AIDocStudio() {
  const [activeTab, setActiveTab] = useState<ToolTab>('tender-builder');

  const renderTool = () => {
    switch (activeTab) {
      case 'tender-builder': return <TenderBuilderTool />;
      case 'bid-builder': return <BidBuilderTool />;
      case 'requirement-analyzer': return <RequirementAnalyzerTool />;
      case 'applicant-analyzer': return <ApplicantAnalyzerTool />;
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col view-enter">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border/50 bg-card/80 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-10 h-10 rounded-xl gradient-emerald flex items-center justify-center premium-shadow"
          >
            <Sparkles className="h-5 w-5 text-white" />
          </motion.div>
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              AI Doc Studio
              <Badge className="text-[9px] px-1.5 py-0 gradient-emerald text-white border-0 font-medium">AI Powered</Badge>
            </h3>
            <p className="text-[11px] text-muted-foreground">Document preparation workspace</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Tool Tabs */}
        <div className="w-[180px] lg:w-[200px] border-r border-border/50 bg-card/50 flex-shrink-0 p-3 hidden sm:flex flex-col gap-1.5">
          {TOOL_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button key={tab.id}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 premium-shadow border border-emerald-200/60'
                    : 'text-muted-foreground hover:bg-muted/50 border border-transparent'
                }`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isActive ? 'gradient-emerald text-white' : 'bg-muted/60 text-muted-foreground'
                }`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${isActive ? 'text-emerald-700' : ''}`}>{tab.label}</p>
                  <p className="text-[9px] text-muted-foreground truncate hidden lg:block">{tab.desc}</p>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Mobile tabs */}
        <div className="sm:hidden flex border-b border-border/50 bg-card overflow-x-auto flex-shrink-0 w-full">
          {TOOL_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-muted-foreground'
                }`}>
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderTool()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
