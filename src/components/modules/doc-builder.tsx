'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api, Tender, Project } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Building2, DollarSign, FileCode, ClipboardList, Receipt,
  Sparkles, FileText, Copy, Printer, RotateCcw, ArrowRight,
  Loader2, Shield, ChevronRight, Zap, BookOpen, Languages,
} from 'lucide-react';
import { InlineTranslator } from '@/components/translator';

// ─── Template Definitions ────────────────────────────────────────────────────

interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select-tender' | 'select-project';
  placeholder?: string;
  rows?: number;
}

interface TemplateDefinition {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  gradientClass: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  description: string;
  fields: TemplateField[];
  hasTenderId?: boolean;
  hasProjectId?: boolean;
  restrictedRoles?: string[];
}

const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'company-profile',
    name: 'Company Profile Builder',
    icon: Building2,
    color: 'emerald',
    gradientClass: 'gradient-emerald',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-600',
    borderClass: 'border-emerald-200',
    description: 'Generate a professional company profile for tender submissions',
    fields: [
      { key: 'companyName', label: 'Company Name', type: 'text', placeholder: 'Enter your company name' },
      { key: 'yearsInBusiness', label: 'Years in Business', type: 'number', placeholder: 'e.g. 10' },
      { key: 'numberOfEmployees', label: 'Number of Employees', type: 'number', placeholder: 'e.g. 50' },
      { key: 'keyProjects', label: 'Key Projects', type: 'textarea', placeholder: 'Describe your major completed projects...', rows: 4 },
      { key: 'certifications', label: 'Certifications', type: 'text', placeholder: 'e.g. ISO 9001, ISO 14001' },
    ],
  },
  {
    id: 'financial-bid',
    name: 'Financial Bid',
    icon: DollarSign,
    color: 'teal',
    gradientClass: 'gradient-teal',
    bgClass: 'bg-teal-50',
    textClass: 'text-teal-600',
    borderClass: 'border-teal-200',
    description: 'Prepare a detailed financial bid proposal',
    hasTenderId: true,
    fields: [
      { key: 'tenderId', label: 'Select Tender', type: 'select-tender', placeholder: 'Choose a tender...' },
      { key: 'estimatedDirectCost', label: 'Estimated Direct Cost (ETB)', type: 'number', placeholder: 'e.g. 500000' },
      { key: 'indirectCostPercent', label: 'Indirect Cost %', type: 'number', placeholder: 'e.g. 15' },
      { key: 'contingencyPercent', label: 'Contingency %', type: 'number', placeholder: 'e.g. 5' },
      { key: 'profitMarginPercent', label: 'Profit Margin %', type: 'number', placeholder: 'e.g. 10' },
    ],
  },
  {
    id: 'technical-proposal',
    name: 'Technical Proposal',
    icon: FileCode,
    color: 'slate',
    gradientClass: 'bg-gradient-to-br from-slate-600 to-slate-500',
    bgClass: 'bg-slate-50',
    textClass: 'text-slate-600',
    borderClass: 'border-slate-200',
    description: 'Write a comprehensive technical proposal',
    hasTenderId: true,
    fields: [
      { key: 'tenderId', label: 'Select Tender', type: 'select-tender', placeholder: 'Choose a tender...' },
      { key: 'methodology', label: 'Methodology', type: 'textarea', placeholder: 'Describe your proposed methodology...', rows: 4 },
      { key: 'teamSize', label: 'Team Size', type: 'number', placeholder: 'e.g. 12' },
      { key: 'keyPersonnel', label: 'Key Personnel Qualifications', type: 'textarea', placeholder: 'List key team members and their qualifications...', rows: 4 },
      { key: 'equipmentAvailable', label: 'Equipment Available', type: 'textarea', placeholder: 'List available equipment and resources...', rows: 3 },
    ],
  },
  {
    id: 'tender-specification',
    name: 'Tender Specification',
    icon: ClipboardList,
    color: 'amber',
    gradientClass: 'gradient-amber',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-600',
    borderClass: 'border-amber-200',
    description: 'Create a detailed tender specification document',
    restrictedRoles: ['team_admin'],
    fields: [
      { key: 'projectTitle', label: 'Project Title', type: 'text', placeholder: 'Enter the project title' },
      { key: 'estimatedBudgetRange', label: 'Estimated Budget Range (ETB)', type: 'text', placeholder: 'e.g. 1,000,000 - 5,000,000' },
      { key: 'requiredDeliverables', label: 'Required Deliverables', type: 'textarea', placeholder: 'List all required deliverables...', rows: 4 },
      { key: 'evaluationCriteria', label: 'Evaluation Criteria', type: 'textarea', placeholder: 'Define the evaluation criteria...', rows: 4 },
      { key: 'specialRequirements', label: 'Special Requirements', type: 'textarea', placeholder: 'Any special requirements or conditions...', rows: 3 },
    ],
  },
  {
    id: 'invoice',
    name: 'Invoice',
    icon: Receipt,
    color: 'rose',
    gradientClass: 'gradient-rose',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-600',
    borderClass: 'border-rose-200',
    description: 'Generate a professional invoice document',
    hasProjectId: true,
    fields: [
      { key: 'projectId', label: 'Select Project', type: 'select-project', placeholder: 'Choose a project...' },
      { key: 'serviceDescription', label: 'Service Description', type: 'text', placeholder: 'Describe the service provided' },
      { key: 'quantity', label: 'Quantity', type: 'number', placeholder: 'e.g. 1' },
      { key: 'unitPrice', label: 'Unit Price (ETB)', type: 'number', placeholder: 'e.g. 250000' },
      { key: 'paymentTerms', label: 'Payment Terms', type: 'text', placeholder: 'e.g. Net 30 days' },
    ],
  },
];

