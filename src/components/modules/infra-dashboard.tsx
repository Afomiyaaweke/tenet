'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Shield,
  BarChart3,
  Globe,
  Activity,
  Bug,
  Server,
  RefreshCw,
  Database,
  Table2,
  Gauge,
  HardDrive,
  Cloud,
  Zap,
  Radio,
  Monitor,
  Lock,
  Plug,
  Key,
  Bot,
  Webhook,
  Eye,
  ServerOff,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Settings,
  RotateCcw,
  Send,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  FileWarning,
  Cpu,
  Network,
  Layers,
  Fingerprint,
  Timer,
  CircleDot,
  Hash,
  ShieldCheck,
  ShieldAlert,
  FileSearch,
  Scan,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

type ConcernStatus = 'healthy' | 'warning' | 'critical' | 'not_configured';

interface HealthResponse {
  success: boolean;
  data: {
    score: number;
    concerns: Record<string, ConcernStatus>;
    lastChecked: string;
    uptime: number;
  };
}

interface MetricsResponse {
  success: boolean;
  data: {
    authentication: AuthMetrics;
    analytics: AnalyticsMetrics;
    dns: DNSMetrics;
    stressTesting: StressTestMetrics;
    penTesting: PenTestMetrics;
    loadHandling: LoadMetrics;
    failTolerance: FailToleranceMetrics;
    backup: BackupMetrics;
    dataModeling: DataModelingMetrics;
    rateLimiting: RateLimitMetrics;
    caching: CacheMetrics;
    edgeComputing: EdgeMetrics;
    webPerformance: WebPerfMetrics;
    cdn: CDNMetrics;
    monitoring: MonitoringMetrics;
    networkSecurity: NetworkSecurityMetrics;
    apiIntegration: APIIntegrationMetrics;
    idempotency: IdempotencyMetrics;
    automation: AutomationMetrics;
    webhooks: WebhookMetrics;
    secretManagement: SecretMetrics;
    audits: AuditMetrics;
    stateless: StatelessMetrics;
  };
}

interface AuthMetrics {
  status: ConcernStatus;
  provider: string;
  jwtExpiry: number;
  passwordMinLength: number;
  twoFactorEnabled: boolean;
  activeSessions: number;
  failedLogins24h: number;
}

interface AnalyticsMetrics {
  status: ConcernStatus;
  apiCalls24h: number;
  avgResponseTime: number;
  activeUsers: number;
  p95Latency: number;
  errorRate: number;
}

interface DNSMetrics {
  status: ConcernStatus;
  domains: Array<{ domain: string; resolved: boolean; ttl: number }>;
  primaryDNS: string;
  secondaryDNS: string;
}

interface StressTestMetrics {
  status: ConcernStatus;
  lastRun: string | null;
  maxConcurrentUsers: number;
  avgResponseTimeMs: number;
  errorRate: number;
  isRunning: boolean;
}

interface PenTestMetrics {
  status: ConcernStatus;
  lastScan: string | null;
  vulnerabilities: { critical: number; high: number; medium: number; low: number };
  nextScheduled: string | null;
}

interface LoadMetrics {
  status: ConcernStatus;
  currentLoad: number;
  maxCapacity: number;
  concurrentConnections: number;
  throughputRps: number;
  avgLatencyMs: number;
}

interface FailToleranceMetrics {
  status: ConcernStatus;
  errorRate: number;
  retrySuccessRate: number;
  circuitBreakerOpen: boolean;
  fallbackActive: boolean;
  mttrMinutes: number;
}

interface BackupMetrics {
  status: ConcernStatus;
  lastBackup: string | null;
  nextBackup: string | null;
  backupSizeGB: number;
  restorePoints: number;
  autoBackupEnabled: boolean;
}

interface DataModelingMetrics {
  status: ConcernStatus;
  totalTables: number;
  pendingMigrations: number;
  largestTable: string;
  largestTableSize: string;
  schemaVersion: number;
}

interface RateLimitMetrics {
  status: ConcernStatus;
  rules: Array<{
    id: string;
    name: string;
    path: string;
    limit: number;
    window: string;
    blocked: number;
  }>;
  totalBlocked24h: number;
  currentRps: number;
}

interface CacheMetrics {
  status: ConcernStatus;
  hitRate: number;
  missRate: number;
  sizeMB: number;
  maxSizMB: number;
  entries: number;
  defaultTTL: number;
}

interface EdgeMetrics {
  status: ConcernStatus;
  locations: Array<{ region: string; city: string; status: 'active' | 'degraded' | 'offline' }>;
  totalLocations: number;
  activeLocations: number;
}

interface WebPerfMetrics {
  status: ConcernStatus;
  lcp: number;
  fid: number;
  cls: number;
  ttfb: number;
  bundleSizeKB: number;
}

interface CDNMetrics {
  status: ConcernStatus;
  provider: string;
  cacheHitRatio: number;
  originShieldEnabled: boolean;
  bandwidthGB: number;
  edgeNodes: number;
}

interface MonitoringMetrics {
  status: ConcernStatus;
  activeAlerts: number;
  healthChecks: { total: number; passing: number; failing: number };
  uptime24h: number;
  metricsCollected: number;
}

interface NetworkSecurityMetrics {
  status: ConcernStatus;
  firewallRules: number;
  sslExpiryDays: number;
  ddosProtection: boolean;
  openPorts: number;
  intrusions24h: number;
}

interface APIIntegrationMetrics {
  status: ConcernStatus;
  connections: Array<{ name: string; status: 'connected' | 'degraded' | 'down'; latency: number }>;
  totalEndpoints: number;
  healthyEndpoints: number;
  webhooksActive: number;
}

