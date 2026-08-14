'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { api, LiveTender, DataSource, Tender, Bid, Project } from '@/lib/api';
import { useAuthStore, useNavStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Globe2, Search, MapPin, Calendar, DollarSign,
  RefreshCw, Radio, Building2, FileText, ShieldCheck, Lock,
  Database, ServerCrash, Sparkles, ArrowUpRight,
  ChevronDown, ChevronUp, BookOpen, Download, Copy,
  Loader2, Clock, Landmark, Plane, Flag, Cpu,
  CheckCircle2, ExternalLink, TrendingUp, ChevronRight, Languages,
  Bookmark, BookmarkCheck, XCircle, AlertTriangle, Lightbulb,
  Target, BarChart3, Users, Zap, Eye, Gavel,
  CircleCheck, Send, FileSearch, FolderKanban, FileDown, FileSpreadsheet,
  Trophy, Swords, Scale, Wrench, HeartPulse, Briefcase, Award,
  OctagonAlert, CircleDashed, ArrowRight, Timer, Milestone,
  Handshake, Star, Flame, Info, GitBranch, Layers, PieChart,
} from 'lucide-react';
import { InlineTranslator } from '@/components/translator';

/* ─────────────────────────────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────────────────────────────── */

const SOURCE_LABELS: Record<string, string> = {
  worldbank: 'World Bank',
  eu_ted: 'EU TED',
  ungm: 'UNGM',
  sam_gov: 'SAM.gov',
  afdb: 'AfDB',
  eu_opentenders: 'OpenTenders EU',
  jica: 'JICA',
  adb: 'ADB',
  uk_contracts: 'UK Contracts',
  dgmarket: 'DgMarket',
  sector_feed: 'Sector Feed',
  apify_global: 'Apify Global',
  apify_procurement: 'Apify Procurement',
  govrider: 'GovRider',
  tenderwell: 'Tenderwell',
  seegenebid: 'SeeGeneBid',
  canada_buyandsell: 'Canada Buyandsell',
  austender: 'AusTender',
  portugal_base: 'Portugal BASE',
  ontario_tenders: 'Ontario Tenders',
  nigeria_nocopo: 'Nigeria NOCOPO',
  kenya_tenders: 'Kenya Tenders',
  india_cppp: 'India CPPP',
  south_africa: 'South Africa eTenders',
  philgeps: 'PhilGEPS',
  colombia_secop: 'Colombia SECOP',
  mexico_compranet: 'Mexico CompraNet',
  chile_mercado: 'Chile Mercado Público',
  argentina_comprar: 'Argentina COMPR.AR',
  uruguay_compras: 'Uruguay Compras',
  undp_procurement: 'UNDP Procurement',
  global_fund: 'Global Fund',
  ifc_advisory: 'IFC Advisory',
  ecuador_sercop: 'Ecuador SERCOP',
  peru_compras: 'Peru Compras',
  paraguay_dncp: 'Paraguay DNCP',
};

const SOURCE_ACCENT: Record<string, { dot: string; badge: string; ring: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  worldbank: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    ring: 'hover:border-emerald-400/60',
    bg: 'from-emerald-500/10 to-teal-500/5',
    icon: Landmark,
  },
  eu_ted: {
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    ring: 'hover:border-blue-400/60',
    bg: 'from-blue-500/10 to-indigo-500/5',
    icon: Flag,
  },
  ungm: {
    dot: 'bg-sky-500',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    ring: 'hover:border-sky-400/60',
    bg: 'from-sky-500/10 to-cyan-500/5',
    icon: Plane,
  },
  sam_gov: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    ring: 'hover:border-amber-400/60',
    bg: 'from-amber-500/10 to-orange-500/5',
    icon: Landmark,
  },
  afdb: {
    dot: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    ring: 'hover:border-orange-400/60',
    bg: 'from-orange-500/10 to-red-500/5',
    icon: Globe2,
  },
  eu_opentenders: {
    dot: 'bg-violet-500',
    badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
    ring: 'hover:border-violet-400/60',
    bg: 'from-violet-500/10 to-purple-500/5',
    icon: Cpu,
  },
  jica: {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    ring: 'hover:border-red-400/60',
    bg: 'from-red-500/10 to-rose-500/5',
    icon: Flag,
  },
  adb: {
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
    ring: 'hover:border-cyan-400/60',
    bg: 'from-cyan-500/10 to-teal-500/5',
    icon: Landmark,
  },
  uk_contracts: {
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    ring: 'hover:border-rose-400/60',
    bg: 'from-rose-500/10 to-pink-500/5',
    icon: Flag,
  },
  dgmarket: {
    dot: 'bg-lime-500',
    badge: 'bg-lime-50 text-lime-700 dark:bg-lime-950/40 dark:text-lime-300',
    ring: 'hover:border-lime-400/60',
    bg: 'from-lime-500/10 to-green-500/5',
    icon: Globe2,
  },
  sector_feed: {
    dot: 'bg-primary',
    badge: 'bg-primary/10 text-primary',
    ring: 'hover:border-primary/40',
    bg: 'from-primary/10 to-primary/5',
    icon: TrendingUp,
  },
  apify_global: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    ring: 'hover:border-amber-400/60',
    bg: 'from-amber-500/10 to-yellow-500/5',
    icon: Cpu,
  },
  apify_procurement: {
    dot: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    ring: 'hover:border-orange-400/60',
    bg: 'from-orange-500/10 to-amber-500/5',
    icon: Database,
  },
  govrider: {
    dot: 'bg-violet-500',
    badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
    ring: 'hover:border-violet-400/60',
    bg: 'from-violet-500/10 to-purple-500/5',
    icon: ShieldCheck,
  },
  tenderwell: {
    dot: 'bg-teal-500',
    badge: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
    ring: 'hover:border-teal-400/60',
    bg: 'from-teal-500/10 to-cyan-500/5',
    icon: Search,
  },
  seegenebid: {
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    ring: 'hover:border-rose-400/60',
    bg: 'from-rose-500/10 to-pink-500/5',
    icon: Globe2,
  },
  canada_buyandsell: {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    ring: 'hover:border-red-400/60',
    bg: 'from-red-500/10 to-red-500/5',
    icon: Flag,
  },
  austender: {
    dot: 'bg-teal-500',
    badge: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
    ring: 'hover:border-teal-400/60',
    bg: 'from-teal-500/10 to-cyan-500/5',
    icon: Globe2,
  },
  portugal_base: {
    dot: 'bg-green-500',
    badge: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300',
    ring: 'hover:border-green-400/60',
    bg: 'from-green-500/10 to-emerald-500/5',
    icon: FileSearch,
  },
  ontario_tenders: {
    dot: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    ring: 'hover:border-orange-400/60',
    bg: 'from-orange-500/10 to-amber-500/5',
    icon: Building2,
  },
  nigeria_nocopo: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    ring: 'hover:border-emerald-400/60',
    bg: 'from-emerald-500/10 to-green-500/5',
    icon: Landmark,
  },
  kenya_tenders: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    ring: 'hover:border-amber-400/60',
    bg: 'from-amber-500/10 to-yellow-500/5',
    icon: Flag,
  },
  india_cppp: {
    dot: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    ring: 'hover:border-orange-400/60',
    bg: 'from-orange-500/10 to-amber-500/5',
    icon: Building2,
  },
  south_africa: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    ring: 'hover:border-amber-400/60',
    bg: 'from-amber-500/10 to-yellow-500/5',
    icon: Flag,
  },
  philgeps: {
    dot: 'bg-sky-500',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    ring: 'hover:border-sky-400/60',
    bg: 'from-sky-500/10 to-cyan-500/5',
    icon: Globe2,
  },
  colombia_secop: {
    dot: 'bg-yellow-500',
    badge: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300',
    ring: 'hover:border-yellow-400/60',
    bg: 'from-yellow-500/10 to-amber-500/5',
    icon: Building2,
  },
  mexico_compranet: {
    dot: 'bg-green-500',
    badge: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300',
    ring: 'hover:border-green-400/60',
    bg: 'from-green-500/10 to-emerald-500/5',
    icon: Landmark,
  },
  chile_mercado: {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    ring: 'hover:border-red-400/60',
    bg: 'from-red-500/10 to-rose-500/5',
    icon: Flag,
  },
  argentina_comprar: {
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
    ring: 'hover:border-cyan-400/60',
    bg: 'from-cyan-500/10 to-teal-500/5',
    icon: Globe2,
  },
  uruguay_compras: {
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    ring: 'hover:border-blue-400/60',
    bg: 'from-blue-500/10 to-indigo-500/5',
    icon: FileSearch,
  },
  undp_procurement: {
    dot: 'bg-sky-500',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    ring: 'hover:border-sky-400/60',
    bg: 'from-sky-500/10 to-cyan-500/5',
    icon: Globe2,
  },
  global_fund: {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    ring: 'hover:border-red-400/60',
    bg: 'from-red-500/10 to-rose-500/5',
    icon: Landmark,
  },
  ifc_advisory: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    ring: 'hover:border-emerald-400/60',
    bg: 'from-emerald-500/10 to-teal-500/5',
    icon: Building2,
  },
  ecuador_sercop: {
    dot: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    ring: 'hover:border-orange-400/60',
    bg: 'from-orange-500/10 to-amber-500/5',
    icon: Globe2,
  },
  peru_compras: {
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    ring: 'hover:border-rose-400/60',
    bg: 'from-rose-500/10 to-pink-500/5',
    icon: Flag,
  },
  paraguay_dncp: {
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
    ring: 'hover:border-cyan-400/60',
    bg: 'from-cyan-500/10 to-teal-500/5',
    icon: Building2,
  },
  default: {
    dot: 'bg-muted-foreground',
    badge: 'bg-muted text-muted-foreground',
    ring: 'hover:border-border',
    bg: 'from-muted/50 to-muted/20',
    icon: Globe2,
  },
};

const ACCENT_DOT: Record<string, string> = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  sky: 'bg-sky-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  violet: 'bg-violet-500',
  teal: 'bg-teal-500',
  rose: 'bg-rose-500',
  red: 'bg-red-500',
  cyan: 'bg-cyan-500',
  lime: 'bg-lime-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  pink: 'bg-pink-500',
};

/* ─────────────────────────────────────────────────────────────────────
 * Sector definitions for quick-filter
 * ───────────────────────────────────────────────────────────────────── */

const SECTOR_PILLS: { id: string; label: string; icon: string; color: string }[] = [
  { id: 'medical', label: 'Medical', icon: '🏥', color: 'rose' },
  { id: 'construction', label: 'Construction', icon: '🏗️', color: 'amber' },
  { id: 'retail', label: 'Retail', icon: '🛒', color: 'pink' },
  { id: 'it', label: 'IT', icon: '💻', color: 'violet' },
  { id: 'energy', label: 'Energy', icon: '⚡', color: 'yellow' },
  { id: 'agriculture', label: 'Agriculture', icon: '🌾', color: 'green' },
  { id: 'education', label: 'Education', icon: '📚', color: 'blue' },
  { id: 'transport', label: 'Transport', icon: '🚛', color: 'cyan' },
  { id: 'finance', label: 'Finance', icon: '🏦', color: 'emerald' },
  { id: 'telecom', label: 'Telecom', icon: '📡', color: 'sky' },
];

/* ─────────────────────────────────────────────────────────────────────
 * Inline document data type
 * ───────────────────────────────────────────────────────────────────── */

interface InlineDocument {
  title: string;
  metaDescription?: string;
  content: string;
  sections?: { heading: string; content: string }[];
  deadlines?: string[];
  budgets?: string[];
  url: string;
  contentType?: string;
  fetchedAt: string;
}

/* ─────────────────────────────────────────────────────────────────────
 * AI Review data type
 * ───────────────────────────────────────────────────────────────────── */

