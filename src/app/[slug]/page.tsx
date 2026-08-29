'use client';

import { useEffect, useState, use } from 'react';
import {
  ShieldCheck, FileText, Gavel, FolderKanban, ArrowRight, CheckCircle,
  Globe, MapPin, Building2, Users, Award, Clock, Banknote, Sparkles,
  Copy, Check, Star, TrendingUp, Trophy, Zap, Target, ExternalLink,
  Activity, Briefcase, Eye, ChevronRight, Crown, Medal, Gem,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// ── Types ──
interface TeamMember { fullName: string; jobTitle: string | null; profilePhoto: string | null; bio: string | null; skillTags: string; verified: boolean; }
interface PublicDoc { id: string; fileName: string; docType: string; createdAt: string; }
interface PublicTender { id: string; title: string; categoryTags: string; deadline: string; budgetMax: number; status: string; createdAt: string; }
interface PublicBid { id: string; status: string; financialProposal: number; createdAt: string; }
interface ActivityItem { type: string; label: string; date: string; }
interface EndorsementItem { skill: string; count: number; }
interface ScoreBreakdown { verified: number; profileCompleteness: number; documents: number; tenders: number; bids: number; projects: number; endorsements: number; }
interface CompanyData {
  name: string; industry: string; city: string | null; country: string;
  logoUrl: string | null; website: string | null; verified: boolean;
  vanitySlug: string; createdAt: string;
  teamMembers: TeamMember[]; teamSize: number;
  documents: PublicDoc[]; docCategories: Record<string, number>;
  tenders: PublicTender[]; tendersPublished: number;
  bids: PublicBid[]; bidsWon: number; bidsSubmitted: number;
  completedProjects: number; totalContractValue: number;
  topEndorsements: EndorsementItem[]; totalEndorsements: number;
  qualityScore: number; badge: 'platinum' | 'gold' | 'silver' | 'bronze' | 'new';
  scoreBreakdown: ScoreBreakdown;
  activityFeed: ActivityItem[];
  stats: { documents: number; tenders: number; projects: number; users: number; bids: number };
}

// ── Badge Config ──
const BADGE_CONFIG = {
  platinum: { label: 'Platinum', color: 'from-slate-200 to-slate-400 text-slate-900 border-slate-300', icon: Gem, glow: 'shadow-slate-300/50' },
  gold:     { label: 'Gold',     color: 'from-amber-300 to-yellow-500 text-amber-900 border-amber-400', icon: Crown, glow: 'shadow-amber-300/50' },
  silver:   { label: 'Silver',   color: 'from-gray-300 to-gray-400 text-gray-800 border-gray-400', icon: Medal, glow: 'shadow-gray-300/50' },
  bronze:   { label: 'Bronze',   color: 'from-orange-400 to-amber-600 text-orange-950 border-orange-500', icon: Trophy, glow: 'shadow-orange-300/50' },
  new:      { label: 'New',      color: 'from-muted to-muted-foreground/20 text-muted-foreground border-border', icon: Zap, glow: '' },
};

// ── Helpers ──
function DocTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'certificate': return <Award className="w-4 h-4 text-emerald-400" />;
    case 'business_license': return <ShieldCheck className="w-4 h-4 text-sky-400" />;
    case 'portfolio': return <FolderKanban className="w-4 h-4 text-amber-400" />;
    default: return <FileText className="w-4 h-4 text-muted-foreground" />;
  }
}
function DocTypeLabel({ type }: { type: string }) {
  const l: Record<string, string> = { certificate: 'Certificate', business_license: 'Business License', portfolio: 'Portfolio' };
  return <>{l[type] || type.replace(/_/g, ' ')}</>;
}
function formatDate(d: string) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return formatDate(d);
}
function formatCurrency(v: number) {
  if (v >= 1e6) return `ETB ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `ETB ${(v / 1e3).toFixed(0)}K`;
  return `ETB ${v.toLocaleString()}`;
}
function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case 'tender': return <Gavel className="w-3.5 h-3.5 text-sky-400" />;
    case 'bid': return <Target className="w-3.5 h-3.5 text-amber-400" />;
    case 'document': return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
    case 'project': return <FolderKanban className="w-3.5 h-3.5 text-purple-400" />;
    default: return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

// ── Score Breakdown Bar ──
function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
      </div>
      <span className="text-xs font-mono font-medium w-6 text-right">{value}</span>
    </div>
  );
}

// ── Main Page ──
export default function VanityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
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
    fetch(`/api/vanity/${slug}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading capability profile...</p>
        </div>
      </div>
    );
  }

  // ── 404 ──
  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Globe className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Page Not Found</h1>
          <p className="text-muted-foreground max-w-md">This company profile doesn&apos;t exist or is no longer available.</p>
          <Button asChild className="mt-4"><a href="/">Go to TenetBid</a></Button>
        </div>
      </div>
    );
  }

  const badgeCfg = BADGE_CONFIG[data.badge];
  const BadgeIcon = badgeCfg.icon;
  const winRate = data.bidsSubmitted > 0 ? Math.round((data.bidsWon / data.bidsSubmitted) * 100) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Background ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-slate-500/10 blur-[100px] animate-[float1_20s_ease-in-out_infinite]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-500/8 blur-[100px] animate-[float2_25s_ease-in-out_infinite]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:inline">TenetBid</span>
          </a>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={copyLink} className="hidden sm:flex gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Share'}
            </Button>
            <Button size="sm" className="gap-1.5 text-xs" asChild>
              <a href="/?signup=1">Get Started <ArrowRight className="w-3 h-3" /></a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 pb-24 w-full">
        {/* ════════════════════════════════════════════
            HERO: Company Identity + Quality Score
           ════════════════════════════════════════════ */}
        <section className="pt-10 sm:pt-16 pb-10">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Left: Company Identity */}
            <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
              <div className="flex items-center gap-4 mb-6">
                {data.logoUrl ? (
                  <img src={data.logoUrl} alt={data.name} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-border shadow-2xl" />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-border flex items-center justify-center shadow-2xl">
                    <Building2 className="w-9 h-9 sm:w-11 sm:h-11 text-primary" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap justify-center lg:justify-start">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{data.name}</h1>
                    {data.verified && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-400">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap justify-center lg:justify-start">
                    <Badge variant="secondary" className="text-[10px] font-medium">{data.industry}</Badge>
                    {(data.city || data.country) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[data.city, data.country].filter(Boolean).join(', ')}</span>}
                    {data.website && <a href={data.website.startsWith('http') ? data.website : `https://${data.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Globe className="w-3 h-3" />Website</a>}
                  </div>
                </div>
              </div>

              {/* Tagline */}
              <p className="text-sm text-muted-foreground max-w-md mb-6 italic">&ldquo;Proof of Work, Not Proof of Talk&rdquo;</p>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg">
                {[
                  { label: 'Documents', value: data.stats.documents, icon: FileText, color: 'text-sky-400' },
                  { label: 'Tenders', value: data.tendersPublished, icon: Gavel, color: 'text-amber-400' },
                  { label: 'Projects', value: data.completedProjects, icon: FolderKanban, color: 'text-purple-400' },
                  { label: 'Team', value: data.teamSize, icon: Users, color: 'text-emerald-400' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-3 text-center">
                    <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                    <div className="text-xl font-bold">{s.value}</div>
                    <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-2 mt-6">
                <Button size="lg" className="gap-2" asChild><a href="/?signup=1"><Sparkles className="w-4 h-4" />Build Your Profile</a></Button>
                <Button size="lg" variant="outline" className="gap-2" asChild><a href="/">Explore Tenders<ArrowRight className="w-4 h-4" /></a></Button>
              </div>
            </div>

            {/* Right: Quality Score Card */}
            <div className="w-full lg:w-80 shrink-0">
              <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 relative overflow-hidden">
                {/* Decorative glow */}
                <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[60px] pointer-events-none ${badgeCfg.glow} opacity-30`} />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quality Score</span>
                    <button
                      onClick={() => setShowBreakdown(!showBreakdown)}
                      className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      <Eye className="w-3 h-3" /> {showBreakdown ? 'Hide' : 'Why?'}
                    </button>
                  </div>

                  {/* Score Ring */}
                  <div className="flex flex-col items-center mb-4">
                    <div className={`relative w-28 h-28 rounded-full bg-gradient-to-br ${badgeCfg.color} border-2 flex items-center justify-center shadow-lg ${badgeCfg.glow}`}>
                      <span className="text-4xl font-black">{data.qualityScore}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-gradient-to-r ${badgeCfg.color} border text-xs font-bold`}>
                      <BadgeIcon className="w-3.5 h-3.5" /> {badgeCfg.label}
                    </div>
                  </div>

                  {/* Score Breakdown (Glass Box) */}
                  {showBreakdown && (
                    <div className="space-y-2.5 pt-4 border-t border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-3">Score Breakdown</p>
                      <ScoreBar label="Verified" value={data.scoreBreakdown.verified} max={15} color="bg-emerald-500" />
                      <ScoreBar label="Profile" value={data.scoreBreakdown.profileCompleteness} max={20} color="bg-sky-500" />
                      <ScoreBar label="Documents" value={data.scoreBreakdown.documents} max={20} color="bg-amber-500" />
                      <ScoreBar label="Tenders" value={data.scoreBreakdown.tenders} max={15} color="bg-purple-500" />
                      <ScoreBar label="Bids" value={data.scoreBreakdown.bids} max={10} color="bg-orange-500" />
                      <ScoreBar label="Projects" value={data.scoreBreakdown.projects} max={10} color="bg-pink-500" />
                      <ScoreBar label="Endorsements" value={data.scoreBreakdown.endorsements} max={10} color="bg-teal-500" />
                    </div>
                  )}

                  {/* Win Rate */}
                  {data.bidsSubmitted > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Win Rate</span>
                        <span className="font-bold text-emerald-400">{winRate}%</span>
                      </div>
                      <Progress value={winRate} className="h-2" />
                      <p className="text-[10px] text-muted-foreground mt-1">{data.bidsWon} won of {data.bidsSubmitted} bids</p>
                    </div>
                  )}

                  {/* Contract Value */}
                  {data.totalContractValue > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-2 text-xs">
                        <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-muted-foreground">Total Contract Value:</span>
                        <span className="font-bold">{formatCurrency(data.totalContractValue)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════
            CAPABILITY STATEMENT
           ════════════════════════════════════════════ */}
        {data.teamMembers.length > 0 && (
          <section className="py-10 border-t border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-sky-500/10"><Users className="w-4 h-4 text-sky-400" /></div>
              <div>
                <h2 className="text-lg font-bold">Team & Expertise</h2>
                <p className="text-xs text-muted-foreground">The people behind the work</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.teamMembers.map((m, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4">
                  {m.profilePhoto ? (
                    <img src={m.profilePhoto} alt={m.fullName} className="w-12 h-12 rounded-full object-cover border-2 border-border shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                      <span className="text-base font-bold text-primary">{m.fullName.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold truncate">{m.fullName}</span>
                      {m.verified && <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />}
                    </div>
                    {m.jobTitle && <p className="text-xs text-muted-foreground">{m.jobTitle}</p>}
                    {m.skillTags && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {m.skillTags.split(',').slice(0, 4).filter(Boolean).map((s) => (
                          <span key={s} className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground">{s.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════
            CREDENTIALS & DOCUMENTS
           ════════════════════════════════════════════ */}
        {data.documents.length > 0 && (
          <section className="py-10 border-t border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-emerald-500/10"><FileText className="w-4 h-4 text-emerald-400" /></div>
              <div>
                <h2 className="text-lg font-bold">Credentials & Documents</h2>
                <p className="text-xs text-muted-foreground">Verified by AI • Transparent & Auditable</p>
              </div>
            </div>
            {/* Category Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {data.docCategories.business_license > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs"><ShieldCheck className="w-3 h-3 text-sky-400" />{data.docCategories.business_license} License{data.docCategories.business_license > 1 ? 's' : ''}</span>
              )}
              {data.docCategories.certificate > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs"><Award className="w-3 h-3 text-emerald-400" />{data.docCategories.certificate} Certificate{data.docCategories.certificate > 1 ? 's' : ''}</span>
              )}
              {data.docCategories.portfolio > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs"><FolderKanban className="w-3 h-3 text-amber-400" />{data.docCategories.portfolio} Portfolio Item{data.docCategories.portfolio > 1 ? 's' : ''}</span>
              )}
            </div>
            {/* Doc List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.documents.slice(0, 9).map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-3.5">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><DocTypeIcon type={doc.docType} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{doc.fileName}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <DocTypeLabel type={doc.docType} /><span>·</span><span>{formatDate(doc.createdAt)}</span>
                    </div>
                  </div>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════
            ENDORSEMENTS (Stars / GitHub Forks equivalent)
           ════════════════════════════════════════════ */}
        {data.topEndorsements.length > 0 && (
          <section className="py-10 border-t border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-amber-500/10"><Star className="w-4 h-4 text-amber-400" /></div>
              <div>
                <h2 className="text-lg font-bold">Endorsements</h2>
                <p className="text-xs text-muted-foreground">{data.totalEndorsements} endorsement{data.totalEndorsements !== 1 ? 's' : ''} from the community</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.topEndorsements.map((e) => (
                <div key={e.skill} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-card/50">
                  <span className="text-xs font-medium">{e.skill}</span>
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />{e.count}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════
            RECENT ACTIVITY (Commit History equivalent)
           ════════════════════════════════════════════ */}
        {data.activityFeed.length > 0 && (
          <section className="py-10 border-t border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-500/10"><Activity className="w-4 h-4 text-purple-400" /></div>
              <div>
                <h2 className="text-lg font-bold">Activity</h2>
                <p className="text-xs text-muted-foreground">Recent actions and contributions</p>
              </div>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {data.activityFeed.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-card/30 hover:bg-card/60 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0"><ActivityIcon type={item.type} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{item.label}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(item.date)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════
            PUBLISHED TENDERS
           ════════════════════════════════════════════ */}
        {data.tenders.length > 0 && (
          <section className="py-10 border-t border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-amber-500/10"><Gavel className="w-4 h-4 text-amber-400" /></div>
              <div>
                <h2 className="text-lg font-bold">Tenders</h2>
                <p className="text-xs text-muted-foreground">{data.tendersPublished} published</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.tenders.slice(0, 6).map((t) => (
                <div key={t.id} className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold leading-snug line-clamp-2">{t.title}</h3>
                    {t.status === 'awarded' && <Badge className="shrink-0 text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Awarded</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    {t.deadline && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(t.deadline)}</span>}
                    {t.budgetMax > 0 && <span className="flex items-center gap-1"><Banknote className="w-3 h-3" />{formatCurrency(t.budgetMax)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════
            BOTTOM CTA — The Growth Engine
           ════════════════════════════════════════════ */}
        <section className="py-14">
          <div className="relative rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/5 p-8 sm:p-12 text-center overflow-hidden">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/10 blur-[60px] pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-orange-500/10 blur-[40px] pointer-events-none" />
            <div className="relative z-10">
              <Badge variant="outline" className="mb-4 text-xs">The GitHub for Procurement</Badge>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                Your Quality Score Is Your New Resume
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8 text-sm sm:text-base">
                {data.name} uses TenetBid to prove their capability, win tenders, and build a public record of performance.
                Stop begging for tenders. Let your data speak.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" className="gap-2" asChild><a href="/?signup=1">Create Your Supplier Passport <ArrowRight className="w-4 h-4" /></a></Button>
                <Button size="lg" variant="outline" className="gap-2" asChild><a href="/">Explore the Ecosystem</a></Button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" />Glass Box AI</span>
                <span className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-sky-400" />Quality Scores</span>
                <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-400" />Smart Matching</span>
                <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-purple-400" />Community Endorsements</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 bg-background/80 backdrop-blur-xl mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <span className="text-white font-bold text-[9px]">T</span>
            </div>
            <span>&copy; {new Date().getFullYear()} TenetBid — The GitHub for Procurement</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="hover:text-foreground transition-colors">Home</a>
            <a href="/" className="hover:text-foreground transition-colors">Tenders</a>
            <a href="/?signup=1" className="hover:text-foreground transition-colors">Get Your Free Site</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
