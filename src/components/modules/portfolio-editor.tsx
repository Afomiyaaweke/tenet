'use client';

import { useState, useEffect } from 'react';
import { api, Company } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Globe, Eye, EyeOff, Rocket, Settings, Edit2, Save,
  CheckCircle, Copy, PenLine, Monitor, Loader2,
  Sparkles, Quote, FileText, ExternalLink,
} from 'lucide-react';

interface PortfolioEditorProps {
  companyId: string;
  companyData: Company;
  onCompanyUpdate: (data: Company) => void;
  onEditCompany: () => void;
}

type Step = 'url' | 'edit' | 'preview' | 'live';

export function PortfolioEditor({ companyId, companyData, onCompanyUpdate, onEditCompany }: PortfolioEditorProps) {
  const vanitySlug = companyData.vanitySlug || null;
  const isPublished = !!companyData.isPublished;

  // Determine current step
  const [step, setStep] = useState<Step>(
    !vanitySlug ? 'url' : (!isPublished ? 'edit' : 'live')
  );

  // Edit form state
  const [tagline, setTagline] = useState(companyData.publicTagline || '');
  const [description, setDescription] = useState(companyData.publicDescription || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(true);

  // Sync step when companyData changes (e.g. vanity URL set externally)
  useEffect(() => {
    setTagline(companyData.publicTagline || '');
    setDescription(companyData.publicDescription || '');
    const slug = companyData.vanitySlug || null;
    const published = !!companyData.isPublished;
    if (slug && step === 'url') {
      setStep(published ? 'live' : 'edit');
    } else if (slug && step === 'edit' && published) {
      setStep('live');
    } else if (slug && !published && step === 'live') {
      setStep('edit');
    }
  }, [companyData]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveContent = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/companies/${companyId}`, {
        publicTagline: tagline || null,
        publicDescription: description || null,
      });
      if (res.success) {
        onCompanyUpdate(res.data);
        toast.success('Portfolio content saved');
        // Refresh preview and navigate to preview step
        setPreviewKey(k => k + 1);
        setPreviewLoading(true);
        setStep('preview');
      } else {
        toast.error(res.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      // Save content first if there are changes
      if (tagline || description) {
        await api.put(`/companies/${companyId}`, {
          publicTagline: tagline || null,
          publicDescription: description || null,
        });
      }
      const res = await api.put(`/companies/${companyId}`, { isPublished: true });
      if (res.success) {
        onCompanyUpdate(res.data);
        setStep('live');
        toast.success('Portfolio published! Your profile is now live and shareable.');
      } else {
        toast.error(res.error || 'Failed to publish');
      }
    } catch {
      toast.error('Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const unpublish = async () => {
    setPublishing(true);
    try {
      const res = await api.put(`/companies/${companyId}`, { isPublished: false });
      if (res.success) {
        onCompanyUpdate(res.data);
        setStep('edit');
        toast.success('Portfolio unpublished. It is now in draft mode.');
      } else {
        toast.error(res.error || 'Failed to unpublish');
      }
    } catch {
      toast.error('Failed to unpublish');
    } finally {
      setPublishing(false);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/${vanitySlug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const previewUrl = vanitySlug ? `/${vanitySlug}?preview=true&k=${previewKey}` : '';

  // ═══════════════════════════════════════════
  // STEP 1: Set Vanity URL
  // ═══════════════════════════════════════════
  if (step === 'url') {
    return (
      <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10">
              <Globe className="h-3.5 w-3.5 text-amber-600" />
            </div>
            Portfolio & Publishing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border-2 border-dashed border-orange-300/60 bg-orange-50/30 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
              <Globe className="h-7 w-7 text-orange-500" />
            </div>
            <h4 className="text-sm font-bold mb-1.5">Set your Vanity URL to get started</h4>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
              Choose a unique URL like <span className="font-mono text-foreground font-medium">tenetbid.com/acme-corp</span> that you can share with anyone.
            </p>
            <Button
              size="sm"
              className="gap-2 text-xs rounded-xl bg-orange-500 hover:bg-orange-600 text-white h-10 px-5"
              onClick={onEditCompany}
            >
              <Settings className="h-3.5 w-3.5" /> Set Vanity URL
            </Button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-5">
            <StepDot active label="URL" />
            <div className="w-8 h-px bg-border" />
            <StepDot label="Edit" />
            <div className="w-8 h-px bg-border" />
            <StepDot label="Preview" />
            <div className="w-8 h-px bg-border" />
            <StepDot label="Publish" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════
  // STEP 2: Edit Content
  // ═══════════════════════════════════════════
  if (step === 'edit') {
    return (
      <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10">
                <PenLine className="h-3.5 w-3.5 text-amber-600" />
              </div>
              Edit Your Portfolio
            </CardTitle>
            <Badge className={
              isPublished
                ? 'text-[10px] px-2 py-0.5 border-0 bg-emerald-50 text-emerald-700 font-medium'
                : 'text-[10px] px-2 py-0.5 border-0 bg-amber-50 text-amber-700 font-medium'
            }>
              {isPublished ? (
                <><CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Live</>
              ) : (
                <><Edit2 className="h-2.5 w-2.5 mr-0.5" /> Draft</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* URL display */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
              <Globe className="h-4 w-4 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground font-mono truncate">
                tenetbid.com/{vanitySlug}
              </p>
              <p className="text-[10px] text-muted-foreground">Your shareable portfolio URL</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0"
              onClick={copyLink}
            >
              {copied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {/* Tagline field */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Quote className="h-3 w-3 text-orange-500" />
              Tagline
            </Label>
            <Input
              className="rounded-xl bg-muted/50 text-sm h-10"
              placeholder={'e.g. "Building Ethiopia\'s future, one project at a time"'}
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              maxLength={100}
            />
            <p className="text-[10px] text-muted-foreground">
              A short, memorable phrase. Appears below your company name on your public profile. {tagline.length}/100
            </p>
          </div>

          {/* Description field */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <FileText className="h-3 w-3 text-orange-500" />
              Description
            </Label>
            <Textarea
              className="rounded-xl bg-muted/50 text-sm min-h-[100px] resize-none"
              placeholder="Tell potential clients about your company, expertise, and what makes you stand out. This will appear prominently on your public portfolio page."
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <p className="text-[10px] text-muted-foreground">
              A longer description of your company. {description.length}/500
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              size="sm"
              className="gap-2 text-xs rounded-xl bg-orange-500 hover:bg-orange-600 text-white h-10 flex-1"
              onClick={saveContent}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save & Preview
            </Button>
            {!isPublished ? (
              <Button
                size="sm"
                className="gap-2 text-xs rounded-xl h-10 flex-1"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white' }}
                onClick={publish}
                disabled={publishing}
              >
                {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                Publish Now
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="gap-2 text-xs rounded-xl h-10 flex-1 border-rose-300/60 text-rose-600 hover:bg-rose-50"
                onClick={unpublish}
                disabled={publishing}
              >
                {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
                Unpublish
              </Button>
            )}
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <StepDot done label="URL" />
            <div className="w-8 h-px bg-orange-400" />
            <StepDot active label="Edit" />
            <div className="w-8 h-px bg-border" />
            <StepDot label="Preview" />
            <div className="w-8 h-px bg-border" />
            <StepDot label="Publish" />
          </div>

          {/* Tip */}
          <p className="text-[10px] text-muted-foreground leading-relaxed text-center">
            <strong>Save & Preview</strong> saves your changes and shows a live preview of your public page.
            <strong>Publish</strong> makes it visible on the leaderboard and shareable via link.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════
  // STEP 3: Preview (embedded iframe)
  // ═══════════════════════════════════════════
  if (step === 'preview') {
    return (
      <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10">
                <Monitor className="h-3.5 w-3.5 text-amber-600" />
              </div>
              Portfolio Preview
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="text-[10px] px-2 py-0.5 border-0 bg-amber-50 text-amber-700 font-medium">
                <Eye className="h-2.5 w-2.5 mr-0.5" /> Preview Mode
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL bar mockup */}
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
              <Globe className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-muted-foreground truncate">
                tenetbid.com/{vanitySlug}
              </p>
            </div>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Embedded preview iframe */}
          <div className="relative rounded-xl border border-border/60 overflow-hidden bg-white">
            {previewLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />
                  <p className="text-xs text-muted-foreground">Loading preview&hellip;</p>
                </div>
              </div>
            )}
            <iframe
              key={previewKey}
              src={previewUrl}
              className="w-full h-[500px] sm:h-[600px] border-0"
              onLoad={() => setPreviewLoading(false)}
              title="Portfolio Preview"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-xs rounded-xl h-10 flex-1"
              onClick={() => setStep('edit')}
            >
              <Edit2 className="h-3.5 w-3.5" />
              Back to Edit
            </Button>
            {!isPublished ? (
              <Button
                size="sm"
                className="gap-2 text-xs rounded-xl h-10 flex-1"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white' }}
                onClick={publish}
                disabled={publishing}
              >
                {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                Publish Now
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-2 text-xs rounded-xl h-10 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setStep('live')}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                View Live Status
              </Button>
            )}
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2">
            <StepDot done label="URL" />
            <div className="w-8 h-px bg-orange-400" />
            <StepDot done label="Edit" />
            <div className="w-8 h-px bg-orange-400" />
            <StepDot active label="Preview" />
            <div className="w-8 h-px bg-border" />
            <StepDot label="Publish" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════
  // STEP 4: Live / Published
  // ═══════════════════════════════════════════
  return (
    <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            Your Portfolio is Live
          </CardTitle>
          <Badge className="text-[10px] px-2 py-0.5 border-0 bg-emerald-50 text-emerald-700 font-medium">
            <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Published
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL + Share */}
        <div className="flex items-center gap-3 p-4 bg-emerald-50/40 border border-emerald-200/50 rounded-xl">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Globe className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground font-mono truncate">
              tenetbid.com/{vanitySlug}
            </p>
            <p className="text-xs text-emerald-700 font-medium">
              <CheckCircle className="h-3 w-3 inline mr-0.5" /> Live & Shareable
            </p>
          </div>
          <Button
            size="sm"
            className="gap-1.5 text-xs rounded-xl h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={copyLink}
          >
            {copied ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
        </div>

        {/* Current tagline/description preview */}
        {(tagline || description) && (
          <div className="p-3.5 bg-muted/30 rounded-xl space-y-1.5">
            {tagline && (
              <p className="text-sm italic text-muted-foreground">&ldquo;{tagline}&rdquo;</p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{description}</p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-xs rounded-xl h-10 flex-1"
            onClick={() => {
              setPreviewKey(k => k + 1);
              setPreviewLoading(true);
              setStep('preview');
            }}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview Page
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-xs rounded-xl h-10 flex-1"
            onClick={() => {
              setTagline(companyData.publicTagline || '');
              setDescription(companyData.publicDescription || '');
              setStep('edit');
            }}
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit Content
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-xs rounded-xl h-10 flex-1 border-rose-300/60 text-rose-600 hover:bg-rose-50"
            onClick={unpublish}
            disabled={publishing}
          >
            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
            Unpublish
          </Button>
        </div>

        {/* All steps done */}
        <div className="flex items-center justify-center gap-2">
          <StepDot done label="URL" />
          <div className="w-8 h-px bg-orange-400" />
          <StepDot done label="Edit" />
          <div className="w-8 h-px bg-orange-400" />
          <StepDot done label="Preview" />
          <div className="w-8 h-px bg-orange-400" />
          <StepDot done active label="Published" />
        </div>

        <p className="text-[10px] text-muted-foreground leading-relaxed text-center">
          Your portfolio is visible on the leaderboard. Share the link with clients and partners.
          You can edit content or unpublish at any time.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Step indicator dot ──
function StepDot({ label, active, done }: { label: string; active?: boolean; done?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors ${
        done
          ? 'bg-orange-500 text-white'
          : active
            ? 'bg-orange-500/20 text-orange-600 ring-2 ring-orange-500/40'
            : 'bg-muted text-muted-foreground'
      }`}>
        {done ? <CheckCircle className="h-3 w-3" /> : null}
      </div>
      <span className={`text-[9px] font-medium ${active ? 'text-orange-600' : 'text-muted-foreground'}`}>{label}</span>
    </div>
  );
}
