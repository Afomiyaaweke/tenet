'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore, useNavStore, useDataStore } from '@/store';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard, FileSearch, Gavel, FolderKanban, MessageSquare,
  GraduationCap, User, FileText, Bot, Menu, LogOut, Bell,
  ChevronRight, CheckCircle, AlertCircle, AlertTriangle, Info, Check,
  Search, Verified, Globe2, Building2, Users, Mail, Lock, ClipboardList,
  PenTool, BarChart3, FileCode, Shield,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { TenetLogo } from '@/components/logo';

/* ──────────────────────────── Dynamic imports (lazy load modules) ──────────────────────────── */

const DashboardView = dynamic(() => import('@/components/modules/dashboard').then(m => ({ default: m.DashboardView })), { ssr: false });
const TendersView = dynamic(() => import('@/components/modules/tenders').then(m => ({ default: m.TendersView })), { ssr: false });
const LiveTendersView = dynamic(() => import('@/components/modules/live-tenders').then(m => ({ default: m.LiveTendersView })), { ssr: false });
const TenderDetailView = dynamic(() => import('@/components/modules/tender-detail').then(m => ({ default: m.TenderDetailView })), { ssr: false });
const TenderCompareView = dynamic(() => import('@/components/modules/tender-compare').then(m => ({ default: m.TenderCompareView })), { ssr: false });
const BidCompareView = dynamic(() => import('@/components/modules/tender-compare').then(m => ({ default: m.BidCompareView })), { ssr: false });
const BidsView = dynamic(() => import('@/components/modules/bids').then(m => ({ default: m.BidsView })), { ssr: false });
const ApplicantsView = dynamic(() => import('@/components/modules/applicants').then(m => ({ default: m.ApplicantsView })), { ssr: false });
const ProjectsView = dynamic(() => import('@/components/modules/projects').then(m => ({ default: m.ProjectsView })), { ssr: false });
const ProjectDetailView = dynamic(() => import('@/components/modules/project-detail').then(m => ({ default: m.ProjectDetailView })), { ssr: false });
const ChatView = dynamic(() => import('@/components/modules/chat').then(m => ({ default: m.ChatView })), { ssr: false });
const EventsView = dynamic(() => import('@/components/modules/events').then(m => ({ default: m.EventsView })), { ssr: false });
const ProfileView = dynamic(() => import('@/components/modules/profile').then(m => ({ default: m.ProfileView })), { ssr: false });
const DocumentsView = dynamic(() => import('@/components/modules/documents').then(m => ({ default: m.DocumentsView })), { ssr: false });
const AgentView = dynamic(() => import('@/components/modules/agent').then(m => ({ default: m.AgentView })), { ssr: false });
const StaffView = dynamic(() => import('@/components/modules/staff').then(m => ({ default: m.StaffView })), { ssr: false });
const ContactUsView = dynamic(() => import('@/components/modules/contact-us').then(m => ({ default: m.ContactUsView })), { ssr: false });
const PrivacyPolicyView = dynamic(() => import('@/components/modules/privacy-policy').then(m => ({ default: m.PrivacyPolicyView })), { ssr: false });
const SocialCircleView = dynamic(() => import('@/components/modules/social-circle').then(m => ({ default: m.SocialCircleView })), { ssr: false });
const RateLimitsView = dynamic(() => import('@/components/modules/rate-limits').then(m => ({ default: m.RateLimitsView })), { ssr: false });
const AIDocStudioView = dynamic(() => import('@/components/modules/ai-doc-studio').then(m => ({ default: m.AIDocStudio })), { ssr: false });
const DocBuilderView = dynamic(() => import('@/components/modules/doc-builder').then(m => ({ default: m.DocBuilderView })), { ssr: false });
const TenderAnalyzerView = dynamic(() => import('@/components/modules/tender-analyzer').then(m => ({ default: m.TenderAnalyzerView })), { ssr: false });
const TeamManagementView = dynamic(() => import('@/components/modules/team-management').then(m => ({ default: m.TeamManagementView })), { ssr: false });

/* ──────────────────────────── Loading spinner ──────────────────────────── */

function ViewLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

/* ──────────────────────────── constants ──────────────────────────── */

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  success: CheckCircle,
  warning: AlertTriangle,
  alert: AlertCircle,
  info: Info,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  success: 'text-orange-500',
  warning: 'text-amber-500',
  alert: 'text-red-500',
  info: 'text-orange-500',
};