interface AIReview {
  executiveSummary: string;
  opportunityScore: number;
  winProbability: number;
  strategicAnalysis: {
    swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
    strategicFit: 'high' | 'medium' | 'low';
    strategicFitReasoning: string;
    marketPositioning: string;
  };
  financialAnalysis: {
    budgetFit: 'well_within' | 'within' | 'above' | 'significantly_above';
    budgetFitReasoning: string;
    estimatedROI: 'low' | 'medium' | 'high' | 'very_high';
    roiReasoning: string;
    paymentTermsRisk: 'low' | 'medium' | 'high';
    paymentTermsNote: string;
    costStructureBreakdown: string[];
    financialRisks: string[];
    marginPotential: 'thin' | 'moderate' | 'healthy' | 'strong';
  };
  technicalComplexity: {
    level: 'low' | 'medium' | 'high' | 'very_high';
    reasoning: string;
    keyTechnologies: string[];
    expertiseRequired: string[];
    implementationRisks: string[];
    estimatedDuration: string;
  };
  complianceAnalysis: {
    overallCompliance: 'fully_compliant' | 'partially_compliant' | 'non_compliant' | 'unclear';
    regulatoryFramework: string;
    mandatoryCertifications: string[];
    voluntaryCertifications: string[];
    complianceGaps: string[];
    documentationRequirements: string[];
    complianceScore: number;
  };
  eligibilityDeepDive: {
    overallEligible: boolean;
    confidenceLevel: 'high' | 'medium' | 'low';
    criteria: Array<{ criterion: string; met: boolean; partial?: boolean; note: string; severity: 'blocker' | 'warning' | 'info' }>;
    blockers: string[];
    warnings: string[];
  };
  riskMatrix: {
    overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    overallRiskScore: number;
    dimensions: {
      financial: { score: number; factors: string[]; mitigation: string };
      technical: { score: number; factors: string[]; mitigation: string };
      legal: { score: number; factors: string[]; mitigation: string };
      operational: { score: number; factors: string[]; mitigation: string };
      reputational: { score: number; factors: string[]; mitigation: string };
    };
    criticalRisks: string[];
    dealBreakers: string[];
  };
  competitiveIntelligence: {
    estimatedBidders: string;
    competitionLevel: 'low' | 'medium' | 'high' | 'very_high';
    typicalCompetitors: string[];
    differentiationStrategies: string[];
    incumbentAdvantage: boolean;
    incumbentNote: string;
    pricingStrategy: 'aggressive' | 'competitive' | 'premium' | 'value_based';
    pricingNote: string;
  };
  bidStrategy: {
    recommendedApproach: string;
    priorityLevel: 'must_win' | 'high' | 'medium' | 'low' | 'monitor';
    keyWinFactors: string[];
    differentiationPoints: string[];
    partnershipOpportunities: string[];
    proposalHighlights: string[];
    estimatedPrepTime: string;
    resourceRequirements: string;
  };
  timelineAnalysis: {
    deadlineAssessment: 'comfortable' | 'tight' | 'very_tight' | 'already_passed';
    daysToDeadline: number;
    recommendedStartDaysBefore: number;
    milestones: Array<{ phase: string; duration: string; deadline: string }>;
    criticalPathItems: string[];
  };
  valueAddOpportunities: Array<{ opportunity: string; impact: 'low' | 'medium' | 'high'; effort: 'low' | 'medium' | 'high' }>;
  redFlags: string[];
  actionableRecommendations: Array<{ action: string; priority: 'critical' | 'high' | 'medium' | 'low'; category: string; timeline: string }>;
}

/* ─────────────────────────────────────────────────────────────────────
 * Credential-gated source definitions
 * ───────────────────────────────────────────────────────────────────── */

interface GatedSource {
  id: string;
  name: string;
  envVar: string;
  description: string;
  docsUrl: string;
  credentialType: 'api_key' | 'open_source';
}

const GATED_SOURCES: GatedSource[] = [
  {
    id: 'apify_global',
    name: 'Apify Global',
    envVar: 'APIFY_API_TOKEN',
    description: 'Apify provides web scraping and data extraction APIs for global procurement data. You need an Apify API token to enable this source.',
    docsUrl: 'https://docs.apify.com/api/v2',
    credentialType: 'api_key',
  },
  {
    id: 'apify_procurement',
    name: 'Apify Procurement',
    envVar: 'APIFY_API_TOKEN',
    description: 'Uses Apify actors specialized for procurement and tender scraping from government portals worldwide. Requires the same Apify API token.',
    docsUrl: 'https://docs.apify.com/api/v2',
    credentialType: 'api_key',
  },
  {
    id: 'govrider',
    name: 'GovRider',
    envVar: 'GOVRIDER_API_KEY',
    description: 'GovRider aggregates government tender data from multiple jurisdictions. An API key is required to access their feed.',
    docsUrl: 'https://govrider.com/docs',
    credentialType: 'api_key',
  },
  {
    id: 'tenderwell',
    name: 'Tenderwell',
    envVar: 'TENDERWELL_API_KEY',
    description: 'Tenderwell provides AI-enhanced tender discovery and matching. Requires an API key for access.',
    docsUrl: 'https://tenderwell.com/api',
    credentialType: 'api_key',
  },
  {
    id: 'seegenebid',
    name: 'SeeGeneBid',
    envVar: '',
    description: 'Open source gene/bid discovery platform. No credentials required - community-maintained data feed.',
    docsUrl: 'https://seegenebid.org',
    credentialType: 'open_source',
  },
];

/* ─────────────────────────────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────────────────────────────── */