// ─── Content Formatting (similar to agent.tsx formatAIContent) ───────────────

function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let partKey = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/\*(.+?)\*/);

    let firstMatch: { index: number; length: number; content: string; type: 'bold' | 'italic' } | null = null;

    if (boldMatch && boldMatch.index !== undefined) {
      firstMatch = { index: boldMatch.index, length: boldMatch[0].length, content: boldMatch[1], type: 'bold' };
    }

    if (italicMatch && italicMatch.index !== undefined) {
      if (!firstMatch || italicMatch.index < firstMatch.index) {
        firstMatch = { index: italicMatch.index, length: italicMatch[0].length, content: italicMatch[1], type: 'italic' };
      }
    }

    if (firstMatch) {
      if (firstMatch.index > 0) {
        parts.push(<span key={`t-${partKey++}`}>{remaining.slice(0, firstMatch.index)}</span>);
      }
      if (firstMatch.type === 'bold') {
        parts.push(<strong key={`b-${partKey++}`} className="font-semibold text-foreground">{firstMatch.content}</strong>);
      } else {
        parts.push(<em key={`i-${partKey++}`} className="italic text-muted-foreground">{firstMatch.content}</em>);
      }
      remaining = remaining.slice(firstMatch.index + firstMatch.length);
    } else {
      parts.push(<span key={`t-${partKey++}`}>{remaining}</span>);
      break;
    }
  }

  return <>{parts}</>;
}

