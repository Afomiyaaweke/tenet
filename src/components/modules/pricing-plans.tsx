'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, useNavStore } from '@/store';
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
  ChevronRight, BarChart3, Bot, Users, FileText, Gavel,
  MessageSquare, Globe2, Award, Calendar,
} from 'lucide-react';

// ─── Plan Data Types ──────────────────────────────────────────────────

interface PlanFeature {
  text: string;
  included: boolean;
  icon?: React.ReactNode;
}

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

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  api_general: { label: 'General API', icon: <BarChart3 className="h-4 w-4" />, color: 'text-gray-500' },
  ai: { label: 'AI & Intelligence', icon: <Bot className="h-4 w-4" />, color: 'text-purple-500' },
  documents: { label: 'Documents', icon: <FileText className="h-4 w-4" />, color: 'text-blue-500' },
  bids: { label: 'Bids', icon: <Gavel className="h-4 w-4" />, color: 'text-green-500' },
  tenders: { label: 'Tenders', icon: <Globe2 className="h-4 w-4" />, color: 'text-emerald-500' },
  chat: { label: 'Chat & Messaging', icon: <MessageSquare className="h-4 w-4" />, color: 'text-cyan-500' },
  social: { label: 'Social Circle', icon: <Users className="h-4 w-4" />, color: 'text-orange-500' },
  auth: { label: 'Auth & Security', icon: <Shield className="h-4 w-4" />, color: 'text-red-500' },
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Rocket className="h-8 w-8" />,
  pro: <Zap className="h-8 w-8" />,
  enterprise: <Crown className="h-8 w-8" />,
};