const NOTIFICATION_BG: Record<string, string> = {
  success: 'bg-orange-50 dark:bg-orange-950/30',
  warning: 'bg-amber-50 dark:bg-amber-950/30',
  alert: 'bg-red-50 dark:bg-red-950/30',
  info: 'bg-orange-50 dark:bg-orange-950/30',
};

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

/* ──────────────────── Role-aware navigation ──────────────────── */

function getNavItemsForRole(role: string): NavSection[] {
  const main: NavSection = {
    label: 'MAIN',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'tenders', label: 'Tenders', icon: FileSearch },
      { id: 'live-tenders', label: 'Live Tenders', icon: Globe2 },
      { id: 'bids', label: 'Bids', icon: Gavel },
      { id: 'applicants', label: 'Published Tenders', icon: ClipboardList },
    ],
  };

  const manage: NavSection = {
    label: 'MANAGE',
    items: [
      { id: 'projects', label: 'Projects', icon: FolderKanban },
      { id: 'chat', label: 'Messages', icon: MessageSquare },
      { id: 'events', label: 'Workshops', icon: GraduationCap },
      { id: 'social-circle', label: 'Social Circle', icon: Users },
    ],
  };

  const tools: NavSection = {
    label: 'TOOLS',
    items: [
      { id: 'profile', label: 'Profile', icon: User },
      { id: 'documents', label: 'Documents', icon: FileText },
      { id: 'ai-doc-studio', label: 'AI Doc Studio', icon: Bot },
      { id: 'doc-builder', label: 'Doc Builder', icon: PenTool },
      { id: 'tender-analyzer', label: 'Tender Analyzer', icon: BarChart3 },
    ],
  };

  const support: NavSection = {
    label: 'SUPPORT',
    items: [
      { id: 'contact-us', label: 'Contact Us', icon: Mail },
      { id: 'privacy-policy', label: 'Privacy Policy', icon: Lock },
    ],
  };

  if (role === 'team_admin') {
    return [
      main,
      {
        label: 'MANAGE',
        items: [
          { id: 'team-management', label: 'Team Management', icon: Users },
          { id: 'social-circle', label: 'Social Circle', icon: Users },
        ],
      },
      tools,
      support,
    ];
  }

  // Regular user
  return [main, { label: 'MANAGE', items: [{ id: 'team-management', label: 'Team Management', icon: Users }, { id: 'social-circle', label: 'Social Circle', icon: Users }] }, tools, support];
}

/* ──────────────────── Role badge config ──────────────────── */

