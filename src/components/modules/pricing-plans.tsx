'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Check, X, Crown, Zap, Rocket, ArrowRight, Shield,
  RefreshCw, Sparkles, Star, TrendingUp, Lock,
  BarChart3, Bot, Users, FileText, Gavel,
  MessageSquare, Globe2, Award, Calendar, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Plan Data Types ──────────────────────────────────────────────────

interface PlanData {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: string;
  description: string;
  features: string[];
  limits: Record<string, number>;
  aiCallsPerDay: number;
  maxTenders: number;
  maxBids: number;
  maxProjects: number;
  maxDocuments: number;
  maxTeamMembers: number;
  prioritySupport: boolean;
  customAiPrompts: boolean;
  apiAccess: boolean;
  highlight: boolean;
  badge: string;
  badgeColor: string;
}

interface UsageItem {
  category: string;
  used: number;
  limit: number;
  percentage: number;
  unlimited: boolean;
}

interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  startDate: string;
  endDate?: string;
  amount: number;
  billingCycle: string;
}

// ─── Category display labels ───────────────────────────────────────────

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string; barColor: string }> = {
  api_general: { label: 'General API', icon: <BarChart3 className="h-4 w-4" />, color: 'text-slate-500', barColor: 'bg-slate-500' },
  ai: { label: 'AI & Intelligence', icon: <Bot className="h-4 w-4" />, color: 'text-violet-500', barColor: 'bg-violet-500' },
  documents: { label: 'Documents', icon: <FileText className="h-4 w-4" />, color: 'text-sky-500', barColor: 'bg-sky-500' },
  bids: { label: 'Bids', icon: <Gavel className="h-4 w-4" />, color: 'text-emerald-500', barColor: 'bg-emerald-500' },
  tenders: { label: 'Tenders', icon: <Globe2 className="h-4 w-4" />, color: 'text-teal-500', barColor: 'bg-teal-500' },
  chat: { label: 'Chat & Messaging', icon: <MessageSquare className="h-4 w-4" />, color: 'text-cyan-500', barColor: 'bg-cyan-500' },
  social: { label: 'Social Circle', icon: <Users className="h-4 w-4" />, color: 'text-amber-500', barColor: 'bg-amber-500' },
  auth: { label: 'Auth & Security', icon: <Shield className="h-4 w-4" />, color: 'text-rose-500', barColor: 'bg-rose-500' },
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Rocket className="h-6 w-6" />,
  pro: <Zap className="h-6 w-6" />,
  enterprise: <Crown className="h-6 w-6" />,
};

const PLAN_THEMES: Record<string, {
  gradient: string;
  cardBorder: string;
  cardShadow: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
  iconText: string;
  buttonBg: string;
  buttonHover: string;
  accent: string;
  checkColor: string;
  headerBg: string;
}> = {
  free: {
    gradient: 'from-slate-50 to-slate-100/50 dark:from-slate-950 dark:to-slate-900/50',
    cardBorder: 'border-slate-200 dark:border-slate-800',
    cardShadow: 'shadow-sm hover:shadow-md',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-700 dark:text-slate-300',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconText: 'text-slate-600 dark:text-slate-400',
    buttonBg: 'bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600',
    buttonHover: '',
    accent: 'text-slate-700 dark:text-slate-300',
    checkColor: 'text-slate-500',
    headerBg: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800',
  },
  pro: {
    gradient: 'from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/30',
    cardBorder: 'border-orange-300 dark:border-orange-700',
    cardShadow: 'shadow-lg hover:shadow-xl ring-2 ring-orange-400/60 dark:ring-orange-600/60',
    badgeBg: 'bg-gradient-to-r from-orange-500 to-amber-500',
    badgeText: 'text-white',
    iconBg: 'bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900',
    iconText: 'text-orange-600 dark:text-orange-400',
    buttonBg: 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600',
    buttonHover: '',
    accent: 'text-orange-700 dark:text-orange-400',
    checkColor: 'text-orange-500',
    headerBg: 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/30',
  },
  enterprise: {
    gradient: 'from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/30',
    cardBorder: 'border-violet-300 dark:border-violet-700',
    cardShadow: 'shadow-lg hover:shadow-xl ring-2 ring-violet-400/60 dark:ring-violet-600/60',
    badgeBg: 'bg-gradient-to-r from-violet-600 to-purple-600',
    badgeText: 'text-white',
    iconBg: 'bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900 dark:to-purple-900',
    iconText: 'text-violet-600 dark:text-violet-400',
    buttonBg: 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700',
    buttonHover: '',
    accent: 'text-violet-700 dark:text-violet-400',
    checkColor: 'text-violet-500',
    headerBg: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/30',
  },
};

