'use client';

import { useEffect, useState, use, useCallback } from 'react';
import {
  ShieldCheck, MapPin, Briefcase, CheckCircle, Sparkles, Award,
  Copy, Check, ExternalLink, Share2, Info, UserCircle, Image as ImageIcon,
  Crown, Medal, Gem, Trophy, Zap, Store, MessageSquare, Gavel,
  Calendar, TrendingUp, ArrowRight, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ── Types ──
interface PortfolioListing {
  id: string;
  productName: string;
  description: string;
  category: string;
  unitPrice: number;
  currency: string;
  city: string;
  country: string;
  imageUrls: string;
  createdAt: string;
}

interface SocialPostSummary {
  id: string;
  content: string;
  imageUrls: string[];
  createdAt: string;
  reactionCount: number;
}

interface ActivityItem {
  type: string;
  label: string;
  date: string;
}

interface ProfileData {
  fullName: string;
  jobTitle: string | null;
  location: string | null;
  profilePhoto: string | null;
  bio: string | null;
  skills: string[];
  verified: boolean;
  accountType: string;
  vanitySlug: string;
  isPublished: boolean;
  publicTagline: string | null;
  publicDescription: string | null;
  isPreview: boolean;
  memberSince: string;
  portfolioImages: string[];
  listings: PortfolioListing[];
  listingsCount: number;
  socialPosts: SocialPostSummary[];
  bidsSubmitted: number;
  bidsWon: number;
  topEndorsements: Array<{ skill: string; count: number }>;
  totalEndorsements: number;
  qualityScore: number;
  badge: string;
  activityFeed: ActivityItem[];
}

// ── Badge Config ──
const BADGE_CONFIG: Record<string, { label: string; gradient: string; icon: typeof Gem }> = {
  platinum: { label: 'Platinum', gradient: 'from-slate-300 to-slate-500', icon: Gem },
  gold:     { label: 'Gold',     gradient: 'from-amber-300 to-yellow-500', icon: Crown },
  silver:   { label: 'Silver',   gradient: 'from-gray-300 to-gray-400', icon: Medal },
  bronze:   { label: 'Bronze',   gradient: 'from-orange-400 to-amber-600', icon: Trophy },
  new:      { label: 'New',      gradient: 'from-gray-300 to-gray-400', icon: Zap },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPrice(price: number, currency: string) {
  if (!price) return `${currency} —`;
  if (price >= 1e6) return `${currency} ${(price / 1e6).toFixed(1)}M`;
  if (price >= 1e3) return `${currency} ${(price / 1e3).toFixed(0)}K`;
  return `${currency} ${price.toLocaleString()}`;
}

// ── Circular SVG Score Gauge ──
function ScoreGauge({ score }: { score: number }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="profileScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#f5f5f4" strokeWidth="9" />
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke="url(#profileScoreGrad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center">
        <span className="text-4xl font-black tracking-tight text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground font-medium">/100</span>
      </div>
    </div>
  );
}

// ── Main Page ──
export default function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params as Promise<{ slug: string }>);
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(false);
    const previewParam = new URLSearchParams(window.location.search).get('preview');
    const url = `/api/profiles/public/${slug}${previewParam === 'true' ? '?preview=true' : ''}`;
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
        title: `${data?.fullName} on TenetBid`,
        text: `View ${data?.fullName}'s profile on TenetBid`,
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
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
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
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
            <UserCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Profile Not Found</h1>
          <p className="text-muted-foreground max-w-md">This person&apos;s profile doesn&apos;t exist or isn&apos;t published yet.</p>
          <Button asChild className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white">
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
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-center gap-2 text-sm font-medium">
            <Info className="w-4 h-4 shrink-0" />
            <span>DRAFT PREVIEW &mdash; This profile is not yet published</span>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          2. HEADER / NAV
         ════════════════════════════════════════ */}
      <header className={`sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/60 ${data.isPreview ? 'top-[41px]' : 'top-0'}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">TenetBid</span>
          </a>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={nativeShare}
              className="hidden sm:flex gap-1.5 text-sm border-gray-200 hover:border-emerald-300 hover:text-emerald-600"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Share'}
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20"
              asChild
            >
              <a href="/?signup=1">Get Started</a>
            </Button>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════
          3. HERO — Identity + Quality Score
         ════════════════════════════════════════ */}
      <main className="flex-1 w-full">
        <section className="relative overflow-hidden">
          {/* Subtle background gradient */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-emerald-100/60 blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-teal-100/40 blur-[80px] pointer-events-none" />
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-12">
            <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
              {/* ── Left Column: Identity ── */}
              <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left animate-[fadeIn_0.3s_ease-out]">
                {/* Photo + Name */}
                <div className="flex items-start gap-4 sm:gap-5 mb-5">
                  {data.profilePhoto ? (
                    <img
                      src={data.profilePhoto}
                      alt={data.fullName}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-gray-200 shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <span className="text-white font-bold text-4xl">
                        {data.fullName?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 pt-1 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        {data.fullName}
                      </h1>
                      {data.verified && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-700">
                          <ShieldCheck className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    {data.jobTitle && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Briefcase className="w-3.5 h-3.5" />
                        {data.jobTitle}
                      </div>
                    )}
                    {data.location && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        {data.location}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Member since {formatDate(data.memberSince)}
                    </div>
                  </div>
                </div>

                {/* Tagline */}
                {data.publicTagline && (
                  <p className="text-base text-muted-foreground italic mb-2 max-w-lg">&ldquo;{data.publicTagline}&rdquo;</p>
                )}
                {data.publicDescription && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-lg">{data.publicDescription}</p>
                )}
                {!data.publicTagline && !data.publicDescription && data.bio && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-lg">{data.bio}</p>
                )}

                {/* Skills */}
                {data.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center lg:justify-start max-w-lg">
                    {data.skills.map((skill) => (
                      <Badge
                        key={skill}
                        className="text-xs px-2.5 py-1 border-0 bg-emerald-50 text-emerald-700 font-medium"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Right Column: Quality Score ── */}
              <div className="flex flex-col items-center gap-4 lg:pt-2">
                <ScoreGauge score={data.qualityScore} />
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${badgeCfg.gradient} text-white shadow-sm`}>
                  <BadgeIcon className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold uppercase tracking-wide">{badgeCfg.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground text-center max-w-[180px]">
                  Profile strength based on completeness, activity &amp; portfolio
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            4. STATS BAR
           ════════════════════════════════════════ */}
        <section className="border-y border-gray-100 bg-gray-50/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              <StatCard icon={Gavel} label="Bids Submitted" value={data.bidsSubmitted} color="text-sky-600 bg-sky-50" />
              <StatCard icon={Award} label="Bids Won" value={data.bidsWon} sub={winRate > 0 ? `${winRate}% win rate` : undefined} color="text-emerald-600 bg-emerald-50" />
              <StatCard icon={Store} label="Listings" value={data.listingsCount} color="text-amber-600 bg-amber-50" />
              <StatCard icon={Sparkles} label="Endorsements" value={data.totalEndorsements} color="text-purple-600 bg-purple-50" />
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            5. PORTFOLIO GALLERY (the media)
           ════════════════════════════════════════ */}
        {data.portfolioImages.length > 0 && (
          <section className="py-10 sm:py-14">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 rounded-lg bg-emerald-50">
                  <ImageIcon className="h-4 w-4 text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Portfolio Gallery</h2>
                <Badge className="text-[10px] px-1.5 py-0 border-0 bg-muted text-muted-foreground font-medium ml-1">
                  {data.portfolioImages.length} {data.portfolioImages.length === 1 ? 'image' : 'images'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {data.portfolioImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setLightbox(img)}
                    className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 hover:shadow-lg transition-shadow"
                  >
                    <img
                      src={img}
                      alt={`${data.fullName} portfolio ${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-center pb-2">
                      <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
            6. BIO + ENDORSEMENTS (two columns)
           ════════════════════════════════════════ */}
        {(data.bio || data.topEndorsements.length > 0) && (
          <section className="py-2 border-t border-gray-100">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
              <div className="grid md:grid-cols-2 gap-8">
                {data.bio && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <UserCircle className="w-4 h-4 text-emerald-500" /> About
                    </h3>
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{data.bio}</p>
                  </div>
                )}
                {data.topEndorsements.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-500" /> Top Endorsements
                    </h3>
                    <div className="space-y-2">
                      {data.topEndorsements.map((e) => (
                        <div key={e.skill} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                          <span className="text-sm font-medium text-foreground">{e.skill}</span>
                          <Badge className="text-[10px] px-2 py-0 border-0 bg-emerald-100 text-emerald-700 font-semibold">
                            {e.count} {e.count === 1 ? 'endorsement' : 'endorsements'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
            7. RECENT MARKETPLACE LISTINGS
           ════════════════════════════════════════ */}
        {data.listings.length > 0 && (
          <section className="py-10 border-t border-gray-100 bg-gray-50/40">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 rounded-lg bg-amber-50">
                  <Store className="h-4 w-4 text-amber-600" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Proforma Listings</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.listings.map((l) => {
                  let imgs: string[] = [];
                  try {
                    imgs = l.imageUrls ? JSON.parse(l.imageUrls) : [];
                    if (!Array.isArray(imgs)) imgs = [];
                  } catch {
                    imgs = [];
                  }
                  return (
                    <div key={l.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
                      {imgs[0] ? (
                        <div className="aspect-video bg-gray-100 overflow-hidden">
                          <img src={imgs[0]} alt={l.productName} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ) : (
                        <div className="aspect-video bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                          <Store className="w-8 h-8 text-amber-300" />
                        </div>
                      )}
                      <div className="p-3.5">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-bold text-foreground line-clamp-1">{l.productName}</h4>
                          <Badge className="text-[10px] px-1.5 py-0 border-0 bg-emerald-100 text-emerald-700 font-semibold shrink-0">
                            {formatPrice(l.unitPrice, l.currency)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{l.description}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          {(l.city || l.country) && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" />
                              {[l.city, l.country].filter(Boolean).join(', ')}
                            </span>
                          )}
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" />
                            {formatDate(l.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
            8. RECENT SOCIAL POSTS
           ════════════════════════════════════════ */}
        {data.socialPosts.length > 0 && (
          <section className="py-10 border-t border-gray-100">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 rounded-lg bg-sky-50">
                  <MessageSquare className="h-4 w-4 text-sky-600" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Recent Posts</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {data.socialPosts.map((p) => (
                  <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3 mb-2">{p.content}</p>
                    {p.imageUrls[0] && (
                      <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 mb-2">
                        <img src={p.imageUrls[0]} alt="Post attachment" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-3 h-3" />
                        {formatDate(p.createdAt)}
                      </span>
                      {p.reactionCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Sparkles className="w-3 h-3" />
                          {p.reactionCount} {p.reactionCount === 1 ? 'reaction' : 'reactions'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
            9. ACTIVITY FEED
           ════════════════════════════════════════ */}
        {data.activityFeed.length > 0 && (
          <section className="py-10 border-t border-gray-100 bg-gray-50/40">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 rounded-lg bg-purple-50">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Recent Activity</h2>
              </div>
              <div className="space-y-2 max-w-2xl">
                {data.activityFeed.map((a, i) => {
                  const icon =
                    a.type === 'bid' ? Gavel :
                    a.type === 'listing' ? Store :
                    a.type === 'post' ? MessageSquare : TrendingUp;
                  const Icon = icon;
                  const color =
                    a.type === 'bid' ? 'text-sky-600 bg-sky-50' :
                    a.type === 'listing' ? 'text-amber-600 bg-amber-50' :
                    a.type === 'post' ? 'text-emerald-600 bg-emerald-50' :
                    'text-purple-600 bg-purple-50';
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-100">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-sm text-foreground/80 flex-1 min-w-0">{a.label}</p>
                      <span className="text-[11px] text-muted-foreground shrink-0">{formatDate(a.date)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
            10. CTA FOOTER
           ════════════════════════════════════════ */}
        <section className="py-12 border-t border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
              <h3 className="text-lg font-bold text-foreground">Want your own shareable profile?</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Join TenetBid to showcase your work, track activity, and connect with the bid &amp; tender community.
              </p>
              <Button asChild className="gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white">
                <a href="/?signup=1">
                  Get Started <ArrowRight className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ════════════════════════════════════════
          FOOTER (sticky bottom)
         ════════════════════════════════════════ */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">T</span>
            </div>
            <span>Powered by TenetBid</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={copyProfileLink}
              className="gap-1.5 text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button
              size="sm"
              onClick={nativeShare}
              className="gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </Button>
          </div>
        </div>
      </footer>

      {/* ════════════════════════════════════════
          LIGHTBOX
         ════════════════════════════════════════ */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease-out]"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            <X />
          </button>
          <img
            src={lightbox}
            alt="Portfolio full size"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// ── Stat Card sub-component ──
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof Gavel;
  label: string;
  value: number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-foreground tabular-nums">{value}</span>
          {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
        </div>
        <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
      </div>
    </div>
  );
}
