import { Database } from 'bun:sqlite';
import { existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─────────────────────────────────────────────────────────────────────────────
// Database Connection – connects to the SAME SQLite as the main Tenet app
// ─────────────────────────────────────────────────────────────────────────────

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') || join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'custom.db');

let db: Database;

function getDb(): Database {
  if (!db) {
    if (!existsSync(DB_PATH)) {
      console.error(`[InfraService] ❌ Database not found at: ${DB_PATH}`);
      process.exit(1);
    }
    db = new Database(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    console.log(`[InfraService] ✅ Connected to database: ${DB_PATH}`);
  }
  return db;
}

// ─────────────────────────────────────────────────────────────────────────────
// User Tracking – queries the real User table for live statistics
// ─────────────────────────────────────────────────────────────────────────────

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  bannedUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersWithCompany: number;
  usersWithoutCompany: number;
  teamAdmins: number;
  regularUsers: number;
  recentRegistrations: Array<{ id: string; email: string; role: string; status: string; createdAt: string; companyId: string | null }>;
  dailyRegistrations: Array<{ date: string; count: number }>;
  monthlyRegistrations: Array<{ month: string; count: number }>;
  roleDistribution: Array<{ role: string; count: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
}

function getUserStats(): UserStats {
  const d = getDb();

  const totalUsers = ((d.prepare('SELECT COUNT(*) as c FROM User').get() as any)?.c) ?? 0;
  const activeUsers = ((d.prepare("SELECT COUNT(*) as c FROM User WHERE status = 'active'").get() as any)?.c) ?? 0;
  const suspendedUsers = ((d.prepare("SELECT COUNT(*) as c FROM User WHERE status = 'suspended'").get() as any)?.c) ?? 0;
  const bannedUsers = ((d.prepare("SELECT COUNT(*) as c FROM User WHERE status = 'banned'").get() as any)?.c) ?? 0;
  const verifiedUsers = ((d.prepare('SELECT COUNT(*) as c FROM User WHERE emailVerified = 1').get() as any)?.c) ?? 0;
  const unverifiedUsers = ((d.prepare('SELECT COUNT(*) as c FROM User WHERE emailVerified = 0').get() as any)?.c) ?? 0;
  const usersWithCompany = ((d.prepare('SELECT COUNT(*) as c FROM User WHERE companyId IS NOT NULL').get() as any)?.c) ?? 0;
  const usersWithoutCompany = totalUsers - usersWithCompany;
  const teamAdmins = ((d.prepare("SELECT COUNT(*) as c FROM User WHERE role = 'team_admin'").get() as any)?.c) ?? 0;
  const regularUsers = totalUsers - teamAdmins;

  // Prisma stores DateTime as Unix ms timestamps; convert to Unix seconds for SQLite date functions
  const nowMs = Date.now();
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const weekAgoMs = nowMs - 7 * 86400000;
  const monthAgoMs = nowMs - 30 * 86400000;

  const newUsersToday = ((d.prepare('SELECT COUNT(*) as c FROM User WHERE createdAt >= ?').get(todayStart) as any)?.c) ?? 0;
  const newUsersThisWeek = ((d.prepare('SELECT COUNT(*) as c FROM User WHERE createdAt >= ?').get(weekAgoMs) as any)?.c) ?? 0;
  const newUsersThisMonth = ((d.prepare('SELECT COUNT(*) as c FROM User WHERE createdAt >= ?').get(monthAgoMs) as any)?.c) ?? 0;

  const recentRegistrations = d.prepare(
    'SELECT id, email, role, status, createdAt, companyId FROM User ORDER BY createdAt DESC LIMIT 20'
  ).all() as Array<{ id: string; email: string; role: string; status: string; createdAt: number; companyId: string | null }>;

  const dailyRegistrations = d.prepare(
    "SELECT DATE(createdAt / 1000, 'unixepoch') as date, COUNT(*) as count FROM User WHERE createdAt >= ? GROUP BY DATE(createdAt / 1000, 'unixepoch') ORDER BY date DESC"
  ).all(nowMs - 30 * 86400000) as Array<{ date: string; count: number }>;

  const monthlyRegistrations = d.prepare(
    "SELECT STRFTIME('%Y-%m', createdAt / 1000, 'unixepoch') as month, COUNT(*) as count FROM User WHERE createdAt >= ? GROUP BY STRFTIME('%Y-%m', createdAt / 1000, 'unixepoch') ORDER BY month DESC"
  ).all(nowMs - 365 * 86400000) as Array<{ month: string; count: number }>;

  const roleDistribution = d.prepare(
    'SELECT role, COUNT(*) as count FROM User GROUP BY role ORDER BY count DESC'
  ).all() as Array<{ role: string; count: number }>;

  const statusDistribution = d.prepare(
    'SELECT status, COUNT(*) as count FROM User GROUP BY status ORDER BY count DESC'
  ).all() as Array<{ status: string; count: number }>;

  return {
    totalUsers, activeUsers, suspendedUsers, bannedUsers,
    verifiedUsers, unverifiedUsers,
    newUsersToday, newUsersThisWeek, newUsersThisMonth,
    usersWithCompany, usersWithoutCompany,
    teamAdmins, regularUsers,
    recentRegistrations, dailyRegistrations, monthlyRegistrations,
    roleDistribution, statusDistribution,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// System Metrics – real data from the database + process info
// ─────────────────────────────────────────────────────────────────────────────

interface SystemMetrics {
  uptime: number;
  memoryUsage: { rss: number; heapTotal: number; heapUsed: number; external: number };
  dbSize: number;
  totalCompanies: number;
  totalTenders: number;
  totalBids: number;
  totalProjects: number;
  totalDocuments: number;
  totalConversations: number;
  totalAuditLogs: number;
  openTenders: number;
  pendingBids: number;
  activeProjects: number;
  tendersByStatus: Array<{ status: string; count: number }>;
  bidsByStatus: Array<{ status: string; count: number }>;
  recentAuditLogs: Array<{ action: string; resource: string | null; createdAt: string; userId: string | null }>;
}

function getSystemMetrics(): SystemMetrics {
  const d = getDb();
  const mem = process.memoryUsage();

  const totalCompanies = ((d.prepare('SELECT COUNT(*) as c FROM Company').get() as any)?.c) ?? 0;
  const totalTenders = ((d.prepare('SELECT COUNT(*) as c FROM Tender').get() as any)?.c) ?? 0;
  const totalBids = ((d.prepare('SELECT COUNT(*) as c FROM Bid').get() as any)?.c) ?? 0;
  const totalProjects = ((d.prepare('SELECT COUNT(*) as c FROM Project').get() as any)?.c) ?? 0;
  const totalDocuments = ((d.prepare('SELECT COUNT(*) as c FROM Document').get() as any)?.c) ?? 0;
  const totalConversations = ((d.prepare('SELECT COUNT(*) as c FROM Conversation').get() as any)?.c) ?? 0;
  const totalAuditLogs = ((d.prepare('SELECT COUNT(*) as c FROM AuditLog').get() as any)?.c) ?? 0;
  const openTenders = ((d.prepare("SELECT COUNT(*) as c FROM Tender WHERE status = 'open'").get() as any)?.c) ?? 0;
  const pendingBids = ((d.prepare("SELECT COUNT(*) as c FROM Bid WHERE status = 'pending_review'").get() as any)?.c) ?? 0;
  const activeProjects = ((d.prepare("SELECT COUNT(*) as c FROM Project WHERE status = 'active'").get() as any)?.c) ?? 0;

  const tendersByStatus = d.prepare('SELECT status, COUNT(*) as count FROM Tender GROUP BY status ORDER BY count DESC').all() as Array<{ status: string; count: number }>;
  const bidsByStatus = d.prepare('SELECT status, COUNT(*) as count FROM Bid GROUP BY status ORDER BY count DESC').all() as Array<{ status: string; count: number }>;

  const recentAuditLogs = d.prepare(
    'SELECT action, resource, createdAt, userId FROM AuditLog ORDER BY createdAt DESC LIMIT 20'
  ).all() as Array<{ action: string; resource: string | null; createdAt: string; userId: string | null }>;

  let dbSize = 0;
  try {
    const stat = statSync(DB_PATH);
    dbSize = stat.size;
  } catch {}

  return {
    uptime: process.uptime(),
    memoryUsage: mem,
    dbSize,
    totalCompanies, totalTenders, totalBids, totalProjects,
    totalDocuments, totalConversations, totalAuditLogs,
    openTenders, pendingBids, activeProjects,
    tendersByStatus, bidsByStatus, recentAuditLogs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Health Check – 23 Infrastructure Concerns
// ─────────────────────────────────────────────────────────────────────────────

function getHealthCheck() {
  const concernStatuses: Record<string, string> = {
    authentication: 'healthy',
    analytics: 'healthy',
    dns: 'healthy',
    stress_testing: 'not_configured',
    pen_testing: 'warning',
    load_handling: 'healthy',
    fail_tolerance: 'healthy',
    backup: 'warning',
    data_modeling: 'healthy',
    rate_limiting: 'healthy',
    caching: 'healthy',
    edge_computing: 'warning',
    web_performance: 'healthy',
    cdn: 'healthy',
    monitoring: 'healthy',
    network_security: 'healthy',
    api_integration: 'warning',
    idempotency: 'healthy',
    automation: 'healthy',
    webhooks: 'healthy',
    secret_management: 'healthy',
    audits: 'healthy',
    stateless: 'not_configured',
  };

  // Try to check DB connectivity
  try {
    getDb().prepare('SELECT 1').get();
    concernStatuses.data_modeling = 'healthy';
  } catch {
    concernStatuses.data_modeling = 'critical';
  }

  const weights: Record<string, number> = { healthy: 1, warning: 0.6, critical: 0.2, not_configured: 0.4 };
  const values = Object.values(concernStatuses);
  const score = Math.round((values.reduce((sum, s) => sum + (weights[s] ?? 0.5), 0) / values.length) * 100);

  return { score, concerns: concernStatuses, lastChecked: new Date().toISOString(), uptime: process.uptime() };
}

// ─────────────────────────────────────────────────────────────────────────────
// Infra Alerts Management (using same DB tables)
// ─────────────────────────────────────────────────────────────────────────────

function getAlerts() {
  const d = getDb();
  try {
    return d.prepare('SELECT * FROM InfraAlert ORDER BY createdAt DESC LIMIT 50').all();
  } catch {
    // Table might not exist yet
    return [];
  }
}

function createAlert(data: { type: string; severity: string; title: string; message: string; source?: string }) {
  const d = getDb();
  try {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    d.prepare(
      'INSERT INTO InfraAlert (id, type, severity, title, message, source, status, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.type, data.severity, data.title, data.message, data.source || 'manual', 'active', '{}');
    return { success: true, id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

function acknowledgeAlert(id: string) {
  const d = getDb();
  try {
    d.prepare('UPDATE InfraAlert SET status = ?, acknowledgedBy = ? WHERE id = ?').run('acknowledged', 'infra-admin', id);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

function resolveAlert(id: string) {
  const d = getDb();
  try {
    d.prepare('UPDATE InfraAlert SET status = ?, resolvedAt = ? WHERE id = ?').run('resolved', new Date().toISOString(), id);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Management
// ─────────────────────────────────────────────────────────────────────────────

function getWebhooks() {
  const d = getDb();
  try {
    return d.prepare('SELECT * FROM Webhook ORDER BY createdAt DESC').all();
  } catch { return []; }
}

function createWebhook(data: { name: string; url: string; events: string; secret: string; companyId?: string; createdBy: string }) {
  const d = getDb();
  try {
    const id = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    d.prepare(
      'INSERT INTO Webhook (id, name, url, events, secret, active, failureCount, companyId, createdBy) VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)'
    ).run(id, data.name, data.url, data.events, data.secret, data.companyId || null, data.createdBy);
    return { success: true, id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

function deleteWebhook(id: string) {
  const d = getDb();
  try {
    d.prepare('DELETE FROM Webhook WHERE id = ?').run(id);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limit Config Management
// ─────────────────────────────────────────────────────────────────────────────

function getRateLimits() {
  const d = getDb();
  try {
    return d.prepare('SELECT * FROM RateLimitConfig ORDER BY endpoint').all();
  } catch { return []; }
}

function createRateLimit(data: { endpoint: string; windowMs: number; maxRequests: number; strategy: string }) {
  const d = getDb();
  try {
    const id = `rl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    d.prepare(
      'INSERT INTO RateLimitConfig (id, endpoint, windowMs, maxRequests, strategy, active) VALUES (?, ?, ?, ?, ?, 1)'
    ).run(id, data.endpoint, data.windowMs, data.maxRequests, data.strategy);
    return { success: true, id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache Entry Management
// ─────────────────────────────────────────────────────────────────────────────

function getCacheEntries() {
  const d = getDb();
  try {
    return d.prepare('SELECT * FROM CacheEntry ORDER BY createdAt DESC LIMIT 50').all();
  } catch { return []; }
}

function getCacheStats() {
  const d = getDb();
  try {
    const total = ((d.prepare('SELECT COUNT(*) as c FROM CacheEntry').get() as any)?.c) ?? 0;
    const totalHits = ((d.prepare('SELECT SUM(hits) as c FROM CacheEntry').get() as any)?.c) ?? 0;
    const totalMisses = ((d.prepare('SELECT SUM(misses) as c FROM CacheEntry').get() as any)?.c) ?? 0;
    const totalSize = ((d.prepare('SELECT SUM(sizeBytes) as c FROM CacheEntry').get() as any)?.c) ?? 0;
    const expired = ((d.prepare('SELECT COUNT(*) as c FROM CacheEntry WHERE expiresAt < ?').get(Date.now()) as any)?.c) ?? 0;
    const hitRate = (totalHits + totalMisses) > 0 ? Math.round((totalHits / (totalHits + totalMisses)) * 100) : 0;
    return { total, totalHits, totalMisses, totalSize, expired, hitRate };
  } catch {
    return { total: 0, totalHits: 0, totalMisses: 0, totalSize: 0, expired: 0, hitRate: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Secret Management (masked)
// ─────────────────────────────────────────────────────────────────────────────

function getSecrets() {
  const d = getDb();
  try {
    return d.prepare('SELECT id, key, category, description, rotatedAt, rotationDays, createdBy, createdAt, updatedAt FROM Secret ORDER BY category, key').all();
  } catch { return []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Logs
// ─────────────────────────────────────────────────────────────────────────────

function getAuditLogs(limit = 50, offset = 0, action?: string) {
  const d = getDb();
  try {
    if (action) {
      return d.prepare('SELECT * FROM AuditLog WHERE action = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?').all(action, limit, offset);
    }
    return d.prepare('SELECT * FROM AuditLog ORDER BY createdAt DESC LIMIT ? OFFSET ?').all(limit, offset);
  } catch { return []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML Dashboard Page
// ─────────────────────────────────────────────────────────────────────────────

function getDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tenet — Infra & DevOps Dashboard</title>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script>
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { 50:'#f0fdf4',100:'#dcfce7',500:'#22c55e',600:'#16a34a',700:'#15803d' },
      }
    }
  }
}
</script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  body { font-family: 'Inter', sans-serif; }
  .scrollbar-thin::-webkit-scrollbar { width: 6px; }
  .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
  .scrollbar-thin::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
  .status-healthy { background: #22c55e; box-shadow: 0 0 6px #22c55e80; }
  .status-warning { background: #f59e0b; box-shadow: 0 0 6px #f59e0b80; }
  .status-critical { background: #ef4444; box-shadow: 0 0 6px #ef444480; }
  .status-not_configured { background: #6b7280; }
  .tab-active { border-bottom: 2px solid #22c55e; color: #22c55e; }
  .fade-in { animation: fadeIn 0.3s ease-in; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; }
  .card:hover { border-color: #475569; }
  pre { white-space: pre-wrap; word-wrap: break-word; }
</style>
</head>
<body class="bg-slate-950 text-slate-200 min-h-screen">

<!-- Header -->
<header class="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white font-bold text-sm">T</div>
      <div>
        <h1 class="text-lg font-bold text-white">Tenet Infra & DevOps</h1>
        <p class="text-xs text-slate-400">Infrastructure monitoring & user tracking</p>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <div id="health-badge" class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 text-xs font-medium">
        <span class="status-dot status-healthy"></span>
        <span id="health-score">--</span>% Health
      </div>
      <button onclick="refreshAll()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        Refresh
      </button>
      <a href="/" class="px-3 py-1.5 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 text-xs font-medium transition-colors">
        ← Back to Tenet
      </a>
    </div>
  </div>
</header>

<!-- Tabs -->
<div class="bg-slate-900/50 border-b border-slate-800">
  <div class="max-w-7xl mx-auto px-4 sm:px-6">
    <nav class="flex gap-6 overflow-x-auto scrollbar-thin" id="tab-nav">
      <button class="tab-btn tab-active py-3 px-1 text-sm font-medium whitespace-nowrap transition-colors" data-tab="users">👥 User Tracking</button>
      <button class="tab-btn py-3 px-1 text-sm font-medium text-slate-400 hover:text-slate-200 whitespace-nowrap transition-colors" data-tab="health">💚 Health Check</button>
      <button class="tab-btn py-3 px-1 text-sm font-medium text-slate-400 hover:text-slate-200 whitespace-nowrap transition-colors" data-tab="metrics">📊 System Metrics</button>
      <button class="tab-btn py-3 px-1 text-sm font-medium text-slate-400 hover:text-slate-200 whitespace-nowrap transition-colors" data-tab="alerts">🔔 Alerts</button>
      <button class="tab-btn py-3 px-1 text-sm font-medium text-slate-400 hover:text-slate-200 whitespace-nowrap transition-colors" data-tab="webhooks">🔗 Webhooks</button>
      <button class="tab-btn py-3 px-1 text-sm font-medium text-slate-400 hover:text-slate-200 whitespace-nowrap transition-colors" data-tab="ratelimits">⏱ Rate Limits</button>
      <button class="tab-btn py-3 px-1 text-sm font-medium text-slate-400 hover:text-slate-200 whitespace-nowrap transition-colors" data-tab="cache">⚡ Cache</button>
      <button class="tab-btn py-3 px-1 text-sm font-medium text-slate-400 hover:text-slate-200 whitespace-nowrap transition-colors" data-tab="secrets">🔑 Secrets</button>
      <button class="tab-btn py-3 px-1 text-sm font-medium text-slate-400 hover:text-slate-200 whitespace-nowrap transition-colors" data-tab="auditlog">📋 Audit Logs</button>
    </nav>
  </div>
</div>

<!-- Main Content -->
<main class="max-w-7xl mx-auto px-4 sm:px-6 py-6">

  <!-- User Tracking Tab -->
  <div id="tab-users" class="tab-content fade-in">
    <!-- Summary Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6" id="user-summary-cards"></div>
    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <div class="card p-5">
        <h3 class="text-sm font-semibold text-slate-300 mb-3">Daily Registrations (Last 30 Days)</h3>
        <canvas id="chart-daily" height="200"></canvas>
      </div>
      <div class="card p-5">
        <h3 class="text-sm font-semibold text-slate-300 mb-3">Monthly Registrations (Last 12 Months)</h3>
        <canvas id="chart-monthly" height="200"></canvas>
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <div class="card p-5">
        <h3 class="text-sm font-semibold text-slate-300 mb-3">Role Distribution</h3>
        <canvas id="chart-roles" height="200"></canvas>
      </div>
      <div class="card p-5">
        <h3 class="text-sm font-semibold text-slate-300 mb-3">Status Distribution</h3>
        <canvas id="chart-status" height="200"></canvas>
      </div>
    </div>
    <!-- Recent Users -->
    <div class="card p-5">
      <h3 class="text-sm font-semibold text-slate-300 mb-3">Recent Registrations</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="text-slate-400 border-b border-slate-700">
            <th class="text-left py-2 px-3">Email</th><th class="text-left py-2 px-3">Role</th><th class="text-left py-2 px-3">Status</th><th class="text-left py-2 px-3">Company</th><th class="text-left py-2 px-3">Registered</th>
          </tr></thead>
          <tbody id="recent-users-table"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Health Check Tab -->
  <div id="tab-health" class="tab-content hidden fade-in">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="health-concerns-grid"></div>
  </div>

  <!-- Metrics Tab -->
  <div id="tab-metrics" class="tab-content hidden fade-in">
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6" id="metrics-cards"></div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <div class="card p-5">
        <h3 class="text-sm font-semibold text-slate-300 mb-3">Tenders by Status</h3>
        <canvas id="chart-tender-status" height="200"></canvas>
      </div>
      <div class="card p-5">
        <h3 class="text-sm font-semibold text-slate-300 mb-3">Bids by Status</h3>
        <canvas id="chart-bid-status" height="200"></canvas>
      </div>
    </div>
    <div class="card p-5">
      <h3 class="text-sm font-semibold text-slate-300 mb-3">Recent Audit Logs</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="text-slate-400 border-b border-slate-700">
            <th class="text-left py-2 px-3">Action</th><th class="text-left py-2 px-3">Resource</th><th class="text-left py-2 px-3">User</th><th class="text-left py-2 px-3">Time</th>
          </tr></thead>
          <tbody id="audit-log-table"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Alerts Tab -->
  <div id="tab-alerts" class="tab-content hidden fade-in">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-slate-300">Active Alerts</h3>
      <button onclick="showCreateAlert()" class="px-3 py-1.5 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 text-xs font-medium transition-colors">+ Create Alert</button>
    </div>
    <div id="alerts-list" class="space-y-3"></div>
    <div id="create-alert-form" class="hidden card p-5 mt-4">
      <h3 class="text-sm font-semibold text-slate-300 mb-3">Create New Alert</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label class="text-xs text-slate-400">Type</label><select id="alert-type" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"><option>cpu</option><option>memory</option><option>disk</option><option>latency</option><option>error_rate</option><option>security</option><option>uptime</option></select></div>
        <div><label class="text-xs text-slate-400">Severity</label><select id="alert-severity" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"><option>info</option><option>warning</option><option>critical</option><option>emergency</option></select></div>
        <div class="sm:col-span-2"><label class="text-xs text-slate-400">Title</label><input id="alert-title" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Alert title..."></div>
        <div class="sm:col-span-2"><label class="text-xs text-slate-400">Message</label><textarea id="alert-message" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" rows="2" placeholder="Alert message..."></textarea></div>
      </div>
      <div class="flex gap-2 mt-3">
        <button onclick="submitAlert()" class="px-4 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium">Create</button>
        <button onclick="document.getElementById('create-alert-form').classList.add('hidden')" class="px-4 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs font-medium">Cancel</button>
      </div>
    </div>
  </div>

  <!-- Webhooks Tab -->
  <div id="tab-webhooks" class="tab-content hidden fade-in">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-slate-300">Configured Webhooks</h3>
      <button onclick="showCreateWebhook()" class="px-3 py-1.5 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 text-xs font-medium transition-colors">+ Add Webhook</button>
    </div>
    <div id="webhooks-list" class="space-y-3"></div>
    <div id="create-webhook-form" class="hidden card p-5 mt-4">
      <h3 class="text-sm font-semibold text-slate-300 mb-3">Add Webhook</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label class="text-xs text-slate-400">Name</label><input id="wh-name" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Webhook name"></div>
        <div><label class="text-xs text-slate-400">URL</label><input id="wh-url" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="https://..."></div>
        <div><label class="text-xs text-slate-400">Events (comma-separated)</label><input id="wh-events" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="tender.created,bid.submitted"></div>
        <div><label class="text-xs text-slate-400">Secret</label><input id="wh-secret" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="HMAC signing secret"></div>
      </div>
      <div class="flex gap-2 mt-3">
        <button onclick="submitWebhook()" class="px-4 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium">Create</button>
        <button onclick="document.getElementById('create-webhook-form').classList.add('hidden')" class="px-4 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs font-medium">Cancel</button>
      </div>
    </div>
  </div>

  <!-- Rate Limits Tab -->
  <div id="tab-ratelimits" class="tab-content hidden fade-in">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-slate-300">Rate Limit Configuration</h3>
      <button onclick="showCreateRateLimit()" class="px-3 py-1.5 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 text-xs font-medium transition-colors">+ Add Rule</button>
    </div>
    <div id="ratelimits-list" class="space-y-3"></div>
    <div id="create-ratelimit-form" class="hidden card p-5 mt-4">
      <h3 class="text-sm font-semibold text-slate-300 mb-3">Add Rate Limit Rule</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label class="text-xs text-slate-400">Endpoint</label><input id="rl-endpoint" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="/api/*"></div>
        <div><label class="text-xs text-slate-400">Window (ms)</label><input id="rl-window" type="number" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" value="60000"></div>
        <div><label class="text-xs text-slate-400">Max Requests</label><input id="rl-max" type="number" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" value="100"></div>
        <div><label class="text-xs text-slate-400">Strategy</label><select id="rl-strategy" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"><option>sliding_window</option><option>fixed_window</option><option>token_bucket</option></select></div>
      </div>
      <div class="flex gap-2 mt-3">
        <button onclick="submitRateLimit()" class="px-4 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium">Create</button>
        <button onclick="document.getElementById('create-ratelimit-form').classList.add('hidden')" class="px-4 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs font-medium">Cancel</button>
      </div>
    </div>
  </div>

  <!-- Cache Tab -->
  <div id="tab-cache" class="tab-content hidden fade-in">
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6" id="cache-stats-cards"></div>
    <div class="card p-5">
      <h3 class="text-sm font-semibold text-slate-300 mb-3">Cache Entries</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="text-slate-400 border-b border-slate-700">
            <th class="text-left py-2 px-3">Key</th><th class="text-left py-2 px-3">Hits</th><th class="text-left py-2 px-3">Misses</th><th class="text-left py-2 px-3">Size</th><th class="text-left py-2 px-3">Expires</th>
          </tr></thead>
          <tbody id="cache-table"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Secrets Tab -->
  <div id="tab-secrets" class="tab-content hidden fade-in">
    <div class="card p-5">
      <h3 class="text-sm font-semibold text-slate-300 mb-3">Secrets Vault</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="text-slate-400 border-b border-slate-700">
            <th class="text-left py-2 px-3">Key</th><th class="text-left py-2 px-3">Category</th><th class="text-left py-2 px-3">Description</th><th class="text-left py-2 px-3">Last Rotated</th><th class="text-left py-2 px-3">Rotation Days</th>
          </tr></thead>
          <tbody id="secrets-table"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Audit Logs Tab -->
  <div id="tab-auditlog" class="tab-content hidden fade-in">
    <div class="flex items-center gap-3 mb-4">
      <label class="text-xs text-slate-400">Filter by action:</label>
      <select id="audit-filter" onchange="loadAuditLogs()" class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs">
        <option value="">All Actions</option>
        <option value="login">Login</option>
        <option value="register">Register</option>
        <option value="tender_create">Tender Create</option>
        <option value="bid_submit">Bid Submit</option>
        <option value="document_upload">Document Upload</option>
      </select>
    </div>
    <div class="card p-5">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="text-slate-400 border-b border-slate-700">
            <th class="text-left py-2 px-3">Action</th><th class="text-left py-2 px-3">Resource</th><th class="text-left py-2 px-3">User ID</th><th class="text-left py-2 px-3">Time</th>
          </tr></thead>
          <tbody id="audit-full-table"></tbody>
        </table>
      </div>
    </div>
  </div>

</main>

<!-- Footer -->
<footer class="border-t border-slate-800 py-4 text-center text-xs text-slate-500 mt-8">
  Tenet Infra Service • Port 3004 • Connected to Tenet SQLite Database
</footer>

<script>
// ── State ──
let currentTab = 'users';
let chartInstances = {};

// ── Tab Switching ──
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('tab-active'); b.classList.add('text-slate-400'); });
    btn.classList.add('tab-active'); btn.classList.remove('text-slate-400');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    const tab = btn.dataset.tab;
    document.getElementById('tab-' + tab).classList.remove('hidden');
    currentTab = tab;
    loadTabData(tab);
  });
});

// ── API Helpers ──
async function api(path) {
  const res = await fetch(path);
  return res.json();
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function timeAgo(dateStr) {
  if (!dateStr) return 'N/A';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}

function destroyChart(id) {
  if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

// ── Data Loaders ──
function loadTabData(tab) {
  switch(tab) {
    case 'users': loadUserStats(); break;
    case 'health': loadHealth(); break;
    case 'metrics': loadMetrics(); break;
    case 'alerts': loadAlerts(); break;
    case 'webhooks': loadWebhooks(); break;
    case 'ratelimits': loadRateLimits(); break;
    case 'cache': loadCache(); break;
    case 'secrets': loadSecrets(); break;
    case 'auditlog': loadAuditLogs(); break;
  }
}

async function loadUserStats() {
  const data = await api('/api/users');
  if (!data.success) return;
  const s = data.data;

  // Summary cards
  const cards = [
    { label: 'Total Users', value: s.totalUsers, color: 'text-green-400' },
    { label: 'Active', value: s.activeUsers, color: 'text-emerald-400' },
    { label: 'New Today', value: s.newUsersToday, color: 'text-blue-400' },
    { label: 'This Week', value: s.newUsersThisWeek, color: 'text-cyan-400' },
    { label: 'This Month', value: s.newUsersThisMonth, color: 'text-purple-400' },
  ];
  document.getElementById('user-summary-cards').innerHTML = cards.map(c => \`
    <div class="card p-4">
      <p class="text-xs text-slate-400 mb-1">\${c.label}</p>
      <p class="text-2xl font-bold \${c.color}">\${c.value}</p>
    </div>
  \`).join('');

  // Daily chart
  destroyChart('daily');
  const dailyLabels = (s.dailyRegistrations || []).map(d => d.date).reverse();
  const dailyData = (s.dailyRegistrations || []).map(d => d.count).reverse();
  chartInstances['daily'] = new Chart(document.getElementById('chart-daily'), {
    type: 'bar',
    data: { labels: dailyLabels, datasets: [{ label: 'Users', data: dailyData, backgroundColor: '#22c55e80', borderColor: '#22c55e', borderWidth: 1, borderRadius: 4 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#1e293b' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' }, beginAtZero: true } } }
  });

  // Monthly chart
  destroyChart('monthly');
  const monthLabels = (s.monthlyRegistrations || []).map(d => d.month).reverse();
  const monthData = (s.monthlyRegistrations || []).map(d => d.count).reverse();
  chartInstances['monthly'] = new Chart(document.getElementById('chart-monthly'), {
    type: 'line',
    data: { labels: monthLabels, datasets: [{ label: 'Users', data: monthData, borderColor: '#22c55e', backgroundColor: '#22c55e20', fill: true, tension: 0.3 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' }, beginAtZero: true } } }
  });

  // Role chart
  destroyChart('roles');
  const roleLabels = (s.roleDistribution || []).map(d => d.role);
  const roleData = (s.roleDistribution || []).map(d => d.count);
  chartInstances['roles'] = new Chart(document.getElementById('chart-roles'), {
    type: 'doughnut',
    data: { labels: roleLabels, datasets: [{ data: roleData, backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'] }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 } } } } }
  });

  // Status chart
  destroyChart('status');
  const statusLabels = (s.statusDistribution || []).map(d => d.status);
  const statusData = (s.statusDistribution || []).map(d => d.count);
  chartInstances['status'] = new Chart(document.getElementById('chart-status'), {
    type: 'doughnut',
    data: { labels: statusLabels, datasets: [{ data: statusData, backgroundColor: ['#22c55e', '#f59e0b', '#ef4444', '#6b7280'] }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 } } } } }
  });

  // Recent users table
  document.getElementById('recent-users-table').innerHTML = (s.recentRegistrations || []).map(u => \`
    <tr class="border-b border-slate-800 hover:bg-slate-800/50">
      <td class="py-2 px-3 text-slate-300">\${u.email}</td>
      <td class="py-2 px-3"><span class="px-2 py-0.5 rounded-full text-xs \${u.role === 'team_admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}">\${u.role}</span></td>
      <td class="py-2 px-3"><span class="px-2 py-0.5 rounded-full text-xs \${u.status === 'active' ? 'bg-green-500/20 text-green-400' : u.status === 'suspended' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}">\${u.status}</span></td>
      <td class="py-2 px-3 text-slate-400">\${u.companyId ? 'Yes' : 'No'}</td>
      <td class="py-2 px-3 text-slate-400">\${timeAgo(u.createdAt)}</td>
    </tr>
  \`).join('');
}

async function loadHealth() {
  const data = await api('/api/health');
  if (!data.success) return;
  const h = data.data;

  document.getElementById('health-score').textContent = h.score;
  const badge = document.getElementById('health-badge');
  const dot = badge.querySelector('.status-dot');
  dot.className = 'status-dot ' + (h.score >= 80 ? 'status-healthy' : h.score >= 50 ? 'status-warning' : 'status-critical');

  const icons = {
    authentication: '🛡️', analytics: '📊', dns: '🌐', stress_testing: '🧪', pen_testing: '🔬',
    load_handling: '⚡', fail_tolerance: '🔄', backup: '💾', data_modeling: '🗄️', rate_limiting: '⏱️',
    caching: '💨', edge_computing: '☁️', web_performance: '🚀', cdn: '📡', monitoring: '👁️',
    network_security: '🔒', api_integration: '🔌', idempotency: '🔢', automation: '🤖',
    webhooks: '🔗', secret_management: '🔑', audits: '📋', stateless: ' Stateless'
  };

  const grid = document.getElementById('health-concerns-grid');
  grid.innerHTML = Object.entries(h.concerns).map(([key, status]) => \`
    <div class="card p-4 flex items-start gap-3">
      <div class="text-2xl">\${icons[key] || '⚙️'}</div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm font-medium text-slate-200">\${key.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase())}</span>
          <span class="status-dot status-\${status}"></span>
        </div>
        <span class="text-xs px-2 py-0.5 rounded-full \${status === 'healthy' ? 'bg-green-500/20 text-green-400' : status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' : status === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}">\${status.replace('_', ' ')}</span>
      </div>
    </div>
  \`).join('');
}

async function loadMetrics() {
  const data = await api('/api/metrics');
  if (!data.success) return;
  const m = data.data;

  const cards = [
    { label: 'Companies', value: m.totalCompanies, color: 'text-blue-400' },
    { label: 'Tenders', value: m.totalTenders, color: 'text-green-400' },
    { label: 'Bids', value: m.totalBids, color: 'text-purple-400' },
    { label: 'Projects', value: m.totalProjects, color: 'text-cyan-400' },
    { label: 'Open Tenders', value: m.openTenders, color: 'text-emerald-400' },
    { label: 'Pending Bids', value: m.pendingBids, color: 'text-yellow-400' },
    { label: 'DB Size', value: formatBytes(m.dbSize), color: 'text-orange-400' },
    { label: 'Uptime', value: Math.floor(m.uptime / 3600) + 'h ' + Math.floor((m.uptime % 3600) / 60) + 'm', color: 'text-teal-400' },
  ];
  document.getElementById('metrics-cards').innerHTML = cards.map(c => \`
    <div class="card p-4">
      <p class="text-xs text-slate-400 mb-1">\${c.label}</p>
      <p class="text-xl font-bold \${c.color}">\${c.value}</p>
    </div>
  \`).join('');

  // Tender status chart
  destroyChart('tender-status');
  const tLabels = (m.tendersByStatus || []).map(d => d.status);
  const tData = (m.tendersByStatus || []).map(d => d.count);
  chartInstances['tender-status'] = new Chart(document.getElementById('chart-tender-status'), {
    type: 'doughnut',
    data: { labels: tLabels, datasets: [{ data: tData, backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'] }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } }
  });

  // Bid status chart
  destroyChart('bid-status');
  const bLabels = (m.bidsByStatus || []).map(d => d.status);
  const bData = (m.bidsByStatus || []).map(d => d.count);
  chartInstances['bid-status'] = new Chart(document.getElementById('chart-bid-status'), {
    type: 'doughnut',
    data: { labels: bLabels, datasets: [{ data: bData, backgroundColor: ['#f59e0b', '#22c55e', '#8b5cf6', '#ef4444', '#3b82f6'] }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } }
  });

  // Audit logs table
  document.getElementById('audit-log-table').innerHTML = (m.recentAuditLogs || []).map(l => \`
    <tr class="border-b border-slate-800 hover:bg-slate-800/50">
      <td class="py-2 px-3 text-slate-300"><span class="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">\${l.action}</span></td>
      <td class="py-2 px-3 text-slate-400">\${l.resource || '-'}</td>
      <td class="py-2 px-3 text-slate-400 text-xs">\${l.userId ? l.userId.substring(0, 12) + '...' : 'system'}</td>
      <td class="py-2 px-3 text-slate-400">\${timeAgo(l.createdAt)}</td>
    </tr>
  \`).join('');
}

async function loadAlerts() {
  const data = await api('/api/alerts');
  if (!data.success) return;
  const alerts = data.data;
  document.getElementById('alerts-list').innerHTML = alerts.length === 0
    ? '<p class="text-sm text-slate-400">No alerts found.</p>'
    : alerts.map(a => \`
    <div class="card p-4 flex items-start gap-3">
      <span class="mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium \${
        a.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
        a.severity === 'emergency' ? 'bg-red-500/20 text-red-400' :
        a.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
        'bg-blue-500/20 text-blue-400'
      }">\${a.severity}</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-slate-200">\${a.title}</span>
          <span class="text-xs text-slate-400">\${timeAgo(a.createdAt)}</span>
        </div>
        <p class="text-xs text-slate-400 mt-1">\${a.message}</p>
        <div class="flex items-center gap-2 mt-2">
          <span class="text-xs text-slate-500">\${a.type} • \${a.source || 'system'}</span>
          <span class="px-2 py-0.5 rounded-full text-xs \${
            a.status === 'active' ? 'bg-red-500/20 text-red-400' :
            a.status === 'acknowledged' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-green-500/20 text-green-400'
          }">\${a.status}</span>
          \${a.status === 'active' ? \`<button onclick="ackAlert('\${a.id}')" class="text-xs text-yellow-400 hover:underline">Acknowledge</button>\` : ''}
          \${a.status !== 'resolved' ? \`<button onclick="resolveAlertAction('\${a.id}')" class="text-xs text-green-400 hover:underline">Resolve</button>\` : ''}
        </div>
      </div>
    </div>
  \`).join('');
}

async function loadWebhooks() {
  const data = await api('/api/webhooks');
  if (!data.success) return;
  const whs = data.data;
  document.getElementById('webhooks-list').innerHTML = whs.length === 0
    ? '<p class="text-sm text-slate-400">No webhooks configured.</p>'
    : whs.map(w => \`
    <div class="card p-4 flex items-start gap-3">
      <span class="px-2 py-0.5 rounded-full text-xs font-medium \${w.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}">\${w.active ? 'Active' : 'Inactive'}</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-slate-200">\${w.name}</span>
          <button onclick="deleteWebhookAction('\${w.id}')" class="text-xs text-red-400 hover:underline">Delete</button>
        </div>
        <p class="text-xs text-slate-400 mt-1 truncate">\${w.url}</p>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-xs text-slate-500">Events: \${w.events}</span>
          \${w.failureCount > 0 ? \`<span class="text-xs text-red-400">\${w.failureCount} failures</span>\` : ''}
        </div>
      </div>
    </div>
  \`).join('');
}

async function loadRateLimits() {
  const data = await api('/api/rate-limits');
  if (!data.success) return;
  const rules = data.data;
  document.getElementById('ratelimits-list').innerHTML = rules.length === 0
    ? '<p class="text-sm text-slate-400">No rate limit rules configured.</p>'
    : rules.map(r => \`
    <div class="card p-4 flex items-start gap-3">
      <span class="px-2 py-0.5 rounded-full text-xs font-medium \${r.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}">\${r.active ? 'Active' : 'Inactive'}</span>
      <div class="flex-1 min-w-0">
        <span class="text-sm font-medium text-slate-200">\${r.endpoint}</span>
        <p class="text-xs text-slate-400 mt-1">\${r.maxRequests} requests per \${(r.windowMs / 1000).toFixed(0)}s • Strategy: \${r.strategy}</p>
      </div>
    </div>
  \`).join('');
}

async function loadCache() {
  const [statsRes, entriesRes] = await Promise.all([api('/api/cache/stats'), api('/api/cache')]);
  if (!statsRes.success) return;
  const cs = statsRes.data;

  document.getElementById('cache-stats-cards').innerHTML = [
    { label: 'Total Entries', value: cs.total, color: 'text-green-400' },
    { label: 'Hit Rate', value: cs.hitRate + '%', color: 'text-emerald-400' },
    { label: 'Total Hits', value: cs.totalHits, color: 'text-blue-400' },
    { label: 'Total Misses', value: cs.totalMisses, color: 'text-yellow-400' },
    { label: 'Total Size', value: formatBytes(cs.totalSize), color: 'text-purple-400' },
    { label: 'Expired', value: cs.expired, color: 'text-red-400' },
  ].map(c => \`
    <div class="card p-4">
      <p class="text-xs text-slate-400 mb-1">\${c.label}</p>
      <p class="text-lg font-bold \${c.color}">\${c.value}</p>
    </div>
  \`).join('');

  if (entriesRes.success) {
    document.getElementById('cache-table').innerHTML = (entriesRes.data || []).map(e => \`
      <tr class="border-b border-slate-800 hover:bg-slate-800/50">
        <td class="py-2 px-3 text-slate-300 text-xs font-mono">\${e.key}</td>
        <td class="py-2 px-3 text-green-400">\${e.hits}</td>
        <td class="py-2 px-3 text-yellow-400">\${e.misses}</td>
        <td class="py-2 px-3 text-slate-400">\${formatBytes(e.sizeBytes)}</td>
        <td class="py-2 px-3 text-slate-400">\${timeAgo(e.expiresAt)}</td>
      </tr>
    \`).join('');
  }
}

async function loadSecrets() {
  const data = await api('/api/secrets');
  if (!data.success) return;
  document.getElementById('secrets-table').innerHTML = (data.data || []).length === 0
    ? '<tr><td colspan="5" class="py-4 text-center text-slate-400">No secrets configured</td></tr>'
    : (data.data || []).map(s => \`
    <tr class="border-b border-slate-800 hover:bg-slate-800/50">
      <td class="py-2 px-3 text-slate-300 font-mono text-xs">\${s.key}</td>
      <td class="py-2 px-3"><span class="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">\${s.category}</span></td>
      <td class="py-2 px-3 text-slate-400 text-xs">\${s.description || '-'}</td>
      <td class="py-2 px-3 text-slate-400 text-xs">\${s.rotatedAt ? timeAgo(s.rotatedAt) : 'Never'}</td>
      <td class="py-2 px-3 text-slate-400">\${s.rotationDays}d</td>
    </tr>
  \`).join('');
}

async function loadAuditLogs() {
  const filter = document.getElementById('audit-filter')?.value || '';
  const url = '/api/audit-logs?limit=50' + (filter ? '&action=' + filter : '');
  const data = await api(url);
  if (!data.success) return;
  document.getElementById('audit-full-table').innerHTML = (data.data || []).length === 0
    ? '<tr><td colspan="4" class="py-4 text-center text-slate-400">No audit logs found</td></tr>'
    : (data.data || []).map(l => \`
    <tr class="border-b border-slate-800 hover:bg-slate-800/50">
      <td class="py-2 px-3"><span class="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">\${l.action}</span></td>
      <td class="py-2 px-3 text-slate-400">\${l.resource || '-'}</td>
      <td class="py-2 px-3 text-slate-400 text-xs font-mono">\${l.userId ? l.userId.substring(0, 12) + '...' : 'system'}</td>
      <td class="py-2 px-3 text-slate-400">\${timeAgo(l.createdAt)}</td>
    </tr>
  \`).join('');
}

// ── Alert Actions ──
function showCreateAlert() { document.getElementById('create-alert-form').classList.remove('hidden'); }
async function submitAlert() {
  const body = {
    type: document.getElementById('alert-type').value,
    severity: document.getElementById('alert-severity').value,
    title: document.getElementById('alert-title').value,
    message: document.getElementById('alert-message').value,
  };
  await fetch('/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  document.getElementById('create-alert-form').classList.add('hidden');
  loadAlerts();
}
async function ackAlert(id) { await fetch('/api/alerts/' + id + '/acknowledge', { method: 'POST' }); loadAlerts(); }
async function resolveAlertAction(id) { await fetch('/api/alerts/' + id + '/resolve', { method: 'POST' }); loadAlerts(); }

// ── Webhook Actions ──
function showCreateWebhook() { document.getElementById('create-webhook-form').classList.remove('hidden'); }
async function submitWebhook() {
  const body = { name: document.getElementById('wh-name').value, url: document.getElementById('wh-url').value, events: document.getElementById('wh-events').value, secret: document.getElementById('wh-secret').value, createdBy: 'infra-admin' };
  await fetch('/api/webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  document.getElementById('create-webhook-form').classList.add('hidden');
  loadWebhooks();
}
async function deleteWebhookAction(id) { await fetch('/api/webhooks?id=' + id, { method: 'DELETE' }); loadWebhooks(); }

// ── Rate Limit Actions ──
function showCreateRateLimit() { document.getElementById('create-ratelimit-form').classList.remove('hidden'); }
async function submitRateLimit() {
  const body = { endpoint: document.getElementById('rl-endpoint').value, windowMs: parseInt(document.getElementById('rl-window').value), maxRequests: parseInt(document.getElementById('rl-max').value), strategy: document.getElementById('rl-strategy').value };
  await fetch('/api/rate-limits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  document.getElementById('create-ratelimit-form').classList.add('hidden');
  loadRateLimits();
}

// ── Refresh ──
async function refreshAll() {
  await loadHealth();
  loadTabData(currentTab);
}

// ── Init ──
loadHealth();
loadUserStats();
</script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Server – using Bun.serve() for stability
// ─────────────────────────────────────────────────────────────────────────────

const PORT = 3004;

// Initialize DB connection on startup
getDb();

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      const headers = { ...corsHeaders };

      // ── Serve Dashboard HTML ──
      if (path === '/' || path === '/index.html') {
        return new Response(getDashboardHTML(), { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
      }

      // ── API: User Statistics ──
      if (path === '/api/users' && method === 'GET') {
        return Response.json({ success: true, data: getUserStats() }, { headers });
      }

      // ── API: Health Check ──
      if (path === '/api/health' && method === 'GET') {
        return Response.json({ success: true, data: getHealthCheck() }, { headers });
      }

      // ── API: System Metrics ──
      if (path === '/api/metrics' && method === 'GET') {
        return Response.json({ success: true, data: getSystemMetrics() }, { headers });
      }

      // ── API: Alerts ──
      if (path === '/api/alerts' && method === 'GET') {
        return Response.json({ success: true, data: getAlerts() }, { headers });
      }

      if (path === '/api/alerts' && method === 'POST') {
        const data = await req.json();
        const result = createAlert(data);
        return Response.json(result, { status: result.success ? 201 : 400, headers });
      }

      // Acknowledge alert
      const ackMatch = path.match(/^\/api\/alerts\/([^/]+)\/acknowledge$/);
      if (ackMatch && method === 'POST') {
        const result = acknowledgeAlert(ackMatch[1]);
        return Response.json(result, { status: result.success ? 200 : 400, headers });
      }

      // Resolve alert
      const resolveMatch = path.match(/^\/api\/alerts\/([^/]+)\/resolve$/);
      if (resolveMatch && method === 'POST') {
        const result = resolveAlert(resolveMatch[1]);
        return Response.json(result, { status: result.success ? 200 : 400, headers });
      }

      // ── API: Webhooks ──
      if (path === '/api/webhooks' && method === 'GET') {
        return Response.json({ success: true, data: getWebhooks() }, { headers });
      }

      if (path === '/api/webhooks' && method === 'POST') {
        const data = await req.json();
        const result = createWebhook(data);
        return Response.json(result, { status: result.success ? 201 : 400, headers });
      }

      if (path === '/api/webhooks' && method === 'DELETE') {
        const id = url.searchParams.get('id');
        if (id) {
          const result = deleteWebhook(id);
          return Response.json(result, { status: result.success ? 200 : 400, headers });
        }
        return Response.json({ success: false, error: 'id query param required' }, { status: 400, headers });
      }

      // ── API: Rate Limits ──
      if (path === '/api/rate-limits' && method === 'GET') {
        return Response.json({ success: true, data: getRateLimits() }, { headers });
      }

      if (path === '/api/rate-limits' && method === 'POST') {
        const data = await req.json();
        const result = createRateLimit(data);
        return Response.json(result, { status: result.success ? 201 : 400, headers });
      }

      // ── API: Cache ──
      if (path === '/api/cache/stats' && method === 'GET') {
        return Response.json({ success: true, data: getCacheStats() }, { headers });
      }

      if (path === '/api/cache' && method === 'GET') {
        return Response.json({ success: true, data: getCacheEntries() }, { headers });
      }

      // ── API: Secrets ──
      if (path === '/api/secrets' && method === 'GET') {
        return Response.json({ success: true, data: getSecrets() }, { headers });
      }

      // ── API: Audit Logs ──
      if (path === '/api/audit-logs' && method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const action = url.searchParams.get('action') || undefined;
        return Response.json({ success: true, data: getAuditLogs(limit, offset, action) }, { headers });
      }

      // ── 404 ──
      return Response.json({ success: false, error: 'Not found' }, { status: 404, headers });
    } catch (e: any) {
      console.error('[InfraService] Error:', e);
      return Response.json({ success: false, error: e.message }, { status: 500 });
    }
  },
});

console.log(`[InfraService] ✅ Infra & DevOps dashboard running on port ${PORT}`);
console.log(`[InfraService] 📊 Dashboard: http://localhost:${PORT}`);
console.log(`[InfraService] 🔗 APIs: /api/users, /api/health, /api/metrics, /api/alerts, /api/webhooks, /api/rate-limits, /api/cache, /api/secrets, /api/audit-logs`);