// ─── Component ────────────────────────────────────────────────────────

export function PricingPlansView() {
  const { user } = useAuthStore();
  const [plansData, setPlansData] = useState<{
    currentPlan: PlanData;
    allPlans: PlanData[];
    usage: UsageItem[];
    subscription: SubscriptionData | null;
    planName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; plan: PlanData | null }>({ open: false, plan: null });
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showRateLimits, setShowRateLimits] = useState<Record<string, boolean>>({});

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/plans');
      if (res.success) {
        setPlansData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleUpgrade = async (planId: string) => {
    setUpgrading(planId);
    try {
      const res = await api.post('/plans', { plan: planId });
      if (res.success) {
        await useAuthStore.getState().fetchMe();
        await fetchPlans();
      }
    } catch (err) {
      console.error('Failed to upgrade plan:', err);
    } finally {
      setUpgrading(null);
      setConfirmDialog({ open: false, plan: null });
    }
  };

  if (loading && !plansData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPlanName = plansData?.planName || 'free';
  const currentPlan = plansData?.currentPlan || null;
  const allPlans = plansData?.allPlans || [];
  const usage = plansData?.usage || [];
  const subscription = plansData?.subscription;

  const faqItems = [
    {
      q: 'Can I upgrade my plan at any time?',
      a: 'Yes! You can upgrade instantly from this page. Your new limits and features activate immediately. In production, you would be redirected to a Stripe checkout page.',
    },
    {
      q: 'What happens if I hit my rate limit?',
      a: 'You\'ll receive a 429 Too Many Requests response with a Retry-After header telling you when you can make your next request. The dashboard also shows real-time usage so you can monitor your limits.',
    },
    {
      q: 'Can I downgrade from Pro/Enterprise to Free?',
      a: 'Yes, you can downgrade at any time. Your current subscription period will remain active until it expires, then your plan will revert to Free tier limits.',
    },
    {
      q: 'Is there a trial period for paid plans?',
      a: 'Pro and Enterprise plans come with a 14-day free trial. You won\'t be charged until the trial ends, and you can cancel anytime before that.',
    },
    {
      q: 'What payment methods are accepted?',
      a: 'We accept credit/debit cards via Stripe. Enterprise customers can also pay via bank transfer or purchase annual licenses with custom invoicing.',
    },
  ];

  const comparisonRows = [
    { label: 'Tender browsing & search', free: true, pro: true, enterprise: true },
    { label: 'Max bids per month', free: '3', pro: '20', enterprise: '∞' },
    { label: 'Max tenders visible', free: '10', pro: '50', enterprise: '∞' },
    { label: 'Max documents stored', free: '5', pro: '50', enterprise: '∞' },
    { label: 'Max team members', free: '1', pro: '5', enterprise: '∞' },
    { label: 'Max projects', free: '1', pro: '10', enterprise: '∞' },
    { label: 'AI calls per day', free: '10', pro: '100', enterprise: '∞' },
    { label: 'AI bid preparation', free: false, pro: true, enterprise: true },
    { label: 'AI document studio', free: false, pro: true, enterprise: true },
    { label: 'AI tender analysis', free: false, pro: true, enterprise: true },
    { label: 'Custom AI prompts', free: false, pro: true, enterprise: true },
    { label: 'Export PDF/Excel', free: false, pro: true, enterprise: true },
    { label: 'API access', free: false, pro: true, enterprise: true },
    { label: 'Priority support', free: false, pro: true, enterprise: true },
    { label: '24/7 dedicated support', free: false, pro: false, enterprise: true },
    { label: 'Custom integrations', free: false, pro: false, enterprise: true },
    { label: 'SSO & advanced security', free: false, pro: false, enterprise: true },
    { label: 'White-label options', free: false, pro: false, enterprise: true },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* ── Hero Header ───────────────────────────────────────────────── */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          {currentPlan?.name || 'Free'} Plan Active
        </div>
        <h2 className="text-3xl font-bold tracking-tight">
          Scale Your Procurement Power
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Choose the plan that fits your needs. Upgrade anytime to unlock more AI tools, higher limits, and premium features.
        </p>
      </div>

      {/* ── Current Plan Overview ─────────────────────────────────────── */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className={`bg-gradient-to-r ${PLAN_THEMES[currentPlanName]?.gradient || PLAN_THEMES.free.gradient} px-6 py-5`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${PLAN_THEMES[currentPlanName]?.iconBg || PLAN_THEMES.free.iconBg}`}>
                <span className={PLAN_THEMES[currentPlanName]?.iconText || PLAN_THEMES.free.iconText}>
                  {PLAN_ICONS[currentPlanName]}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold">{currentPlan?.name || 'Free'} Plan</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{currentPlan?.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {currentPlan?.price > 0 && (
                <div className="text-right">
                  <div className="text-2xl font-bold">${currentPlan.price}<span className="text-sm font-normal text-muted-foreground">/{currentPlan.billingCycle}</span></div>
                </div>
              )}
              {subscription && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-400 dark:bg-green-950/50">
                    <Check className="h-3 w-3 mr-1" />
                    {subscription.status}
                  </Badge>
                  {subscription.endDate && (
                    <Badge variant="outline" className="text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      Renews {new Date(subscription.endDate).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { label: 'AI Calls', value: currentPlan?.aiCallsPerDay === -1 ? '∞' : currentPlan?.aiCallsPerDay || 10, unit: '/day', icon: <Bot className="h-4 w-4" /> },
              { label: 'Tenders', value: currentPlan?.maxTenders === -1 ? '∞' : currentPlan?.maxTenders || 10, unit: '', icon: <Globe2 className="h-4 w-4" /> },
              { label: 'Bids', value: currentPlan?.maxBids === -1 ? '∞' : currentPlan?.maxBids || 3, unit: '/mo', icon: <Gavel className="h-4 w-4" /> },
              { label: 'Team', value: currentPlan?.maxTeamMembers === -1 ? '∞' : currentPlan?.maxTeamMembers || 1, unit: 'members', icon: <Users className="h-4 w-4" /> },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/60 dark:bg-black/20 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  {stat.icon}
                  <span className="text-xs font-medium">{stat.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold">{stat.value}</span>
                  {stat.unit && <span className="text-xs text-muted-foreground">{stat.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Usage Section */}
        {usage.length > 0 && (
          <div className="px-6 py-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Rate Limit Usage (Last Minute)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {usage.filter(u => CATEGORY_LABELS[u.category]).map((u) => {
                const catInfo = CATEGORY_LABELS[u.category];
                return (
                  <div key={u.category} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                    <span className={catInfo.color}>{catInfo.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate">{catInfo.label}</span>
                        <span className="text-xs font-semibold ml-2 whitespace-nowrap">
                          {u.used}/{u.unlimited ? '∞' : u.limit}
                        </span>
                      </div>
                      {!u.unlimited && (
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              u.percentage > 80 ? 'bg-red-500' : u.percentage > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(u.percentage, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* ── Pricing Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {allPlans.map((plan) => {
          const theme = PLAN_THEMES[plan.id] || PLAN_THEMES.free;
          const isCurrent = plan.id === currentPlanName;
          const isExpanded = showRateLimits[plan.id] || false;

          return (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-300 ${theme.cardShadow} ${theme.cardBorder} ${isCurrent ? 'opacity-95' : ''}`}
            >
              {/* Popular badge */}
              {plan.highlight && (
                <div className="absolute top-0 right-0 z-10">
                  <div className={`${theme.badgeBg} ${theme.badgeText} text-xs font-bold px-4 py-1.5 rounded-bl-xl shadow-sm`}>
                    ★ MOST POPULAR
                  </div>
                </div>
              )}

              {/* Card Header with Plan Identity */}
              <div className={`${theme.headerBg} px-6 pt-6 pb-5`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2.5 rounded-xl ${theme.iconBg}`}>
                    <span className={theme.iconText}>{PLAN_ICONS[plan.id]}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  {plan.price === 0 ? (
                    <span className="text-4xl font-extrabold tracking-tight">Free</span>
                  ) : (
                    <>
                      <span className="text-4xl font-extrabold tracking-tight">${plan.price}</span>
                      <span className="text-sm text-muted-foreground font-medium">/ {plan.billingCycle}</span>
                    </>
                  )}
                </div>
              </div>

              <CardContent className="pt-5 px-6 pb-6">
                {/* Key Limits */}
                <div className="grid grid-cols-2 gap-2.5 mb-5">
                  {[
                    { icon: <Globe2 className="h-3.5 w-3.5" />, value: plan.maxTenders === -1 ? '∞' : plan.maxTenders, label: 'Tenders' },
                    { icon: <Gavel className="h-3.5 w-3.5" />, value: plan.maxBids === -1 ? '∞' : plan.maxBids, label: 'Bids' },
                    { icon: <Bot className="h-3.5 w-3.5" />, value: plan.aiCallsPerDay === -1 ? '∞' : plan.aiCallsPerDay, label: 'AI calls/day' },
                    { icon: <Users className="h-3.5 w-3.5" />, value: plan.maxTeamMembers === -1 ? '∞' : plan.maxTeamMembers, label: 'Members' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                      <span className="text-muted-foreground">{item.icon}</span>
                      <span className="text-sm">
                        <span className="font-semibold">{item.value}</span>{' '}
                        <span className="text-muted-foreground">{item.label}</span>
                      </span>
                    </div>
                  ))}
                </div>

                <Separator className="mb-5" />

                {/* Features */}
                <ul className="space-y-2.5 mb-5">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm">
                      <Check className={`h-4 w-4 mt-0.5 ${theme.checkColor} shrink-0`} />
                      <span className="leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Rate Limits Toggle */}
                <button
                  onClick={() => setShowRateLimits(prev => ({ ...prev, [plan.id]: !prev[plan.id] }))}
                  className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2 hover:text-foreground transition-colors"
                >
                  <span>Rate Limits (req/min)</span>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {isExpanded && (
                  <div className="grid grid-cols-2 gap-1.5 mt-2 mb-4">
                    {Object.entries(plan.limits).map(([cat, limit]) => {
                      const catLabel = CATEGORY_LABELS[cat]?.label || cat;
                      return (
                        <div key={cat} className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-xs">
                          <span className="text-muted-foreground truncate mr-1">{catLabel}</span>
                          <span className="font-bold shrink-0">{limit === -1 ? '∞' : limit}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Action Button */}
                <div className="mt-5">
                  {isCurrent ? (
                    <Button variant="outline" className="w-full h-11" disabled>
                      <Check className="h-4 w-4 mr-2" />
                      Current Plan
                    </Button>
                  ) : plan.price === 0 ? (
                    <Button
                      variant="outline"
                      className="w-full h-11"
                      onClick={() => setConfirmDialog({ open: true, plan })}
                      disabled={upgrading === plan.id}
                    >
                      {upgrading === plan.id ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                      Switch to Free
                    </Button>
                  ) : (
                    <Button
                      className={`w-full h-11 text-white font-semibold ${theme.buttonBg}`}
                      onClick={() => setConfirmDialog({ open: true, plan })}
                      disabled={upgrading === plan.id}
                    >
                      {upgrading === plan.id ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Upgrade to {plan.name}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Feature Comparison ────────────────────────────────────────── */}
      <Card className="overflow-hidden border-0 shadow-md">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Detailed Feature Comparison
          </CardTitle>
          <CardDescription>See exactly what each plan includes at a glance</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="py-3 px-5 text-left font-semibold text-muted-foreground w-[40%]">Feature</th>
                  {allPlans.map(p => (
                    <th key={p.id} className={`py-3 px-4 text-center font-bold ${p.id === currentPlanName ? PLAN_THEMES[p.id]?.accent : ''}`}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, idx) => (
                  <tr key={idx} className={`border-b border-muted/50 ${idx % 2 === 0 ? 'bg-muted/10' : ''}`}>
                    <td className="py-2.5 px-5 font-medium">{row.label}</td>
                    {[row.free, row.pro, row.enterprise].map((val, colIdx) => {
                      const planId = ['free', 'pro', 'enterprise'][colIdx];
                      const isCurrent = planId === currentPlanName;
                      return (
                        <td key={colIdx} className={`py-2.5 px-4 text-center ${isCurrent ? 'font-semibold ' + PLAN_THEMES[planId]?.accent : ''}`}>
                          {val === true ? (
                            <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                          ) : val === false ? (
                            <X className="h-4 w-4 text-red-300 mx-auto" />
                          ) : (
                            <span>{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ── FAQ Section ──────────────────────────────────────────────── */}
      <Card className="overflow-hidden border-0 shadow-md">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-muted/50">
          {faqItems.map((faq, idx) => (
            <div key={idx}>
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/20 transition-colors"
              >
                <span className="font-medium text-sm pr-4">{faq.q}</span>
                {expandedFaq === idx ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>
              {expandedFaq === idx && (
                <div className="px-6 pb-4 -mt-1">
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Confirmation Dialog ──────────────────────────────────────── */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, plan: open ? confirmDialog.plan : null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {confirmDialog.plan && (
                <span className={PLAN_THEMES[confirmDialog.plan.id]?.iconText}>
                  {PLAN_ICONS[confirmDialog.plan.id]}
                </span>
              )}
              {confirmDialog.plan?.price === 0
                ? 'Switch to Free Plan'
                : `Upgrade to ${confirmDialog.plan?.name}`}
            </DialogTitle>
            <DialogDescription className="text-sm mt-2">
              {confirmDialog.plan?.price === 0
                ? 'You will lose access to premium features and your limits will be reduced to the Free tier.'
                : `This will upgrade your account to the ${confirmDialog.plan?.name} plan at $${confirmDialog.plan?.price}/${confirmDialog.plan?.billingCycle}. In production, you would be redirected to Stripe for payment.`}
            </DialogDescription>
          </DialogHeader>

          {confirmDialog.plan && confirmDialog.plan.price > 0 && (
            <div className="space-y-3 py-3">
              <h4 className="text-sm font-semibold">You&apos;ll unlock:</h4>
              <ul className="space-y-1.5">
                {confirmDialog.plan.features.slice(0, 5).map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, plan: null })}>
              Cancel
            </Button>
            <Button
              onClick={() => confirmDialog.plan && handleUpgrade(confirmDialog.plan.id)}
              disabled={upgrading !== null}
              className={
                confirmDialog.plan?.id === 'pro'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600'
                  : confirmDialog.plan?.id === 'enterprise'
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700'
                  : ''
              }
            >
              {upgrading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
              {confirmDialog.plan?.price === 0 ? 'Switch to Free' : `Upgrade to ${confirmDialog.plan?.name}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
