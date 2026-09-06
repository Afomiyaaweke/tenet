'use client';

import { useEffect, useState, use } from 'react';
import {
  ArrowLeft, MapPin, Globe2, Building2, Verified, Store,
  Share2, Copy, Check, ChevronRight, Image as ImageIcon, X,
  TrendingUp, Calendar, Package, Tag, Mail, Phone, MessageSquare,
  ShieldCheck, ArrowRight, Loader2, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ListingDetail {
  id: string;
  productName: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  currency: string;
  city: string;
  country: string;
  contactInfo: string;
  imageUrls: string;
  status: string;
  views: number;
  createdAt: string;
  user: {
    id: string;
    email: string;
    accountType: string;
    profile?: {
      fullName: string; profilePhoto: string | null; verified: boolean;
      jobTitle: string | null; location: string | null;
      vanitySlug: string | null; isPublished: boolean;
    } | null;
    company?: {
      name: string; logoUrl: string | null; verified: boolean;
      industry: string | null; city: string | null; country: string | null;
      vanitySlug: string | null; isPublished: boolean;
    } | null;
  };
}

function parseImageUrls(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((u) => typeof u === 'string') : [];
  } catch {
    return [];
  }
}

function detectContactType(info: string): { type: 'phone' | 'email' | 'other'; href: string | null } {
  const trimmed = info.trim();
  if (/^[\+]?[\d\s\-\(\)]{7,}$/.test(trimmed)) return { type: 'phone', href: `tel:${trimmed.replace(/\s/g, '')}` };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return { type: 'email', href: `mailto:${trimmed}` };
  return { type: 'other', href: null };
}