function fmtMoney(amount: number, currency: string): string {
  if (!amount) return '-';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return 999;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function deadlineBadge(days: number): string {
  if (days <= 0) return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
  if (days <= 7) return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  if (days <= 21) return 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300';
  return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
}

function deadlineLabel(days: number): string {
  if (days <= 0) return 'Closed';
  if (days <= 7) return `${days}d left`;
  if (days <= 30) return `${days}d left`;
  return `${days}d left`;
}

function relativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const day = 86400000;
  if (diff < day) return 'today';
  if (diff < 2 * day) return 'yesterday';
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function riskBadgeColor(level: string): string {
  if (level === 'low') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  if (level === 'medium') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
}

function readinessColor(score: number): string {
  if (score >= 8) return 'bg-emerald-500';
  if (score >= 5) return 'bg-amber-500';
  return 'bg-rose-500';
}

/* ─────────────────────────────────────────────────────────────────────
 * Inline Document Viewer Component
 * ───────────────────────────────────────────────────────────────────── */

function InlineDocumentViewer({ doc, onClose, tenderTitle }: { doc: InlineDocument; onClose: () => void; tenderTitle?: string }) {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const copyContent = () => {
    const text = doc.sections
      ? doc.sections.map((s) => `${s.heading}\n${s.content}`).join('\n\n')
      : doc.content;
    navigator.clipboard.writeText(text);
    toast.success('Content copied to clipboard');
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const token = localStorage.getItem('tenet_token');
      const res = await fetch('/api/tenders/fetch-doc/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: doc.url, title: tenderTitle }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Original_${(tenderTitle || 'Requirements').replace(/[^a-zA-Z0-9]/g, '_')}_Source.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('PDF exported!');
    } catch {
      toast.error('Failed to export PDF');
    }
    setExportingPdf(false);
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const token = localStorage.getItem('tenet_token');
      const res = await fetch('/api/tenders/fetch-doc/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: doc.url, title: tenderTitle }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Original_${(tenderTitle || 'Requirements').replace(/[^a-zA-Z0-9]/g, '_')}_Source.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported!');
    } catch {
      toast.error('Failed to export CSV');
    }
    setExportingCsv(false);
  };

  return (
    <div className="overflow-hidden animate-[fadeIn_0.3s_ease-out]">
      <div className="border-t border-border bg-gradient-to-b from-muted/30 to-background">
        <div className="p-4 md:p-6 space-y-4">
          {/* Document header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Full tender content loaded from {new URL(doc.url).hostname}</span>
                <span>·</span>
                <span>{new Date(doc.fetchedAt).toLocaleTimeString()}</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground leading-snug">
                {doc.title || 'Tender Document'}
              </h3>
              {doc.metaDescription && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {doc.metaDescription}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleExportPdf} disabled={exportingPdf}>
                {exportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                PDF
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleExportCsv} disabled={exportingCsv}>
                {exportingCsv ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                CSV
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={copyContent}>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open original
              </a>
              <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5 text-xs text-muted-foreground">
                <ChevronUp className="h-3.5 w-3.5" />
                Collapse
              </Button>
            </div>
          </div>

          {/* Extracted metadata pills */}
          {(doc.deadlines && doc.deadlines.length > 0) || (doc.budgets && doc.budgets.length > 0) ? (
            <div className="flex flex-wrap gap-2">
              {doc.deadlines?.map((d, i) => (
                <Badge key={`dl-${i}`} variant="outline" className="gap-1.5 text-xs border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300">
                  <Calendar className="h-3 w-3" />
                  {d}
                </Badge>
              ))}
              {doc.budgets?.map((b, i) => (
                <Badge key={`bg-${i}`} variant="outline" className="gap-1.5 text-xs border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                  <DollarSign className="h-3 w-3" />
                  {b}
                </Badge>
              ))}
            </div>
          ) : null}

          {/* Sections view */}
          {doc.sections && doc.sections.length > 0 ? (
            <div className="max-h-96 overflow-y-auto rounded-lg border border-border bg-background p-4 space-y-4 scrollbar-thin">
              {doc.sections.map((section, i) => (
                <div key={i}>
                  <h4 className="text-sm font-semibold text-foreground mb-1.5">{section.heading}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                  {i < doc.sections!.length - 1 && <Separator className="mt-4 bg-border" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-lg border border-border bg-background p-4 scrollbar-thin">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {doc.content || 'No content could be extracted from this page.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Advanced AI Deep Review - Shared Rendering Helpers
 * ───────────────────────────────────────────────────────────────────── */

const priorityColors: Record<string, string> = {
  must_win: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  critical: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  high: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  medium: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  low: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  monitor: 'bg-muted text-muted-foreground',
};

const fitColors: Record<string, string> = {
  high: 'text-emerald-600 dark:text-emerald-400',
  medium: 'text-amber-600 dark:text-amber-400',
  low: 'text-rose-600 dark:text-rose-400',
};

const riskDimColors: Record<string, string> = {
  financial: 'bg-amber-500',
  technical: 'bg-sky-500',
  legal: 'bg-violet-500',
  operational: 'bg-orange-500',
  reputational: 'bg-rose-500',
};

const riskDimIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  financial: DollarSign,
  technical: Cpu,
  legal: Scale,
  operational: Wrench,
  reputational: HeartPulse,
};

function ScoreRing({ score, max = 100, size = 56, label }: { score: number; max?: number; size?: number; label?: string }) {
  const pct = Math.min(Math.max(score / max, 0), 1);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color = pct >= 0.7 ? 'text-emerald-500' : pct >= 0.4 ? 'text-amber-500' : 'text-rose-500';
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-muted" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className={`stroke-current ${color}`} strokeWidth={4} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className={`absolute font-bold text-sm ${color}`} style={{ width: size, textAlign: 'center', lineHeight: `${size}px` }}>{score}</span>
      {label && <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Advanced AI Deep Review Content Renderer
 * ───────────────────────────────────────────────────────────────────── */

function DeepReviewContent({ review }: { review: AIReview }) {
  return (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full h-auto flex flex-wrap gap-1 bg-muted/50 p-1 mb-4">
          <TabsTrigger value="overview" className="text-xs gap-1 data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 dark:data-[state=active]:bg-violet-900/40 dark:data-[state=active]:text-violet-300"><Layers className="h-3 w-3" />Overview</TabsTrigger>
          <TabsTrigger value="strategy" className="text-xs gap-1 data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 dark:data-[state=active]:bg-violet-900/40 dark:data-[state=active]:text-violet-300"><Swords className="h-3 w-3" />Strategy</TabsTrigger>
          <TabsTrigger value="risk" className="text-xs gap-1 data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 dark:data-[state=active]:bg-violet-900/40 dark:data-[state=active]:text-violet-300"><AlertTriangle className="h-3 w-3" />Risk</TabsTrigger>
          <TabsTrigger value="financial" className="text-xs gap-1 data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 dark:data-[state=active]:bg-violet-900/40 dark:data-[state=active]:text-violet-300"><DollarSign className="h-3 w-3" />Financial</TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs gap-1 data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 dark:data-[state=active]:bg-violet-900/40 dark:data-[state=active]:text-violet-300"><ShieldCheck className="h-3 w-3" />Compliance</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs gap-1 data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 dark:data-[state=active]:bg-violet-900/40 dark:data-[state=active]:text-violet-300"><Timer className="h-3 w-3" />Timeline</TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW TAB ─── */}
        <TabsContent value="overview" className="space-y-4 mt-0">
          {/* Executive Summary */}
          <div className="rounded-lg border border-violet-200/50 dark:border-violet-800/30 bg-gradient-to-r from-violet-50/50 to-background dark:from-violet-950/20 dark:to-background p-3">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />Executive Summary
            </p>
            <p className="text-sm text-foreground leading-relaxed">{review.executiveSummary}</p>
          </div>

          {/* Score Rings */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center gap-1 relative">
              <ScoreRing score={review.opportunityScore} label="Opportunity" />
            </div>
            <div className="flex flex-col items-center gap-1 relative">
              <ScoreRing score={review.winProbability} label="Win Prob." />
            </div>
            <div className="flex flex-col items-center gap-1 relative">
              <ScoreRing score={100 - review.riskMatrix.overallRiskScore} label="Safety" />
            </div>
          </div>

          <Separator />

          {/* Priority Badge + Strategic Fit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3 space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Priority Level</p>
              <Badge className={`${priorityColors[review.bidStrategy.priorityLevel] || priorityColors.medium} border-0 text-xs capitalize`}>
                {review.bidStrategy.priorityLevel.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="rounded-lg border border-border p-3 space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Strategic Fit</p>
              <span className={`text-sm font-bold capitalize ${fitColors[review.strategicAnalysis.strategicFit]}`}>
                {review.strategicAnalysis.strategicFit}
              </span>
              <p className="text-[10px] text-muted-foreground leading-snug">{review.strategicAnalysis.strategicFitReasoning}</p>
            </div>
          </div>

          {/* SWOT */}
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-violet-500" />SWOT Analysis
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Strengths', items: review.strategicAnalysis.swot.strengths, color: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/10', icon: <CheckCircle2 className="h-3 w-3 text-emerald-500" /> },
                { label: 'Weaknesses', items: review.strategicAnalysis.swot.weaknesses, color: 'border-rose-300 dark:border-rose-700 bg-rose-50/30 dark:bg-rose-950/10', icon: <XCircle className="h-3 w-3 text-rose-500" /> },
                { label: 'Opportunities', items: review.strategicAnalysis.swot.opportunities, color: 'border-sky-300 dark:border-sky-700 bg-sky-50/30 dark:bg-sky-950/10', icon: <TrendingUp className="h-3 w-3 text-sky-500" /> },
                { label: 'Threats', items: review.strategicAnalysis.swot.threats, color: 'border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/10', icon: <AlertTriangle className="h-3 w-3 text-amber-500" /> },
              ].map(({ label, items, color, icon }) => (
                <div key={label} className={`rounded-lg border p-2.5 ${color}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1">{icon}{label}</p>
                  <ul className="space-y-1">
                    {items.map((item, i) => (
                      <li key={i} className="text-[10px] text-foreground leading-snug">{item}</li>
                    ))}
                    {items.length === 0 && <li className="text-[10px] text-muted-foreground italic">None identified</li>}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Red Flags */}
          {review.redFlags.length > 0 && (
            <div className="rounded-lg border border-rose-200/50 dark:border-rose-800/30 bg-rose-50/30 dark:bg-rose-950/10 p-3">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5" />Red Flags
              </p>
              <ul className="space-y-1">
                {review.redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400">
                    <OctagonAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        {/* ─── STRATEGY TAB ─── */}
        <TabsContent value="strategy" className="space-y-4 mt-0">
          {/* Recommended Approach */}
          <div className="rounded-lg border border-violet-200/50 dark:border-violet-800/30 bg-violet-50/30 dark:bg-violet-950/10 p-3">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />Recommended Approach
            </p>
            <p className="text-sm text-foreground leading-relaxed">{review.bidStrategy.recommendedApproach}</p>
          </div>

          {/* Key Win Factors & Differentiation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />Key Win Factors
              </p>
              <ul className="space-y-1.5">
                {review.bidStrategy.keyWinFactors.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-sky-500" />Differentiation Points
              </p>
              <ul className="space-y-1.5">
                {review.bidStrategy.differentiationPoints.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <ChevronRight className="h-3.5 w-3.5 text-sky-500 shrink-0 mt-0.5" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Competitive Intelligence */}
          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Swords className="h-3.5 w-3.5 text-violet-500" />Competitive Intelligence
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Competition</p>
                <Badge className={`${priorityColors[review.competitiveIntelligence.competitionLevel] || ''} border-0 text-xs capitalize mt-1`}>
                  {review.competitiveIntelligence.competitionLevel}
                </Badge>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Est. Bidders</p>
                <p className="text-xs font-semibold mt-1">{review.competitiveIntelligence.estimatedBidders}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Pricing</p>
                <p className="text-xs font-semibold capitalize mt-1">{review.competitiveIntelligence.pricingStrategy.replace(/_/g, ' ')}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Incumbent</p>
                <p className="text-xs font-semibold mt-1">{review.competitiveIntelligence.incumbentAdvantage ? 'Yes' : 'No'}</p>
              </div>
            </div>
            {review.competitiveIntelligence.pricingNote && (
              <p className="text-xs text-muted-foreground"><span className="font-medium">Pricing:</span> {review.competitiveIntelligence.pricingNote}</p>
            )}
            {review.competitiveIntelligence.incumbentNote && (
              <p className="text-xs text-muted-foreground"><span className="font-medium">Incumbent:</span> {review.competitiveIntelligence.incumbentNote}</p>
            )}
            {review.competitiveIntelligence.typicalCompetitors.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-muted-foreground">Typical competitors:</span>
                {review.competitiveIntelligence.typicalCompetitors.map((c, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">{c}</Badge>
                ))}
              </div>
            )}
            {review.competitiveIntelligence.differentiationStrategies.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Differentiation Strategies</p>
                <ul className="space-y-1">
                  {review.competitiveIntelligence.differentiationStrategies.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <ChevronRight className="h-3 w-3 shrink-0 mt-0.5 text-violet-500" />{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Partnership & Proposal Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {review.bidStrategy.partnershipOpportunities.length > 0 && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Handshake className="h-3.5 w-3.5 text-emerald-500" />Partnership Opportunities
                </p>
                <ul className="space-y-1.5">
                  {review.bidStrategy.partnershipOpportunities.map((p, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-emerald-500 shrink-0" />{p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {review.bidStrategy.proposalHighlights.length > 0 && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-amber-500" />Proposal Highlights
                </p>
                <ul className="space-y-1.5">
                  {review.bidStrategy.proposalHighlights.map((h, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />{h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Market Positioning */}
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-sky-500" />Market Positioning
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">{review.strategicAnalysis.marketPositioning}</p>
          </div>
        </TabsContent>

        {/* ─── RISK TAB ─── */}
        <TabsContent value="risk" className="space-y-4 mt-0">
          {/* Overall Risk Score */}
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />Overall Risk Score
              </p>
              <span className="text-sm font-bold">{review.riskMatrix.overallRiskScore}/100</span>
            </div>
            <Progress value={review.riskMatrix.overallRiskScore} className="h-3" />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-emerald-600">Low</span>
              <span className="text-[10px] text-amber-600">Medium</span>
              <span className="text-[10px] text-rose-600">High</span>
            </div>
          </div>

          {/* 5-Dimension Risk Matrix */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <PieChart className="h-3.5 w-3.5 text-violet-500" />Risk Dimensions
            </p>
            {Object.entries(review.riskMatrix.dimensions).map(([dim, data]) => {
              const DimIcon = riskDimIcons[dim] || AlertTriangle;
              const barColor = riskDimColors[dim] || 'bg-muted';
              return (
                <div key={dim} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <DimIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold capitalize">{dim}</span>
                    </div>
                    <span className="text-xs font-bold">{data.score}/10</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-1.5">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${data.score * 10}%` }} />
                  </div>
                  {data.factors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {data.factors.map((f, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{f}</span>
                      ))}
                    </div>
                  )}
                  {data.mitigation && (
                    <p className="text-[10px] text-muted-foreground"><span className="font-medium text-emerald-600 dark:text-emerald-400">Mitigation:</span> {data.mitigation}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Deal Breakers & Critical Risks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {review.riskMatrix.dealBreakers.length > 0 && (
              <div className="rounded-lg border border-rose-200/50 dark:border-rose-800/30 bg-rose-50/30 dark:bg-rose-950/10 p-3">
                <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <OctagonAlert className="h-3.5 w-3.5" />Deal Breakers
                </p>
                <ul className="space-y-1">
                  {review.riskMatrix.dealBreakers.map((d, i) => (
                    <li key={i} className="text-xs text-rose-600 dark:text-rose-400 flex items-start gap-1.5">
                      <XCircle className="h-3 w-3 shrink-0 mt-0.5" />{d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {review.riskMatrix.criticalRisks.length > 0 && (
              <div className="rounded-lg border border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/10 p-3">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />Critical Risks
                </p>
                <ul className="space-y-1">
                  {review.riskMatrix.criticalRisks.map((r, i) => (
                    <li key={i} className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-500 shrink-0" />{r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── FINANCIAL TAB ─── */}
        <TabsContent value="financial" className="space-y-4 mt-0">
          {/* Budget Fit */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Budget Fit</p>
              <Badge className={`border-0 text-xs capitalize mt-1 ${review.financialAnalysis.budgetFit === 'well_within' ? 'bg-emerald-50 text-emerald-700' : review.financialAnalysis.budgetFit === 'within' ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'}`}>
                {review.financialAnalysis.budgetFit.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">ROI Potential</p>
              <Badge className={`border-0 text-xs capitalize mt-1 ${review.financialAnalysis.estimatedROI === 'very_high' || review.financialAnalysis.estimatedROI === 'high' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {review.financialAnalysis.estimatedROI.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Margins</p>
              <Badge className={`border-0 text-xs capitalize mt-1 ${review.financialAnalysis.marginPotential === 'strong' || review.financialAnalysis.marginPotential === 'healthy' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {review.financialAnalysis.marginPotential}
              </Badge>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs text-foreground leading-relaxed"><span className="font-semibold">Budget Analysis:</span> {review.financialAnalysis.budgetFitReasoning}</p>
            <p className="text-xs text-foreground leading-relaxed"><span className="font-semibold">ROI Analysis:</span> {review.financialAnalysis.roiReasoning}</p>
            <p className="text-xs text-foreground leading-relaxed"><span className="font-semibold">Payment Terms:</span> {review.financialAnalysis.paymentTermsNote} <Badge className={`ml-1 border-0 text-[10px] ${review.financialAnalysis.paymentTermsRisk === 'low' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{review.financialAnalysis.paymentTermsRisk} risk</Badge></p>
          </div>

          {/* Cost Breakdown */}
          {review.financialAnalysis.costStructureBreakdown.length > 0 && (
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <PieChart className="h-3.5 w-3.5 text-violet-500" />Cost Structure Breakdown
              </p>
              <ul className="space-y-1.5">
                {review.financialAnalysis.costStructureBreakdown.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-violet-500 shrink-0" />{c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Financial Risks */}
          {review.financialAnalysis.financialRisks.length > 0 && (
            <div className="rounded-lg border border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/10 p-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />Financial Risks
              </p>
              <ul className="space-y-1">
                {review.financialAnalysis.financialRisks.map((r, i) => (
                  <li key={i} className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />{r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        {/* ─── COMPLIANCE TAB ─── */}
        <TabsContent value="compliance" className="space-y-4 mt-0">
          {/* Overall Compliance */}
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />Compliance Score
              </p>
              <span className="text-sm font-bold">{review.complianceAnalysis.complianceScore}/100</span>
            </div>
            <Progress value={review.complianceAnalysis.complianceScore} className="h-3" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Compliance Status */}
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Status</p>
              <Badge className={`border-0 text-xs capitalize ${review.complianceAnalysis.overallCompliance === 'fully_compliant' ? 'bg-emerald-50 text-emerald-700' : review.complianceAnalysis.overallCompliance === 'partially_compliant' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                {review.complianceAnalysis.overallCompliance.replace(/_/g, ' ')}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{review.complianceAnalysis.regulatoryFramework}</p>
            </div>

            {/* Eligibility Deep Dive */}
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Eligibility</p>
              <div className="flex items-center gap-2 mb-1">
                {review.eligibilityDeepDive.overallEligible ? (
                  <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 gap-1 text-xs">
                    <CheckCircle2 className="h-3 w-3" />Eligible
                  </Badge>
                ) : (
                  <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-0 gap-1 text-xs">
                    <XCircle className="h-3 w-3" />Not Eligible
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px]">Confidence: {review.eligibilityDeepDive.confidenceLevel}</Badge>
              </div>
              {review.eligibilityDeepDive.blockers.length > 0 && (
                <ul className="space-y-1 mb-2">
                  {review.eligibilityDeepDive.blockers.map((b, i) => (
                    <li key={i} className="text-xs text-rose-600 dark:text-rose-400 flex items-start gap-1.5">
                      <XCircle className="h-3 w-3 shrink-0 mt-0.5" />{b}
                    </li>
                  ))}
                </ul>
              )}
              {review.eligibilityDeepDive.warnings.length > 0 && (
                <ul className="space-y-1">
                  {review.eligibilityDeepDive.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />{w}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Eligibility Criteria */}
          {review.eligibilityDeepDive.criteria.length > 0 && (
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-violet-500" />Eligibility Criteria Breakdown
              </p>
              <div className="space-y-2">
                {review.eligibilityDeepDive.criteria.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {c.met ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : c.partial ? (
                      <CircleDashed className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <span className="font-medium text-foreground">{c.criterion}</span>
                      <span className="text-muted-foreground ml-1">— {c.note}</span>
                      {c.severity === 'blocker' && <Badge className="ml-1.5 bg-rose-50 text-rose-700 border-0 text-[10px]">Blocker</Badge>}
                      {c.severity === 'warning' && <Badge className="ml-1.5 bg-amber-50 text-amber-700 border-0 text-[10px]">Warning</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications & Documents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-amber-500" />Mandatory Certifications
              </p>
              <div className="flex flex-wrap gap-1.5">
                {review.complianceAnalysis.mandatoryCertifications.map((c, i) => (
                  <Badge key={i} className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-0 text-[10px]">{c}</Badge>
                ))}
                {review.complianceAnalysis.mandatoryCertifications.length === 0 && <span className="text-xs text-muted-foreground italic">None specified</span>}
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-sky-500" />Required Documents
              </p>
              <div className="flex flex-wrap gap-1.5">
                {review.complianceAnalysis.documentationRequirements.map((d, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">{d}</Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Compliance Gaps */}
          {review.complianceAnalysis.complianceGaps.length > 0 && (
            <div className="rounded-lg border border-rose-200/50 dark:border-rose-800/30 bg-rose-50/30 dark:bg-rose-950/10 p-3">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <OctagonAlert className="h-3.5 w-3.5" />Compliance Gaps
              </p>
              <ul className="space-y-1">
                {review.complianceAnalysis.complianceGaps.map((g, i) => (
                  <li key={i} className="text-xs text-rose-600 dark:text-rose-400 flex items-start gap-1.5">
                    <ArrowRight className="h-3 w-3 shrink-0 mt-0.5" />{g}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        {/* ─── TIMELINE TAB ─── */}
        <TabsContent value="timeline" className="space-y-4 mt-0">
          {/* Deadline Assessment */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Deadline</p>
              <Badge className={`border-0 text-xs capitalize mt-1 ${review.timelineAnalysis.deadlineAssessment === 'comfortable' ? 'bg-emerald-50 text-emerald-700' : review.timelineAnalysis.deadlineAssessment === 'tight' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                {review.timelineAnalysis.deadlineAssessment.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Days Left</p>
              <p className="text-lg font-bold mt-1">{review.timelineAnalysis.daysToDeadline}</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Start Before</p>
              <p className="text-lg font-bold mt-1">{review.timelineAnalysis.recommendedStartDaysBefore}d</p>
            </div>
          </div>

          {/* Milestones */}
          {review.timelineAnalysis.milestones.length > 0 && (
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Milestone className="h-3.5 w-3.5 text-violet-500" />Preparation Milestones
              </p>
              <div className="space-y-2">
                {review.timelineAnalysis.milestones.map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-violet-600 dark:text-violet-300">{i + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">{m.phase}</p>
                      <p className="text-[10px] text-muted-foreground">{m.duration} · {m.deadline}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Complexity */}
          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-sky-500" />Technical Complexity
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Level</p>
                <Badge className={`border-0 text-xs capitalize mt-1 ${review.technicalComplexity.level === 'low' ? 'bg-emerald-50 text-emerald-700' : review.technicalComplexity.level === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                  {review.technicalComplexity.level.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Duration</p>
                <p className="text-xs font-semibold mt-1">{review.technicalComplexity.estimatedDuration}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{review.technicalComplexity.reasoning}</p>
            {review.technicalComplexity.keyTechnologies.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-muted-foreground">Key tech:</span>
                {review.technicalComplexity.keyTechnologies.map((t, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">{t}</Badge>
                ))}
              </div>
            )}
            {review.technicalComplexity.expertiseRequired.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-muted-foreground">Expertise:</span>
                {review.technicalComplexity.expertiseRequired.map((e, i) => (
                  <Badge key={i} className="bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-0 text-[10px]">{e}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Critical Path */}
          {review.timelineAnalysis.criticalPathItems.length > 0 && (
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-amber-500" />Critical Path Items
              </p>
              <ul className="space-y-1">
                {review.timelineAnalysis.criticalPathItems.map((item, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-500 shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Always-visible bottom section: Action Items & Value Add ─── */}
      <Separator className="my-4" />

      {/* Actionable Recommendations */}
      {review.actionableRecommendations.length > 0 && (
        <div className="rounded-lg border border-violet-200/50 dark:border-violet-800/30 bg-gradient-to-r from-violet-50/30 to-background dark:from-violet-950/10 dark:to-background p-3 mb-3">
          <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />Actionable Recommendations
          </p>
          <div className="space-y-2">
            {review.actionableRecommendations
              .sort((a, b) => {
                const order = { critical: 0, high: 1, medium: 2, low: 3 };
                return (order[a.priority as keyof typeof order] ?? 3) - (order[b.priority as keyof typeof order] ?? 3);
              })
              .map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <Badge className={`${priorityColors[rec.priority] || ''} border-0 text-[10px] capitalize shrink-0`}>
                    {rec.priority}
                  </Badge>
                  <div className="min-w-0">
                    <span className="text-foreground">{rec.action}</span>
                    <span className="text-muted-foreground ml-1">· {rec.timeline}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Value Add Opportunities */}
      {review.valueAddOpportunities.length > 0 && (
        <div className="rounded-lg border border-emerald-200/50 dark:border-emerald-800/30 bg-emerald-50/30 dark:bg-emerald-950/10 p-3">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />Value-Add Opportunities
          </p>
          <div className="space-y-2">
            {review.valueAddOpportunities.map((v, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className="flex gap-1 shrink-0">
                  <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 text-[10px]">{v.impact} impact</Badge>
                  <Badge variant="outline" className="text-[10px]">{v.effort} effort</Badge>
                </div>
                <span className="text-muted-foreground">{v.opportunity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bid Strategy Summary Footer */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-[10px] text-muted-foreground uppercase">Prep Time</p>
          <p className="text-xs font-semibold mt-0.5">{review.bidStrategy.estimatedPrepTime}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-[10px] text-muted-foreground uppercase">Resources</p>
          <p className="text-xs font-semibold mt-0.5">{review.bidStrategy.resourceRequirements}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-[10px] text-muted-foreground uppercase">Impl. Duration</p>
          <p className="text-xs font-semibold mt-0.5">{review.technicalComplexity.estimatedDuration}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * AI Review Panel Component (Side Panel)
 * ───────────────────────────────────────────────────────────────────── */

function AIReviewPanel({
  review,
  isLoading,
}: {
  review: AIReview | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="border-t border-border bg-gradient-to-b from-violet-50/30 to-background dark:from-violet-950/10 dark:to-background p-4 md:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" />
          <span className="text-sm font-medium text-violet-700 dark:text-violet-300">Generating Deep AI Review…</span>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }

  if (!review) return null;

  return (
    <div className="border-t border-border bg-gradient-to-b from-violet-50/30 to-background dark:from-violet-950/10 dark:to-background p-4 md:p-5 animate-[fadeIn_0.3s_ease-out]">
      <DeepReviewContent review={review} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Credential Dialog Component
 * ───────────────────────────────────────────────────────────────────── */

function CredentialDialog({
  source,
  open,
  onOpenChange,
}: {
  source: GatedSource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!source) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {source.credentialType === 'api_key' ? (
              <Lock className="h-5 w-5 text-amber-500" />
            ) : (
              <Globe2 className="h-5 w-5 text-emerald-500" />
            )}
            Enable {source.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{source.description}</p>
          {source.credentialType === 'api_key' ? (
            <>
              <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">Required Environment Variable</p>
                <code className="block text-sm font-mono bg-background px-3 py-2 rounded border border-border">
                  {source.envVar}=your_api_key_here
                </code>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">To enable this data source:</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Sign up at <a href={source.docsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">{source.name} <ArrowUpRight className="h-2.5 w-2.5" /></a></li>
                  <li>Generate an API key from your dashboard</li>
                  <li>Add <code className="px-1 py-0.5 rounded bg-muted">{source.envVar}</code> to your environment</li>
                  <li>Restart the application server</li>
                </ol>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/80 dark:bg-emerald-950/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">No Credentials Required</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300/80">
                {source.name} is an open source data source. It should be automatically available once the integration module is enabled.
              </p>
            </div>
          )}
          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Close
            </Button>
            <a
              href={source.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button className="w-full gap-1.5">
                View Documentation
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Single Tender Card Component - detailed, World Bank style for ALL sources
 * ───────────────────────────────────────────────────────────────────── */

function TenderCard({
  tender,
  accent,
  isSaved,
  isSaving,
  isExpanded,
  isLoadingDoc,
  doc,
  docErr,
  showAiReview,
  aiLoading,
  aiReview,
  isDetailOpen,
  onToggleSave,
  onLoadDocument,
  onLoadAIReview,
  onImport,
  onCardClick,
  onStartBidApplication,
}: {
  tender: LiveTender;
  accent: typeof SOURCE_ACCENT[string];
  isSaved: boolean;
  isSaving: boolean;
  isExpanded: boolean;
  isLoadingDoc: boolean;
  doc: InlineDocument | undefined;
  docErr: string | undefined;
  showAiReview: boolean;
  aiLoading: boolean;
  aiReview: AIReview | null;
  isDetailOpen: boolean;
  onToggleSave: () => void;
  onLoadDocument: () => void;
  onLoadAIReview: () => void;
  onImport: () => void;
  onCardClick: () => void;
  onStartBidApplication: () => void;
}) {
  const SourceIcon = accent.icon;
  const days = daysUntil(tender.deadline);

  const hasBudget = !!(tender.budgetMin || tender.budgetMax);
  const hasLocation = !!tender.location;
  const hasDeadline = !!tender.deadline;
  const hasBorrower = !!(tender.borrower || tender.supplier);
  const hasContractType = !!tender.contractType;
  const hasRegion = !!tender.region;
  const metaFieldCount = [hasBudget, hasLocation, hasDeadline, hasBorrower, hasContractType, hasRegion].filter(Boolean).length;

  return (
    <Card className={`bg-card border-border transition-all ${accent.ring} ${isDetailOpen ? 'ring-1 ring-primary/20 shadow-md' : ''}`}>
      <CardContent className="p-0">
        {/* Main card content - clickable to open detail view */}
        <div
          className="p-4 md:p-5 relative cursor-pointer"
          onClick={onCardClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCardClick(); }}
          aria-expanded={isDetailOpen}
        >

          {/* ── Right corner: In Bids badge (if saved) + Move to Bid button ── */}
          <div className="absolute top-3 right-3 md:top-4 md:right-4 flex items-center gap-1.5">
            {isSaved && (
              <Badge
                className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 gap-1 text-[10px] cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
                onClick={(e) => { e.stopPropagation(); onStartBidApplication(); }}
              >
                <BookmarkCheck className="h-3 w-3" />
                In Bids
              </Badge>
            )}
            <Button
              variant={isSaved ? 'default' : 'outline'}
              size="sm"
              className={`h-8 gap-1.5 text-xs rounded-full ${isSaved
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }`}
              onClick={(e) => { e.stopPropagation(); onToggleSave(); }}
              disabled={isSaving}
              title={isSaved ? 'Added to Bids - click to remove' : 'Move to Bids'}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isSaved ? (
                <>
                  <Gavel className="h-3.5 w-3.5" />
                  In Bids
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Bid
                </>
              )}
            </Button>
          </div>

          {/* ── Top row: source badge + status + relative time ── */}
          <div className="flex items-center justify-between gap-2 mb-3 pr-24">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${accent.badge}`}
              >
                <SourceIcon className="h-3 w-3" />
                {SOURCE_LABELS[tender.source] || tender.source}
              </span>
              {tender.status === 'awarded' ? (
                <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                  Contract Award
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                  Open Notice
                </Badge>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground hidden md:inline-flex items-center gap-1 shrink-0">
              <Clock className="h-3 w-3" />
              {tender.signingDate
                ? `Signed ${relativeTime(tender.signingDate)}`
                : `Published ${relativeTime(tender.createdAt)}`}
            </span>
          </div>

          {/* ── Title ── */}
          <h3 className="text-base md:text-lg font-semibold text-foreground leading-snug line-clamp-2 pr-24">
            {tender.title}
          </h3>

          {/* ── Scope preview ── */}
          {tender.scope && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
              {tender.scope}
            </p>
          )}

          {/* Document/Requirement files indicator */}
          {(tender.documentUrl || (tender.requiredDocs && tender.requiredDocs.startsWith('http')) || (tender.documentFiles && tender.documentFiles.length > 0)) && (
            <div className="flex items-center gap-1.5 mt-2">
              <FileSearch className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">Requirement Documents Available</span>
              {tender.documentFiles && tender.documentFiles.length > 0 && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-emerald-200 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 ml-0.5">
                  {tender.documentFiles.length} file{tender.documentFiles.length !== 1 ? 's' : ''}
                </Badge>
              )}
              <a
                href={tender.documentUrl || tender.requiredDocs}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline ml-auto flex items-center gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                View <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          )}

          {/* ── Rich meta grid ── */}
          {metaFieldCount > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
              {hasBudget && (
                <div className="flex items-center gap-1.5 text-xs">
                  <DollarSign className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-medium text-foreground truncate">
                    {tender.budgetMin && tender.budgetMax
                      ? `${fmtMoney(tender.budgetMin, tender.currency).replace(/\.00/, '')} – ${fmtMoney(tender.budgetMax, tender.currency).replace(/\.00/, '')}`
                      : fmtMoney(tender.budgetMax || tender.budgetMin, tender.currency)}
                  </span>
                </div>
              )}
              {hasLocation && (
                <div className="flex items-center gap-1.5 text-xs">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium text-foreground truncate max-w-[140px]">{tender.location}</span>
                </div>
              )}
              {hasDeadline && (
                <div className={`inline-flex items-center gap-1.5 text-xs px-1.5 py-0.5 rounded w-fit ${deadlineBadge(days)}`}>
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium">{deadlineLabel(days)}</span>
                </div>
              )}
              {hasBorrower && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                  <span className="text-muted-foreground">{tender.borrower ? 'Borrower:' : 'Org:'}</span>
                  <span className="font-medium text-foreground truncate max-w-[140px]">{tender.borrower || tender.supplier}</span>
                </div>
              )}
              {hasContractType && (
                <div className="flex items-center gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium text-foreground truncate">{tender.contractType}</span>
                </div>
              )}
              {hasRegion && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Globe2 className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                  <span className="text-muted-foreground">Region:</span>
                  <span className="font-medium text-foreground truncate">{tender.region}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Category tags ── */}
          {((tender.categoryTags && tender.categoryTags.split(',').filter(Boolean).length > 0) || tender.contractType) && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tender.categoryTags
                .split(',')
                .filter(Boolean)
                .slice(0, 5)
                .map((c) => (
                  <span
                    key={c}
                    className="text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                  >
                    {c.trim()}
                  </span>
                ))}
            </div>
          )}

          {/* ── External link preview ── */}
          {tender.externalUrl && (
            <div className="mt-3 flex items-center gap-2">
              <a
                href={tender.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View on {SOURCE_LABELS[tender.source] || 'source site'}
              </a>
              <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                {(() => { try { return new URL(tender.externalUrl).hostname; } catch { return tender.externalUrl; } })()}
              </span>
            </div>
          )}

          {/* ── Bottom action bar ── */}
          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Expand / Collapse detail view */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={(e) => { e.stopPropagation(); onCardClick(); }}
              >
                {isDetailOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {isDetailOpen ? 'Collapse' : 'View Details'}
              </Button>
              {/* See More - loads the full tender content from the external site */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={(e) => { e.stopPropagation(); onLoadDocument(); }}
                disabled={isLoadingDoc}
              >
                {isLoadingDoc ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                {isLoadingDoc ? 'Loading…' : isExpanded ? 'Collapse Doc' : 'See More'}
              </Button>
              {/* AI Review */}
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1.5 text-xs h-7 ${showAiReview ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-950/40' : 'text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30'}`}
                onClick={(e) => { e.stopPropagation(); onLoadAIReview(); }}
                disabled={aiLoading}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {aiLoading ? 'Analyzing…' : showAiReview ? 'Hide Review' : 'Deep Review'}
              </Button>
              {/* Import to local */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs h-7 text-primary"
                onClick={(e) => { e.stopPropagation(); onImport(); }}
              >
                <Download className="h-3.5 w-3.5" />
                Import
              </Button>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <InlineTranslator text={tender.scope || tender.title} size="sm" className="hidden md:flex" />
            </div>
          </div>
        </div>

        {/* ── Detail View: expanded full information ── */}
        {isDetailOpen && (
          <div className="border-t border-border bg-gradient-to-b from-muted/20 to-background animate-[fadeIn_0.3s_ease-out]">
            <div className="p-4 md:p-6 space-y-5">
              {/* Detail header with close */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <FileSearch className="h-3.5 w-3.5" />
                    <span>Full Tender Details</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />
                      {SOURCE_LABELS[tender.source] || tender.source}
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-foreground leading-snug">
                    {tender.title}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCardClick}
                  className="gap-1.5 text-xs text-muted-foreground shrink-0"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  Collapse
                </Button>
              </div>

              {/* ── Tender Document Content (PRIMARY - shown first) ── */}
              <div className="rounded-lg border border-primary/20 bg-gradient-to-b from-primary/5 to-background p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Tender Document Content</p>
                      <p className="text-xs text-muted-foreground">Full notice text, requirements &amp; specifications</p>
                    </div>
                  </div>
                  {tender.externalUrl && (
                    <a
                      href={tender.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Full Document
                    </a>
                  )}
                </div>

                {/* Document loading / content states */}
                {isLoadingDoc && (
                  <div className="space-y-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Fetching document content from source…
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-5/6" />
                      <Skeleton className="h-3 w-4/5" />
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                )}

                {docErr && !isLoadingDoc && (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                        Could not load document content
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
                        {docErr}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs h-7 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300"
                          onClick={(e) => { e.stopPropagation(); onLoadDocument(); }}
                        >
                          <RefreshCw className="h-3 w-3" />
                          Retry
                        </Button>
                        {tender.externalUrl && (
                          <a
                            href={tender.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Open original page →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {doc && !isLoadingDoc && (
                  <div className="space-y-3">
                    {/* Document meta info */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Content loaded from {(() => { try { return new URL(doc.url).hostname; } catch { return 'source'; } })()}</span>
                      <span>·</span>
                      <span>{new Date(doc.fetchedAt).toLocaleTimeString()}</span>
                      <div className="flex items-center gap-1 ml-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs h-6 px-1.5"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const token = localStorage.getItem('tenet_token');
                              const res = await fetch('/api/tenders/fetch-doc/export-pdf', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ url: doc.url, title: tender.title }),
                              });
                              if (!res.ok) throw new Error('Export failed');
                              const blob = await res.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `Original_${(tender.title || 'Requirements').replace(/[^a-zA-Z0-9]/g, '_')}_Source.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(url);
                              toast.success('PDF exported!');
                            } catch {
                              toast.error('Failed to export PDF');
                            }
                          }}
                        >
                          <FileDown className="h-3 w-3" />
                          PDF
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs h-6 px-1.5"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const token = localStorage.getItem('tenet_token');
                              const res = await fetch('/api/tenders/fetch-doc/export-csv', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ url: doc.url, title: tender.title }),
                              });
                              if (!res.ok) throw new Error('Export failed');
                              const blob = await res.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `Original_${(tender.title || 'Requirements').replace(/[^a-zA-Z0-9]/g, '_')}_Source.csv`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(url);
                              toast.success('CSV exported!');
                            } catch {
                              toast.error('Failed to export CSV');
                            }
                          }}
                        >
                          <FileSpreadsheet className="h-3 w-3" />
                          CSV
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs h-6 px-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            const text = doc.sections
                              ? doc.sections.map((s) => `${s.heading}\n${s.content}`).join('\n\n')
                              : doc.content;
                            navigator.clipboard.writeText(text);
                            toast.success('Content copied to clipboard');
                          }}
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </Button>
                      </div>
                    </div>

                    {/* Extracted metadata pills */}
                    {(doc.deadlines && doc.deadlines.length > 0) || (doc.budgets && doc.budgets.length > 0) ? (
                      <div className="flex flex-wrap gap-2">
                        {doc.deadlines?.map((d, i) => (
                          <Badge key={`dl-${i}`} variant="outline" className="gap-1.5 text-xs border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300">
                            <Calendar className="h-3 w-3" />
                            {d}
                          </Badge>
                        ))}
                        {doc.budgets?.map((b, i) => (
                          <Badge key={`bg-${i}`} variant="outline" className="gap-1.5 text-xs border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                            <DollarSign className="h-3 w-3" />
                            {b}
                          </Badge>
                        ))}
                      </div>
                    ) : null}

                    {/* Document content - sections or raw text */}
                    {doc.sections && doc.sections.length > 0 ? (
                      <div className="max-h-96 overflow-y-auto rounded-lg border border-border bg-background p-4 space-y-4 scrollbar-thin">
                        {doc.sections.map((section, i) => (
                          <div key={i}>
                            <h4 className="text-sm font-semibold text-foreground mb-1.5">{section.heading}</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                              {section.content}
                            </p>
                            {i < doc.sections!.length - 1 && <Separator className="mt-4 bg-border" />}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto rounded-lg border border-border bg-background p-4 scrollbar-thin">
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {doc.content || 'No content could be extracted from this page.'}
                        </p>
                      </div>
                    )}

                    {/* Translator for document content */}
                    <InlineTranslator text={doc.content || tender.scope || tender.title} size="sm" />
                  </div>
                )}

                {/* Load button - shown when doc not yet loaded and not loading */}
                {!doc && !isLoadingDoc && !docErr && (
                  <div className="py-2 space-y-3">
                    <Button
                      className="gap-2 w-full sm:w-auto"
                      onClick={(e) => { e.stopPropagation(); onLoadDocument(); }}
                    >
                      <Eye className="h-4 w-4" />
                      Load Document Content
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Fetch the full tender notice text, requirements, and specifications from the source site.
                    </p>
                    {/* View Requirements link - when requiredDocs has a URL */}
                    {tender.requiredDocs && tender.requiredDocs.startsWith('http') && (
                      <a
                        href={tender.requiredDocs}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        View Requirement Documents
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Document Files list */}
              {tender.documentFiles && tender.documentFiles.length > 0 && (
                <div className="rounded-lg border border-sky-200/60 dark:border-sky-800/40 bg-sky-50/40 dark:bg-sky-950/20 p-2.5 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <FileSearch className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                    <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 uppercase tracking-wide">Requirement Files</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-sky-200 dark:border-sky-700 text-sky-600 dark:text-sky-400">
                      {tender.documentFiles.length}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {tender.documentFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[10px]">
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-white dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 font-mono text-sky-700 dark:text-sky-300">
                          {file.type}
                        </span>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {file.name}
                        </a>
                        <span className="text-muted-foreground ml-auto shrink-0">{file.size}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── AI Review Section (inline in detail view) ── */}
              <div className="rounded-lg border border-violet-200/50 dark:border-violet-800/30 bg-gradient-to-b from-violet-50/30 to-background dark:from-violet-950/10 dark:to-background p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Deep AI Review</p>
                      <p className="text-xs text-muted-foreground">Multi-dimensional strategy, risk &amp; compliance analysis</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-1.5 text-xs h-8 ${showAiReview ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30' : 'text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30'}`}
                    onClick={(e) => { e.stopPropagation(); onLoadAIReview(); }}
                    disabled={aiLoading}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {aiLoading ? 'Analyzing…' : showAiReview ? 'Hide Review' : 'Run Deep Review'}
                  </Button>
                </div>

                {/* AI Review inline content */}
                {aiLoading && !aiReview && (
                  <div className="space-y-3 py-1">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                      <span className="text-xs text-muted-foreground">Generating deep multi-dimensional analysis…</span>
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-5/6" />
                      <div className="grid grid-cols-3 gap-2">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </div>
                  </div>
                )}

                {showAiReview && aiReview && (
                  <DeepReviewContent review={aiReview} />
                )}

                {/* Prompt to run AI review if not yet started */}
                {!showAiReview && !aiLoading && (
                  <p className="text-xs text-muted-foreground">
                    Click &quot;Run Deep Review&quot; for a comprehensive multi-dimensional analysis covering strategy, risk, financial, compliance, and timeline.
                  </p>
                )}
              </div>

              {/* ── Metadata / Classification Info (after document content) ── */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <FolderKanban className="h-3.5 w-3.5" />
                  Tender Classification &amp; Details
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Scope / Description */}
                  {tender.scope && (
                    <div className="md:col-span-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        Scope of Work
                      </p>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                        {tender.scope}
                      </p>
                    </div>
                  )}

                  {/* Budget */}
                  {hasBudget && (
                    <div className="rounded-lg border border-emerald-200/50 dark:border-emerald-800/30 bg-emerald-50/30 dark:bg-emerald-950/20 p-3">
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5" />
                        Budget Range
                      </p>
                      <p className="text-base font-bold text-foreground">
                        {tender.budgetMin && tender.budgetMax
                          ? `${fmtMoney(tender.budgetMin, tender.currency).replace(/\.00/, '')} – ${fmtMoney(tender.budgetMax, tender.currency).replace(/\.00/, '')}`
                          : fmtMoney(tender.budgetMax || tender.budgetMin, tender.currency)}
                      </p>
                      {tender.currency && tender.currency !== 'USD' && (
                        <p className="text-xs text-muted-foreground mt-0.5">Currency: {tender.currency}</p>
                      )}
                    </div>
                  )}

                  {/* Deadline */}
                  {hasDeadline && (
                    <div className={`rounded-lg border p-3 ${days <= 7
                      ? 'border-rose-200/50 dark:border-rose-800/30 bg-rose-50/30 dark:bg-rose-950/20'
                      : 'border-sky-200/50 dark:border-sky-800/30 bg-sky-50/30 dark:bg-sky-950/20'
                    }`}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Deadline
                      </p>
                      <p className="text-base font-bold text-foreground">
                        {new Date(tender.deadline).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      <p className={`text-xs mt-0.5 font-medium ${days <= 0 ? 'text-rose-600 dark:text-rose-400' : days <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                        {days <= 0 ? 'Deadline has passed' : `${days} days remaining`}
                      </p>
                    </div>
                  )}

                  {/* Location */}
                  {hasLocation && (
                    <div className="rounded-lg border border-sky-200/50 dark:border-sky-800/30 bg-sky-50/30 dark:bg-sky-950/20 p-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        Location
                      </p>
                      <p className="text-sm font-bold text-foreground">{tender.location}</p>
                    </div>
                  )}

                  {/* Borrower / Organization */}
                  {hasBorrower && (
                    <div className="rounded-lg border border-violet-200/50 dark:border-violet-800/30 bg-violet-50/30 dark:bg-violet-950/20 p-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {tender.borrower ? 'Borrower' : 'Organization'}
                      </p>
                      <p className="text-sm font-bold text-foreground">{tender.borrower || tender.supplier}</p>
                    </div>
                  )}

                  {/* Contract Type */}
                  {hasContractType && (
                    <div className="rounded-lg border border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/20 p-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        Contract Type
                      </p>
                      <p className="text-sm font-bold text-foreground">{tender.contractType}</p>
                    </div>
                  )}

                  {/* Region */}
                  {hasRegion && (
                    <div className="rounded-lg border border-rose-200/50 dark:border-rose-800/30 bg-rose-50/30 dark:bg-rose-950/20 p-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
                        <Globe2 className="h-3.5 w-3.5" />
                        Region
                      </p>
                      <p className="text-sm font-bold text-foreground">{tender.region}</p>
                    </div>
                  )}

                  {/* Source Info */}
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <Radio className="h-3.5 w-3.5" />
                      Source
                    </p>
                    <div className="flex items-center gap-2">
                      <SourceIcon className="h-4 w-4" />
                      <span className="text-sm font-bold text-foreground">{SOURCE_LABELS[tender.source] || tender.source}</span>
                    </div>
                    {tender.externalId && (
                      <p className="text-xs text-muted-foreground mt-1">External ID: {tender.externalId}</p>
                    )}
                    {tender.signingDate && (
                      <p className="text-xs text-muted-foreground mt-0.5">Signed: {new Date(tender.signingDate).toLocaleDateString()}</p>
                    )}
                  </div>

                  {/* Category Tags */}
                  {(tender.categoryTags && tender.categoryTags.split(',').filter(Boolean).length > 0) && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <FolderKanban className="h-3.5 w-3.5" />
                        Categories &amp; Sectors
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {tender.categoryTags
                          .split(',')
                          .filter(Boolean)
                          .map((c) => (
                            <span
                              key={c}
                              className="text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                            >
                              {c.trim()}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* External URL */}
              {tender.externalUrl && (
                <div className="flex items-center gap-3 pt-2">
                  <a
                    href={tender.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Original on {SOURCE_LABELS[tender.source] || 'source site'}
                  </a>
                  <span className="text-xs text-muted-foreground">
                    {(() => { try { return new URL(tender.externalUrl).hostname; } catch { return tender.externalUrl; } })()}
                  </span>
                </div>
              )}

              {/* Action Buttons in Detail View */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                <Button
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={(e) => { e.stopPropagation(); onStartBidApplication(); }}
                >
                  <Gavel className="h-4 w-4" />
                  Start Bid Application
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
                  onClick={(e) => { e.stopPropagation(); onImport(); }}
                >
                  <Download className="h-4 w-4" />
                  Import to My Tenders
                </Button>
                {tender.externalUrl && (
                  <a
                    href={tender.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="outline" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Open Original
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Inline document viewer - only shown when detail view is NOT open */}
        {isExpanded && !isDetailOpen && (
          <>
            {isLoadingDoc && (
              <div className="border-t border-border p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground animate-[fadeIn_0.3s_ease-out]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching full tender content from the source site…
              </div>
            )}
            {docErr && !isLoadingDoc && (
              <div className="border-t border-border p-6 animate-[fadeIn_0.3s_ease-out]">
                <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 flex items-start gap-3">
                  <ServerCrash className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                      Could not load the full tender content
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
                      {docErr} - you can still{' '}
                      <a
                        href={tender.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium"
                      >
                        view the original page directly
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>
            )}
            {doc && !isLoadingDoc && (
              <InlineDocumentViewer
                doc={doc}
                onClose={() => {/* handled by parent */}}
                tenderTitle={tender.title}
              />
            )}
            {/* Translator for document content */}
            {(doc?.content || tender.scope) && !isLoadingDoc && (
              <div className="border-t border-border px-4 py-2.5">
                <InlineTranslator text={doc?.content || tender.scope} />
              </div>
            )}
          </>
        )}

        {/* AI Review Panel - only shown when detail view is NOT open */}
        {showAiReview && !isDetailOpen && (
          <AIReviewPanel
            review={aiReview}
            isLoading={aiLoading}
          />
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Main LiveTendersView component
 * ───────────────────────────────────────────────────────────────────── */

export function LiveTendersView() {
  const [tenders, setTenders] = useState<LiveTender[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [sourceMeta, setSourceMeta] = useState<
    { id: string; name: string; live: boolean; ok: boolean; count: number; error?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [lastRefreshedText, setLastRefreshedText] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sectorFilter, setSectorFilter] = useState('');
  const [sectorCounts, setSectorCounts] = useState<{ id: string; label: string; count: number }[]>([]);

  // Server-side pagination state
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalAvailable, setTotalAvailable] = useState(0);

  // Inline document state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState<string | null>(null);
  const [docData, setDocData] = useState<Record<string, InlineDocument>>({});
  const [docError, setDocError] = useState<Record<string, string>>({});

  // AI Review state
  const [aiReviewData, setAiReviewData] = useState<Record<string, AIReview>>({});
  const [aiReviewLoading, setAiReviewLoading] = useState<Record<string, boolean>>({});
  const [aiReviewExpanded, setAiReviewExpanded] = useState<Record<string, boolean>>({});

  // Saved/bookmark state
  const [savedTenders, setSavedTenders] = useState<Record<string, boolean>>({});
  const [savingTender, setSavingTender] = useState<Record<string, boolean>>({});

  // Import state
  const [importing, setImporting] = useState<string | null>(null);

  // Credential dialog state
  const [credDialogSource, setCredDialogSource] = useState<GatedSource | null>(null);
  const [credDialogOpen, setCredDialogOpen] = useState(false);

  // Detail view state (card click expands full info)
  const [detailOpenId, setDetailOpenId] = useState<string | null>(null);

  // Dashboard stats state
  const [dashTenders, setDashTenders] = useState<Tender[]>([]);
  const [dashBids, setDashBids] = useState<Bid[]>([]);
  const [dashProjects, setDashProjects] = useState<Project[]>([]);
  const [dashStatsLoading, setDashStatsLoading] = useState(true);

  const { setView } = useNavStore();

  // Fetch dashboard summary data on mount
  useEffect(() => {
    const loadDashStats = async () => {
      setDashStatsLoading(true);
      const [tendersRes, bidsRes, projectsRes] = await Promise.all([
        api.get('/tenders'),
        api.get('/bids'),
        api.get('/projects'),
      ]);
      if (tendersRes.success) setDashTenders(tendersRes.data);
      if (bidsRes.success) setDashBids(bidsRes.data);
      if (projectsRes.success) setDashProjects(projectsRes.data);
      setDashStatsLoading(false);
    };
    loadDashStats();
  }, []);

  const dashStats = useMemo(() => {
    const openTenders = dashTenders.filter(t => t.status === 'open').length;
    const activeBids = dashBids.filter(b => b.status === 'pending_review' || b.status === 'shortlisted').length;
    const activeProjects = dashProjects.filter(p => p.status === 'active').length;
    const totalContractValue = dashProjects.reduce((sum, p) => sum + (p.contractValue || 0), 0);
    return { openTenders, activeBids, activeProjects, totalContractValue };
  }, [dashTenders, dashBids, dashProjects]);

  const formatContractValue = (value: number): string => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    if (value > 0) return `$${value.toLocaleString()}`;
    return '$0';
  };

  // Ref to track tenders length for offset calculation without re-creating load
  const tendersLengthRef = useRef(0);

  const load = useCallback(
    async (isRefresh = false, append = false) => {
      if (isRefresh) setRefreshing(true);
      else if (append) setLoadingMore(true);
      else setLoading(true);

      const currentOffset = append ? tendersLengthRef.current : 0;
      const params: Record<string, string> = { rows: append ? '50' : '25', offset: String(currentOffset) };
      if (search) params.search = search;
      if (sourceFilter && sourceFilter !== 'all') params.source = sourceFilter;
      if (sectorFilter) params.sector = sectorFilter;

      const res = await api.get('/tenders/live', params);
      if (res.success) {
        const newTenders = res.data as LiveTender[];
        setTenders(append ? (prev: LiveTender[]) => {
          const updated = [...prev, ...newTenders];
          tendersLengthRef.current = updated.length;
          return updated;
        } : newTenders);
        if (!append) tendersLengthRef.current = newTenders.length;
        setSourceMeta(res.meta?.sources || []);
        if (Array.isArray(res.meta?.dataSources)) setDataSources(res.meta.dataSources);
        if (Array.isArray(res.meta?.sectors)) setSectorCounts(res.meta.sectors);
        // If appending and got 0 new tenders, there's nothing more to load
        const apiHasMore = res.meta?.hasMore ?? false;
        if (append && newTenders.length === 0) {
          setHasMore(false);
        } else {
          setHasMore(apiHasMore);
        }
        if (res.meta?.totalAvailable) setTotalAvailable(res.meta.totalAvailable);
        setLastRefreshed(new Date());
      } else {
        toast.error(res.error || 'Failed to load live tenders');
      }
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    },
    [search, sourceFilter, sectorFilter],
  );

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  // Auto-refresh polling with smart tab visibility pause
  useEffect(() => {
    if (!autoRefresh) return;

    const POLL_INTERVAL = 5 * 60_000; // 5 minutes

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        load(true);
      }
    }, POLL_INTERVAL);

    const handleVisibilityChange = () => {
      // When tab becomes visible again, refresh immediately if data is stale
      if (document.visibilityState === 'visible' && lastRefreshed) {
        const staleMs = Date.now() - lastRefreshed.getTime();
        if (staleMs > POLL_INTERVAL) {
          load(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefresh, load, lastRefreshed]);

  // "Last refreshed" timer display
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!lastRefreshed) { setLastRefreshedText(''); return; }
    const update = () => {
      const seconds = Math.floor((Date.now() - lastRefreshed.getTime()) / 1000);
      if (seconds < 5) setLastRefreshedText('just now');
      else if (seconds < 60) setLastRefreshedText(`${seconds}s ago`);
      else setLastRefreshedText(`${Math.floor(seconds / 60)}m ago`);
    };
    update();
    /* eslint-enable react-hooks/set-state-in-effect */
    const id = setInterval(update, 10_000);
    return () => clearInterval(id);
  }, [lastRefreshed]);

  // Check saved status for visible tenders — batched into a single API call
  useEffect(() => {
    const checkSaved = async () => {
      const unchecked = tenders.filter(t => savedTenders[t.id] === undefined);
      const batch = unchecked.slice(0, 50);
      if (batch.length === 0) return;
      try {
        const items = batch.map(t => ({
          tenderId: t.externalId || t.id,
          source: t.source,
        }));
        const res = await api.post('/tenders/saved/batch-check', { items });
        if (res.success && res.results) {
          const updates: Record<string, boolean> = {};
          for (const t of batch) {
            const key = t.externalId || t.id;
            if (key in res.results) {
              updates[t.id] = res.results[key];
            }
          }
          setSavedTenders((prev) => ({ ...prev, ...updates }));
        }
      } catch {
        // Ignore errors for saved check
      }
    };
    if (tenders.length > 0) checkSaved();
  }, [tenders, savedTenders]);

  const liveSourcesCount = useMemo(
    () => sourceMeta.filter((s) => s.live && s.ok).length,
    [sourceMeta],
  );

  const totalTenderValue = useMemo(() => {
    return tenders.reduce((sum, t) => sum + (t.budgetMax || 0), 0);
  }, [tenders]);

  /* ────── Inline document loading ────── */

  /** Fetch document content from external URL - does NOT toggle expandedId */
  const fetchDocumentContent = useCallback(async (tender: LiveTender) => {
    const id = tender.id;
    // Already fetched or currently loading?
    if (docData[id] || docLoading === id) return;

    setDocLoading(id);
    setDocError((prev) => { const n = { ...prev }; delete n[id]; return n; });

    try {
      const res = await api.get(`/tenders/${encodeURIComponent(id)}/documents`, { url: tender.externalUrl });
      if (res.success && res.data) {
        setDocData((prev) => ({ ...prev, [id]: res.data as InlineDocument }));
      } else {
        setDocError((prev) => ({ ...prev, [id]: res.error || 'Failed to load document' }));
      }
    } catch {
      setDocError((prev) => ({ ...prev, [id]: 'Network error' }));
    }
    setDocLoading(null);
  }, [docData, docLoading]);

  /** Load document content and toggle the inline expanded view */
  const loadDocument = useCallback(async (tender: LiveTender) => {
    const id = tender.id;
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    // Already fetched?
    if (docData[id]) {
      setExpandedId(id);
      return;
    }

    setExpandedId(id);
    fetchDocumentContent(tender);
  }, [expandedId, docData, fetchDocumentContent]);

  /* ────── AI Review ────── */
  const loadAIReview = useCallback(async (tender: LiveTender) => {
    const id = tender.id;
    // Toggle off if already expanded
    if (aiReviewExpanded[id]) {
      setAiReviewExpanded((prev) => ({ ...prev, [id]: false }));
      return;
    }
    // Expand the panel
    setAiReviewExpanded((prev) => ({ ...prev, [id]: true }));
    // If already loaded, no need to fetch
    if (aiReviewData[id]) return;

    setAiReviewLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await api.post('/tenders/live/review', {
        title: tender.title,
        scope: tender.scope,
        budgetMin: tender.budgetMin,
        budgetMax: tender.budgetMax,
        deadline: tender.deadline,
        location: tender.location,
        categoryTags: tender.categoryTags,
        source: tender.source,
        currency: tender.currency,
        borrower: tender.borrower,
        contractType: tender.contractType,
        region: tender.region,
        externalUrl: tender.externalUrl,
      });
      if (res.success && res.data) {
        setAiReviewData((prev) => ({ ...prev, [id]: res.data as AIReview }));
      } else {
        toast.error(res.error || 'Failed to generate AI review');
        setAiReviewExpanded((prev) => ({ ...prev, [id]: false }));
      }
    } catch {
      toast.error('Failed to generate AI review');
      setAiReviewExpanded((prev) => ({ ...prev, [id]: false }));
    }
    setAiReviewLoading((prev) => ({ ...prev, [id]: false }));
  }, [aiReviewExpanded, aiReviewData]);

  /* ────── Save/Bookmark → Move to Bid ────── */
  const toggleSave = useCallback(async (tender: LiveTender) => {
    const id = tender.id;
    const isCurrentlySaved = savedTenders[id];
    setSavingTender((prev) => ({ ...prev, [id]: true }));

    try {
      if (isCurrentlySaved) {
        // Remove from saved/bids
        const checkRes = await api.get('/tenders/saved/check', {
          tenderId: tender.externalId || tender.id,
          source: tender.source,
        });
        if (checkRes.success && checkRes.data?.id) {
          await api.delete(`/tenders/saved/${checkRes.data.id}`);
        }
        setSavedTenders((prev) => ({ ...prev, [id]: false }));
        toast.success('Removed from Bids', { description: `"${tender.title}" removed from your bids list.` });
      } else {
        // Save the tender → move to bids
        await api.post('/tenders/saved', {
          tenderId: tender.externalId || tender.id,
          source: tender.source,
          title: tender.title,
          scope: tender.scope,
          budgetMin: tender.budgetMin,
          budgetMax: tender.budgetMax,
          deadline: tender.deadline,
          location: tender.location,
          categoryTags: tender.categoryTags,
          externalUrl: tender.externalUrl,
          currency: tender.currency,
        });
        setSavedTenders((prev) => ({ ...prev, [id]: true }));
        toast.success('Moved to Bids', {
          description: `"${tender.title}" is now in your bids list.`,
          action: {
            label: 'Go to Bids',
            onClick: () => useNavStore.getState().setView('bids', { tenderId: tender.id }),
          },
        });
      }
    } catch {
      toast.error(isCurrentlySaved ? 'Failed to remove from bids' : 'Failed to move to bids');
    }
    setSavingTender((prev) => ({ ...prev, [id]: false }));
  }, [savedTenders]);

  /* ────── Import to local tenders ────── */
  const importTender = useCallback(async (tender: LiveTender) => {
    setImporting(tender.id);
    try {
      const res = await api.post('/tenders', {
        title: tender.title,
        scope: tender.scope,
        budgetMin: tender.budgetMin,
        budgetMax: tender.budgetMax,
        deadline: tender.deadline,
        location: tender.location,
        categoryTags: tender.categoryTags,
        requiredDocs: `Source: ${SOURCE_LABELS[tender.source] || tender.source} | External ID: ${tender.externalId} | URL: ${tender.externalUrl}`,
        status: 'open',
        currency: tender.currency,
      });
      if (res.success) {
        toast.success('Tender imported successfully', {
          description: `"${tender.title}" is now in your tenders list.`,
        });
      } else {
        toast.error(res.error || 'Failed to import tender');
      }
    } catch {
      toast.error('Failed to import tender');
    }
    setImporting(null);
  }, []);

  /* ────── Open credential dialog ────── */
  const openCredDialog = useCallback((sourceId: string) => {
    const gated = GATED_SOURCES.find((s) => s.id === sourceId);
    if (gated) {
      setCredDialogSource(gated);
      setCredDialogOpen(true);
    }
  }, []);

  /* ────── Count saved tenders ────── */
  const savedCount = useMemo(() => Object.values(savedTenders).filter(Boolean).length, [savedTenders]);

  /* ────── Dynamic sector extraction from loaded tenders ────── */
  const dynamicSectorCounts = useMemo(() => {
    const sectorMap = new Map<string, number>();
    tenders.forEach((t) => {
      if (t.categoryTags) {
        t.categoryTags.split(',').filter(Boolean).forEach((tag) => {
          const normalized = tag.trim().toLowerCase();
          if (normalized) {
            sectorMap.set(normalized, (sectorMap.get(normalized) || 0) + 1);
          }
        });
      }
    });
    // Build the result: always start with the SECTOR_PILLS that have matching data,
    // then add any additional sectors found in data not covered by the static pills
    const result: { id: string; label: string; count: number; icon?: string }[] = [];

    // First add known sectors from SECTOR_PILLS
    SECTOR_PILLS.forEach((sp) => {
      const count = sectorMap.get(sp.id) || sectorMap.get(sp.label.toLowerCase()) || 0;
      if (count > 0) {
        result.push({ id: sp.id, label: sp.label, count, icon: sp.icon });
      }
    });

    // Then add any unmatched sectors from actual data (top 10 by count)
    const knownIds = new Set(SECTOR_PILLS.map((sp) => sp.id));
    const knownLabels = new Set(SECTOR_PILLS.map((sp) => sp.label.toLowerCase()));
    const additional: { id: string; label: string; count: number }[] = [];
    sectorMap.forEach((count, key) => {
      if (!knownIds.has(key) && !knownLabels.has(key) && count > 0) {
        additional.push({ id: key, label: key.charAt(0).toUpperCase() + key.slice(1), count });
      }
    });
    additional.sort((a, b) => b.count - a.count);
    result.push(...additional.slice(0, 10));

    return result;
  }, [tenders]);

  /* ────── Start Bid Application ────── */
  const startBidApplication = useCallback(async (tender: LiveTender) => {
    // If not saved yet, save first, then navigate to bids
    if (!savedTenders[tender.id]) {
      setSavingTender((prev) => ({ ...prev, [tender.id]: true }));
      try {
        await api.post('/tenders/saved', {
          tenderId: tender.externalId || tender.id,
          source: tender.source,
          title: tender.title,
          scope: tender.scope,
          budgetMin: tender.budgetMin,
          budgetMax: tender.budgetMax,
          deadline: tender.deadline,
          location: tender.location,
          categoryTags: tender.categoryTags,
          externalUrl: tender.externalUrl,
          currency: tender.currency,
        });
        setSavedTenders((prev) => ({ ...prev, [tender.id]: true }));
        toast.success('Moved to Bids', {
          description: `"${tender.title}" is now in your bids list. Navigating to Bids…`,
          action: {
            label: 'Go to Bids',
            onClick: () => useNavStore.getState().setView('bids', { tenderId: tender.id }),
          },
        });
      } catch {
        toast.error('Failed to save tender to bids');
        setSavingTender((prev) => ({ ...prev, [tender.id]: false }));
        return;
      }
      setSavingTender((prev) => ({ ...prev, [tender.id]: false }));
    }
    // Navigate to bids view
    useNavStore.getState().setView('bids', { tenderId: tender.id });
  }, [savedTenders]);

  /* ────── Render ────── */
  return (
    <div className="view-enter">
      {/* ───────────────── Notion-style Cover ───────────────── */}
      <div className="relative h-32 md:h-40 bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-60" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute top-4 right-4 md:right-6 flex items-center gap-2">
          {savedCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
              onClick={() => useNavStore.getState().setView('bids')}
            >
              <Gavel className="h-3.5 w-3.5 text-emerald-600" />
              My Bids ({savedCount})
            </Button>
          )}
          {lastRefreshedText && (
            <span className="text-[10px] text-muted-foreground/70 hidden sm:inline-block">
              Updated {lastRefreshedText}
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`gap-1 shadow-lg backdrop-blur-sm ${autoRefresh ? 'bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-white/90 dark:bg-gray-800/90'}`}
            title={autoRefresh ? 'Auto-refresh every 60s — click to pause' : 'Auto-refresh paused — click to resume'}
          >
            {autoRefresh ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Live
              </>
            ) : (
              <>
                <span className="inline-flex rounded-full h-2 w-2 bg-gray-400" />
                Paused
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => load(true)}
            disabled={refreshing}
            className="gap-1.5 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="px-4 md:px-6 max-w-5xl mx-auto -mt-8 relative z-10 space-y-6">
        {/* ───────────────── Notion-style Icon + Title ───────────────── */}
        <div className="flex items-end gap-4">
          <div className="h-14 w-14 md:h-16 md:w-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 border-4 border-background shrink-0">
            <Globe2 className="h-7 w-7 md:h-8 md:w-8 text-white" />
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Live Tenders</h1>
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 gap-1 text-xs">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                LIVE
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              {tenders.length} tenders from {sourceMeta.length || 15} sources - click a card to view full details, &quot;AI Review&quot; to analyze, &quot;Bid&quot; to work on it later
              {sectorFilter && <span className="ml-1 text-primary font-medium">· filtered by {SECTOR_PILLS.find(s => s.id === sectorFilter)?.label || sectorFilter}</span>}
            </p>
          </div>
        </div>

        {/* ───────────────── Breadcrumb ───────────────── */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <span className="hover:text-foreground cursor-default">Dashboard</span>
          <span>/</span>
          <span className="hover:text-foreground cursor-default">Tenders</span>
          <span>/</span>
          <span className="text-foreground font-medium">Live Feed</span>
        </nav>

        {/* ───────────────── Dashboard Summary Stats ───────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {dashStatsLoading ? (
            <>
              {[0, 1, 2, 3].map(i => (
                <Card key={i} className="bg-card/80 backdrop-blur-sm border-0 shadow-sm">
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-5 w-8" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              {/* Open Tenders */}
              <Card
                className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/30 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                onClick={() => setView('tenders')}
              >
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shrink-0">
                    <FileSearch className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 truncate">Open Tenders</p>
                    <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">{dashStats.openTenders}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Active Bids */}
              <Card
                className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20 border-amber-200/50 dark:border-amber-800/30 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                onClick={() => setView('bids')}
              >
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-sm shrink-0">
                    <Gavel className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300 truncate">Active Bids</p>
                    <p className="text-xl font-bold text-amber-900 dark:text-amber-100">{dashStats.activeBids}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Active Projects */}
              <Card
                className="bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-950/40 dark:to-teal-900/20 border-teal-200/50 dark:border-teal-800/30 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                onClick={() => setView('projects')}
              >
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-sm shrink-0">
                    <FolderKanban className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-teal-700 dark:text-teal-300 truncate">Active Projects</p>
                    <p className="text-xl font-bold text-teal-900 dark:text-teal-100">{dashStats.activeProjects}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Contract Value */}
              <Card
                className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:to-purple-900/20 border-purple-200/50 dark:border-purple-800/30 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                onClick={() => setView('projects')}
              >
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-sm shrink-0">
                    <DollarSign className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-purple-700 dark:text-purple-300 truncate">Contract Value</p>
                    <p className="text-xl font-bold text-purple-900 dark:text-purple-100">{formatContractValue(dashStats.totalContractValue)}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* ───────────────── Stats bar ───────────────── */}
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">Tenders</span>
                <Database className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <p className="text-lg md:text-2xl font-bold text-foreground mt-1">{tenders.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">Online</span>
                <Radio className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <p className="text-lg md:text-2xl font-bold text-foreground mt-1">{liveSourcesCount}/{sourceMeta.length || 15}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">Value</span>
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <p className="text-sm md:text-base font-bold text-foreground mt-1">
                {totalTenderValue > 0 ? fmtMoney(totalTenderValue, 'USD').replace('USD', '').trim() : '-'}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">My Bids</span>
                <Gavel className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <p className="text-lg md:text-2xl font-bold text-foreground mt-1">{savedCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* ───────────────── Filters ───────────────── */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tenders - title, country, category…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-muted/50 border-border"
                />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full md:w-56 bg-muted/50 border-border">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All live sources</SelectItem>
                  <SelectItem value="worldbank">🏦 World Bank</SelectItem>
                  <SelectItem value="eu_ted">🇪🇺 EU TED</SelectItem>
                  <SelectItem value="ungm">🇺🇳 UNGM</SelectItem>
                  <SelectItem value="sam_gov">🇺🇸 SAM.gov</SelectItem>
                  <SelectItem value="afdb">🌍 AfDB</SelectItem>
                  <SelectItem value="eu_opentenders">🔎 OpenTenders EU</SelectItem>
                  <SelectItem value="jica">🇯🇵 JICA</SelectItem>
                  <SelectItem value="adb">🌏 ADB</SelectItem>
                  <SelectItem value="uk_contracts">🇬🇧 UK Contracts Finder</SelectItem>
                  <SelectItem value="dgmarket">🌐 DgMarket</SelectItem>
                  <SelectItem value="apify_global">🤖 Apify Global</SelectItem>
                  <SelectItem value="apify_procurement">📦 Apify Procurement</SelectItem>
                  <SelectItem value="govrider">🛡️ GovRider</SelectItem>
                  <SelectItem value="tenderwell">🔍 Tenderwell</SelectItem>
                  <SelectItem value="seegenebid">🌐 SeeGeneBid</SelectItem>
                  <SelectItem value="colombia_secop">🇨🇴 Colombia SECOP</SelectItem>
                  <SelectItem value="mexico_compranet">🇲🇽 Mexico CompraNet</SelectItem>
                  <SelectItem value="chile_mercado">🇨🇱 Chile Mercado Público</SelectItem>
                  <SelectItem value="argentina_comprar">🇦🇷 Argentina COMPR.AR</SelectItem>
                  <SelectItem value="uruguay_compras">🇺🇾 Uruguay Compras</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sector quick-filter pills - dynamically built from actual tenders + API sectors */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-border">
              <span className="text-xs font-medium text-muted-foreground mr-1">Sectors:</span>
              <button
                onClick={() => setSectorFilter('')}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                  !sectorFilter
                    ? 'ring-2 ring-primary/50 bg-primary/10 text-primary font-medium'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                All
                <span className="opacity-70">· {tenders.length}</span>
              </button>
              {dynamicSectorCounts.map((s) => {
                const isActive = sectorFilter === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSectorFilter(isActive ? '' : s.id)}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                      isActive
                        ? 'ring-2 ring-primary/50 bg-primary/10 text-primary font-medium'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {s.icon && <span>{s.icon}</span>}
                    {s.label}
                    <span className="opacity-70">· {s.count}</span>
                  </button>
                );
              })}
            </div>

            {/* Source status pills */}
            {sourceMeta.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
                <span className="text-xs font-medium text-muted-foreground mr-1">Feed status:</span>
                {sourceMeta.map((s) => {
                  const accent = SOURCE_ACCENT[s.id] || SOURCE_ACCENT.default;
                  const isComingSoon = !s.ok && s.error && (s.error.toLowerCase().includes('coming soon') || s.error.toLowerCase().includes('credentials'));
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSourceFilter(s.id === sourceFilter ? 'all' : s.id)}
                      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                        sourceFilter === s.id
                          ? 'ring-2 ring-primary/50 ' + accent.badge
                          : accent.badge
                      }`}
                      title={s.ok ? 'Connected' : isComingSoon ? 'Coming Soon - requires API credentials' : 'Unavailable - using fallback'}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${s.ok ? accent.dot : 'bg-muted-foreground/40'}`} />
                      {s.name}
                      {s.ok ? (
                        <span className="opacity-70">· {s.count}</span>
                      ) : isComingSoon ? (
                        <Badge variant="outline" className="text-[9px] leading-none px-1.5 py-0 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30">
                          Coming Soon
                        </Badge>
                      ) : (
                        <span className="opacity-50">· 0</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ───────────────── Individual Tender Cards (NOT grouped by source) ───────────────── */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-full bg-muted rounded animate-pulse" />
                  <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                  <div className="flex gap-3 pt-1">
                    <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tenders.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <Globe2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-foreground font-medium">No live tenders found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters or check back later.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
            {tenders.map((t) => {
                const accent = SOURCE_ACCENT[t.source] || SOURCE_ACCENT.default;

                return (
                  <TenderCard
                    key={t.id}
                    tender={t}
                    accent={accent}
                    isSaved={savedTenders[t.id] || false}
                    isSaving={savingTender[t.id] || false}
                    isExpanded={expandedId === t.id}
                    isLoadingDoc={docLoading === t.id}
                    doc={docData[t.id]}
                    docErr={docError[t.id]}
                    showAiReview={aiReviewExpanded[t.id] || false}
                    aiLoading={aiReviewLoading[t.id] || false}
                    aiReview={aiReviewData[t.id] || null}
                    isDetailOpen={detailOpenId === t.id}
                    onToggleSave={() => toggleSave(t)}
                    onLoadDocument={() => loadDocument(t)}
                    onLoadAIReview={() => loadAIReview(t)}
                    onImport={() => importTender(t)}
                    onCardClick={() => {
                      if (detailOpenId !== t.id) {
                        // Opening detail view - also auto-fetch document content
                        setDetailOpenId(t.id);
                        fetchDocumentContent(t);
                      } else {
                        // Closing detail view
                        setDetailOpenId(null);
                      }
                    }}
                    onStartBidApplication={() => startBidApplication(t)}
                  />
                );
              })}
          </div>
        )}

        {/* Load More section - server-side pagination */}
        {tenders.length > 0 && (
          <div className="flex flex-col items-center gap-4 pt-8 pb-6">
            {/* Expand All indicator */}
            {hasMore && totalAvailable > 0 && (
              <div className="flex items-center gap-2 mb-1">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-300 dark:via-emerald-700 to-transparent min-w-[40px]" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Expand All - {totalAvailable.toLocaleString()} tenders available
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-300 dark:via-emerald-700 to-transparent min-w-[40px]" />
              </div>
            )}

            {/* Progress bar */}
            {totalAvailable > 0 && (
              <div className="w-full max-w-lg">
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((tenders.length / totalAvailable) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {/* Stats row */}
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {totalAvailable > 0
                  ? `Showing ${tenders.length} of ${totalAvailable.toLocaleString()} tenders`
                  : `${tenders.length} tenders loaded`}
              </span>
              {tenders.filter(t => t.documentUrl || (t.requiredDocs && t.requiredDocs.startsWith('http')) || (t.documentFiles && t.documentFiles.length > 0)).length > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <FolderKanban className="h-3 w-3" />
                    {tenders.filter(t => t.documentUrl || (t.requiredDocs && t.requiredDocs.startsWith('http')) || (t.documentFiles && t.documentFiles.length > 0)).length} with requirement documents
                  </span>
                </>
              )}
              {tenders.filter(t => t.documentFiles && t.documentFiles.length > 0).length > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                    <FileSearch className="h-3 w-3" />
                    {tenders.reduce((sum, t) => sum + (t.documentFiles?.length || 0), 0)} downloadable files
                  </span>
                </>
              )}
            </div>

            {/* Load More button or completion */}
            {hasMore ? (
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2.5 rounded-xl border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 min-w-[280px] h-12 text-sm font-medium shadow-sm"
                  onClick={() => load(false, true)}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {loadingMore
                    ? 'Loading More…'
                    : totalAvailable > 0
                      ? `Load More (${Math.round((tenders.length / totalAvailable) * 100)}% loaded)`
                      : 'Load More Tenders'}
                  {!loadingMore && (
                    <Badge className="ml-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-0 text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
                      +200
                    </Badge>
                  )}
                </Button>
                {totalAvailable > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    {Math.min(100, totalAvailable - tenders.length)} new tenders will be loaded
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  {totalAvailable > 0 ? `All ${totalAvailable.toLocaleString()} tenders loaded` : 'All tenders loaded'}
                </p>
                <p className="text-[11px] text-muted-foreground">You&apos;ve reached the end of available tenders</p>
              </div>
            )}
          </div>
        )}

        {/* ───────────────── Data Sources panel ───────────────── */}
        <div className="pt-4 pb-8">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-4 w-4 text-emerald-500" />
            <h2 className="text-lg font-semibold text-foreground">Connected Data Sources</h2>
            <Badge variant="outline" className="text-xs border-border text-muted-foreground">
              {dataSources.filter((s) => s.live).length} live · {dataSources.length + GATED_SOURCES.length} total
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Aggregated procurement from international data feeds.
            Sources marked <span className="font-medium text-emerald-600 dark:text-emerald-400">Live</span> are
            fetched in real time; others require credentials.
          </p>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {/* Live data sources from API */}
            {dataSources.map((s) => {
              const accent = SOURCE_ACCENT[s.id] || SOURCE_ACCENT.default;
              const SourceIcon = accent.icon;
              return (
                <Card
                  key={s.id}
                  className={`bg-card border-border hover:border-primary/40 transition-colors ${s.live ? 'cursor-pointer' : 'opacity-70'}`}
                  onClick={s.live ? () => setSourceFilter(s.id === sourceFilter ? 'all' : s.id) : undefined}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${s.live ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-muted'}`}>
                          {s.live ? (
                            <SourceIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-semibold text-foreground text-sm truncate">{s.name}</h4>
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${ACCENT_DOT[s.accent] || 'bg-muted-foreground'}`}
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{s.coverage}</p>
                        </div>
                      </div>
                      {s.live ? (
                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 shrink-0 text-[10px]">
                          Live
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-border text-muted-foreground shrink-0 text-[10px]">
                          Reference
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground min-w-0">
                        <ShieldCheck className="h-3 w-3 shrink-0" />
                        <span className="truncate">{s.access}</span>
                      </div>
                      <a
                        href={s.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open
                        <ArrowUpRight className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Credential-gated sources */}
            {GATED_SOURCES.map((gs) => {
              const accent = SOURCE_ACCENT[gs.id] || SOURCE_ACCENT.default;
              const SourceIcon = accent.icon;
              const isOpenSource = gs.credentialType === 'open_source';
              return (
                <Card
                  key={gs.id}
                  className="bg-card border-border hover:border-primary/40 transition-colors opacity-80"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-950/40">
                          <SourceIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-semibold text-foreground text-sm truncate">{gs.name}</h4>
                            <span className={`h-2 w-2 rounded-full shrink-0 ${accent.dot}`} />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{gs.description}</p>
                        </div>
                      </div>
                      {isOpenSource ? (
                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 shrink-0 text-[10px]">
                          Open Source
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300 shrink-0 text-[10px] gap-1">
                          <Lock className="h-2.5 w-2.5" />
                          API Key
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground min-w-0">
                        {isOpenSource ? (
                          <Globe2 className="h-3 w-3 shrink-0 text-emerald-500" />
                        ) : (
                          <Lock className="h-3 w-3 shrink-0 text-amber-500" />
                        )}
                        <span className="truncate">
                          {isOpenSource ? 'No credentials required' : `Requires ${gs.envVar}`}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] gap-1 px-2 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCredDialog(gs.id);
                        }}
                      >
                        {isOpenSource ? (
                          <>
                            <Globe2 className="h-2.5 w-2.5" />
                            Enable
                          </>
                        ) : (
                          <>
                            <Lock className="h-2.5 w-2.5" />
                            Enable
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">15 sources available</span>{' '}
              Enable Apify, GovRider, Tenderwell, or SeeGeneBid by providing the required
              API credentials. Each adapter follows the same{' '}
              <code className="px-1 py-0.5 rounded bg-muted text-foreground">LiveTender</code> shape
              and integrates directly into this feed.
            </p>
          </div>
        </div>
      </div>

      {/* Credential Dialog */}
      <CredentialDialog
        source={credDialogSource}
        open={credDialogOpen}
        onOpenChange={setCredDialogOpen}
      />
    </div>
  );
}
