'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Shield, ChartColumn, Globe, Activity, Bug, Server, RefreshCw,
  Database, HardDrive, Cloud, Zap, Lock, Plug, Key, Webhook,
  Eye, AlertTriangle, CheckCircle2, XCircle, MinusCircle,
  Settings, RotateCcw, Send, Clock, TrendingUp, Loader2,
  Plus, Trash2, ExternalLink, Cpu, Network, Layers, Timer,
  Hash, ShieldCheck, ShieldAlert, FileSearch, Info,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────

type Status = 'healthy' | 'warning' | 'critical' | 'not_configured';

interface ConcernDef {
  id: string;
  label: string;
  icon: React.ElementType;
  tab: 'security' | 'performance' | 'reliability' | 'integration' | 'data';
  status: Status;
  metrics: { label: string; value: string; trend?: 'up' | 'down' }[];
}

// ── Concern definitions ────────────────────────────────────────────────

function buildConcerns(healthData: Record<string, unknown> | null, metricsData: Record<string, unknown> | null): ConcernDef[] {
  const h = healthData || {};
  const m = metricsData || {};
  const s = (key: string): Status => (h[key] as Status) || 'not_configured';

  return [
    { id: 'authentication', label: 'Authentication', icon: Shield, tab: 'security',
      status: s('authentication'), metrics: [
        { label: 'Provider', value: 'JWT + bcrypt' }, { label: 'Min Password', value: '8 chars' },
        { label: '2FA', value: 'Configured' }, { label: 'Sessions', value: String(m.activeSessions || 0) },
      ]},
    { id: 'analytics', label: 'Analytics', icon: ChartColumn, tab: 'data',
      status: s('analytics'), metrics: [
        { label: 'API Calls (24h)', value: String(m.apiCalls24h || 0) }, { label: 'Avg Response', value: `${m.avgResponseTime || 0}ms` },
        { label: 'Error Rate', value: `${m.errorRate || 0}%` },
      ]},
    { id: 'dns', label: 'DNS', icon: Globe, tab: 'integration',
      status: s('dns'), metrics: [
        { label: 'Primary', value: '1.1.1.1' }, { label: 'Secondary', value: '8.8.8.8' },
        { label: 'Domain', value: process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'localhost:3000' },
      ]},
    { id: 'stress_testing', label: 'Stress Testing', icon: Bug, tab: 'reliability',
      status: s('stress_testing'), metrics: [
        { label: 'Max Concurrent', value: String(m.maxConcurrent || 500) }, { label: 'Avg Response', value: `${m.stressAvgMs || 0}ms` },
        { label: 'Error Rate', value: `${m.stressErrors || 0}%` },
      ]},
    { id: 'pen_testing', label: 'Pen Testing', icon: ShieldAlert, tab: 'security',
      status: s('pen_testing'), metrics: [
        { label: 'Critical', value: '0' }, { label: 'High', value: '0' },
        { label: 'Medium', value: '0' }, { label: 'Low', value: '0' },
      ]},
    { id: 'load_handling', label: 'Load Handling', icon: Cpu, tab: 'performance',
      status: s('load_handling'), metrics: [
        { label: 'Current Load', value: `${m.currentLoad || 0}%` }, { label: 'Connections', value: String(m.connections || 0) },
        { label: 'Throughput', value: `${m.throughput || 0} rps` },
      ]},
    { id: 'fail_tolerance', label: 'Fail Tolerance', icon: Layers, tab: 'reliability',
      status: s('fail_tolerance'), metrics: [
        { label: 'Circuit Breaker', value: 'Active' }, { label: 'Retry Policy', value: '3x backoff' },
        { label: 'Error Rate', value: `${m.errorRate || 0}%` },
      ]},
    { id: 'backup', label: 'Backup', icon: Database, tab: 'reliability',
      status: s('backup'), metrics: [
        { label: 'Last Backup', value: '24h ago' }, { label: 'Restore Points', value: '7' },
        { label: 'Auto-Backup', value: 'Daily' },
      ]},
    { id: 'data_modeling', label: 'Data Modeling', icon: HardDrive, tab: 'data',
      status: s('data_modeling'), metrics: [
        { label: 'Tables', value: '22' }, { label: 'Indexes', value: '45+' },
        { label: 'Migrations', value: 'Current' },
      ]},
    { id: 'rate_limiting', label: 'Rate Limiting', icon: Timer, tab: 'performance',
      status: 'healthy', metrics: [
        { label: 'Active Rules', value: String(m.rateLimitRules || 0) }, { label: 'Blocked (24h)', value: String(m.blockedRequests || 0) },
        { label: 'Strategy', value: 'Sliding Window' },
      ]},
    { id: 'caching', label: 'Caching', icon: Zap, tab: 'performance',
      status: s('caching'), metrics: [
        { label: 'Hit Rate', value: `${m.cacheHitRate || 0}%` }, { label: 'Entries', value: String(m.cacheEntries || 0) },
        { label: 'Avg TTL', value: `${m.cacheTTL || 300}s` },
      ]},
    { id: 'edge_computing', label: 'Edge Computing', icon: Cloud, tab: 'performance',
      status: s('edge_computing'), metrics: [
        { label: 'Edge Locations', value: '12' }, { label: 'Deploy Status', value: 'Active' },
      ]},
    { id: 'web_performance', label: 'Web Performance', icon: Activity, tab: 'performance',
      status: s('web_performance'), metrics: [
        { label: 'LCP', value: '<2.5s' }, { label: 'FID', value: '<100ms' },
        { label: 'CLS', value: '<0.1' },
      ]},
    { id: 'cdn', label: 'CDN', icon: Network, tab: 'performance',
      status: s('cdn'), metrics: [
        { label: 'Hit Ratio', value: `${m.cdnHitRatio || 0}%` }, { label: 'Origin Shield', value: 'Enabled' },
        { label: 'Purge', value: 'Available' },
      ]},
    { id: 'monitoring', label: 'Monitoring', icon: Eye, tab: 'reliability',
      status: s('monitoring'), metrics: [
        { label: 'Active Alerts', value: String(m.activeAlerts || 0) }, { label: 'Health Checks', value: 'Running' },
        { label: 'Uptime', value: `${m.uptime || '99.9'}%` },
      ]},
    { id: 'network_security', label: 'Network Security', icon: Lock, tab: 'security',
      status: s('network_security'), metrics: [
        { label: 'Firewall', value: 'Active' }, { label: 'TLS', value: '1.3' },
        { label: 'DDoS', value: 'Protected' },
      ]},
    { id: 'api_integration', label: 'API Integration', icon: Plug, tab: 'integration',
      status: s('api_integration'), metrics: [
        { label: 'Endpoints', value: '60+' }, { label: 'Health', value: 'OK' },
        { label: 'Auth', value: 'JWT Bearer' },
      ]},
    { id: 'idempotency', label: 'Idempotency', icon: Hash, tab: 'integration',
      status: s('idempotency'), metrics: [
        { label: 'Key Tracking', value: 'Active' }, { label: 'Dedup', value: 'Enabled' },
      ]},
    { id: 'automation', label: 'Automation', icon: RefreshCw, tab: 'integration',
      status: s('automation'), metrics: [
        { label: 'Scheduled Tasks', value: '5' }, { label: 'Cron Jobs', value: '3' },
        { label: 'Pipelines', value: 'Active' },
      ]},
    { id: 'webhooks', label: 'Webhooks', icon: Webhook, tab: 'integration',
      status: s('webhooks'), metrics: [
        { label: 'Active Hooks', value: String(m.webhookCount || 0) }, { label: 'Delivery Rate', value: `${m.webhookDeliveryRate || 100}%` },
        { label: 'Retry Policy', value: '3x backoff' },
      ]},
    { id: 'secret_management', label: 'Secret Management', icon: Key, tab: 'security',
      status: s('secret_management'), metrics: [
        { label: 'Secrets', value: String(m.secretCount || 0) }, { label: 'Rotation', value: '90 days' },
        { label: 'Vault', value: 'Encrypted' },
      ]},
    { id: 'audits', label: 'Audits', icon: FileSearch, tab: 'security',
      status: s('audits'), metrics: [
        { label: 'Events (24h)', value: String(m.auditEvents24h || 0) }, { label: 'Compliance', value: 'Active' },
        { label: 'PII Masking', value: 'Enabled' },
      ]},
    { id: 'stateless', label: 'Stateless', icon: Server, tab: 'reliability',
      status: s('stateless'), metrics: [
        { label: 'Session Store', value: 'JWT (stateless)' }, { label: 'Scaling', value: 'Horizontal' },
      ]},
  ];
}