export default function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/social/proforma/${id}`)
      .then((r) => {
        if (r.status === 404) setNotFound(true);
        return r.json();
      })
      .then((res) => {
        if (cancelled) return;
        if (res.success) setListing(res.data);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/marketplace/${id}` : '';
  const copyLink = () => {
    if (navigator.share) {
      navigator.share({ title: listing?.productName || 'Proforma listing', url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center">
            <a href="/marketplace" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Proforma
            </a>
          </div>
        </header>
        <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="aspect-[4/3] bg-muted/40 rounded-2xl animate-pulse" />
            <div className="space-y-3">
              <div className="h-4 w-24 bg-muted/50 rounded animate-pulse" />
              <div className="h-8 w-3/4 bg-muted/50 rounded animate-pulse" />
              <div className="h-6 w-1/3 bg-muted/40 rounded animate-pulse" />
              <div className="h-20 bg-muted/30 rounded animate-pulse mt-4" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Not found ──
  if (notFound || !listing) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center">
            <a href="/marketplace" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Proforma
            </a>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Listing not found</h1>
            <p className="text-sm text-muted-foreground mb-6">
              This listing may have been deleted or marked as sold by the seller.
            </p>
            <Button className="gap-2 gradient-emerald hover:opacity-90 text-white" asChild>
              <a href="/marketplace"><Store className="w-4 h-4" /> Browse Proforma</a>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const images = parseImageUrls(listing.imageUrls);
  const sellerName = listing.user?.company?.name || listing.user?.profile?.fullName || 'Unknown seller';
  const sellerVerified = listing.user?.company?.verified || listing.user?.profile?.verified;
  const sellerPhoto = listing.user?.company?.logoUrl || listing.user?.profile?.profilePhoto;
  const sellerSlug = listing.user?.company?.vanitySlug || listing.user?.profile?.vanitySlug;
  const sellerPublished = listing.user?.company?.isPublished || listing.user?.profile?.isPublished;
  const sellerLink = sellerSlug && sellerPublished
    ? (listing.user?.company ? `/${sellerSlug}` : `/u/${sellerSlug}`)
    : null;
  const location = [listing.city, listing.country].filter(Boolean).join(', ');
  const contact = listing.contactInfo ? detectContactType(listing.contactInfo) : null;
  const ContactIcon = contact?.type === 'phone' ? Phone : contact?.type === 'email' ? Mail : MessageSquare;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-amber-500/8 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/marketplace" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back to Proforma</span><span className="sm:hidden">Back</span>
          </a>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={copyLink}>
              {copied ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied</> : <><Share2 className="w-3.5 h-3.5" /> Share</>}
            </Button>
            <Button size="sm" className="gap-1.5 text-xs gradient-emerald hover:opacity-90 text-white" asChild>
              <a href="/?signup=1"><Store className="w-3.5 h-3.5" /> Post your own</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5">
          <a href="/marketplace" className="hover:text-foreground transition-colors">Proforma</a>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground truncate">{listing.productName}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          {/* ── Gallery ── */}
          <div>
            <div className="rounded-2xl border border-border bg-card/60 overflow-hidden aspect-[4/3] relative">
              {images.length > 0 ? (
                <img
                  src={images[0]}
                  alt={listing.productName}
                  className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => setLightboxIdx(0)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/20">
                  <ImageIcon className="w-16 h-16 text-muted-foreground/40" />
                </div>
              )}
              {listing.status === 'sold' && (
                <div className="absolute top-3 left-3">
                  <Badge className="bg-rose-600 text-white border-0 shadow-sm">Sold</Badge>
                </div>
              )}
              {images.length > 1 && (
                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> 1 / {images.length}
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {images.map((url, idx) => (
                  <button
                    key={url + idx}
                    onClick={() => setLightboxIdx(idx)}
                    className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-emerald-500/50 transition-colors bg-muted"
                  >
                    <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info ── */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge className="text-[11px] bg-emerald-600 text-white border-0">{listing.category}</Badge>
              {listing.country && (
                <Badge variant="secondary" className="text-[11px] gap-1">
                  <Globe2 className="w-3 h-3" /> {listing.country}
                </Badge>
              )}
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {new Date(listing.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">{listing.productName}</h1>

            {/* Price */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 mb-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {listing.currency} {listing.unitPrice.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">/ {listing.unit}</span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Package className="w-3 h-3" /> Qty: {listing.quantity.toLocaleString()} {listing.unit}</span>
                {listing.views > 0 && (
                  <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {listing.views} view{listing.views !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>

            {/* Location */}
            {location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <MapPin className="w-4 h-4 text-emerald-500" /> {location}
              </div>
            )}

            {/* Description */}
            {listing.description && (
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-foreground mb-1.5">Description</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{listing.description}</p>
              </div>
            )}

            {/* Contact CTA */}
            {contact && (
              <div className="rounded-xl border border-border bg-card/60 p-4 mb-5">
                <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-500" /> Contact the seller
                </h2>
                {contact.href ? (
                  <Button className="w-full gap-2 gradient-emerald hover:opacity-90 text-white" asChild>
                    <a href={contact.href}>
                      <ContactIcon className="w-4 h-4" /> {listing.contactInfo}
                    </a>
                  </Button>
                ) : (
                  <p className="text-sm text-foreground font-medium">{listing.contactInfo}</p>
                )}
              </div>
            )}

            {/* Seller card */}
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Seller</h2>
              <div className="flex items-center gap-3">
                {sellerPhoto ? (
                  <img src={sellerPhoto} alt={sellerName} className="w-12 h-12 rounded-full object-cover border border-border" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-border flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm truncate">{sellerName}</span>
                    {sellerVerified && <Verified className="w-4 h-4 text-emerald-500 shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {listing.user?.company ? (
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {listing.user.company.industry || 'Company'}</span>
                    ) : (
                      <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {listing.user?.profile?.jobTitle || 'Individual seller'}</span>
                    )}
                  </div>
                </div>
                {sellerLink && (
                  <Button variant="outline" size="sm" className="gap-1 text-xs shrink-0" asChild>
                    <a href={sellerLink}>View <ArrowRight className="w-3 h-3" /></a>
                  </Button>
                )}
              </div>
            </div>

            {/* Trust note */}
            <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p>
                Always verify products in person before payment. TenetBid is not involved in transactions
                and does not guarantee listings. Report suspicious listings via the seller&apos;s profile.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background/80 backdrop-blur-xl mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <span className="text-white font-bold text-[9px]">T</span>
            </div>
            <span>&copy; {new Date().getFullYear()} TenetBid</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="hover:text-foreground transition-colors">Home</a>
            <a href="/marketplace" className="hover:text-foreground transition-colors">Proforma</a>
            <a href="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</a>
          </div>
        </div>
      </footer>

      {/* Lightbox */}
      {lightboxIdx !== null && images[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30"
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(Math.max(0, lightboxIdx - 1)); }}
            disabled={lightboxIdx === 0}
            aria-label="Previous"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <img
            src={images[lightboxIdx]}
            alt={`${listing.productName} — photo ${lightboxIdx + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30"
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(Math.min(images.length - 1, lightboxIdx + 1)); }}
            disabled={lightboxIdx === images.length - 1}
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-xs">
            {lightboxIdx + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