function formatDocContent(content: string): React.ReactNode[] {
  const lines = content.split('\n');
  const result: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const key = `doc-line-${i}`;

    // Heading lines (## Title, ### Subtitle)
    const h2Match = line.match(/^##\s+(.*)/);
    if (h2Match) {
      result.push(
        <h2 key={key} className="text-xl font-bold text-foreground mt-6 mb-3 pb-2 border-b border-border/40">
          {formatInline(h2Match[1])}
        </h2>
      );
      continue;
    }

    const h3Match = line.match(/^###\s+(.*)/);
    if (h3Match) {
      result.push(
        <h3 key={key} className="text-lg font-semibold text-foreground mt-4 mb-2">
          {formatInline(h3Match[1])}
        </h3>
      );
      continue;
    }

    const h1Match = line.match(/^#\s+(.*)/);
    if (h1Match) {
      result.push(
        <h1 key={key} className="text-2xl font-bold text-foreground mt-4 mb-3">
          {formatInline(h1Match[1])}
        </h1>
      );
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      result.push(<Separator key={key} className="my-4" />);
      continue;
    }

    // Bullet point lines
    const bulletMatch = line.match(/^[\s]*[-*•]\s+(.*)/);
    if (bulletMatch) {
      const bulletContent = bulletMatch[1];
      result.push(
        <div key={key} className="flex items-start gap-2.5 ml-3 my-1">
          <span className="text-emerald-500 mt-1 flex-shrink-0 text-xs">&#9679;</span>
          <span className="text-sm leading-relaxed">{formatInline(bulletContent)}</span>
        </div>
      );
      continue;
    }

    // Numbered list lines
    const numberedMatch = line.match(/^[\s]*(\d+)[.)]\s+(.*)/);
    if (numberedMatch) {
      const num = numberedMatch[1];
      const numberedContent = numberedMatch[2];
      result.push(
        <div key={key} className="flex items-start gap-2.5 ml-3 my-1">
          <span className="text-emerald-600 font-semibold flex-shrink-0 text-sm min-w-[1.25rem]">{num}.</span>
          <span className="text-sm leading-relaxed">{formatInline(numberedContent)}</span>
        </div>
      );
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      result.push(<div key={key} className="h-2" />);
      continue;
    }

    // Regular line
    result.push(<div key={key} className="text-sm leading-relaxed">{formatInline(line)}</div>);
  }

  return result;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DocBuilderView() {
  const { user } = useAuthStore();
  const { viewParams } = useNavStore();
  const role = user?.role || 'user';

  // UI State
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [inputData, setInputData] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [generatedTemplateType, setGeneratedTemplateType] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  // Auto-select template and tender from viewParams (e.g. from "Start Bid Application")
  useEffect(() => {
    if (viewParams?.templateId && !selectedTemplate) {
      setSelectedTemplate(viewParams.templateId as string);
    }
    if (viewParams?.tenderId && !inputData.tenderId) {
      setInputData(prev => ({ ...prev, tenderId: viewParams.tenderId as string }));
    }
  }, [viewParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Data
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Filter visible templates based on role
  const visibleTemplates = TEMPLATES.filter(t => {
    if (!t.restrictedRoles) return true;
    return t.restrictedRoles.includes(role);
  });

  const activeTemplate = TEMPLATES.find(t => t.id === selectedTemplate) || null;

  // Fetch tenders for dropdown
  const fetchTenders = useCallback(async () => {
    const res = await api.get('/tenders', { status: 'open', limit: '50' });
    if (res.success) setTenders(res.data);
  }, []);

  // Fetch projects for invoice
  const fetchProjects = useCallback(async () => {
    const res = await api.get('/projects');
    if (res.success) setProjects(res.data);
  }, []);

  useEffect(() => {
    fetchTenders();
    fetchProjects();
  }, [fetchTenders, fetchProjects]);

  // Handle template selection
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    setInputData({});
    setGeneratedContent(null);
    setGeneratedAt(null);
    setGeneratedTemplateType(null);
    setUsedFallback(false);
  };

  // Handle input change
  const handleInputChange = (key: string, value: string) => {
    setInputData(prev => ({ ...prev, [key]: value }));
  };

  // Handle generate document
  const handleGenerate = async () => {
    if (!activeTemplate) return;

    setGenerating(true);
    setGeneratedContent(null);
    setUsedFallback(false);

    try {
      const body: Record<string, unknown> = {
        templateType: activeTemplate.id,
        inputData,
      };

      // Include tenderId if present in inputData
      if (activeTemplate.hasTenderId && inputData.tenderId) {
        body.tenderId = inputData.tenderId;
      }

      // 12s client timeout — Vercel Hobby kills the function at 10s anyway,
      // so waiting longer just leaves the user staring at a spinner.
      const res = await api.post('/documents/generate', body, { timeout: 12000 });

      if (res.success) {
        setGeneratedContent(res.data.content);
        setGeneratedAt(res.data.generatedAt);
        setGeneratedTemplateType(res.data.templateType);
        setUsedFallback(res.data.fallback === true);
        toast.success(
          res.data.fallback
            ? 'Template ready — AI was slow, edit the placeholders.'
            : 'Document generated successfully!'
        );
      } else {
        toast.error(res.error || 'Failed to generate document');
      }
    } catch (err: unknown) {
      const name = (err as Error)?.name;
      const msg = (err as Error)?.message || '';
      if (name === 'TimeoutError' || msg.includes('timed out')) {
        toast.error('The AI is taking too long. Please try again — your template is ready to edit.');
      } else {
        toast.error('Document generation failed. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (!generatedContent) return;
    try {
      await navigator.clipboard.writeText(generatedContent);
      toast.success('Document copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Print document
  const handlePrint = () => {
    window.print();
  };

  // Start over
  const handleNewDocument = () => {
    setSelectedTemplate(null);
    setInputData({});
    setGeneratedContent(null);
    setGeneratedAt(null);
    setGeneratedTemplateType(null);
    setUsedFallback(false);
  };

  // ─── Render: Empty State (no template selected) ───────────────────────────

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 py-8 view-enter">
      {/* Hero */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl gradient-emerald flex items-center justify-center premium-shadow-lg">
          <BookOpen className="h-10 w-10 text-white" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-lg gradient-amber flex items-center justify-center premium-shadow">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      </div>
      <div className="text-center max-w-md">
        <h3 className="text-2xl font-bold tracking-tight mb-2">
          AI <span className="text-gradient-emerald">Document Builder</span>
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Select a template below to generate professional, AI-powered documents for your tender workflow. From company profiles to invoices - all tailored for the TenetBid platform.
        </p>
      </div>

      {/* Template Grid */}
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1 rounded-md bg-emerald-50">
            <Zap className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available Templates</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleTemplates.map(template => {
            const Icon = template.icon;
            return (
              <Card
                key={template.id}
                className={`premium-shadow rounded-xl border-0 bg-white hover:-translate-y-1 transition-all duration-300 cursor-pointer group ${template.borderClass} border`}
                onClick={() => handleSelectTemplate(template.id)}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-xl ${template.gradientClass} flex items-center justify-center premium-shadow`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    {template.restrictedRoles && (
                      <Badge className="text-[9px] px-1.5 py-0 bg-amber-100 text-amber-700 border-0 font-medium flex items-center gap-1">
                        <Shield className="h-2.5 w-2.5" />
                        Restricted
                      </Badge>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm group-hover:text-emerald-700 transition-colors">{template.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{template.description}</p>
                  </div>
                  <div className="flex items-center text-xs font-medium text-emerald-600 group-hover:text-emerald-700 transition-colors pt-1">
                    Use Template
                    <ChevronRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ─── Render: Left Panel (Template List) ────────────────────────────────────

  const renderTemplateList = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg gradient-emerald">
          <BookOpen className="h-3.5 w-3.5 text-white" />
        </div>
        <h3 className="text-sm font-semibold">Templates</h3>
      </div>
      {visibleTemplates.map(template => {
        const Icon = template.icon;
        const isActive = selectedTemplate === template.id;
        return (
          <button
            key={template.id}
            onClick={() => handleSelectTemplate(template.id)}
            className={`w-full text-left p-3 rounded-xl transition-all duration-200 group flex items-center gap-3 ${
              isActive
                ? `${template.bgClass} ${template.borderClass} border shadow-sm`
                : 'hover:bg-muted/50 border border-transparent'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg ${isActive ? template.gradientClass : 'bg-muted/80'} flex items-center justify-center flex-shrink-0 transition-all`}>
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isActive ? template.textClass : ''}`}>
                {template.name}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{template.description}</p>
            </div>
            {template.restrictedRoles && (
              <Shield className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );

  // ─── Render: Template Form ─────────────────────────────────────────────────

  const renderTemplateForm = () => {
    if (!activeTemplate) return null;
    const Icon = activeTemplate.icon;

    return (
      <div className="space-y-5 view-enter">
        {/* Template Header */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${activeTemplate.gradientClass} flex items-center justify-center premium-shadow`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-base">{activeTemplate.name}</h3>
            <p className="text-xs text-muted-foreground">{activeTemplate.description}</p>
          </div>
        </div>

        <Separator />

        {/* Form Fields */}
        <div className="space-y-4">
          {activeTemplate.fields.map(field => (
            <div key={field.key} className="space-y-2">
              <Label className="text-sm font-medium">{field.label}</Label>
              {field.type === 'textarea' ? (
                <Textarea
                  placeholder={field.placeholder}
                  rows={field.rows || 3}
                  value={inputData[field.key] || ''}
                  onChange={e => handleInputChange(field.key, e.target.value)}
                  className="bg-muted/50 border-border/60 rounded-xl resize-none focus:border-emerald-300 focus:ring-emerald-200/40"
                />
              ) : field.type === 'select-tender' ? (
                <Select
                  value={inputData[field.key] || ''}
                  onValueChange={val => handleInputChange(field.key, val)}
                >
                  <SelectTrigger className="bg-muted/50 border-border/60 rounded-xl w-full">
                    <SelectValue placeholder={field.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {tenders.length === 0 ? (
                      <SelectItem value="_none" disabled>No open tenders available</SelectItem>
                    ) : (
                      tenders.map(tender => (
                        <SelectItem key={tender.id} value={tender.id}>
                          {tender.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              ) : field.type === 'select-project' ? (
                <Select
                  value={inputData[field.key] || ''}
                  onValueChange={val => handleInputChange(field.key, val)}
                >
                  <SelectTrigger className="bg-muted/50 border-border/60 rounded-xl w-full">
                    <SelectValue placeholder={field.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.filter(p => p.status === 'active').length === 0 ? (
                      <SelectItem value="_none" disabled>No active projects available</SelectItem>
                    ) : (
                      projects
                        .filter(p => p.status === 'active')
                        .map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.tender?.title || `Project ${project.id.slice(0, 8)}`}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={field.type === 'number' ? 'number' : 'text'}
                  placeholder={field.placeholder}
                  value={inputData[field.key] || ''}
                  onChange={e => handleInputChange(field.key, e.target.value)}
                  className="bg-muted/50 border-border/60 rounded-xl focus:border-emerald-300 focus:ring-emerald-200/40"
                />
              )}
            </div>
          ))}
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full gradient-emerald hover:opacity-90 text-white rounded-xl h-12 premium-shadow transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 text-sm font-semibold"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Document...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Document
            </>
          )}
        </Button>
      </div>
    );
  };

  // ─── Render: Generating Animation ──────────────────────────────────────────

  const renderGenerating = () => (
    <div className="flex flex-col items-center justify-center py-16 gap-6 view-enter">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center animate-pulse">
          <FileText className="h-8 w-8 text-emerald-500" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full gradient-emerald flex items-center justify-center">
          <Sparkles className="h-3 w-3 text-white animate-spin" />
        </div>
      </div>
      <div className="text-center">
        <h4 className="font-semibold text-base mb-1">AI is writing your document...</h4>
        <p className="text-sm text-muted-foreground">This may take a moment. Our AI is crafting your professional document.</p>
      </div>
      <div className="flex gap-1.5">
        <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );

  // ─── Render: Generated Document Preview ────────────────────────────────────

  const renderGeneratedDoc = () => {
    if (!generatedContent) return null;
    const templateDef = TEMPLATES.find(t => t.id === generatedTemplateType);
    const DocIcon = templateDef?.icon || FileText;

    return (
      <div className="space-y-4 view-enter">
        {/* Document Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${templateDef?.gradientClass || 'gradient-emerald'} flex items-center justify-center`}>
              <DocIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">{templateDef?.name || 'Generated Document'}</h4>
              {generatedAt && (
                <p className="text-[11px] text-muted-foreground">
                  Generated {new Date(generatedAt).toLocaleDateString()} at {new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={handleCopy}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
              <Copy className="h-3.5 w-3.5" />
              Copy
            </Button>
            <Button variant="ghost" size="sm" onClick={handlePrint}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNewDocument}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
              <RotateCcw className="h-3.5 w-3.5" />
              New
            </Button>
          </div>
        </div>

        {/* Translator for generated document */}
        {generatedContent && (
          <div className="mt-4">
            <InlineTranslator text={generatedContent} />
          </div>
        )}

        {/* Document Paper */}
        <div className="bg-white rounded-xl border border-border/40 premium-shadow-lg overflow-hidden">
          {/* Document Header Bar */}
          <div className="px-6 py-3 bg-muted/30 border-b border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${templateDef?.bgClass || 'bg-emerald-50'}`} style={{ backgroundColor: 'oklch(0.558 0.155 163)' }} />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {templateDef?.name || 'Document'}
              </span>
            </div>
            <Badge
              className={`text-[9px] px-1.5 py-0 border-0 font-medium ${
                usedFallback ? 'bg-amber-100 text-amber-700' : 'gradient-emerald text-white'
              }`}
            >
              {usedFallback ? 'Template' : 'AI Generated'}
            </Badge>
          </div>

          {/* Document Content */}
          <ScrollArea className="max-h-[60vh]">
            <div className="p-6 md:p-8">
              {/* Document Meta */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/30">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Prepared by</p>
                  <p className="text-sm font-medium">
                    {user?.company?.name || user?.profile?.fullName || user?.email || 'Unknown User'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Date</p>
                  <p className="text-sm font-medium">
                    {generatedAt ? new Date(generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Formatted Content */}
              <div className="prose-sm space-y-1">
                {formatDocContent(generatedContent)}
              </div>

              {/* Document Footer */}
              <div className="mt-8 pt-4 border-t border-border/30 flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">
                  TenetBid Procurement Platform &middot; AI-Powered Document
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {generatedTemplateType?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  // ─── Render: Right Panel ───────────────────────────────────────────────────

  const renderRightPanel = () => {
    if (!selectedTemplate) return null;

    return (
      <Card className="premium-shadow rounded-xl border-0 bg-white">
        <CardContent className="p-5 md:p-6">
          {generating ? renderGenerating() : generatedContent ? renderGeneratedDoc() : renderTemplateForm()}
        </CardContent>
      </Card>
    );
  };

  // ─── Main Render ───────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto view-enter">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl gradient-emerald shadow-md flex-shrink-0">
          <BookOpen className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            <span className="text-gradient-emerald">Document</span> Builder
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">AI-powered document preparation for the tender ecosystem</p>
        </div>
        {selectedTemplate && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewDocument}
            className="gap-1.5 text-xs rounded-xl border-border/60 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Start Over
          </Button>
        )}
      </div>

      {/* Body */}
      {!selectedTemplate ? (
        renderEmptyState()
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Panel */}
          <div className="lg:col-span-4 xl:col-span-3">
            <Card className="premium-shadow rounded-xl border-0 bg-white">
              <CardContent className="p-4">
                {renderTemplateList()}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-8 xl:col-span-9">
            {renderRightPanel()}
          </div>
        </div>
      )}
    </div>
  );
}
