'use client';

import { useEffect, useState, use } from 'react';
import {
  ShieldCheck,
  FileText,
  Gavel,
  FolderKanban,
  ArrowRight,
  CheckCircle,
  Globe,
  MapPin,
  Building2,
  Users,
  Award,
  Clock,
  Banknote,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TeamMember {
  fullName: string;
  jobTitle: string | null;
  profilePhoto: string | null;
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
  category: string;
  deadline: string;
  budget: string;
  createdAt: string;
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
  teamMembers: TeamMember[];
  documents: PublicDoc[];
  tenders: PublicTender[];
  stats: {
    documents: number;
    tenders: number;
    projects: number;
    users: number;
  };
}

function DocTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'certificate':
      return <Award className="w-4 h-4 text-emerald-400" />;
    case 'business_license':
      return <ShieldCheck className="w-4 h-4 text-sky-400" />;
    case 'portfolio':
      return <FolderKanban className="w-4 h-4 text-amber-400" />;
    default:
      return <FileText className="w-4 h-4 text-muted-foreground" />;
  }
}

function DocTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    certificate: 'Certificate',
    business_license: 'Business License',
    portfolio: 'Portfolio',
  };
  return <>{labels[type] || type}</>;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function VanityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [data, setData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(false);
    fetch(`/api/vanity/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
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

  // ── Loading State ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  // ── 404 State ──
  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Globe className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Page Not Found</h1>
          <p className="text-muted-foreground max-w-md">
            This company profile doesn&apos;t exist or is no longer available.
          </p>
          <Button asChild className="mt-4">
            <a href="/">Go to TenetBid</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Animated Background ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-slate-500/10 blur-[100px] animate-[float1_20s_ease-in-out_infinite]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-500/8 blur-[100px] animate-[float2_25s_ease-in-out_infinite]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Top Nav Bar ── */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-lg tracking-tight">TenetBid</span>
          </a>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={copyLink} className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button size="sm" className="gap-2" asChild>
              <a href="/?signup=1">
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        {/* ── Hero Section: Company Profile ── */}
        <section className="pt-12 sm:pt-20 pb-12 sm:pb-16">
          <div className="flex flex-col items-center text-center">
            {/* Logo */}
            {data.logoUrl ? (
              <img
                src={data.logoUrl}
                alt={data.name}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover border-2 border-border shadow-2xl mb-6"
              />
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-border flex items-center justify-center mb-6 shadow-2xl">
                <Building2 className="w-10 h-10 sm:w-14 sm:h-14 text-primary" />
              </div>
            )}

            {/* Name + Verified */}
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">{data.name}</h1>
              {data.verified && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400">Verified</span>
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground mb-6">
              <Badge variant="secondary" className="text-xs font-medium">
                {data.industry}
              </Badge>
              {(data.city || data.country) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {[data.city, data.country].filter(Boolean).join(', ')}
                </span>
              )}
              {data.website && (
                <a
                  href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Website
                </a>
              )}
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <Button size="lg" className="gap-2 text-base px-8" asChild>
                <a href="/?signup=1">
                  <Sparkles className="w-4 h-4" />
                  Join TenetBid
                </a>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 text-base px-8" asChild>
                <a href="/">
                  Explore Tenders <ArrowRight className="w-4 h-4" />
                </a>
              </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 w-full max-w-2xl">
              {[
                { label: 'Documents', value: data.stats.documents, icon: FileText },
                { label: 'Tenders', value: data.stats.tenders, icon: Gavel },
                { label: 'Projects', value: data.stats.projects, icon: FolderKanban },
                { label: 'Team', value: data.stats.users, icon: Users },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 text-center"
                >
                  <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                  <div className="text-2xl sm:text-3xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Team Members ── */}
        {data.teamMembers.length > 0 && (
          <section className="py-12 border-t border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Team</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {data.teamMembers.map((member, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center text-center rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4"
                >
                  {member.profilePhoto ? (
                    <img
                      src={member.profilePhoto}
                      alt={member.fullName}
                      className="w-14 h-14 rounded-full object-cover border-2 border-border mb-3"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-3">
                      <span className="text-lg font-bold text-primary">
                        {member.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium truncate w-full">{member.fullName}</span>
                  {member.jobTitle && (
                    <span className="text-xs text-muted-foreground truncate w-full">
                      {member.jobTitle}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Published Tenders ── */}
        {data.tenders.length > 0 && (
          <section className="py-12 border-t border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <Gavel className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Latest Tenders</h2>
              <Badge variant="secondary" className="text-xs">{data.tenders.length} shown</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.tenders.map((tender) => (
                <div
                  key={tender.id}
                  className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2">
                      {tender.title}
                    </h3>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {tender.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {tender.deadline ? formatDate(tender.deadline) : 'No deadline'}
                    </span>
                    {tender.budget && (
                      <span className="flex items-center gap-1">
                        <Banknote className="w-3.5 h-3.5" />
                        {tender.budget}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Public Documents / Credentials ── */}
        {data.documents.length > 0 && (
          <section className="py-12 border-t border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Credentials &amp; Documents</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <DocTypeIcon type={doc.docType} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{doc.fileName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <DocTypeLabel type={doc.docType} />
                      <span>·</span>
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>
                  </div>
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Bottom CTA: The Growth Engine ── */}
        <section className="py-16 sm:py-20">
          <div className="relative rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/5 p-8 sm:p-12 text-center overflow-hidden">
            {/* Decorative */}
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/10 blur-[60px] pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-orange-500/10 blur-[40px] pointer-events-none" />

            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                Part of the TenetBid Ecosystem
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8 text-sm sm:text-base">
                {data.name} uses TenetBid to manage tenders, documents, and procurement.
                Join thousands of contractors and organizations transforming how they win bids.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" className="gap-2 text-base px-8" asChild>
                  <a href="/?signup=1">
                    Create Free Account <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="gap-2" asChild>
                  <a href="/">
                    Learn More
                  </a>
                </Button>
              </div>

              {/* Trust Signals */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Verified Companies
                </span>
                <span className="flex items-center gap-1.5">
                  <Gavel className="w-4 h-4 text-sky-400" />
                  Live Tenders
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  AI-Powered Tools
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-400" />
                  Smart Documents
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Sticky Footer ── */}
      <footer className="border-t border-border/50 bg-background/80 backdrop-blur-xl mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">T</span>
            </div>
            <span>&copy; {new Date().getFullYear()} TenetBid. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="hover:text-foreground transition-colors">Home</a>
            <a href="/" className="hover:text-foreground transition-colors">Tenders</a>
            <a href="/?signup=1" className="hover:text-foreground transition-colors">Sign Up</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
