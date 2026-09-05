'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Search, MapPin, Globe2, Tag, Building2, Verified, Store,
  ArrowRight, Sparkles, TrendingUp, DollarSign, Image as ImageIcon,
  ChevronRight, SlidersHorizontal, X, Loader2, Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ── Types ──
interface MarketplaceListing {
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
    profile?: { fullName: string; profilePhoto: string | null; verified: boolean } | null;
    company?: { name: string; logoUrl: string | null; verified: boolean } | null;
  };
}

interface CountryChip { name: string; count: number; }

const CATEGORIES = [
  'General', 'Agriculture', 'Coffee & Tea', 'Spices & Grains', 'Textiles',
  'Leather', 'Handicrafts', 'Construction', 'Electronics', 'Food & Beverage',
  'Mining & Minerals', 'Livestock', 'Other',
];

type SortKey = 'newest' | 'price_low' | 'price_high' | 'popular';

function parseImageUrls(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((u) => typeof u === 'string') : [];
  } catch {
    return [];
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function MarketplacePage() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [countries, setCountries] = useState<CountryChip[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [total, setTotal] = useState(0);

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (countryFilter !== 'all') params.country = countryFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (search.trim()) params.search = search.trim();
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`/api/social/proforma${qs ? `?${qs}` : ''}`);
      const json = await res.json();
      if (json.success) {
        setListings(json.data || []);
        setCountries(json.meta?.countries || []);
        setTotal(json.meta?.total || 0);
      }
    } catch {
      // network error — keep empty state
    } finally {
      setLoading(false);
    }
  }, [countryFilter, categoryFilter, search]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const sorted = useMemo(() => {
    const arr = [...listings];
    if (sort === 'price_low') arr.sort((a, b) => a.unitPrice - b.unitPrice);
    else if (sort === 'price_high') arr.sort((a, b) => b.unitPrice - a.unitPrice);
    else if (sort === 'popular') arr.sort((a, b) => b.views - a.views);
    else arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return arr;
  }, [listings, sort]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
  };

  const hasFilters = countryFilter !== 'all' || categoryFilter !== 'all' || search !== '';
  const clearFilters = () => {
    setCountryFilter('all');
    setCategoryFilter('all');
    setSearch('');
    setSearchInput('');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-amber-500/8 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:inline">TenetBid</span>
          </a>
          <div className="flex items-center gap-2">
            <a
              href="/leaderboard"
              className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
            >
              Leaderboard
            </a>
            <Button size="sm" className="gap-1.5 text-xs gradient-emerald hover:opacity-90 text-white" asChild>
              <a href="/?signup=1"><Store className="w-3.5 h-3.5" /> Post a Listing <ArrowRight className="w-3 h-3" /></a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 pb-24 w-full">
        {/* Hero */}
        <section className="pt-10 sm:pt-14 pb-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 mb-4">
            <Globe2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Public Marketplace</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-3">
            Proforma Marketplace
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base mb-6">
            Where companies show their prices — browse real product prices posted by companies across countries.
            Buyers, travelers, and procurement teams welcome — no login needed to look around.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products, places, categories…"
              className="w-full h-12 pl-11 pr-24 rounded-xl border border-border bg-card/80 backdrop-blur-sm text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <Button type="submit" size="sm" className="h-8 gap-1 text-xs gradient-emerald hover:opacity-90 text-white">
                Search
              </Button>
            </div>
          </form>
        </section>

        {/* Country chips */}
        {countries.length > 0 && (
          <section className="mb-5">
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 -mx-1 px-1">
              <button
                onClick={() => setCountryFilter('all')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  countryFilter === 'all'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-card/60 border-border text-muted-foreground hover:text-foreground hover:border-emerald-500/40'
                }`}
              >
                <Globe2 className="w-3 h-3 inline mr-1" /> All Countries
              </button>
              {countries.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setCountryFilter(c.name)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
                    countryFilter === c.name
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-card/60 border-border text-muted-foreground hover:text-foreground hover:border-emerald-500/40'
                  }`}
                >
                  <MapPin className="w-3 h-3" /> {c.name}
                  <span className={`ml-0.5 px-1.5 rounded-full text-[10px] ${countryFilter === c.name ? 'bg-white/20' : 'bg-muted'}`}>
                    {c.count}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Filters bar */}
        <section className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters:
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-[150px] text-xs rounded-lg">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-8 w-[150px] text-xs rounded-lg">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="price_low">Price: Low → High</SelectItem>
                <SelectItem value="price_high">Price: High → Low</SelectItem>
                <SelectItem value="popular">Most viewed</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={clearFilters}>
                <X className="w-3 h-3" /> Clear
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {loading ? (
              <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</span>
            ) : (
              <span>{sorted.length} listing{sorted.length !== 1 ? 's' : ''}{total !== sorted.length && ` · ${total} total`}</span>
            )}
          </div>
        </section>

        {/* Listings grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card/40 overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-muted/40" />
                <div className="p-4 space-y-2">
                  <div className="h-3 w-20 bg-muted/50 rounded" />
                  <div className="h-4 w-3/4 bg-muted/50 rounded" />
                  <div className="h-3 w-1/2 bg-muted/40 rounded" />
                  <div className="h-5 w-1/3 bg-muted/50 rounded mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">
              {hasFilters ? 'No listings match your filters' : 'No product listings yet'}
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
              {hasFilters
                ? 'Try widening your search or clearing filters to see all listings.'
                : 'Be the first to show your company\'s prices to buyers and travelers.'}
            </p>
            {hasFilters ? (
              <Button variant="outline" className="gap-2" onClick={clearFilters}>
                <X className="w-4 h-4" /> Clear filters
              </Button>
            ) : (
              <Button className="gap-2 gradient-emerald hover:opacity-90 text-white" asChild>
                <a href="/?signup=1"><Store className="w-4 h-4" /> Post the First Listing <ArrowRight className="w-4 h-4" /></a>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sorted.map((listing) => {
              const images = parseImageUrls(listing.imageUrls);
              const cover = images[0];
              const posterName = listing.user?.company?.name || listing.user?.profile?.fullName || 'Unknown seller';
              const posterVerified = listing.user?.company?.verified || listing.user?.profile?.verified;
              const location = [listing.city, listing.country].filter(Boolean).join(', ');
              return (
                <a
                  key={listing.id}
                  href={`/marketplace/${listing.id}`}
                  className="group rounded-xl border border-border bg-card/70 backdrop-blur-sm overflow-hidden hover:shadow-lg hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
                >
                  {/* Cover */}
                  <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                    {cover ? (
                      <img
                        src={cover}
                        alt={listing.productName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/20">
                        <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
                      </div>
                    )}
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                      <Badge className="text-[10px] bg-emerald-600 text-white border-0 shadow-sm">
                        {listing.category}
                      </Badge>
                      {listing.status === 'sold' && (
                        <Badge className="text-[10px] bg-rose-600 text-white border-0 shadow-sm">Sold</Badge>
                      )}
                    </div>
                    {images.length > 1 && (
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] flex items-center gap-1">
                        <ImageIcon className="w-2.5 h-2.5" /> {images.length}
                      </div>
                    )}
                  </div>
                  {/* Body */}
                  <div className="p-3.5 flex-1 flex flex-col">
                    <h3 className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                      {listing.productName}
                    </h3>
                    {listing.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 flex-1">{listing.description}</p>
                    )}
                    {/* Price */}
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {listing.currency} {listing.unitPrice.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-muted-foreground">/ {listing.unit}</span>
                    </div>
                    {/* Meta */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      {location && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" /> {location}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <Building2 className="w-2.5 h-2.5" /> {posterName}
                        {posterVerified && <Verified className="w-2.5 h-2.5 text-emerald-500" />}
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{timeAgo(listing.createdAt)}</span>
                      {listing.views > 0 && (
                        <span className="flex items-center gap-0.5">
                          <TrendingUp className="w-2.5 h-2.5" /> {listing.views} view{listing.views !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* CTA banner */}
        {!loading && sorted.length > 0 && (
          <section className="mt-12 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/20 p-6 sm:p-8 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-medium mb-3">
              <Sparkles className="w-3 h-3" /> For Sellers
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Got products to sell?</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Post your prices on Proforma and reach buyers, travelers, and procurement teams browsing from any country.
            </p>
            <Button className="gap-2 gradient-emerald hover:opacity-90 text-white" asChild>
              <a href="/?signup=1"><Store className="w-4 h-4" /> Post a Listing <ArrowRight className="w-4 h-4" /></a>
            </Button>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background/80 backdrop-blur-xl mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
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

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 9999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground)); }
      `}</style>
    </div>
  );
}