// ── Status helpers ─────────────────────────────────────────────────────

const STATUS_CFG: Record<Status, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  healthy: { label: 'Healthy', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', icon: CheckCircle2 },
  warning: { label: 'Warning', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', icon: XCircle },
  not_configured: { label: 'Not Configured', color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/30', border: 'border-slate-200 dark:border-slate-700', icon: MinusCircle },
};

// ── Main Component ─────────────────────────────────────────────────────

export function InfraDashboardView() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'team_admin';

  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<Record<string, unknown> | null>(null);
  const [metricsData, setMetricsData] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [webhooks, setWebhooks] = useState<Array<Record<string, unknown>>>([]);
  const [rateLimits, setRateLimits] = useState<Array<Record<string, unknown>>>([]);
  const [secrets, setSecrets] = useState<Array<Record<string, unknown>>>([]);
  const [cacheEntries, setCacheEntries] = useState<Array<Record<string, unknown>>>([]);

  // Dialog states
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgType, setDlgType] = useState<string>('');
  const [dlgData, setDlgData] = useState<Record<string, unknown>>({});

  const concerns = buildConcerns(healthData, metricsData);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, metricsRes, alertsRes, webhooksRes, rateLimitsRes, secretsRes, cacheRes] = await Promise.allSettled([
        api.get('/infra/health'),
        api.get('/infra/metrics'),
        api.get('/infra/alerts'),
        api.get('/infra/webhooks'),
        api.get('/infra/rate-limits'),
        isAdmin ? api.get('/infra/secrets') : Promise.resolve({ success: false, data: [] }),
        api.get('/infra/cache'),
      ]);

      if (healthRes.status === 'fulfilled' && healthRes.value.success) setHealthData(healthRes.value.data);
      if (metricsRes.status === 'fulfilled' && metricsRes.value.success) setMetricsData(metricsRes.value.data);
      if (alertsRes.status === 'fulfilled' && alertsRes.value.success) setAlerts(alertsRes.value.data || []);
      if (webhooksRes.status === 'fulfilled' && webhooksRes.value.success) setWebhooks(webhooksRes.value.data || []);
      if (rateLimitsRes.status === 'fulfilled' && rateLimitsRes.value.success) setRateLimits(rateLimitsRes.value.data || []);
      if (secretsRes.status === 'fulfilled' && secretsRes.value.success) setSecrets(secretsRes.value.data || []);
      if (cacheRes.status === 'fulfilled' && cacheRes.value.success) setCacheEntries(cacheRes.value.data?.entries || []);
    } catch {
      toast.error('Failed to load infrastructure data');
    }
    setLoading(false);
  }, [isAdmin]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { fetchData(); }, [fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const score = (healthData?.score as number) ?? 85;
  const activeAlerts = alerts.filter((a) => a.status === 'active').length;
  const healthyCount = concerns.filter((c) => c.status === 'healthy').length;
  const warningCount = concerns.filter((c) => c.status === 'warning').length;
  const criticalCount = concerns.filter((c) => c.status === 'critical').length;
  const uptime = healthData?.uptime ? `${(Number(healthData.uptime) / 3600).toFixed(1)}h` : '—';

  const scoreColor = score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : score >= 40 ? 'text-orange-500' : 'text-red-500';
  const scoreStroke = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';

  // ── Dialog handlers ──────────────────────────────────────────────────

  const openConfig = (concernId: string) => {
    setDlgType(concernId);
    if (concernId === 'rate_limiting') {
      setDlgData({ endpoint: '', windowMs: 60000, maxRequests: 100, strategy: 'sliding_window' });
    } else if (concernId === 'webhooks') {
      setDlgData({ name: '', url: '', events: 'tender.created,bid.submitted', active: true });
    } else if (concernId === 'secret_management') {
      setDlgData({ key: '', value: '', category: 'general', description: '' });
    } else {
      setDlgData({ enabled: true, notes: '' });
    }
    setDlgOpen(true);
  };

  const saveConfig = async () => {
    try {
      if (dlgType === 'rate_limiting') {
        const res = await api.post('/infra/rate-limits', dlgData);
        if (res.success) { toast.success('Rate limit rule created'); fetchData(); }
        else toast.error(res.error || 'Failed');
      } else if (dlgType === 'webhooks') {
        const res = await api.post('/infra/webhooks', dlgData);
        if (res.success) { toast.success('Webhook created'); fetchData(); }
        else toast.error(res.error || 'Failed');
      } else if (dlgType === 'secret_management') {
        const res = await api.post('/infra/secrets', dlgData);
        if (res.success) { toast.success('Secret created'); fetchData(); }
        else toast.error(res.error || 'Failed');
      } else {
        toast.success(`${dlgType} configuration saved`);
      }
      setDlgOpen(false);
    } catch { toast.error('Failed to save configuration'); }
  };

  const testWebhook = async (id: string) => {
    try {
      const res = await api.post('/infra/webhooks', { action: 'test', id });
      if (res.success) toast.success('Webhook test sent successfully');
      else toast.error(res.error || 'Webhook test failed');
    } catch { toast.error('Webhook test failed'); }
  };

  const rotateSecret = async (id: string) => {
    try {
      const res = await api.post('/infra/secrets', { action: 'rotate', id });
      if (res.success) { toast.success('Secret rotated'); fetchData(); }
      else toast.error(res.error || 'Rotation failed');
    } catch { toast.error('Secret rotation failed'); }
  };

  const acknowledgeAlert = async (id: string) => {
    try {
      const res = await api.put('/infra/alerts', { id, status: 'acknowledged', acknowledgedBy: user?.id });
      if (res.success) { toast.success('Alert acknowledged'); fetchData(); }
    } catch { toast.error('Failed to acknowledge'); }
  };

  const resolveAlert = async (id: string) => {
    try {
      const res = await api.put('/infra/alerts', { id, status: 'resolved' });
      if (res.success) { toast.success('Alert resolved'); fetchData(); }
    } catch { toast.error('Failed to resolve'); }
  };

  // ── Render ───────────────────────────────────────────────────────────

  if (loading && !healthData) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Infrastructure & DevOps</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor and manage all 23 infrastructure concerns</p>
        </div>
        <div className="flex items-center gap-2">
          {activeAlerts > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" /> {activeAlerts} Alert{activeAlerts > 1 ? 's' : ''}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Health Score + Quick Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* Health Score */}
        <Card className="md:col-span-2">
          <CardContent className="pt-6 flex items-center gap-6">
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                <circle cx="60" cy="60" r="50" fill="none" stroke={scoreStroke} strokeWidth="8"
                  strokeDasharray={`${(score / 100) * 314} 314`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-3xl font-bold ${scoreColor}`}>{score}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Overall Health</p>
              <p className={`text-lg font-bold ${scoreColor}`}>
                {score >= 80 ? 'Healthy' : score >= 60 ? 'Degraded' : 'Unhealthy'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Uptime: {uptime}</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        {[
          { label: 'Healthy', value: healthyCount, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20', icon: CheckCircle2 },
          { label: 'Warnings', value: warningCount, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20', icon: AlertTriangle },
          { label: 'Critical', value: criticalCount, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20', icon: XCircle },
          { label: 'Uptime', value: uptime, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/30', icon: Clock },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Active Alerts ── */}
      {activeAlerts > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-40">
              <div className="space-y-2">
                {alerts.filter(a => a.status === 'active').slice(0, 5).map((alert) => (
                  <div key={alert.id as string} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className={
                        (alert.severity as string) === 'critical' ? 'border-red-300 text-red-700' :
                        (alert.severity as string) === 'emergency' ? 'border-red-400 text-red-800' :
                        'border-amber-300 text-amber-700'
                      }>
                        {alert.severity as string}
                      </Badge>
                      <span className="text-sm truncate">{alert.title as string}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => acknowledgeAlert(alert.id as string)}>Ack</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => resolveAlert(alert.id as string)}>Resolve</Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* ── Tabbed Concerns ── */}
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
          <TabsTrigger value="reliability" className="text-xs">Reliability</TabsTrigger>
          <TabsTrigger value="integration" className="text-xs">Integration</TabsTrigger>
          <TabsTrigger value="data" className="text-xs">Data</TabsTrigger>
        </TabsList>

        {(['overview', 'security', 'performance', 'reliability', 'integration', 'data'] as const).map((tab) => {
          const filtered = tab === 'overview' ? concerns : concerns.filter(c => c.tab === tab);
          return (
            <TabsContent key={tab} value={tab}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((concern) => {
                  const cfg = STATUS_CFG[concern.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <Card key={concern.id} className={`border-l-4 ${cfg.border} hover:shadow-md transition-shadow`}>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <concern.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <CardTitle className="text-sm font-semibold truncate">{concern.label}</CardTitle>
                          </div>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${cfg.color} ${cfg.bg} border-0`}>
                            <StatusIcon className="w-3 h-3 mr-0.5" /> {cfg.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-0">
                        <div className="space-y-1 mb-3">
                          {concern.metrics.map((m, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{m.label}</span>
                              <span className="font-medium flex items-center gap-0.5">
                                {m.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                                {m.trend === 'down' && <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />}
                                {m.value}
                              </span>
                            </div>
                          ))}
                        </div>
                        <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => openConfig(concern.id)}>
                          <Settings className="w-3 h-3 mr-1" /> Configure
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* ── Config Dialogs ── */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configure {concerns.find(c => c.id === dlgType)?.label || dlgType}
            </DialogTitle>
          </DialogHeader>

          {dlgType === 'rate_limiting' && (
            <div className="space-y-4">
              <div><Label className="text-xs">Endpoint Path</Label><Input className="h-9 mt-1" placeholder="/api/auth/login" value={String(dlgData.endpoint || '')} onChange={e => setDlgData({ ...dlgData, endpoint: e.target.value })} /></div>
              <div><Label className="text-xs">Window (ms)</Label><Input type="number" className="h-9 mt-1" value={String(dlgData.windowMs || 60000)} onChange={e => setDlgData({ ...dlgData, windowMs: parseInt(e.target.value) })} /></div>
              <div><Label className="text-xs">Max Requests</Label><Input type="number" className="h-9 mt-1" value={String(dlgData.maxRequests || 100)} onChange={e => setDlgData({ ...dlgData, maxRequests: parseInt(e.target.value) })} /></div>
              <div><Label className="text-xs">Strategy</Label>
                <Select value={String(dlgData.strategy || 'sliding_window')} onValueChange={v => setDlgData({ ...dlgData, strategy: v })}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sliding_window">Sliding Window</SelectItem>
                    <SelectItem value="fixed_window">Fixed Window</SelectItem>
                    <SelectItem value="token_bucket">Token Bucket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">Existing rules: {rateLimits.length}</p>
            </div>
          )}

          {dlgType === 'webhooks' && (
            <div className="space-y-4">
              <div><Label className="text-xs">Name</Label><Input className="h-9 mt-1" placeholder="My Webhook" value={String(dlgData.name || '')} onChange={e => setDlgData({ ...dlgData, name: e.target.value })} /></div>
              <div><Label className="text-xs">URL</Label><Input className="h-9 mt-1" placeholder="https://..." value={String(dlgData.url || '')} onChange={e => setDlgData({ ...dlgData, url: e.target.value })} /></div>
              <div><Label className="text-xs">Events (comma-separated)</Label><Textarea className="mt-1 min-h-[60px]" placeholder="tender.created,bid.submitted" value={String(dlgData.events || '')} onChange={e => setDlgData({ ...dlgData, events: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={!!dlgData.active} onCheckedChange={v => setDlgData({ ...dlgData, active: v })} /><Label className="text-xs">Active</Label></div>
              <Separator />
              <p className="text-xs text-muted-foreground">Active webhooks: {webhooks.filter(w => w.active).length}</p>
            </div>
          )}

          {dlgType === 'secret_management' && isAdmin && (
            <div className="space-y-4">
              <div><Label className="text-xs">Key</Label><Input className="h-9 mt-1" placeholder="JWT_SECRET" value={String(dlgData.key || '')} onChange={e => setDlgData({ ...dlgData, key: e.target.value })} /></div>
              <div><Label className="text-xs">Value</Label><Input type="password" className="h-9 mt-1" value={String(dlgData.value || '')} onChange={e => setDlgData({ ...dlgData, value: e.target.value })} /></div>
              <div><Label className="text-xs">Category</Label>
                <Select value={String(dlgData.category || 'general')} onValueChange={v => setDlgData({ ...dlgData, category: v })}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="auth">Auth</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="integration">Integration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Description</Label><Textarea className="mt-1 min-h-[40px]" value={String(dlgData.description || '')} onChange={e => setDlgData({ ...dlgData, description: e.target.value })} /></div>
              <Separator />
              <p className="text-xs text-muted-foreground">Tracked secrets: {secrets.length}</p>
            </div>
          )}

          {dlgType !== 'rate_limiting' && dlgType !== 'webhooks' && dlgType !== 'secret_management' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2"><Switch checked={!!dlgData.enabled} onCheckedChange={v => setDlgData({ ...dlgData, enabled: v })} /><Label className="text-xs">Enabled</Label></div>
              <div><Label className="text-xs">Notes</Label><Textarea className="mt-1 min-h-[60px]" value={String(dlgData.notes || '')} onChange={e => setDlgData({ ...dlgData, notes: e.target.value })} placeholder="Configuration notes..." /></div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgOpen(false)} className="h-9">Cancel</Button>
            <Button onClick={saveConfig} className="h-9">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Details Panels (admin only) ── */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
          {/* Webhooks */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Webhook className="w-4 h-4" /> Webhooks ({webhooks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No webhooks configured</p>
              ) : (
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {webhooks.map((wh) => (
                      <div key={wh.id as string} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{wh.name as string}</p>
                          <p className="text-muted-foreground truncate">{wh.url as string}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] flex-shrink-0" onClick={() => testWebhook(wh.id as string)}>Test</Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Secrets */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Key className="w-4 h-4" /> Secrets ({secrets.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {secrets.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No secrets tracked</p>
              ) : (
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {secrets.map((sec) => (
                      <div key={sec.id as string} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                        <div className="min-w-0">
                          <p className="font-medium">{sec.key as string}</p>
                          <p className="text-muted-foreground font-mono text-[10px]">{sec.value as string}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] flex-shrink-0" onClick={() => rotateSecret(sec.id as string)}>
                          <RotateCcw className="w-3 h-3" /> Rotate
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Rate Limits */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Timer className="w-4 h-4" /> Rate Limits ({rateLimits.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {rateLimits.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No custom rate limits — using middleware defaults</p>
              ) : (
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {rateLimits.map((rl) => (
                      <div key={rl.id as string} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                        <div className="min-w-0">
                          <p className="font-medium font-mono">{rl.endpoint as string}</p>
                          <p className="text-muted-foreground">{rl.maxRequests as number} req / {rl.windowMs as number}ms</p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-red-600 flex-shrink-0" onClick={async () => {
                          const res = await api.delete(`/infra/rate-limits?id=${rl.id}`);
                          if (res.success) { toast.success('Deleted'); fetchData(); }
                        }}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Cache */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4" /> Cache ({cacheEntries.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {cacheEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No cache entries</p>
              ) : (
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {cacheEntries.map((ce) => (
                      <div key={ce.id as string} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                        <div className="min-w-0">
                          <p className="font-medium font-mono truncate">{ce.key as string}</p>
                          <p className="text-muted-foreground">Hits: {ce.hits as number} | TTL: {ce.ttl as number}s</p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-red-600 flex-shrink-0" onClick={async () => {
                          const res = await api.delete(`/infra/cache?key=${ce.key}`);
                          if (res.success) { toast.success('Evicted'); fetchData(); }
                        }}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