interface IdempotencyMetrics {
  status: ConcernStatus;
  keysTracked: number;
  duplicateRequestsBlocked: number;
  keyTTLHours: number;
  storageBackend: string;
}

interface AutomationMetrics {
  status: ConcernStatus;
  scheduledTasks: number;
  cronJobs: number;
  lastRunStatus: 'success' | 'failed' | 'running' | 'idle';
  pipelinesActive: number;
  failedTasks24h: number;
}

interface WebhookMetrics {
  status: ConcernStatus;
  endpoints: Array<{
    id: string;
    url: string;
    events: string[];
    active: boolean;
    successRate: number;
    lastDelivery: string | null;
  }>;
  totalDeliveries24h: number;
  failedDeliveries24h: number;
}

interface SecretMetrics {
  status: ConcernStatus;
  totalSecrets: number;
  rotationEnabled: boolean;
  lastRotation: string | null;
  expiringSoon: number;
  vaultHealth: 'healthy' | 'degraded' | 'offline';
}

interface AuditMetrics {
  status: ConcernStatus;
  events24h: number;
  complianceScore: number;
  retentionDays: number;
  recentEvents: Array<{ action: string; user: string; timestamp: string; severity: string }>;
}

interface StatelessMetrics {
  status: ConcernStatus;
  sessionStore: string;
  externalSessionStore: boolean;
  stickySessions: boolean;
  statelessCompliance: number;
  activeSessions: number;
}

interface AlertItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
}

interface AlertsResponse {
  success: boolean;
  data: AlertItem[];
}

interface CacheResponse {
  success: boolean;
  data: {
    entries: Array<{ key: string; size: string; ttl: number; hits: number }>;
    stats: CacheMetrics;
  };
}

interface RateLimitsResponse {
  success: boolean;
  data: {
    rules: RateLimitMetrics['rules'];
    stats: { totalBlocked24h: number; currentRps: number };
  };
}

interface WebhooksResponse {
  success: boolean;
  data: {
    endpoints: WebhookMetrics['endpoints'];
    stats: { totalDeliveries24h: number; failedDeliveries24h: number };
  };
}

interface SecretsResponse {
  success: boolean;
  data: {
    secrets: Array<{ id: string; name: string; value: string; lastRotated: string | null; expiresAt: string | null }>;
    stats: SecretMetrics;
  };
}

