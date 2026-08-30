'use client';

import { useEffect, useState, use, useCallback } from 'react';
import {
  ShieldCheck, FileText, FileSearch, Gavel, FolderKanban, ArrowRight,
  CheckCircle, MapPin, Building2, Users, Award, Clock, Banknote, Sparkles,
  Copy, Check, ExternalLink, Share2, Info, UserCircle, FileCheck,
  Crown, Medal, Gem, Trophy, Zap, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ── Types ──
interface TeamMember {
  fullName: string;
  jobTitle: string | null;
  profilePhoto: string | null;
  bio: string | null;
  skillTags: string | null;
  verified: boolean;
}

interface PublicDoc {
  id: string;
  fileName: string;
  docType: string;
  createdAt: string;
}

interface PublicTender {
  id: string;
  title: string;
  categoryTags: string;
  deadline: string | null;
  budgetMax: number | null;
  status: string;
  createdAt: string;
}

interface ScoreBreakdown {
  verified: number;
  profileCompleteness: number;
  documents: number;
  tenders: number;
  bids: number;
  projects: number;
  endorsements: number;
}

interface CompanyData {
  name: string;
  industry: string;
  city: string | null;
  country: string;
  logoUrl: string | null;
  website: string | null;
  verified: boolean;
  vanitySlug: string;
  isPublished: boolean;
  publicTagline: string | null;
  publicDescription: string | null;
  isPreview: boolean;
  teamMembers: TeamMember[];
  documents: PublicDoc[];
  docCategories: { business_license: number; certificate: number; portfolio: number; other: number };
  tenders: PublicTender[];
  bidsWon: number;
  bidsSubmitted: number;
  completedProjects: number;
  totalContractValue: number;
  topEndorsements: Array<{ skill: string; count: number }>;
  totalEndorsements: number;
  qualityScore: number;
  badge: string;
  scoreBreakdown: ScoreBreakdown;
  activityFeed: Array<{ type: string; label: string; date: string }>;
  stats: { documents: number; tenders: number; projects: number; users: number; bids: number };
}

// ── Badge Config ──
const BADGE_CONFIG: Record<string, { label: string; gradient: string; icon: typeof Gem }> = {
  platinum: { label: 'Platinum', gradient: 'from-slate-300 to-slate-500', icon: Gem },
  gold:     { label: 'Gold',     gradient: 'from-amber-300 to-yellow-500', icon: Crown },
  silver:   { label: 'Silver',   gradient: 'from-gray-300 to-gray-400', icon: Medal },
  bronze:   { label: 'Bronze',   gradient: 'from-orange-400 to-amber-600', icon: Trophy },
  new:      { label: 'New',      gradient: 'from-gray-300 to-gray-400', icon: Zap },
};

// ── Helpers ──
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(v: number) {
  if (v >= 1e6) return `ETB ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `ETB ${(v / 1e3).toFixed(0)}K`;
  return `ETB ${v.toLocaleString()}`;
}

function DocTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'certificate':      return <Award className="w-5 h-5 text-emerald-500" />;
    case 'business_license': return <ShieldCheck className="w-5 h-5 text-sky-500" />;
    case 'portfolio':        return <FolderKanban className="w-5 h-5 text-amber-500" />;
    default:                 return <FileText className="w-5 h-5 text-muted-foreground" />;
  }
}

function DocTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    certificate: 'Certificate',
    business_license: 'Business License',
    portfolio: 'Portfolio',
  };
  return <>{labels[type] || type.replace(/_/g, ' ')}</>;
}

function tenderStatusStyle(status: string) {
  switch (status) {
    case 'awarded':   return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'published': return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'closed':    return 'bg-gray-100 text-gray-500 border-gray-200';
    default:          return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

// ── Circular SVG Score Gauge ──
function ScoreGauge({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="vanityScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#f5f5f4" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke="url(#vanityScoreGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center">
        <span className="text-5xl font-black tracking-tight text-foreground">{score}</span>
        <span className="text-sm text-muted-foreground font-medium">/100</span>
      </div>
    </div>
  );
}

// ── Score Breakdown Bar ──
function BreakdownBar({ icon: Icon, label, value, max }: { icon: typeof ShieldCheck; label: string; value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="w-3.5 h-3.5 text-orange-500" />
          {label}
        </span>
        <span className="text-xs font-semibold tabular-nums">{value}/{max}</span>
      </div>
      <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main Page ──
export default function VanityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params as Promise<{ slug: string }>);
  const [data, setData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(false);
    const previewParam = new URLSearchParams(window.location.search).get('preview');
    const url = `/api/vanity/${slug}${previewParam === 'true' ? '?preview=true' : ''}`;
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  const copyProfileLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href.replace(/[?&]preview=true/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const nativeShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: `${data?.name} on TenetBid`,
        text: `View ${data?.name}'s verified capability profile on TenetBid`,
        url: window.location.href.replace(/[?&]preview=true/, ''),
      }).catch(() => { /* user cancelled */ });
    } else {
      copyProfileLink();
    }
  }, [data, copyProfileLink]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading profile&hellip;</p>
        </div>
      </div>
    );
  }

  // ── 404 ──
  if (error || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mx-auto">
            <Building2 className="w-10 h-10 text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Page Not Found</h1>
          <p className="text-muted-foreground max-w-md">This company profile doesn&apos;t exist or is no longer available.</p>
          <Button asChild className="mt-4 bg-orange-500 hover:bg-orange-600 text-white">
            <a href="/">Go to TenetBid</a>
          </Button>
        </div>
      </div>
    );
  }

  const badgeCfg = BADGE_CONFIG[data.badge] || BADGE_CONFIG.new;
  const BadgeIcon = badgeCfg.icon;
  const winRate = data.bidsSubmitted > 0 ? Math.round((data.bidsWon / data.bidsSubmitted) * 100) : 0;

  return (
    <div className="min-h-screen bg-white text-foreground flex flex-col">
      {/* ════════════════════════════════════════
          1. DRAFT PREVIEW BANNER (conditional)
         ════════════════════════════════════════ */}
      {data.isPreview && (
        <div className="sticky top-0 z-[60] bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-center gap-2 text-sm font-medium">
            <Info className="w-4 h-4 shrink-0" />
            <span>DRAFT PREVIEW &mdash; This profile is not yet published</span>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          2. HEADER / NAV
         ════════════════════════════════════════ */}
      <header className={`sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/60 ${data.isPreview ? 'top-[41px]' : 'top-0'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">TenetBid</span>
          </a>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={nativeShare}
              className="hidden sm:flex gap-1.5 text-sm border-gray-200 hover:border-orange-300 hover:text-orange-600"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Share'}
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/20"
              asChild
            >
              <a href="/?signup=1">Get Started</a>
            </Button>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════
          3. HERO — Company Identity + Quality Score
         ════════════════════════════════════════ */}
      <main className="flex-1 w-full">
        <section className="relative overflow-hidden">
          {/* Subtle background gradient */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-orange-100/60 blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-amber-100/40 blur-[80px] pointer-events-none" />
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-12">
            <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
              {/* ── Left Column: Company Identity ── */}
              <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left animate-[fadeIn_0.3s_ease-out]">
                {/* Logo + Name */}
                <div className="flex items-start gap-4 sm:gap-5 mb-5">
                  {data.logoUrl ? (
                    <img
                      src={data.logoUrl}
                      alt={data.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-gray-200 shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                      <Building2 className="w-9 h-9 sm:w-11 sm:h-11 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center gap-2 flex-wrap justify-center lg:justify-start">
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        {data.name}
                      </h1>
                      {data.verified && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-700">
                          <ShieldCheck className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground flex-wrap justify-center lg:justify-start">
                      <Badge variant="outline" className="text-xs font-medium border-gray-300 text-gray-600">
                        {data.industry}
                      </Badge>
                      {(data.city || data.country) && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5" />
                          {[data.city, data.country].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                    {data.website && (
                      <a
                        href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 hover:underline w-fit"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Website
                      </a>
                    )}
                  </div>
                </div>

                {/* Tagline */}
                {data.publicTagline && (
                  <p className="text-sm text-muted-foreground italic mb-2">&ldquo;{data.publicTagline}&rdquo;</p>
                )}
                {data.publicDescription && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-7 max-w-lg">{data.publicDescription}</p>
                )}
                {!data.publicTagline && !data.publicDescription && (
                  <p className="text-sm text-muted-foreground italic mb-7">Proof of Work, Not Proof of Talk</p>
                )}

                {/* Stat Cards 2x2 Grid */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                  {[
                    { icon: FileText, label: 'Documents', value: data.stats.documents, color: 'text-sky-500', bg: 'bg-sky-50' },
                    { icon: FileSearch, label: 'Tenders', value: data.stats.tenders, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { icon: FolderKanban, label: 'Projects', value: data.stats.projects, color: 'text-purple-500', bg: 'bg-purple-50' },
                    { icon: Users, label: 'Team Size', value: data.stats.users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-2xl border border-gray-100 bg-white p-4 flex items-center gap-3 shadow-sm"
                    >
                      <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                        <s.icon className={`w-5 h-5 ${s.color}`} />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-foreground leading-none">{s.value}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Right Column: Quality Score Card ── */}
              <div className="w-full lg:w-[380px] shrink-0 animate-[fadeIn_0.4s_ease-out]">
                <div className="rounded-2xl border border-gray-100 bg-white shadow-lg p-6 relative overflow-hidden">
                  {/* Decorative glow */}
                  <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-orange-200/40 blur-[60px] pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Quality Score
                      </span>
                      <button
                        onClick={() => setShowBreakdown(!showBreakdown)}
                        className="flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors"
                      >
                        {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {showBreakdown ? 'Hide' : 'Why this score?'}
                      </button>
                    </div>

                    {/* Score Gauge */}
                    <div className="flex flex-col items-center mb-5">
                      <ScoreGauge score={data.qualityScore} />
                      <div
                        className={`flex items-center gap-1.5 mt-4 px-3.5 py-1.5 rounded-full bg-gradient-to-r ${badgeCfg.gradient} border border-white/30 text-xs font-bold text-white shadow-sm`}
                      >
                        <BadgeIcon className="w-3.5 h-3.5" />
                        {badgeCfg.label}
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    {showBreakdown && (
                      <div className="space-y-3 pt-5 border-t border-gray-100 animate-[fadeIn_0.2s_ease-out]">
                        <BreakdownBar icon={ShieldCheck} label="Verified" value={data.scoreBreakdown.verified} max={15} />
                        <BreakdownBar icon={Sparkles} label="Profile" value={data.scoreBreakdown.profileCompleteness} max={20} />
                        <BreakdownBar icon={FileText} label="Documents" value={data.scoreBreakdown.documents} max={20} />
                        <BreakdownBar icon={FileSearch} label="Tenders" value={data.scoreBreakdown.tenders} max={15} />
                        <BreakdownBar icon={Gavel} label="Bids" value={data.scoreBreakdown.bids} max={10} />
                        <BreakdownBar icon={FolderKanban} label="Projects" value={data.scoreBreakdown.projects} max={10} />
                        <BreakdownBar icon={Award} label="Endorsements" value={data.scoreBreakdown.endorsements} max={10} />
                      </div>
                    )}

                    {/* Win Rate */}
                    {data.bidsSubmitted > 0 && (
                      <div className="mt-5 pt-5 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-muted-foreground font-medium">Win Rate</span>
                          <span className="font-bold text-orange-600">{winRate}%</span>
                        </div>
                        <div className="h-2.5 bg-orange-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-700"
                            style={{ width: `${winRate}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          {data.bidsWon} won of {data.bidsSubmitted} bids
                        </p>
                      </div>
                    )}

                    {/* Total Contract Value */}
                    {data.totalContractValue > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-sm">
                          <Banknote className="w-4 h-4 text-emerald-500" />
                          <span className="text-muted-foreground">Total Contract Value:</span>
                          <span className="font-bold text-foreground">{formatCurrency(data.totalContractValue)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            4. TEAM & EXPERTISE
           ════════════════════════════════════════ */}
        {data.teamMembers.length > 0 && (
          <section className="py-14 border-t border-gray-100 animate-[fadeIn_0.3s_ease-out]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex items-center gap-2.5 mb-7">
                <div className="p-2 rounded-lg bg-orange-50">
                  <Users className="w-5 h-5 text-orange-500" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Team & Expertise</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.teamMembers.map((m, i) => {
                  const skills = m.skillTags ? m.skillTags.split(',').slice(0, 4).filter(Boolean).map(s => s.trim()) : [];
                  return (
                    <div
                      key={i}
                      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3.5 mb-3">
                        {m.profilePhoto ? (
                          <img
                            src={m.profilePhoto}
                            alt={m.fullName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-100 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center shrink-0">
                            <UserCircle className="w-7 h-7 text-orange-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-foreground truncate">{m.fullName}</span>
                            {m.verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                          </div>
                          {m.jobTitle && (
                            <p className="text-xs text-muted-foreground truncate">{m.jobTitle}</p>
                          )}
                        </div>
                      </div>
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {skills.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded-md bg-orange-50 text-[11px] font-medium text-orange-700 border border-orange-100"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
            5. CREDENTIALS & DOCUMENTS
           ════════════════════════════════════════ */}
        {data.documents.length > 0 && (
          <section className="py-14 border-t border-gray-100 animate-[fadeIn_0.3s_ease-out]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-lg bg-emerald-50">
                  <FileCheck className="w-5 h-5 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Credentials & Documents</h2>
              </div>

              {/* Category Summary Badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                {data.docCategories.business_license > 0 && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-xs font-medium text-sky-700">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {data.docCategories.business_license} Business License{data.docCategories.business_license > 1 ? 's' : ''}
                  </span>
                )}
                {data.docCategories.certificate > 0 && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
                    <Award className="w-3.5 h-3.5" />
                    {data.docCategories.certificate} Certificate{data.docCategories.certificate > 1 ? 's' : ''}
                  </span>
                )}
                {data.docCategories.portfolio > 0 && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700">
                    <FolderKanban className="w-3.5 h-3.5" />
                    {data.docCategories.portfolio} Portfolio
                  </span>
                )}
              </div>

              {/* Document Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.documents.slice(0, 9).map((doc) => (
                  <div
                    key={doc.id}
                    className="relative flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                      <DocTypeIcon type={doc.docType} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{doc.fileName}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <DocTypeLabel type={doc.docType} />
                        <span className="text-gray-300">·</span>
                        <span>{formatDate(doc.createdAt)}</span>
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  </div>
                ))}
              </div>

              {/* +X more */}
              {data.documents.length > 9 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  +{data.documents.length - 9} more document{data.documents.length - 9 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
            6. RECENT TENDERS
           ════════════════════════════════════════ */}
        {data.tenders.length > 0 && (
          <section className="py-14 border-t border-gray-100 animate-[fadeIn_0.3s_ease-out]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex items-center gap-2.5 mb-7">
                <div className="p-2 rounded-lg bg-amber-50">
                  <FileSearch className="w-5 h-5 text-amber-500" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Recent Tenders</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.tenders.slice(0, 6).map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground">
                        {t.title}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${tenderStatusStyle(t.status)}`}>
                        {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                      </span>
                      {t.deadline && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(t.deadline)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* +X more */}
              {data.tenders.length > 6 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  +{data.tenders.length - 6} more tender{data.tenders.length - 6 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
            7. SHARE CTA SECTION
           ════════════════════════════════════════ */}
        <section className="py-14">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="relative rounded-2xl border border-orange-200/60 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/60 p-8 sm:p-12 text-center overflow-hidden shadow-sm">
              {/* Gradient border glow */}
              <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-orange-200/40 blur-[60px] pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-amber-200/30 blur-[50px] pointer-events-none" />

              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                  View {data.name} on TenetBid
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto mb-8 text-sm sm:text-base">
                  Quality scores, verified credentials, and transparent performance metrics.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    size="lg"
                    className="gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 text-base"
                    onClick={nativeShare}
                  >
                    <Share2 className="w-5 h-5" />
                    {copied ? 'Link Copied!' : 'Share this Profile'}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 border-gray-200 text-muted-foreground hover:text-foreground hover:border-gray-300"
                    asChild
                  >
                    <a href="/?signup=1">Create Your Own Profile</a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ════════════════════════════════════════
          8. FOOTER
         ════════════════════════════════════════ */}
      <footer className="border-t border-gray-100 bg-white mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">T</span>
            </div>
            <span className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} TenetBid
            </span>
          </div>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <a href="/" className="hover:text-foreground transition-colors">Home</a>
            <a href="/tenders" className="hover:text-foreground transition-colors">Tenders</a>
            <a href="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</a>
          </div>
        </div>
      </footer>

      {/* ── Inline Toast for copy feedback ── */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg animate-[fadeIn_0.2s_ease-out]">
          Link copied!
        </div>
      )}
    </div>
  );
}
