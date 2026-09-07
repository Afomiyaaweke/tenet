'use client';

import { use, useEffect, useState } from 'react';
import {
  Globe2, FileSearch, Banknote, Calendar, MapPin, Building2, Tag,
  ExternalLink, Share2, Check, ChevronLeft, Eye, Loader2,
  ShieldCheck, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

interface SharedTender {
  kind: 'tender' | 'live';
  title: string;
  scope: string;
  budgetMin: number;
  budgetMax: number;
  deadline: string | null;
  location: string;
  categoryTags: string;
  status: string;
  externalUrl: string | null;
  externalSource: string;
  currency: string;
  borrower?: string | null;
  supplier?: string | null;
  contractType?: string | null;
  region?: string | null;
  documentUrl?: string | null;
  documentFiles?: Array<{ name?: string; url?: string }>;
  views: number;
  sharedAt: string;
}

const SOURCE_LABELS: Record<string, string> = {
  worldbank: 'World Bank',
  eu_ted: 'EU TED',
  ungm: 'UNGM',
  sam_gov: 'SAM.gov',
  afdb: 'African Dev. Bank',
  TenetBid: 'TenetBid',
};

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const d = new Date(deadline).getTime();
  if (Number.isNaN(d)) return null;
  return Math.ceil((d - Date.now()) / 86_400_000);
}

function formatBudget(min: number, max: number, currency: string) {
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (min && max && min !== max) return `${currency} ${fmt(min)} – ${fmt(max)}`;
  if (max) return `${currency} ${fmt(max)}`;
  if (min) return `${currency} ${fmt(min)}`;
  return null;
}

function MetaRow({ icon: Icon, label, value }: { icon: typeof Banknote; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

export default function SharedTenderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [tender, setTender] = useState<SharedTender | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/share/tender/${encodeURIComponent(slug)}`);
        const json = await res.json();
        if (!alive) return;
        if (json.success) setTender(json.data);
        else setNotFound(true);
      } catch {
        if (alive) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  const shareLink = typeof window !== 'undefined' ? window.location.href : '';

  const copyLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: tender?.title || 'Tender', url: shareLink });
        return;
      }
    } catch { /* user cancelled — fall through to clipboard */ }
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const days = daysUntil(tender?.deadline ?? null);
  const budget = tender ? formatBudget(tender.budgetMin, tender.budgetMax, tender.currency || 'USD') : null;
  const sourceLabel = tender
    ? (SOURCE_LABELS[tender.externalSource] || tender.externalSource || 'Unknown source')
    : '';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/marketplace" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Globe2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-foreground">TenetBid</span>
          </a>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-full" onClick={copyLink}>
            {copied ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied</> : <><Share2 className="w-3.5 h-3.5" /> Share</>}
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        {loading && (
          <div className="space-y-5 animate-pulse">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {notFound && (
          <div className="text-center py-20">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <FileSearch className="h-7 w-7 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Share link not found</h1>
            <p className="text-sm text-muted-foreground mb-6">
              This tender share link may have been removed or never existed.
            </p>
            <Button className="gap-2 gradient-emerald hover:opacity-90 text-white" asChild>
              <a href="/marketplace"><Globe2 className="w-4 h-4" /> Browse Proforma</a>
            </Button>
          </div>
        )}

        {tender && !loading && (
          <div className="space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <a href="/marketplace" className="hover:text-foreground transition-colors flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> TenetBid
              </a>
              <span>·</span>
              <span>Shared Tender</span>
            </nav>

            {/* Title block */}
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Badge variant="outline" className="text-[11px] gap-1.5 border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="w-3 h-3" /> {sourceLabel}
                </Badge>
                <Badge variant="outline" className="text-[11px] text-muted-foreground capitalize">
                  {tender.status === 'awarded' ? 'Contract Award' : 'Open Notice'}
                </Badge>
                {days !== null && days > 0 && (
                  <Badge variant="outline" className="text-[11px] text-amber-600 dark:text-amber-400">
                    Closes in {days} day{days === 1 ? '' : 's'}
                  </Badge>
                )}
                {days !== null && days <= 0 && (
                  <Badge variant="outline" className="text-[11px] text-red-500">Deadline passed</Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                {tender.title}
              </h1>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {tender.views} view{tender.views === 1 ? '' : 's'}</span>
                <span>Shared {new Date(tender.sharedAt).toLocaleDateString()}</span>
              </div>
            </div>

            <Separator />

            {/* Meta grid */}
            <div className="grid sm:grid-cols-2 gap-x-8">
              <MetaRow icon={Banknote} label="Budget" value={budget || 'Not disclosed'} />
              <MetaRow icon={Calendar} label="Deadline" value={tender.deadline ? new Date(tender.deadline).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not specified'} />
              <MetaRow icon={MapPin} label="Location" value={tender.location || (tender.region || '')} />
              <MetaRow icon={Building2} label="Borrower / Buyer" value={tender.borrower || tender.supplier || ''} />
              {tender.contractType && <MetaRow icon={FileSearch} label="Contract Type" value={tender.contractType} />}
              {tender.categoryTags && <MetaRow icon={Tag} label="Category" value={tender.categoryTags} />}
            </div>

            {/* Description */}
            {tender.scope && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground mb-2">Tender Description</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{tender.scope}</p>
              </div>
            )}

            {/* Documents */}
            {tender.documentFiles && tender.documentFiles.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">Documents</h2>
                <ul className="space-y-2">
                  {tender.documentFiles.map((f, i) => (
                    <li key={i}>
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" /> {f.name || `Document ${i + 1}`}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Original source link */}
            {tender.externalUrl && (
              <a
                href={tender.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                    <ExternalLink className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">View on {sourceLabel}</p>
                    <p className="text-xs text-muted-foreground">Original notice at the source portal</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
              </a>
            )}

            {/* CTA */}
            <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-6 text-center">
              <h2 className="text-lg font-bold mb-1">Want to bid on tenders like this?</h2>
              <p className="text-sm text-emerald-50 mb-4">Join TenetBid to discover opportunities, prepare documents, and submit bids.</p>
              <Button className="bg-white text-emerald-700 hover:bg-emerald-50 gap-2" asChild>
                <a href="/?signup=1">Get Started Free <ArrowRight className="w-4 h-4" /></a>
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-5 mt-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} TenetBid</span>
          <div className="flex items-center gap-4">
            <a href="/" className="hover:text-foreground transition-colors">Home</a>
            <a href="/marketplace" className="hover:text-foreground transition-colors">Proforma</a>
            <a href="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</a>
            <a href="/?signup=1" className="hover:text-foreground transition-colors">Sign Up</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