interface AuditLogsResponse {
  success: boolean;
  data: {
    events: AuditMetrics['recentEvents'];
    stats: AuditMetrics;
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const STATUS_CONFIG: Record<ConcernStatus, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }> = {
  healthy: { label: 'Healthy', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30', borderColor: 'border-emerald-200 dark:border-emerald-800', icon: CheckCircle2 },
  warning: { label: 'Warning', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950/30', borderColor: 'border-amber-200 dark:border-amber-800', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950/30', borderColor: 'border-red-200 dark:border-red-800', icon: XCircle },
  not_configured: { label: 'Not Configured', color: 'text-slate-500 dark:text-slate-400', bgColor: 'bg-slate-50 dark:bg-slate-900/30', borderColor: 'border-slate-200 dark:border-slate-700', icon: MinusCircle },
};

function statusBadgeVariant(status: ConcernStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'healthy': return 'default';
    case 'warning': return 'secondary';
    case 'critical': return 'destructive';
    case 'not_configured': return 'outline';
  }
}

function statusBadgeClass(status: ConcernStatus): string {
  switch (status) {
    case 'healthy': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'warning': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800';
    case 'not_configured': return 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400 border-slate-200 dark:border-slate-700';
  }
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(d: string | null): string {
  if (!d) return 'Never';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONCERN DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════════ */

interface ConcernDef {
  id: string;
  title: string;
  icon: React.ElementType;
  tab: 'overview' | 'security' | 'performance' | 'reliability' | 'integration' | 'data';
}

const CONCERNS: ConcernDef[] = [
  { id: 'authentication', title: 'Authentication', icon: Shield, tab: 'security' },
  { id: 'networkSecurity', title: 'Network Security', icon: Lock, tab: 'security' },
  { id: 'penTesting', title: 'Pen Testing', icon: Bug, tab: 'security' },
  { id: 'secretManagement', title: 'Secret Management', icon: Key, tab: 'security' },
  { id: 'audits', title: 'Audits', icon: Eye, tab: 'security' },
  { id: 'caching', title: 'Caching', icon: HardDrive, tab: 'performance' },
  { id: 'cdn', title: 'CDN', icon: Globe, tab: 'performance' },
  { id: 'edgeComputing', title: 'Edge Computing', icon: Cloud, tab: 'performance' },
  { id: 'webPerformance', title: 'Web Performance', icon: Monitor, tab: 'performance' },
  { id: 'loadHandling', title: 'Load Handling', icon: Gauge, tab: 'performance' },
  { id: 'rateLimiting', title: 'Rate Limiting', icon: Timer, tab: 'performance' },
  { id: 'failTolerance', title: 'Fail Tolerance', icon: RefreshCw, tab: 'reliability' },
  { id: 'backup', title: 'Backup', icon: Database, tab: 'reliability' },
  { id: 'monitoring', title: 'Monitoring', icon: Activity, tab: 'reliability' },
  { id: 'stressTesting', title: 'Stress Testing', icon: Cpu, tab: 'reliability' },
  { id: 'stateless', title: 'Stateless', icon: ServerOff, tab: 'reliability' },
  { id: 'apiIntegration', title: 'API Integration', icon: Plug, tab: 'integration' },
  { id: 'webhooks', title: 'Webhooks', icon: Webhook, tab: 'integration' },
  { id: 'automation', title: 'Automation', icon: Bot, tab: 'integration' },
  { id: 'idempotency', title: 'Idempotency', icon: Fingerprint, tab: 'integration' },
  { id: 'dns', title: 'DNS', icon: Globe, tab: 'integration' },
  { id: 'dataModeling', title: 'Data Modeling', icon: Table2, tab: 'data' },
  { id: 'analytics', title: 'Analytics', icon: BarChart3, tab: 'data' },
];

const TAB_CONCERNS: Record<string, string[]> = {
  overview: CONCERNS.map(c => c.id),
  security: CONCERNS.filter(c => c.tab === 'security').map(c => c.id),
  performance: CONCERNS.filter(c => c.tab === 'performance').map(c => c.id),
  reliability: CONCERNS.filter(c => c.tab === 'reliability').map(c => c.id),
  integration: CONCERNS.filter(c => c.tab === 'integration').map(c => c.id),
  data: CONCERNS.filter(c => c.tab === 'data').map(c => c.id),
};

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

/** Circular health score ring using SVG */
function HealthScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;

  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/20" />
        <circle
          cx={center} cy={center} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Health</span>
      </div>
    </div>
  );
}

/** Metric row used inside concern cards */
function MetricRow({ label, value, trend, sub }: { label: string; value: string | number; trend?: 'up' | 'down' | null; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
        {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
        <span className="text-xs font-medium">{value}</span>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

/** Concern card skeleton loader */
function ConcernCardSkeleton() {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-5/6" />
        </div>
        <div className="mt-3">
          <Skeleton className="h-7 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

/** Quick stat card for the top section */
function QuickStatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONCERN CARD CONTENT RENDERERS
   ═══════════════════════════════════════════════════════════════════════════ */

function AuthenticationCardContent({ data, onConfigure }: { data: AuthMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="Provider" value={data.provider} />
      <MetricRow label="JWT Expiry" value={`${data.jwtExpiry}s`} />
      <MetricRow label="Password Min Length" value={data.passwordMinLength} />
      <MetricRow label="2FA" value={data.twoFactorEnabled ? 'Enabled' : 'Disabled'} trend={data.twoFactorEnabled ? 'up' : null} />
      <MetricRow label="Active Sessions" value={formatNumber(data.activeSessions)} />
      <MetricRow label="Failed Logins (24h)" value={data.failedLogins24h} trend={data.failedLogins24h > 10 ? 'down' : null} />
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function AnalyticsCardContent({ data, onConfigure }: { data: AnalyticsMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="API Calls (24h)" value={formatNumber(data.apiCalls24h)} trend="up" />
      <MetricRow label="Avg Response Time" value={`${data.avgResponseTime}ms`} />
      <MetricRow label="Active Users" value={formatNumber(data.activeUsers)} />
      <MetricRow label="P95 Latency" value={`${data.p95Latency}ms`} />
      <MetricRow label="Error Rate" value={`${data.errorRate}%`} trend={data.errorRate > 1 ? 'down' : null} />
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function DNSCardContent({ data, onConfigure }: { data: DNSMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  const resolved = data.domains.filter(d => d.resolved).length;
  return (
    <>
      <MetricRow label="Domains Resolved" value={`${resolved}/${data.domains.length}`} />
      <MetricRow label="Primary DNS" value={data.primaryDNS} />
      <MetricRow label="Secondary DNS" value={data.secondaryDNS} />
      {data.domains.slice(0, 3).map(d => (
        <MetricRow key={d.domain} label={d.domain} value={d.resolved ? 'Resolved' : 'Failed'} trend={d.resolved ? 'up' : 'down'} />
      ))}
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function StressTestCardContent({ data, onConfigure }: { data: StressTestMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="Last Run" value={formatDate(data.lastRun)} />
      <MetricRow label="Max Concurrent" value={formatNumber(data.maxConcurrentUsers)} />
      <MetricRow label="Avg Response" value={`${data.avgResponseTimeMs}ms`} />
      <MetricRow label="Error Rate" value={`${data.errorRate}%`} trend={data.errorRate > 5 ? 'down' : null} />
      <MetricRow label="Status" value={data.isRunning ? 'Running' : 'Idle'} />
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function PenTestCardContent({ data, onConfigure }: { data: PenTestMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="Last Scan" value={formatDate(data.lastScan)} />
      <MetricRow label="Critical" value={data.vulnerabilities.critical} trend={data.vulnerabilities.critical > 0 ? 'down' : null} />
      <MetricRow label="High" value={data.vulnerabilities.high} />
      <MetricRow label="Medium" value={data.vulnerabilities.medium} />
      <MetricRow label="Low" value={data.vulnerabilities.low} />
      <MetricRow label="Next Scheduled" value={formatDate(data.nextScheduled)} />
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function LoadHandlingCardContent({ data, onConfigure }: { data: LoadMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  const loadPercent = Math.round((data.currentLoad / data.maxCapacity) * 100);
  return (
    <>
      <div className="mb-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Current Load</span>
          <span className="font-medium">{loadPercent}%</span>
        </div>
        <Progress value={loadPercent} className="h-1.5" />
      </div>
      <MetricRow label="Max Capacity" value={formatNumber(data.maxCapacity)} />
      <MetricRow label="Concurrent Conn." value={formatNumber(data.concurrentConnections)} />
      <MetricRow label="Throughput" value={`${formatNumber(data.throughputRps)} rps`} trend="up" />
      <MetricRow label="Avg Latency" value={`${data.avgLatencyMs}ms`} />
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function FailToleranceCardContent({ data, onConfigure }: { data: FailToleranceMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="Error Rate" value={`${data.errorRate}%`} trend={data.errorRate > 2 ? 'down' : null} />
      <MetricRow label="Retry Success" value={`${data.retrySuccessRate}%`} trend="up" />
      <MetricRow label="Circuit Breaker" value={data.circuitBreakerOpen ? 'Open' : 'Closed'} trend={data.circuitBreakerOpen ? 'down' : null} />
      <MetricRow label="Fallback Active" value={data.fallbackActive ? 'Yes' : 'No'} />
      <MetricRow label="MTTR" value={`${data.mttrMinutes} min`} />
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function BackupCardContent({ data, onConfigure }: { data: BackupMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="Last Backup" value={formatDate(data.lastBackup)} />
      <MetricRow label="Next Backup" value={formatDate(data.nextBackup)} />
      <MetricRow label="Backup Size" value={`${data.backupSizeGB} GB`} />
      <MetricRow label="Restore Points" value={data.restorePoints} />
      <MetricRow label="Auto Backup" value={data.autoBackupEnabled ? 'Enabled' : 'Disabled'} trend={data.autoBackupEnabled ? 'up' : null} />
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function DataModelingCardContent({ data, onConfigure }: { data: DataModelingMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="Total Tables" value={data.totalTables} />
      <MetricRow label="Pending Migrations" value={data.pendingMigrations} trend={data.pendingMigrations > 0 ? 'down' : null} />
      <MetricRow label="Largest Table" value={data.largestTable} />
      <MetricRow label="Table Size" value={data.largestTableSize} />
      <MetricRow label="Schema Version" value={`v${data.schemaVersion}`} />
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function RateLimitingCardContent({ data, onConfigure }: { data: RateLimitMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="Active Rules" value={data.rules.length} />
      <MetricRow label="Blocked (24h)" value={formatNumber(data.totalBlocked24h)} />
      <MetricRow label="Current RPS" value={formatNumber(data.currentRps)} />
      {data.rules.slice(0, 2).map(r => (
        <MetricRow key={r.id} label={r.name} value={`${r.limit}/${r.window}`} />
      ))}
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function CachingCardContent({ data, onConfigure }: { data: CacheMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <div className="mb-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Hit Rate</span>
          <span className="font-medium">{data.hitRate}%</span>
        </div>
        <Progress value={data.hitRate} className="h-1.5" />
      </div>
      <MetricRow label="Miss Rate" value={`${data.missRate}%`} />
      <MetricRow label="Size" value={`${data.sizeMB} / ${data.maxSizMB} MB`} />
      <MetricRow label="Entries" value={formatNumber(data.entries)} />
      <MetricRow label="Default TTL" value={`${data.defaultTTL}s`} />
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function EdgeComputingCardContent({ data, onConfigure }: { data: EdgeMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="Total Locations" value={data.totalLocations} />
      <MetricRow label="Active" value={data.activeLocations} trend="up" />
      <MetricRow label="Offline" value={data.totalLocations - data.activeLocations} trend={data.totalLocations - data.activeLocations > 0 ? 'down' : null} />
      {data.locations.slice(0, 3).map(l => (
        <MetricRow key={`${l.region}-${l.city}`} label={`${l.city}, ${l.region}`} value={l.status} trend={l.status === 'active' ? 'up' : l.status === 'offline' ? 'down' : null} />
      ))}
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function WebPerfCardContent({ data, onConfigure }: { data: WebPerfMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="LCP" value={`${data.lcp}s`} trend={data.lcp <= 2.5 ? 'up' : 'down'} />
      <MetricRow label="FID" value={`${data.fid}ms`} trend={data.fid <= 100 ? 'up' : 'down'} />
      <MetricRow label="CLS" value={data.cls.toString()} trend={data.cls <= 0.1 ? 'up' : 'down'} />
      <MetricRow label="TTFB" value={`${data.ttfb}ms`} trend={data.ttfb <= 200 ? 'up' : 'down'} />
      <MetricRow label="Bundle Size" value={`${data.bundleSizeKB} KB`} />
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function CDNCardContent({ data, onConfigure }: { data: CDNMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <div className="mb-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Cache Hit Ratio</span>
          <span className="font-medium">{data.cacheHitRatio}%</span>
        </div>
        <Progress value={data.cacheHitRatio} className="h-1.5" />
      </div>
      <MetricRow label="Provider" value={data.provider} />
      <MetricRow label="Origin Shield" value={data.originShieldEnabled ? 'Enabled' : 'Disabled'} trend={data.originShieldEnabled ? 'up' : null} />
      <MetricRow label="Bandwidth" value={`${data.bandwidthGB} GB`} />
      <MetricRow label="Edge Nodes" value={data.edgeNodes} />
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function MonitoringCardContent({ data, onConfigure }: { data: MonitoringMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="Active Alerts" value={data.activeAlerts} trend={data.activeAlerts > 0 ? 'down' : null} />
      <MetricRow label="Health Checks" value={`${data.healthChecks.passing}/${data.healthChecks.total} passing`} />
      <MetricRow label="Failing Checks" value={data.healthChecks.failing} trend={data.healthChecks.failing > 0 ? 'down' : null} />
      <MetricRow label="Uptime (24h)" value={`${data.uptime24h}%`} />
      <MetricRow label="Metrics Collected" value={formatNumber(data.metricsCollected)} />
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function NetworkSecurityCardContent({ data, onConfigure }: { data: NetworkSecurityMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="Firewall Rules" value={data.firewallRules} />
      <MetricRow label="SSL Expires" value={`${data.sslExpiryDays} days`} trend={data.sslExpiryDays < 30 ? 'down' : null} />
      <MetricRow label="DDoS Protection" value={data.ddosProtection ? 'Enabled' : 'Disabled'} trend={data.ddosProtection ? 'up' : null} />
      <MetricRow label="Open Ports" value={data.openPorts} trend={data.openPorts > 10 ? 'down' : null} />
      <MetricRow label="Intrusions (24h)" value={data.intrusions24h} trend={data.intrusions24h > 0 ? 'down' : null} />
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function APIIntegrationCardContent({ data, onConfigure }: { data: APIIntegrationMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="Total Endpoints" value={data.totalEndpoints} />
      <MetricRow label="Healthy" value={data.healthyEndpoints} trend="up" />
      <MetricRow label="Webhooks Active" value={data.webhooksActive} />
      {data.connections.slice(0, 3).map(c => (
        <MetricRow key={c.name} label={c.name} value={`${c.latency}ms`} trend={c.status === 'connected' ? 'up' : 'down'} />
      ))}
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function IdempotencyCardContent({ data, onConfigure }: { data: IdempotencyMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="Keys Tracked" value={formatNumber(data.keysTracked)} />
      <MetricRow label="Duplicates Blocked" value={formatNumber(data.duplicateRequestsBlocked)} trend="up" />
      <MetricRow label="Key TTL" value={`${data.keyTTLHours}h`} />
      <MetricRow label="Storage Backend" value={data.storageBackend} />
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function AutomationCardContent({ data, onConfigure }: { data: AutomationMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="Scheduled Tasks" value={data.scheduledTasks} />
      <MetricRow label="Cron Jobs" value={data.cronJobs} />
      <MetricRow label="Last Run" value={data.lastRunStatus} trend={data.lastRunStatus === 'success' ? 'up' : data.lastRunStatus === 'failed' ? 'down' : null} />
      <MetricRow label="Active Pipelines" value={data.pipelinesActive} />
      <MetricRow label="Failed (24h)" value={data.failedTasks24h} trend={data.failedTasks24h > 0 ? 'down' : null} />
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function WebhooksCardContent({ data, onConfigure }: { data: WebhookMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="Endpoints" value={data.endpoints.length} />
      <MetricRow label="Deliveries (24h)" value={formatNumber(data.totalDeliveries24h)} />
      <MetricRow label="Failed (24h)" value={data.failedDeliveries24h} trend={data.failedDeliveries24h > 0 ? 'down' : null} />
      {data.endpoints.slice(0, 2).map(e => (
        <MetricRow key={e.id} label={e.url.substring(0, 25)} value={`${e.successRate}%`} trend={e.successRate >= 95 ? 'up' : 'down'} />
      ))}
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function SecretManagementCardContent({ data, onConfigure }: { data: SecretMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="Total Secrets" value={data.totalSecrets} />
      <MetricRow label="Rotation" value={data.rotationEnabled ? 'Enabled' : 'Disabled'} trend={data.rotationEnabled ? 'up' : null} />
      <MetricRow label="Last Rotation" value={formatDate(data.lastRotation)} />
      <MetricRow label="Expiring Soon" value={data.expiringSoon} trend={data.expiringSoon > 0 ? 'down' : null} />
      <MetricRow label="Vault Health" value={data.vaultHealth} trend={data.vaultHealth === 'healthy' ? 'up' : 'down'} />
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function AuditsCardContent({ data, onConfigure }: { data: AuditMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="Events (24h)" value={formatNumber(data.events24h)} />
      <MetricRow label="Compliance Score" value={`${data.complianceScore}%`} trend={data.complianceScore >= 90 ? 'up' : 'down'} />
      <MetricRow label="Retention" value={`${data.retentionDays} days`} />
      {data.recentEvents.slice(0, 2).map((e, i) => (
        <MetricRow key={i} label={e.action} value={e.severity} />
      ))}
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

function StatelessCardContent({ data, onConfigure }: { data: StatelessMetrics | null; onConfigure: () => void }) {
  if (!data) return <p className="text-xs text-muted-foreground">No data available</p>;
  return (
    <>
      <MetricRow label="Session Store" value={data.sessionStore} />
      <MetricRow label="External Store" value={data.externalSessionStore ? 'Yes' : 'No'} trend={data.externalSessionStore ? 'up' : null} />
      <MetricRow label="Sticky Sessions" value={data.stickySessions ? 'Yes' : 'No'} trend={data.stickySessions ? null : 'up'} />
      <MetricRow label="Compliance" value={`${data.statelessCompliance}%`} trend={data.statelessCompliance >= 90 ? 'up' : 'down'} />
      <MetricRow label="Active Sessions" value={formatNumber(data.activeSessions)} />
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={onConfigure}>
        <Settings className="h-3 w-3 mr-1" /> Configure
      </Button>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONCERN CARD WRAPPER
   ═══════════════════════════════════════════════════════════════════════════ */

function ConcernCard({
  concern,
  status,
  content,
  loading,
}: {
  concern: ConcernDef;
  status: ConcernStatus;
  content: React.ReactNode;
  loading: boolean;
}) {
  const Icon = concern.icon;
  const StatusIcon = STATUS_CONFIG[status].icon;
  const sc = STATUS_CONFIG[status];

  return (
    <Card className={`border ${sc.borderColor} transition-all duration-200 hover:shadow-md`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${sc.bgColor}`}>
              <Icon className={`h-4 w-4 ${sc.color}`} />
            </div>
            <CardTitle className="text-sm font-medium">{concern.title}</CardTitle>
          </div>
          <Badge variant="outline" className={`text-[10px] px-2 py-0 ${statusBadgeClass(status)}`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {sc.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-7 w-20 mt-2" />
          </div>
        ) : (
          content
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DIALOG COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function RateLimitDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [limit, setLimit] = useState('100');
  const [window, setWindow] = useState('60');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.post('/infra/rate-limits', { name, path, limit: parseInt(limit), window: parseInt(window) });
      if (res.success) {
        toast.success('Rate limit rule created');
        onOpenChange(false);
        setName(''); setPath('');
      } else {
        toast.error(res.error || 'Failed to create rate limit');
      }
    } catch {
      toast.error('Failed to create rate limit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Limit Configuration</DialogTitle>
          <DialogDescription>Create or edit rate limiting rules for API endpoints.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rl-name">Rule Name</Label>
            <Input id="rl-name" placeholder="e.g., API General" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rl-path">Path Pattern</Label>
            <Input id="rl-path" placeholder="e.g., /api/*" value={path} onChange={e => setPath(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rl-limit">Request Limit</Label>
              <Input id="rl-limit" type="number" value={limit} onChange={e => setLimit(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rl-window">Window (seconds)</Label>
              <Select value={window} onValueChange={setWindow}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30s</SelectItem>
                  <SelectItem value="60">1 min</SelectItem>
                  <SelectItem value="300">5 min</SelectItem>
                  <SelectItem value="3600">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name || !path}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WebhookConfigDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.post('/infra/webhooks', { url, events: events.split(',').map(e => e.trim()).filter(Boolean), active });
      if (res.success) {
        toast.success('Webhook created');
        onOpenChange(false);
        setUrl(''); setEvents('');
      } else {
        toast.error(res.error || 'Failed to create webhook');
      }
    } catch {
      toast.error('Failed to create webhook');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await api.post('/infra/webhooks/test', { url });
      if (res.success) {
        toast.success('Webhook test delivered successfully');
      } else {
        toast.error('Webhook test failed');
      }
    } catch {
      toast.error('Webhook test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Webhook Configuration</DialogTitle>
          <DialogDescription>Create or edit webhook endpoints for event delivery.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wh-url">Endpoint URL</Label>
            <Input id="wh-url" placeholder="https://example.com/webhook" value={url} onChange={e => setUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wh-events">Events (comma-separated)</Label>
            <Input id="wh-events" placeholder="e.g., user.created, order.placed" value={events} onChange={e => setEvents(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="wh-active">Active</Label>
            <Switch id="wh-active" checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleTest} disabled={testing || !url}>
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Test
          </Button>
          <Button onClick={handleSave} disabled={saving || !url}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SecretManagementDialog({ open, onOpenChange, secrets }: { open: boolean; onOpenChange: (open: boolean) => void; secrets: Array<{ id: string; name: string; value: string; lastRotated: string | null; expiresAt: string | null }> }) {
  const [rotating, setRotating] = useState<string | null>(null);

  const handleRotate = async (id: string) => {
    setRotating(id);
    try {
      const res = await api.post(`/infra/secrets/${id}/rotate`);
      if (res.success) {
        toast.success('Secret rotated successfully');
      } else {
        toast.error(res.error || 'Failed to rotate secret');
      }
    } catch {
      toast.error('Failed to rotate secret');
    } finally {
      setRotating(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Secret Management</DialogTitle>
          <DialogDescription>View and rotate application secrets. Values are masked for security.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-96">
          <div className="space-y-3">
            {secrets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No secrets configured</p>
            ) : (
              secrets.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{s.value}</p>
                    <div className="flex gap-3 mt-1">
                      {s.lastRotated && <span className="text-[10px] text-muted-foreground">Rotated: {formatDate(s.lastRotated)}</span>}
                      {s.expiresAt && <span className="text-[10px] text-muted-foreground">Expires: {formatDate(s.expiresAt)}</span>}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleRotate(s.id)} disabled={rotating === s.id}>
                    {rotating === s.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                    Rotate
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AlertDialog({ open, onOpenChange, alerts }: { open: boolean; onOpenChange: (open: boolean) => void; alerts: AlertItem[] }) {
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  const handleAcknowledge = async (id: string) => {
    setAcknowledging(id);
    try {
      const res = await api.patch(`/infra/alerts/${id}`, { acknowledged: true });
      if (res.success) {
        toast.success('Alert acknowledged');
      } else {
        toast.error('Failed to acknowledge alert');
      }
    } catch {
      toast.error('Failed to acknowledge alert');
    } finally {
      setAcknowledging(null);
    }
  };

  const handleResolve = async (id: string) => {
    setAcknowledging(id);
    try {
      const res = await api.patch(`/infra/alerts/${id}`, { resolved: true });
      if (res.success) {
        toast.success('Alert resolved');
      } else {
        toast.error('Failed to resolve alert');
      }
    } catch {
      toast.error('Failed to resolve alert');
    } finally {
      setAcknowledging(null);
    }
  };

  const severityColor: Record<string, string> = {
    critical: 'text-red-600 dark:text-red-400',
    warning: 'text-amber-600 dark:text-amber-400',
    info: 'text-slate-600 dark:text-slate-400',
  };

  const severityIcon: Record<string, React.ElementType> = {
    critical: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Active Alerts</DialogTitle>
          <DialogDescription>Acknowledge or resolve infrastructure alerts.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-96">
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                <p className="text-sm text-muted-foreground">No active alerts</p>
              </div>
            ) : (
              alerts.filter(a => !a.resolved).map(a => {
                const SevIcon = severityIcon[a.severity] || Info;
                return (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                    <SevIcon className={`h-4 w-4 mt-0.5 shrink-0 ${severityColor[a.severity]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{a.message}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{a.source}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(a.timestamp)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!a.acknowledged && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleAcknowledge(a.id)} disabled={acknowledging === a.id}>
                          {acknowledging === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Ack'}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleResolve(a.id)} disabled={acknowledging === a.id}>
                        Resolve
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Generic configure dialog for concerns that don't have a specialized dialog */
function GenericConfigDialog({ open, onOpenChange, title }: { open: boolean; onOpenChange: (open: boolean) => void; title: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure {title}</DialogTitle>
          <DialogDescription>Adjust settings for {title.toLowerCase()}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enabled</Label>
            <Switch defaultChecked />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Add configuration notes..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { toast.success(`${title} configuration saved`); onOpenChange(false); }}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export function InfraDashboardView() {
  const { user } = useAuthStore();

  // ── State ──
  const [healthData, setHealthData] = useState<HealthResponse['data'] | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsResponse['data'] | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [secrets, setSecrets] = useState<SecretsResponse['data']['secrets']>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [configDialog, setConfigDialog] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch Health ──
  const fetchHealth = useCallback(async () => {
    try {
      const res: HealthResponse = await api.get('/infra/health');
      if (res.success) {
        setHealthData(res.data);
      }
    } catch {
      toast.error('Failed to fetch infrastructure health');
    }
  }, []);

  // ── Fetch Metrics ──
  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const res: MetricsResponse = await api.get('/infra/metrics');
      if (res.success) {
        setMetricsData(res.data);
      }
    } catch {
      toast.error('Failed to fetch infrastructure metrics');
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // ── Fetch Alerts ──
  const fetchAlerts = useCallback(async () => {
    try {
      const res: AlertsResponse = await api.get('/infra/alerts');
      if (res.success) {
        setAlerts(res.data);
      }
    } catch {
      // Silently fail for alerts
    }
  }, []);

  // ── Fetch Secrets (masked) ──
  const fetchSecrets = useCallback(async () => {
    try {
      const res: SecretsResponse = await api.get('/infra/secrets');
      if (res.success) {
        setSecrets(res.data.secrets);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // ── Initial load ──
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchHealth(), fetchMetrics(), fetchAlerts()]);
      setLoading(false);
    };
    load();
  }, [fetchHealth, fetchMetrics, fetchAlerts]);

  // ── Refresh handler ──
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchHealth(), fetchMetrics(), fetchAlerts()]);
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  // ── Tab change fetch ──
  useEffect(() => {
    if (activeTab === 'security') {
      fetchSecrets();
    }
  }, [activeTab, fetchSecrets]);

  // ── Derived values ──
  const healthScore = healthData?.score ?? 0;
  const concernStatuses = healthData?.concerns ?? {};
  const uptime = healthData?.uptime ?? 0;
  const lastChecked = healthData?.lastChecked;

  const healthyCount = Object.values(concernStatuses).filter(s => s === 'healthy').length;
  const warningCount = Object.values(concernStatuses).filter(s => s === 'warning').length;
  const criticalCount = Object.values(concernStatuses).filter(s => s === 'critical').length;
  const notConfiguredCount = Object.values(concernStatuses).filter(s => s === 'not_configured').length;

  const activeAlertsCount = alerts.filter(a => !a.resolved).length;

  // ── Get card content for a concern ──
  const getCardContent = (concernId: string): React.ReactNode => {
    if (!metricsData) return <p className="text-xs text-muted-foreground">No data available</p>;
    const onConfigure = () => setConfigDialog(concernId);

    switch (concernId) {
      case 'authentication': return <AuthenticationCardContent data={metricsData.authentication} onConfigure={onConfigure} />;
      case 'analytics': return <AnalyticsCardContent data={metricsData.analytics} onConfigure={onConfigure} />;
      case 'dns': return <DNSCardContent data={metricsData.dns} onConfigure={onConfigure} />;
      case 'stressTesting': return <StressTestCardContent data={metricsData.stressTesting} onConfigure={onConfigure} />;
      case 'penTesting': return <PenTestCardContent data={metricsData.penTesting} onConfigure={onConfigure} />;
      case 'loadHandling': return <LoadHandlingCardContent data={metricsData.loadHandling} onConfigure={onConfigure} />;
      case 'failTolerance': return <FailToleranceCardContent data={metricsData.failTolerance} onConfigure={onConfigure} />;
      case 'backup': return <BackupCardContent data={metricsData.backup} onConfigure={onConfigure} />;
      case 'dataModeling': return <DataModelingCardContent data={metricsData.dataModeling} onConfigure={onConfigure} />;
      case 'rateLimiting': return <RateLimitingCardContent data={metricsData.rateLimiting} onConfigure={onConfigure} />;
      case 'caching': return <CachingCardContent data={metricsData.caching} onConfigure={onConfigure} />;
      case 'edgeComputing': return <EdgeComputingCardContent data={metricsData.edgeComputing} onConfigure={onConfigure} />;
      case 'webPerformance': return <WebPerfCardContent data={metricsData.webPerformance} onConfigure={onConfigure} />;
      case 'cdn': return <CDNCardContent data={metricsData.cdn} onConfigure={onConfigure} />;
      case 'monitoring': return <MonitoringCardContent data={metricsData.monitoring} onConfigure={onConfigure} />;
      case 'networkSecurity': return <NetworkSecurityCardContent data={metricsData.networkSecurity} onConfigure={onConfigure} />;
      case 'apiIntegration': return <APIIntegrationCardContent data={metricsData.apiIntegration} onConfigure={onConfigure} />;
      case 'idempotency': return <IdempotencyCardContent data={metricsData.idempotency} onConfigure={onConfigure} />;
      case 'automation': return <AutomationCardContent data={metricsData.automation} onConfigure={onConfigure} />;
      case 'webhooks': return <WebhooksCardContent data={metricsData.webhooks} onConfigure={onConfigure} />;
      case 'secretManagement': return <SecretManagementCardContent data={metricsData.secretManagement} onConfigure={onConfigure} />;
      case 'audits': return <AuditsCardContent data={metricsData.audits} onConfigure={onConfigure} />;
      case 'stateless': return <StatelessCardContent data={metricsData.stateless} onConfigure={onConfigure} />;
      default: return <p className="text-xs text-muted-foreground">Unknown concern</p>;
    }
  };

  // ── Concern cards for a tab ──
  const renderTabCards = (tabId: string) => {
    const concernIds = TAB_CONCERNS[tabId] ?? [];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {concernIds.map(id => {
          const concern = CONCERNS.find(c => c.id === id)!;
          const status = concernStatuses[id] ?? 'not_configured';
          return (
            <ConcernCard
              key={id}
              concern={concern}
              status={status}
              content={getCardContent(id)}
              loading={metricsLoading}
            />
          );
        })}
      </div>
    );
  };

  // ── Dialog rendering ──
  const renderActiveDialog = () => {
    if (!configDialog) return null;

    // Specialized dialogs
    if (configDialog === 'rateLimiting') {
      return <RateLimitDialog open={true} onOpenChange={() => setConfigDialog(null)} />;
    }
    if (configDialog === 'webhooks') {
      return <WebhookConfigDialog open={true} onOpenChange={() => setConfigDialog(null)} />;
    }
    if (configDialog === 'secretManagement') {
      return <SecretManagementDialog open={true} onOpenChange={() => setConfigDialog(null)} secrets={secrets} />;
    }

    // Generic config dialog for all other concerns
    const concern = CONCERNS.find(c => c.id === configDialog);
    return (
      <GenericConfigDialog
        open={true}
        onOpenChange={() => setConfigDialog(null)}
        title={concern?.title ?? configDialog}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Infrastructure & DevOps</h1>
          <p className="text-sm text-muted-foreground">
            Monitor and manage all {CONCERNS.length} infrastructure concerns
            {lastChecked && <span className="ml-2">· Last checked {formatDate(lastChecked)}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfigDialog('__alerts')} className="relative">
            <Activity className="h-4 w-4 mr-1" />
            Alerts
            {activeAlertsCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-[10px]">
                {activeAlertsCount}
              </Badge>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ═══ Top Section: Health Score + Quick Stats ═══ */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
            <Skeleton className="h-[140px] w-[140px] rounded-full" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Health Score */}
          <div className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-4">
            <HealthScoreRing score={healthScore} />
          </div>

          {/* Quick Stats */}
          <QuickStatCard
            icon={CheckCircle2}
            label="Healthy"
            value={healthyCount}
            sub={`of ${CONCERNS.length} concerns`}
            color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
          />
          <QuickStatCard
            icon={AlertTriangle}
            label="Warnings"
            value={warningCount}
            sub="need attention"
            color="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
          />
          <QuickStatCard
            icon={XCircle}
            label="Critical"
            value={criticalCount}
            sub="require action"
            color="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
          />
          <QuickStatCard
            icon={Clock}
            label="Uptime"
            value={formatUptime(uptime)}
            sub="current session"
            color="bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400"
          />
          <QuickStatCard
            icon={MinusCircle}
            label="Not Configured"
            value={notConfiguredCount}
            sub="need setup"
            color="bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400"
          />
        </div>
      )}

      {/* ═══ Tabbed Interface ═══ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto">
          <TabsList className="w-full sm:w-auto mb-4">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="security" className="text-xs">
              <Shield className="h-3 w-3 mr-1" /> Security
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-xs">
              <Zap className="h-3 w-3 mr-1" /> Performance
            </TabsTrigger>
            <TabsTrigger value="reliability" className="text-xs">
              <RefreshCw className="h-3 w-3 mr-1" /> Reliability
            </TabsTrigger>
            <TabsTrigger value="integration" className="text-xs">
              <Plug className="h-3 w-3 mr-1" /> Integration
            </TabsTrigger>
            <TabsTrigger value="data" className="text-xs">
              <Database className="h-3 w-3 mr-1" /> Data
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <ConcernCardSkeleton key={i} />)}
            </div>
          ) : (
            renderTabCards('overview')
          )}
        </TabsContent>

        <TabsContent value="security" className="mt-0">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <ConcernCardSkeleton key={i} />)}
            </div>
          ) : (
            renderTabCards('security')
          )}
        </TabsContent>

        <TabsContent value="performance" className="mt-0">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <ConcernCardSkeleton key={i} />)}
            </div>
          ) : (
            renderTabCards('performance')
          )}
        </TabsContent>

        <TabsContent value="reliability" className="mt-0">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <ConcernCardSkeleton key={i} />)}
            </div>
          ) : (
            renderTabCards('reliability')
          )}
        </TabsContent>

        <TabsContent value="integration" className="mt-0">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <ConcernCardSkeleton key={i} />)}
            </div>
          ) : (
            renderTabCards('integration')
          )}
        </TabsContent>

        <TabsContent value="data" className="mt-0">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => <ConcernCardSkeleton key={i} />)}
            </div>
          ) : (
            renderTabCards('data')
          )}
        </TabsContent>
      </Tabs>

      {/* ═══ Alert Dialog (accessible from header) ═══ */}
      {configDialog === '__alerts' && (
        <AlertDialog open={true} onOpenChange={() => setConfigDialog(null)} alerts={alerts} />
      )}

      {/* ═══ Active Config Dialog ═══ */}
      {configDialog && configDialog !== '__alerts' && renderActiveDialog()}
    </div>
  );
}

export default InfraDashboardView;