const ROLE_BADGE_CONFIG: Record<string, { label: string; className: string }> = {
  team_admin: {
    label: 'Team Admin',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  user: {
    label: 'User',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
};

type View = 'dashboard' | 'tenders' | 'live-tenders' | 'tender-detail' | 'tender-compare' | 'bid-compare' | 'bid-analysis' | 'bids' | 'applicants' | 'projects' | 'project-detail' | 'chat' | 'finance' | 'events' | 'profile' | 'company-settings' | 'documents' | 'ai-doc-studio' | 'doc-builder' | 'tender-analyzer' | 'agent' | 'staff' | 'team-management' | 'contact-us' | 'privacy-policy' | 'admin' |'social-circle' | 'rate-limits';

/* ──────────────────────────── helpers ──────────────────────────── */

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getUserInitial(user: { profile?: { fullName?: string }; email?: string } | null): string {
  return (user?.profile?.fullName || user?.email || 'U')[0].toUpperCase();
}

function getCompanyInitial(company: { name?: string } | null): string {
  return (company?.name || 'C')[0].toUpperCase();
}

/* ──────────────────────── SidebarContent ──────────────────────── */

function SidebarContent({
  user,
  role,
  company,
  navSections,
  view,
  setView,
  unreadCount,
  logout,
}: {
  user: { profile?: { fullName?: string; verified?: boolean }; email?: string; role?: string; companyId?: string; company?: { name?: string } } | null;
  role: string;
  company: { name?: string; verified?: boolean } | null;
  navSections: NavSection[];
  view: string;
  setView: (view: View, params?: Record<string, string>) => void;
  unreadCount: number;
  logout: () => void;
}) {
  const displayName = user?.profile?.fullName || user?.email || 'User';
  const isVerified = (user?.profile as { verified?: boolean })?.verified ?? false;
  const companyName = company?.name || user?.company?.name;
  const badgeConfig = ROLE_BADGE_CONFIG[role] || ROLE_BADGE_CONFIG.user;

  return (
    <div className="flex flex-col h-full bg-[#121418]">
      {/* ── Navigation ── */}
      <ScrollArea className="flex-1 px-3 py-5">
        <nav className="space-y-6">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-2 text-[11px] font-semibold tracking-[0.08em] text-[#6b7280] uppercase select-none">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    view === item.id ||
                    (item.id === 'tenders' && (view === 'tender-detail' || view === 'tender-compare' || view === 'bid-compare' || view === 'bid-analysis')) ||
                    (item.id === 'projects' && view === 'project-detail');

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setView(item.id as View);
                      }}
                      className={`
                        group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-all duration-150 relative
                        ${
                          isActive
                            ? 'bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-600/30'
                            : 'text-[#9ca3af] hover:bg-white/5 hover:text-[#f3f4f6]'
                        }
                      `}
                    >
                      <Icon
                        className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                          isActive ? 'text-white' : 'text-[#9ca3af] group-hover:text-white'
                        }`}
                      />
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      {item.id === 'chat' && unreadCount > 0 && (
                        <span className="ml-auto flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm shadow-red-200">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                      {isActive && (
                        <ChevronRight className="h-4 w-4 ml-auto flex-shrink-0 text-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* ── Bottom Section ── */}
      <div className="px-4 pb-4 pt-2 space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-[#9ca3af] hover:text-red-500 hover:bg-white/5 transition-colors"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

/* ──────────────────── NotificationDropdown ──────────────────── */

function NotificationDropdown({
  notifications,
  onMarkAsRead,
  onMarkAllRead,
}: {
  notifications: { id: string; title: string; message: string; type: string; read: boolean; createdAt: string }[];
  onMarkAsRead: (id: string) => void;
  onMarkAllRead: () => void;
}) {
  const [open, setOpen] = useState(false);
  const unread = useMemo(() => notifications.filter((n) => !n.read), [notifications]);
  const displayItems = useMemo(() => unread.slice(0, 6), [unread]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 hover:bg-muted/80 transition-colors">
          <Bell className="h-[18px] w-[18px] text-muted-foreground" />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm shadow-red-200 animate-in zoom-in-50 duration-200">
              {unread.length > 99 ? '99+' : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 glass-card rounded-xl overflow-hidden animate-in slide-in-from-top-2 fade-in-0 duration-200"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground">Notifications</h4>
            {unread.length > 0 && (
              <Badge className="text-[10px] px-1.5 py-0 bg-red-500 text-white font-bold border-0">
                {unread.length}
              </Badge>
            )}
          </div>
          {unread.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] h-7 px-2 text-primary hover:text-primary/80 hover:bg-primary/10 font-semibold"
              onClick={onMarkAllRead}
            >
              <Check className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        {/* Items */}
        <ScrollArea className="max-h-[340px]">
          {displayItems.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-orange-400" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">No new notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {displayItems.map((n, i) => {
                const Icon = NOTIFICATION_ICONS[n.type] || Info;
                const colorClass = NOTIFICATION_COLORS[n.type] || 'text-gray-500';
                const bgClass = NOTIFICATION_BG[n.type] || 'bg-gray-50';
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      onMarkAsRead(n.id);
                      setOpen(false);
                    }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left group"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${bgClass} flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform group-hover:scale-110`}
                    >
                      <Icon className={`h-4 w-4 ${colorClass}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold truncate text-foreground">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1 font-medium">{relativeTime(n.createdAt)}</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 mt-2 ring-2 ring-orange-100 dark:ring-orange-900/40" />
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 6 && (
          <div className="px-3 py-2 border-t border-border/40">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-[11px] text-muted-foreground hover:text-foreground font-medium"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ──────────────────────────── AppShell ──────────────────────────── */

export function AppShell() {
  const { user, company, logout } = useAuthStore();
  const { view, viewParams, setView } = useNavStore();
  const { fetchNotifications, notifications } = useDataStore();
  const role = user?.role || 'user';
  const navSections = useMemo(() => getNavItemsForRole(role), [role]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Flat list for title lookup
  const allNavItems = useMemo(
    () => navSections.flatMap((s) => s.items),
    [navSections]
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    await api.patch(`/notifications/${id}`, { read: true });
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => api.patch(`/notifications/${n.id}`, { read: true })));
    fetchNotifications();
  };

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <DashboardView />;
      case 'tenders':
        return <TendersView />;
      case 'live-tenders':
        return <LiveTendersView />;
      case 'tender-detail':
        return <TenderDetailView tenderId={viewParams.id} initialTab={viewParams.tab as any} />;
      case 'tender-compare':
        return <TenderCompareView tenderIds={viewParams.ids} />;
      case 'bid-compare':
        return <BidCompareView tenderId={viewParams.tenderId} />;
      case 'bid-analysis':
        return <BidsView />;
      case 'bids':
        return <BidsView />;
      case 'applicants':
        return <ApplicantsView />;
      case 'projects':
        return <ProjectsView />;
      case 'project-detail':
        return <ProjectDetailView projectId={viewParams.id} />;
      case 'chat':
        return <ChatView chatId={viewParams.id} />;
      case 'finance':
        return <ProjectDetailView projectId={viewParams.id} />;
      case 'events':
        return <EventsView />;
      case 'profile':
        return <ProfileView />;
      case 'company-settings':
        return <ProfileView />;
      case 'documents':
        return <DocumentsView />;
      case 'ai-doc-studio':
        return <AIDocStudioView />;
      case 'doc-builder':
        return <DocBuilderView />;
      case 'tender-analyzer':
        return <TenderAnalyzerView />;
      case 'agent':
        return <AgentView />;
      case 'team-management':
        return <TeamManagementView />;
      case 'staff':
        return <StaffView />;
      case 'contact-us':
        return <ContactUsView />;
      case 'privacy-policy':
        return <PrivacyPolicyView />;
      case 'social-circle':
        return <SocialCircleView />;
      case 'rate-limits':
        return <RateLimitsView />;

      default:
        return <DashboardView />;
    }
  };

  const pageTitle = allNavItems.find((i) => i.id === view)?.label
    || (view === 'tender-compare' ? 'Compare Tenders' : view === 'bid-compare' ? 'Compare Bids' : view === 'bid-analysis' ? 'Bid Analysis' : 'Dashboard');
  const breadcrumb = view === 'tender-detail' || view === 'bid-compare' || view === 'bid-analysis' ? 'Tenders' : view === 'tender-compare' ? 'Tenders' : view === 'project-detail' ? 'Projects' : null;

  const badgeConfig = ROLE_BADGE_CONFIG[role] || ROLE_BADGE_CONFIG.user;
  const companyName = company?.name || user?.company?.name;

  const sidebarProps = { user, role, company, navSections, view, setView, unreadCount, logout };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-[260px] border-r border-white/5 flex-col flex-shrink-0">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Top Bar ── */}
        <header className="h-14 bg-background/80 backdrop-blur-md border-b border-border/50 flex items-center px-4 gap-3 flex-shrink-0 sticky top-0 z-30">
          {/* Mobile hamburger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 hover:bg-muted/80">
                <Menu className="h-5 w-5 text-muted-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[260px] bg-[#121418]">
              <SidebarContent {...sidebarProps} />
            </SheetContent>
          </Sheet>

          {/* Page Title & Breadcrumb */}
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            {breadcrumb && (
              <>
                <span className="text-sm text-muted-foreground/60 font-medium hidden sm:inline">
                  {breadcrumb}
                </span>
                <ChevronRight className="h-3 w-3 text-muted-foreground/40 hidden sm:inline" />
              </>
            )}
            <h1 className="text-base font-bold truncate text-foreground">{pageTitle}</h1>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1">
            {/* Search */}
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted/80 transition-colors">
              <Search className="h-[18px] w-[18px] text-muted-foreground" />
            </Button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <NotificationDropdown
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllRead={handleMarkAllRead}
            />

            {/* User Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted/80 transition-colors ml-0.5">
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shadow-sm shadow-slate-200">
                    <span className="text-white font-bold text-[11px]">{getUserInitial(user)}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium leading-none">{user?.profile?.fullName || user?.email || 'User'}</p>
                      <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 font-semibold border-0 ${badgeConfig.className}`}>
                        {badgeConfig.label}
                      </Badge>
                    </div>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    {companyName && (
                      <p className="text-[11px] leading-none text-muted-foreground/70 flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {companyName}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setView('profile' as View)} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView('documents' as View)} className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Documents</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ── Content Area ── */}
        <main className="flex-1 overflow-auto">
          <div key={view} className="view-enter">
            <Suspense fallback={<ViewLoader />}>
              {renderView()}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
