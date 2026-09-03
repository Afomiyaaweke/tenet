'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { api, Profile } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Globe, Eye, EyeOff, Rocket, Edit2, Save,
  CheckCircle, Copy, PenLine, Monitor, Loader2,
  Sparkles, Quote, FileText, ExternalLink,
  Image as ImageIcon, Trash2, Plus,
} from 'lucide-react';

interface PersonalPortfolioEditorProps {
  profile: Profile;
  onProfileUpdate: (data: Profile) => void;
}

type Step = 'url' | 'edit' | 'preview' | 'live';

const MAX_IMAGES = 12;

export function PersonalPortfolioEditor({ profile, onProfileUpdate }: PersonalPortfolioEditorProps) {
  const vanitySlug = profile.vanitySlug || null;
  const isPublished = !!profile.isPublished;

  const [step, setStep] = useState<Step>(
    !vanitySlug ? 'url' : (!isPublished ? 'edit' : 'live')
  );

  // Vanity slug input (for the 'url' step)
  const [slugInput, setSlugInput] = useState('');
  const [slugChecking, setSlugChecking] = useState(false);

  // Edit form state
  const [tagline, setTagline] = useState(profile.publicTagline || '');
  const [description, setDescription] = useState(profile.publicDescription || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(true);

  // Portfolio gallery state
  const [images, setImages] = useState<string[]>(() => {
    try {
      const parsed = profile.portfolioImages ? JSON.parse(profile.portfolioImages) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local state when profile prop changes externally
  useEffect(() => {
    setTagline(profile.publicTagline || '');
    setDescription(profile.publicDescription || '');
    try {
      const parsed = profile.portfolioImages ? JSON.parse(profile.portfolioImages) : [];
      setImages(Array.isArray(parsed) ? parsed : []);
    } catch {
      setImages([]);
    }
    const slug = profile.vanitySlug || null;
    const published = !!profile.isPublished;
    if (slug && step === 'url') {
      setStep(published ? 'live' : 'edit');
    } else if (slug && step === 'edit' && published) {
      setStep('live');
    } else if (slug && !published && step === 'live') {
      setStep('edit');
    }
  }, [profile]);

  // ── Set vanity slug ──
  const setVanitySlug = async () => {
    const slug = slugInput.trim().toLowerCase();
    if (!slug) {
      toast.error('Enter a vanity URL');
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && !/^[a-z0-9]$/.test(slug)) {
      toast.error('Use lowercase letters, numbers, and hyphens only (2+ chars)');
      return;
    }
    setSlugChecking(true);
    try {
      const res = await api.put('/profiles', { vanitySlug: slug });
      if (res.success) {
        onProfileUpdate(res.data);
        setStep('edit');
        toast.success('Vanity URL set!');
      } else {
        toast.error(res.error || 'Failed to set vanity URL');
      }
    } catch {
      toast.error('Failed to set vanity URL');
    } finally {
      setSlugChecking(false);
    }
  };

  // ── Save content (tagline + description) ──
  const saveContent = async () => {
    setSaving(true);
    try {
      const res = await api.put('/profiles', {
        publicTagline: tagline || null,
        publicDescription: description || null,
      });
      if (res.success) {
        onProfileUpdate(res.data);
        toast.success('Portfolio content saved');
        setPreviewKey((k) => k + 1);
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

  // ── Publish / unpublish ──
  const publish = async () => {
    setPublishing(true);
    try {
      const res = await api.put('/profiles', { isPublished: true });
      if (res.success) {
        onProfileUpdate(res.data);
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
      const res = await api.put('/profiles', { isPublished: false });
      if (res.success) {
        onProfileUpdate(res.data);
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

  const copyLink = useCallback(() => {
    const url = `${window.location.origin}/u/${vanitySlug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }, [vanitySlug]);

  // ── Portfolio image upload ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (images.length >= MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images. Remove one first.`);
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.upload('/profiles/upload-media', formData);
      if (res.success) {
        setImages(res.data?.images || []);
        // Update the parent profile state so portfolioImages persists
        onProfileUpdate({ ...profile, portfolioImages: JSON.stringify(res.data?.images || []) });
        toast.success('Image added to portfolio');
      } else {
        toast.error(res.error || 'Failed to upload image');
      }
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = async (url: string) => {
    setRemoving(url);
    try {
      const res = await api.delete(`/profiles/upload-media?url=${encodeURIComponent(url)}`);
      if (res.success) {
        setImages(res.data?.images || []);
        onProfileUpdate({ ...profile, portfolioImages: JSON.stringify(res.data?.images || []) });
        toast.success('Image removed');
      } else {
        toast.error(res.error || 'Failed to remove image');
      }
    } catch {
      toast.error('Failed to remove image');
    } finally {
      setRemoving(null);
    }
  };

  const previewUrl = vanitySlug ? `/u/${vanitySlug}?preview=true&k=${previewKey}` : '';

  // ═══════════════════════════════════════════
  // STEP 1: Set Vanity URL
  // ═══════════════════════════════════════════
  if (step === 'url') {
    return (
      <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
              <Globe className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            Portfolio & Publishing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border-2 border-dashed border-emerald-300/60 bg-emerald-50/30 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Globe className="h-7 w-7 text-emerald-500" />
            </div>
            <h4 className="text-sm font-bold mb-1.5">Set your shareable URL</h4>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
              Choose a unique URL like <span className="font-mono text-foreground font-medium">tenetbid.com/u/jane-doe</span> that you can share with anyone.
            </p>
            <div className="flex gap-2 max-w-xs mx-auto">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">/u/</span>
                <Input
                  className="rounded-xl bg-muted/50 text-sm h-10 pl-9"
                  placeholder="jane-doe"
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  onKeyDown={(e) => { if (e.key === 'Enter') setVanitySlug(); }}
                  maxLength={40}
                />
              </div>
              <Button
                size="sm"
                className="gap-2 text-xs rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white h-10 px-4"
                onClick={setVanitySlug}
                disabled={slugChecking || !slugInput.trim()}
              >
                {slugChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                Set
              </Button>
            </div>
          </div>

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
  // STEP 2: Edit Content + Portfolio Gallery
  // ═══════════════════════════════════════════
  if (step === 'edit') {
    return (
      <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
                <PenLine className="h-3.5 w-3.5 text-emerald-600" />
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
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Globe className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground font-mono truncate">
                tenetbid.com/u/{vanitySlug}
              </p>
              <p className="text-[10px] text-muted-foreground">Your shareable portfolio URL</p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={copyLink}>
              {copied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {/* Tagline */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Quote className="h-3 w-3 text-emerald-500" />
              Tagline
            </Label>
            <Input
              className="rounded-xl bg-muted/50 text-sm h-10"
              placeholder={'e.g. "Building Ethiopia\'s future, one project at a time"'}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={100}
            />
            <p className="text-[10px] text-muted-foreground">
              A short, memorable phrase shown below your name. {tagline.length}/100
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <FileText className="h-3 w-3 text-emerald-500" />
              Description
            </Label>
            <Textarea
              className="rounded-xl bg-muted/50 text-sm min-h-[100px] resize-none"
              placeholder="Tell people about your expertise, experience, and what makes you stand out."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <p className="text-[10px] text-muted-foreground">
              A longer description shown on your public profile. {description.length}/500
            </p>
          </div>

          {/* Portfolio Gallery */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <ImageIcon className="h-3 w-3 text-emerald-500" />
              Portfolio Gallery
              <Badge className="text-[9px] px-1.5 py-0 border-0 bg-muted text-muted-foreground font-medium ml-1">
                {images.length}/{MAX_IMAGES}
              </Badge>
            </Label>
            <p className="text-[10px] text-muted-foreground mb-2">
              Upload photos of your work, certificates, or any media you want to showcase on your public profile.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map((url, i) => (
                <div key={i} className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/30">
                  <img src={url} alt={`Portfolio ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(url)}
                    disabled={removing === url}
                    className="absolute top-1 right-1 w-6 h-6 rounded-md bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    aria-label="Remove image"
                  >
                    {removing === url ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-emerald-400 hover:bg-emerald-50/40 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-emerald-600 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      <span className="text-[10px] font-medium">Add</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              size="sm"
              className="gap-2 text-xs rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white h-10 flex-1"
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
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}
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

          <div className="flex items-center justify-center gap-2 pt-2">
            <StepDot done label="URL" />
            <div className="w-8 h-px bg-emerald-400" />
            <StepDot active label="Edit" />
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
  // STEP 3: Preview (embedded iframe)
  // ═══════════════════════════════════════════
  if (step === 'preview') {
    return (
      <Card className="premium-shadow rounded-xl border-0 bg-card overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
                <Monitor className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              Portfolio Preview
            </CardTitle>
            <Badge className="text-[10px] px-2 py-0.5 border-0 bg-amber-50 text-amber-700 font-medium">
              <Eye className="h-2.5 w-2.5 mr-0.5" /> Preview Mode
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Globe className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-muted-foreground truncate">
                tenetbid.com/u/{vanitySlug}
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

          <div className="relative rounded-xl border border-border/60 overflow-hidden bg-white">
            {previewLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
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

          <div className="flex flex-col sm:flex-row gap-2">
            <Button size="sm" variant="outline" className="gap-2 text-xs rounded-xl h-10 flex-1" onClick={() => setStep('edit')}>
              <Edit2 className="h-3.5 w-3.5" /> Back to Edit
            </Button>
            {!isPublished ? (
              <Button
                size="sm"
                className="gap-2 text-xs rounded-xl h-10 flex-1"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}
                onClick={publish}
                disabled={publishing}
              >
                {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                Publish Now
              </Button>
            ) : (
              <Button size="sm" className="gap-2 text-xs rounded-xl h-10 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setStep('live')}>
                <CheckCircle className="h-3.5 w-3.5" /> View Live Status
              </Button>
            )}
          </div>

          <div className="flex items-center justify-center gap-2">
            <StepDot done label="URL" />
            <div className="w-8 h-px bg-emerald-400" />
            <StepDot done label="Edit" />
            <div className="w-8 h-px bg-emerald-400" />
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
        <div className="flex items-center gap-3 p-4 bg-emerald-50/40 border border-emerald-200/50 rounded-xl">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Globe className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground font-mono truncate">
              tenetbid.com/u/{vanitySlug}
            </p>
            <p className="text-xs text-emerald-700 font-medium">
              <CheckCircle className="h-3 w-3 inline mr-0.5" /> Live &amp; Shareable
            </p>
          </div>
          <Button size="sm" className="gap-1.5 text-xs rounded-xl h-9 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={copyLink}>
            {copied ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
        </div>

        {(tagline || description) && (
          <div className="p-3.5 bg-muted/30 rounded-xl space-y-1.5">
            {tagline && <p className="text-sm italic text-muted-foreground">&ldquo;{tagline}&rdquo;</p>}
            {description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{description}</p>}
          </div>
        )}

        {images.length > 0 && (
          <div className="p-3.5 bg-muted/30 rounded-xl">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ImageIcon className="h-3 w-3 text-emerald-500" />
              {images.length} {images.length === 1 ? 'Portfolio Image' : 'Portfolio Images'}
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {images.slice(0, 6).map((url, i) => (
                <div key={i} className="aspect-square rounded-md overflow-hidden bg-muted">
                  <img src={url} alt={`Portfolio ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button size="sm" variant="outline" className="gap-2 text-xs rounded-xl h-10 flex-1" onClick={() => { setPreviewKey((k) => k + 1); setPreviewLoading(true); setStep('preview'); }}>
            <Eye className="h-3.5 w-3.5" /> Preview Page
          </Button>
          <Button size="sm" variant="outline" className="gap-2 text-xs rounded-xl h-10 flex-1" onClick={() => { setTagline(profile.publicTagline || ''); setDescription(profile.publicDescription || ''); setStep('edit'); }}>
            <Edit2 className="h-3.5 w-3.5" /> Edit Content
          </Button>
          <Button size="sm" variant="outline" className="gap-2 text-xs rounded-xl h-10 flex-1 border-rose-300/60 text-rose-600 hover:bg-rose-50" onClick={unpublish} disabled={publishing}>
            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
            Unpublish
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2">
          <StepDot done label="URL" />
          <div className="w-8 h-px bg-emerald-400" />
          <StepDot done label="Edit" />
          <div className="w-8 h-px bg-emerald-400" />
          <StepDot done label="Preview" />
          <div className="w-8 h-px bg-emerald-400" />
          <StepDot done active label="Published" />
        </div>

        <p className="text-[10px] text-muted-foreground leading-relaxed text-center">
          Your portfolio is live and shareable. Share the link with clients and partners.
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
          ? 'bg-emerald-500 text-white'
          : active
            ? 'bg-emerald-500/20 text-emerald-600 ring-2 ring-emerald-500/40'
            : 'bg-muted text-muted-foreground'
      }`}>
        {done ? <CheckCircle className="h-3 w-3" /> : null}
      </div>
      <span className={`text-[9px] font-medium ${active ? 'text-emerald-600' : 'text-muted-foreground'}`}>{label}</span>
    </div>
  );
}
