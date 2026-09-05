'use client';

import { useEffect, useState } from 'react';
import {
  ShieldCheck, ArrowRight, Sparkles, Copy, Check, Trophy, Crown,
  Medal, Gem, Zap, Gavel, FolderKanban, Users, MapPin, Building2,
  Star, TrendingUp, Banknote, ExternalLink, Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LeaderEntry {
  name: string; industry: string; city: string | null; country: string;
  logoUrl: string | null; vanitySlug: string; verified: boolean;
  qualityScore: number; badge: 'platinum' | 'gold' | 'silver' | 'bronze' | 'new';
  bidsWon: number; completedProjects: number; totalContractValue: number;
  docCount: number; tenderCount: number; teamSize: number; proformaCount: number;
}

const BADGE_CONFIG = {
  platinum: { label: 'Platinum', color: 'from-slate-200 to-slate-400 text-slate-900 border-slate-300', icon: Gem },
  gold:     { label: 'Gold',     color: 'from-amber-300 to-yellow-500 text-amber-900 border-amber-400', icon: Crown },
  silver:   { label: 'Silver',   color: 'from-gray-300 to-gray-400 text-gray-800 border-gray-400', icon: Medal },
  bronze:   { label: 'Bronze',   color: 'from-orange-400 to-amber-600 text-orange-950 border-orange-500', icon: Trophy },
  new:      { label: 'New',      color: 'from-muted to-muted-foreground/20 text-muted-foreground border-border', icon: Zap },
};

function formatCurrency(v: number) {
  if (v >= 1e6) return `ETB ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `ETB ${(v / 1e3).toFixed(0)}K`;
  return `ETB ${v.toLocaleString()}`;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((r) => r.json())
      .then((res) => setEntries(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-500/8 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:inline">TenetBid</span>
          </a>
          <Button size="sm" className="gap-1.5 text-xs" asChild>
            <a href="/?signup=1">Get Started <ArrowRight className="w-3 h-3" /></a>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 pb-24 w-full">
        {/* Hero */}
        <section className="pt-12 sm:pt-16 pb-10 text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-3">
            Top Performing Suppliers
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base mb-2">
            Quality Scores are earned, not bought. Ranked by verified documents, completed projects, win rate, live marketplace listings, and community endorsements.
          </p>
          <p className="text-xs text-muted-foreground italic">
            &ldquo;Your Quality Score is your new resume.&rdquo;
          </p>
        </section>

        {/* Loading */}
        {loading && (
          <div className="space-y-3 max-w-3xl mx-auto">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/30 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && entries.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">Leaderboard is warming up</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
              No suppliers have published their public profiles yet. Be the first to claim your spot!
            </p>
            <Button className="gap-2" asChild>
              <a href="/?signup=1"><Sparkles className="w-4 h-4" />Build Your Supplier Passport <ArrowRight className="w-4 h-4" /></a>
            </Button>
          </div>
        )}

        {/* Pod — Top 3 */}
        {!loading && entries.length >= 3 && (
          <section className="mb-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {entries.slice(0, 3).map((entry, i) => {
                const cfg = BADGE_CONFIG[entry.badge];
                const BadgeIcon = cfg.icon;
                const podiumStyles = [
                  'sm:order-2 sm:-mt-4 sm:scale-105 border-amber-500/30',
                  'sm:order-1 border-slate-400/30',
                  'sm:order-3 border-orange-700/30',
                ];
                const rankIcons = [
                  <Crown key="1" className="w-5 h-5 text-amber-400" />,
                  <Medal key="2" className="w-5 h-5 text-slate-400" />,
                  <Trophy key="3" className="w-5 h-5 text-orange-600" />,
                ];
                return (
                  <div
                    key={entry.vanitySlug}
                    className={`rounded-2xl border-2 bg-card/80 backdrop-blur-sm p-6 text-center relative overflow-hidden ${podiumStyles[i]}`}
                  >
                    {i === 0 && <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-500/10 blur-[40px]" />}
                    <div className="relative z-10">
                      <div className="flex items-center justify-center gap-1.5 mb-3">
                        {rankIcons[i]}
                        <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                      </div>
                      {entry.logoUrl ? (
                        <img src={entry.logoUrl} alt={entry.name} className="w-16 h-16 rounded-xl object-cover border-2 border-border mx-auto mb-3" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-border flex items-center justify-center mx-auto mb-3">
                          <Building2 className="w-7 h-7 text-primary" />
                        </div>
                      )}
                      <a href={`/${entry.vanitySlug}`} className="block hover:underline">
                        <h3 className="font-bold text-sm truncate">{entry.name}</h3>
                      </a>
                      <p className="text-[10px] text-muted-foreground mb-3">{entry.industry}</p>
                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r ${cfg.color} border text-[10px] font-bold mb-2`}>
                        <BadgeIcon className="w-3 h-3" /> {cfg.label}
                      </div>
                      <div className="text-3xl font-black">{entry.qualityScore}</div>
                      <p className="text-[10px] text-muted-foreground">Quality Score</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Full Ranking List */}
        {!loading && entries.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10"><TrendingUp className="w-4 h-4 text-amber-400" /></div>
              <div>
                <h2 className="text-lg font-bold">Full Ranking</h2>
                <p className="text-xs text-muted-foreground">{entries.length} verified suppliers</p>
              </div>
            </div>

            <div className="space-y-2">
              {entries.map((entry, i) => {
                const cfg = BADGE_CONFIG[entry.badge];
                const BadgeIcon = cfg.icon;
                return (
                  <div
                    key={entry.vanitySlug}
                    className="flex items-center gap-3 sm:gap-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-3 sm:p-4 hover:border-primary/30 transition-colors"
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center w-8 sm:w-10 shrink-0">
                      <span className={`text-lg font-black ${i < 3 ? 'text-amber-400' : 'text-muted-foreground'}`}>{i + 1}</span>
                    </div>

                    {/* Logo */}
                    {entry.logoUrl ? (
                      <img src={entry.logoUrl} alt={entry.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-border shrink-0" />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-border flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <a href={`/${entry.vanitySlug}`} className="text-sm font-semibold hover:underline truncate">{entry.name}</a>
                        {entry.verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{entry.industry}</Badge>
                        {entry.city && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{entry.city}</span>}
                      </div>
                    </div>

                    {/* Stats (hidden on mobile) */}
                    <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1" title="Bids Won"><Gavel className="w-3 h-3 text-amber-400" />{entry.bidsWon}</span>
                      <span className="flex items-center gap-1" title="Projects"><FolderKanban className="w-3 h-3 text-purple-400" />{entry.completedProjects}</span>
                      <span className="flex items-center gap-1" title="Live Marketplace Listings"><Store className="w-3 h-3 text-orange-400" />{entry.proformaCount}</span>
                      <span className="flex items-center gap-1" title="Documents"><ShieldCheck className="w-3 h-3 text-sky-400" />{entry.docCount}</span>
                      {entry.totalContractValue > 0 && (
                        <span className="flex items-center gap-1" title="Contract Value"><Banknote className="w-3 h-3 text-emerald-400" />{formatCurrency(entry.totalContractValue)}</span>
                      )}
                    </div>

                    {/* Badge + Score */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${cfg.color} border text-[9px] font-bold`}>
                        <BadgeIcon className="w-2.5 h-2.5" />{cfg.label}
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-black leading-none">{entry.qualityScore}</div>
                        <div className="text-[8px] text-muted-foreground uppercase">score</div>
                      </div>
                      <button
                        onClick={() => copyLink(entry.vanitySlug)}
                        className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title="Copy profile link"
                      >
                        {copied === entry.vanitySlug ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a
                        href={`/${entry.vanitySlug}`}
                        className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title="View profile"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-14">
          <div className="relative rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/5 p-8 sm:p-12 text-center overflow-hidden">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-amber-500/10 blur-[60px] pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                Claim Your Spot
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8 text-sm sm:text-base">
                Build your Supplier Passport, publish your capability microsite, and climb the leaderboard.
                Status must be earned — start building your quality reputation today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" className="gap-2" asChild>
                  <a href="/?signup=1">Create Free Account <ArrowRight className="w-4 h-4" /></a>
                </Button>
                <Button size="lg" variant="outline" className="gap-2" asChild>
                  <a href="/">Explore Tenders</a>
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" />Verified Companies</span>
                <span className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-sky-400" />Quality Scores</span>
                <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-400" />Earned Badges</span>
                <span className="flex items-center gap-1.5"><Store className="w-4 h-4 text-orange-400" />Live Marketplace Listings</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-purple-400" />Community Endorsements</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background/80 backdrop-blur-xl mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <span className="text-white font-bold text-[9px]">T</span>
            </div>
            <span>&copy; {new Date().getFullYear()} TenetBid</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="hover:text-foreground transition-colors">Home</a>
            <a href="/marketplace" className="hover:text-foreground transition-colors">Marketplace</a>
            <a href="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</a>
            <a href="/?signup=1" className="hover:text-foreground transition-colors">Sign Up</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