const PLAN_COLORS: Record<string, { bg: string; border: string; accent: string; gradient: string }> = {
  free: {
    bg: 'bg-gray-50 dark:bg-gray-950',
    border: 'border-gray-200 dark:border-gray-800',
    accent: 'text-gray-700 dark:text-gray-300',
    gradient: 'from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-950',
  },
  pro: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-300 dark:border-orange-800',
    accent: 'text-orange-700 dark:text-orange-400',
    gradient: 'from-orange-100 to-orange-50 dark:from-orange-900 dark:to-orange-950',
  },
  enterprise: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-300 dark:border-purple-800',
    accent: 'text-purple-700 dark:text-purple-400',
    gradient: 'from-purple-100 to-purple-50 dark:from-purple-900 dark:to-purple-950',
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
        // Refresh user data
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            Subscription Plans
          </h2>
          <p className="text-muted-foreground mt-1">
            Choose the plan that fits your procurement needs. Upgrade anytime.
          </p>
        </div>
        <Badge className={`${currentPlan?.badgeColor || 'bg-gray-100 text-gray-700'} px-3 py-1 text-sm`}>
          Current: {currentPlan?.name || 'Free'}
        </Badge>
      </div>

      {/* Current Plan Summary */}
      <Card className={`bg-gradient-to-r ${PLAN_COLORS[currentPlanName]?.gradient || PLAN_COLORS.free.gradient} border-2 ${PLAN_COLORS[currentPlanName]?.border || PLAN_COLORS.free.border}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            {PLAN_ICONS[currentPlanName]}
            <span>{currentPlan?.name || 'Free'} Plan</span>
            {currentPlan?.price > 0 && (
              <span className="text-lg font-normal text-muted-foreground">
                — ${currentPlan.price}/{currentPlan.billingCycle}
              </span>
            )}
          </CardTitle>
          <CardDescription>{currentPlan?.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {subscription && (
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-green-500" />
                <span>Status: <strong className="text-green-600">{subscription.status}</strong></span>
              </div>
              {subscription.endDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Renews: <strong>{new Date(subscription.endDate).toLocaleDateString()}</strong></span>
                </div>
              )}
              {currentPlan?.prioritySupport && (
                <div className="flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-orange-500" />
                  <span>Priority Support</span>
                </div>
              )}
              {currentPlan?.customAiPrompts && (
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span>Custom AI Prompts</span>
                </div>
              )}
            </div>
          )}

          {/* Usage Bars */}
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-semibold mb-2">Current Usage (Last Minute)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {usage.filter(u => CATEGORY_LABELS[u.category]).map((u) => {
                const catInfo = CATEGORY_LABELS[u.category];
                return (
                  <div key={u.category} className="p-3 rounded-lg bg-white/50 dark:bg-black/20 border">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={catInfo.color}>{catInfo.icon}</span>
                      <span className="text-sm font-medium">{catInfo.label}</span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-lg font-bold">{u.used}</span>
                      <span className="text-xs text-muted-foreground">
                        / {u.unlimited ? '∞' : u.limit} per min
                      </span>
                    </div>
                    {!u.unlimited && (
                      <Progress
                        value={u.percentage}
                        className={`h-1.5 ${u.percentage > 80 ? '[&>div]:bg-red-500' : u.percentage > 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {allPlans.map((plan) => {
          const colors = PLAN_COLORS[plan.id] || PLAN_COLORS.free;
          const isCurrent = plan.id === currentPlanName;
          const isPro = plan.id === 'pro';
          const isEnterprise = plan.id === 'enterprise';

          return (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-200 ${
                isPro ? 'scale-[1.02] shadow-lg ring-2 ring-orange-400 dark:ring-orange-600' :
                isEnterprise ? 'shadow-md ring-1 ring-purple-300 dark:ring-purple-700' :
                'shadow-sm'
              } ${isCurrent ? 'opacity-90' : ''}`}
            >
              {/* Highlight badge */}
              {plan.highlight && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-500 to-orange-400 text-white text-xs font-bold px-3 py-1 rounded-bl-lg shadow-sm">
                  ★ MOST POPULAR
                </div>
              )}

              <CardHeader className={`pb-4 ${colors.bg}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${colors.bg} border ${colors.border}`}>
                    <span className={colors.accent}>{PLAN_ICONS[plan.id]}</span>
                  </div>
                  <div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription className="text-sm mt-0.5">
                      {plan.price === 0 ? 'No cost' : `$${plan.price}/${plan.billingCycle}`}
                    </CardDescription>
                  </div>
                </div>

                {/* Price display */}
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-sm text-muted-foreground">/{plan.billingCycle}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </CardHeader>

              <CardContent className="pt-4">
                {/* Limits Summary */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{plan.maxTenders === -1 ? '∞' : plan.maxTenders} tenders</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Gavel className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{plan.maxBids === -1 ? '∞' : plan.maxBids} bids</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{plan.aiCallsPerDay === -1 ? '∞' : plan.aiCallsPerDay} AI calls</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{plan.maxTeamMembers === -1 ? '∞' : plan.maxTeamMembers} members</span>
                  </div>
                </div>

                <Separator className="mb-4" />

                {/* Features list */}
                <ScrollArea className="max-h-[240px] pr-2">
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className={`h-4 w-4 mt-0.5 ${colors.accent} shrink-0`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>

                {/* Rate limits detail */}
                <Separator className="my-4" />
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rate Limits (req/min)</h4>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {Object.entries(plan.limits).map(([cat, limit]) => {
                      const catLabel = CATEGORY_LABELS[cat]?.label || cat;
                      return (
                        <div key={cat} className="flex items-center justify-between p-1.5 rounded bg-muted/30">
                          <span className="text-muted-foreground">{catLabel}</span>
                          <span className="font-semibold">{limit === -1 ? '∞' : limit}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Action button */}
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Check className="h-4 w-4 mr-2" />
                    Current Plan
                  </Button>
                ) : plan.price === 0 ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setConfirmDialog({ open: true, plan })}
                    disabled={upgrading === plan.id}
                  >
                    {upgrading === plan.id ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                    Switch to Free
                  </Button>
                ) : (
                  <Button
                    className={`w-full ${isPro ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white' : isEnterprise ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white' : ''}`}
                    onClick={() => setConfirmDialog({ open: true, plan })}
                    disabled={upgrading === plan.id}
                  >
                    {upgrading === plan.id ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Upgrade to {plan.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Feature Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[500px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-3 text-left font-medium text-muted-foreground w-[40%]">Feature</th>
                  {allPlans.map(p => (
                    <th key={p.id} className={`py-2 px-3 text-center font-semibold ${p.id === currentPlanName ? PLAN_COLORS[p.id]?.accent : ''}`}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
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
                ].map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                    <td className="py-2 px-3 font-medium">{row.label}</td>
                    {[row.free, row.pro, row.enterprise].map((val, colIdx) => {
                      const planId = ['free', 'pro', 'enterprise'][colIdx];
                      const isCurrent = planId === currentPlanName;
                      return (
                        <td key={colIdx} className={`py-2 px-3 text-center ${isCurrent ? 'font-semibold ' + PLAN_COLORS[planId]?.accent : ''}`}>
                          {val === true ? (
                            <Check className="h-4 w-4 text-green-500 mx-auto" />
                          ) : val === false ? (
                            <X className="h-4 w-4 text-red-400 mx-auto" />
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

      {/* FAQ Section */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
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
          ].map((faq, idx) => (
            <div key={idx}>
              <h4 className="text-sm font-semibold">{faq.q}</h4>
              <p className="text-sm text-muted-foreground mt-1">{faq.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, plan: open ? confirmDialog.plan : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmDialog.plan && PLAN_ICONS[confirmDialog.plan.id]}
              {confirmDialog.plan?.price === 0
                ? 'Switch to Free Plan'
                : `Upgrade to ${confirmDialog.plan?.name} Plan`}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.plan?.price === 0
                ? 'You will lose access to premium features and your limits will be reduced to the Free tier.'
                : `This will upgrade your account to the ${confirmDialog.plan?.name} plan at $${confirmDialog.plan?.price}/${confirmDialog.plan?.billingCycle}. In production, you would be redirected to Stripe for payment.`}
            </DialogDescription>
          </DialogHeader>

          {confirmDialog.plan && confirmDialog.plan.price > 0 && (
            <div className="space-y-3 py-3">
              <h4 className="text-sm font-semibold">You'll unlock:</h4>
              <ul className="space-y-1">
                {confirmDialog.plan.features.slice(0, 5).map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, plan: null })}>
              Cancel
            </Button>
            <Button
              onClick={() => confirmDialog.plan && handleUpgrade(confirmDialog.plan.id)}
              disabled={upgrading !== null}
              className={
                confirmDialog.plan?.id === 'pro'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                  : confirmDialog.plan?.id === 'enterprise'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
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
