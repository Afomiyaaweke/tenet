'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Shield, ShieldAlert, ShieldCheck, Plus, Trash2, RotateCcw,
  Activity, Ban, Clock, Zap, TrendingUp, AlertTriangle, Settings2,
  ChartColumn, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';

interface RateLimitConfig {
  endpoint: string;
  limit: number;
  windowMs: number;
  strategy: string;
  active: boolean;
  source: 'system' | 'database';
  stats: {
    totalRequests: number;
    blockedRequests: number;
    blockRate: string;
    lastBlockedAt: number | null;
  };
}

interface RateLimitOverview {
  totalRequests: number;
  blockedRequests: number;
  blockRate: string;
  activeEndpoints: number;
  totalEndpoints: number;
}

interface RateLimitData {
  configs: RateLimitConfig[];
  overview: RateLimitOverview;
}

const STRATEGY_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  sliding_window: { label: 'Sliding Window', desc: 'Smooth rate counting, resets gradually', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  fixed_window: { label: 'Fixed Window', desc: 'Fixed time buckets, simple but may allow bursts', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  token_bucket: { label: 'Token Bucket', desc: 'Burst-friendly, tokens refill over time', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
};

const CATEGORY_GROUPS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  auth: { label: 'Authentication', icon: <ShieldAlert className="h-4 w-4" />, color: 'text-red-500' },
  ai: { label: 'AI & Intelligence', icon: <Zap className="h-4 w-4" />, color: 'text-purple-500' },
  document: { label: 'Documents', icon: <Activity className="h-4 w-4" />, color: 'text-blue-500' },
  bid: { label: 'Bids & Tenders', icon: <ChartColumn className="h-4 w-4" />, color: 'text-green-500' },
  communication: { label: 'Communication', icon: <Shield className="h-4 w-4" />, color: 'text-cyan-500' },
  public: { label: 'Public APIs', icon: <ShieldCheck className="h-4 w-4" />, color: 'text-orange-500' },
  general: { label: 'General', icon: <Settings2 className="h-4 w-4" />, color: 'text-gray-500' },
};

function categorizeEndpoint(endpoint: string): string {
  if (endpoint.includes('/auth/')) return 'auth';
  if (endpoint.includes('/ai/') || endpoint.includes('/agent') || endpoint.includes('/ocr')) return 'ai';
  if (endpoint.includes('/document') || endpoint.includes('/bid-analysis')) return 'document';
  if (endpoint.includes('/bid') || endpoint.includes('/tender')) return 'bid';
  if (endpoint.includes('/chat') || endpoint.includes('/conversation') || endpoint.includes('/social')) return 'communication';
  if (endpoint.includes('/contact') || endpoint.includes('/comment')) return 'public';
  return 'general';
}

function formatWindow(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${ms / 1000}s`;
  if (ms < 3600000) return `${ms / 60000}min`;
  return `${ms / 3600000}hr`;
}

function formatTimeAgo(timestamp: number | null): string {
  if (!timestamp) return 'Never';
  const diff = Date.now() - timestamp;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export function RateLimitsView() {
  const [data, setData] = useState<RateLimitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editConfig, setEditConfig] = useState<Partial<RateLimitConfig> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(Object.keys(CATEGORY_GROUPS)));

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/rate-limits');
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch rate limits:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const handleSave = async () => {
    if (!editConfig) return;
    setSaving(true);
    try {
      await api.post('/rate-limits', {
        endpoint: editConfig.endpoint,
        maxRequests: editConfig.limit,
        windowMs: editConfig.windowMs,
        strategy: editConfig.strategy,
        active: editConfig.active,
      });
      setDialogOpen(false);
      setEditConfig(null);
      fetchConfigs();
    } catch (err) {
      console.error('Failed to save rate limit:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (endpoint: string) => {
    try {
      await api.delete(`/rate-limits?endpoint=${encodeURIComponent(endpoint)}`);
      fetchConfigs();
    } catch (err) {
      console.error('Failed to delete rate limit:', err);
    }
  };

  const handleResetStats = async () => {
    try {
      await api.patch('/rate-limits', { action: 'reset-stats' });
      fetchConfigs();
    } catch (err) {
      console.error('Failed to reset stats:', err);
    }
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const overview = data?.overview || { totalRequests: 0, blockedRequests: 0, blockRate: '0', activeEndpoints: 0, totalEndpoints: 0 };
  const configs = data?.configs || [];

  // Group configs by category
  const grouped: Record<string, RateLimitConfig[]> = {};
  for (const config of configs) {
    const cat = categorizeEndpoint(config.endpoint);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(config);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Rate Limits
          </h2>
          <p className="text-muted-foreground mt-1">Configure and monitor API rate limiting across all endpoints</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetStats}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset Stats
          </Button>
          <Button variant="outline" size="sm" onClick={fetchConfigs}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setEditConfig({ endpoint: '', limit: 60, windowMs: 60000, strategy: 'sliding_window', active: true })}>
                <Plus className="h-4 w-4 mr-1" /> Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editConfig?.source === 'database' ? 'Edit Rate Limit' : 'Add Rate Limit Rule'}</DialogTitle>
                <DialogDescription>Configure the rate limit for an API endpoint</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Endpoint</Label>
                  <Input
                    placeholder="/api/auth/login"
                    value={editConfig?.endpoint || ''}
                    onChange={(e) => setEditConfig(prev => prev ? { ...prev, endpoint: e.target.value } : null)}
                    disabled={editConfig?.source === 'database'}
                  />
                  <p className="text-xs text-muted-foreground">Use trailing slash for path prefixes (e.g. /api/ai/)</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Requests</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      value={editConfig?.limit || ''}
                      onChange={(e) => setEditConfig(prev => prev ? { ...prev, limit: Number(e.target.value) } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Window (ms)</Label>
                    <Select
                      value={String(editConfig?.windowMs || 60000)}
                      onValueChange={(v) => setEditConfig(prev => prev ? { ...prev, windowMs: Number(v) } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10000">10 seconds</SelectItem>
                        <SelectItem value="30000">30 seconds</SelectItem>
                        <SelectItem value="60000">1 minute</SelectItem>
                        <SelectItem value="300000">5 minutes</SelectItem>
                        <SelectItem value="900000">15 minutes</SelectItem>
                        <SelectItem value="3600000">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Strategy</Label>
                  <Select
                    value={editConfig?.strategy || 'sliding_window'}
                    onValueChange={(v) => setEditConfig(prev => prev ? { ...prev, strategy: v } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sliding_window">Sliding Window</SelectItem>
                      <SelectItem value="fixed_window">Fixed Window</SelectItem>
                      <SelectItem value="token_bucket">Token Bucket</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {STRATEGY_LABELS[editConfig?.strategy || 'sliding_window']?.desc}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={editConfig?.active !== false}
                    onCheckedChange={(v) => setEditConfig(prev => prev ? { ...prev, active: v } : null)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Activity className="h-4 w-4" /> Total Requests
            </div>
            <p className="text-2xl font-bold">{overview.totalRequests.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Ban className="h-4 w-4 text-red-500" /> Blocked
            </div>
            <p className="text-2xl font-bold text-red-600">{overview.blockedRequests.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" /> Block Rate
            </div>
            <p className="text-2xl font-bold">{overview.blockRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <ShieldCheck className="h-4 w-4 text-green-500" /> Active Rules
            </div>
            <p className="text-2xl font-bold">{overview.activeEndpoints}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Settings2 className="h-4 w-4" /> Total Endpoints
            </div>
            <p className="text-2xl font-bold">{overview.totalEndpoints}</p>
          </CardContent>
        </Card>
      </div>

      {/* Block Rate Bar */}
      {overview.totalRequests > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Block Rate</span>
              <span className="text-sm text-muted-foreground">{overview.blockRate}%</span>
            </div>
            <Progress
              value={parseFloat(overview.blockRate)}
              className={`h-2 ${parseFloat(overview.blockRate) > 5 ? '[&>div]:bg-red-500' : parseFloat(overview.blockRate) > 2 ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {parseFloat(overview.blockRate) > 5 ? (
                  <span className="text-red-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> High block rate detected</span>
                ) : parseFloat(overview.blockRate) > 2 ? (
                  <span className="text-amber-600 flex items-center gap-1"><Clock className="h-3 w-3" /> Moderate blocking activity</span>
                ) : (
                  <span className="text-green-600 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Rate limits working normally</span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">{overview.blockedRequests} of {overview.totalRequests} requests blocked</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategy Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Rate Limiting Strategies</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(STRATEGY_LABELS).map(([key, val]) => (
              <div key={key} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                <Badge variant="outline" className={val.color}>{val.label}</Badge>
                <p className="text-xs text-muted-foreground leading-tight">{val.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grouped Endpoint Table */}
      <ScrollArea className="max-h-[600px]">
        <div className="space-y-2">
          {Object.entries(CATEGORY_GROUPS).map(([catKey, catInfo]) => {
            const catConfigs = grouped[catKey];
            if (!catConfigs || catConfigs.length === 0) return null;
            const isExpanded = expandedGroups.has(catKey);
            const catBlocked = catConfigs.reduce((sum, c) => sum + c.stats.blockedRequests, 0);

            return (
              <Card key={catKey}>
                <button
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  onClick={() => toggleGroup(catKey)}
                >
                  <div className="flex items-center gap-2">
                    <span className={catInfo.color}>{catInfo.icon}</span>
                    <span className="font-semibold text-sm">{catInfo.label}</span>
                    <Badge variant="secondary" className="text-xs">{catConfigs.length}</Badge>
                    {catBlocked > 0 && (
                      <Badge variant="destructive" className="text-xs">{catBlocked} blocked</Badge>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <>
                    <Separator />
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[280px]">Endpoint</TableHead>
                            <TableHead>Limit</TableHead>
                            <TableHead>Window</TableHead>
                            <TableHead>Strategy</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Requests</TableHead>
                            <TableHead>Blocked</TableHead>
                            <TableHead>Block %</TableHead>
                            <TableHead>Last Blocked</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {catConfigs.map((config) => {
                            const stratInfo = STRATEGY_LABELS[config.strategy] || STRATEGY_LABELS.sliding_window;
                            const blockPct = parseFloat(config.stats.blockRate);

                            return (
                              <TableRow key={config.endpoint} className={!config.active ? 'opacity-50' : ''}>
                                <TableCell className="font-mono text-xs">{config.endpoint}</TableCell>
                                <TableCell>
                                  <span className="font-semibold">{config.limit}</span>
                                  <span className="text-xs text-muted-foreground"> req</span>
                                </TableCell>
                                <TableCell>{formatWindow(config.windowMs)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`text-[10px] ${stratInfo.color}`}>
                                    {stratInfo.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <div className={`h-2 w-2 rounded-full ${config.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                                    <span className="text-xs">{config.active ? 'Active' : 'Disabled'}</span>
                                  </div>
                                </TableCell>
                                <TableCell>{config.stats.totalRequests.toLocaleString()}</TableCell>
                                <TableCell className={config.stats.blockedRequests > 0 ? 'text-red-600 font-medium' : ''}>
                                  {config.stats.blockedRequests.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <span className={`text-xs font-medium ${blockPct > 5 ? 'text-red-600' : blockPct > 2 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {config.stats.blockRate}%
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {formatTimeAgo(config.stats.lastBlockedAt)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        setEditConfig(config);
                                        setDialogOpen(true);
                                      }}
                                    >
                                      <Settings2 className="h-3.5 w-3.5" />
                                    </Button>
                                    {config.source === 'database' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                        onClick={() => handleDelete(config.endpoint)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Info Footer */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">How Rate Limiting Works</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                <li>• <strong>Sliding Window:</strong> Counts requests in a rolling time window. Smooth and fair.</li>
                <li>• <strong>Fixed Window:</strong> Counts requests in fixed time buckets. Simple but may allow burst at boundaries.</li>
                <li>• <strong>Token Bucket:</strong> Allows bursts up to the limit, then refills tokens over time. Best for AI endpoints.</li>
                <li>• Rate limit headers (<code className="bg-muted px-1 rounded">X-RateLimit-*</code>) are included in every API response.</li>
                <li>• When rate limited, the API returns <code className="bg-muted px-1 rounded">429 Too Many Requests</code> with a <code className="bg-muted px-1 rounded">Retry-After</code> header.</li>
                <li>• Custom rules override system defaults. Deleting a custom rule reverts to the system default.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
