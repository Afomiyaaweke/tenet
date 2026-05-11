'use client';

import { useEffect } from 'react';
import { useAuthStore, useNavStore, useDataStore } from '@/store';
import { DashboardView } from '@/components/modules/dashboard';
import { TendersView } from '@/components/modules/tenders';
import { TenderDetailView } from '@/components/modules/tender-detail';
import { BidsView } from '@/components/modules/bids';
import { ProjectsView } from '@/components/modules/projects';
import { ProjectDetailView } from '@/components/modules/project-detail';
import { ChatView } from '@/components/modules/chat';
import { EventsView } from '@/components/modules/events';
import { ProfileView } from '@/components/modules/profile';
import { DocumentsView } from '@/components/modules/documents';
import { AdminView } from '@/components/modules/admin';
import { AgentView } from '@/components/modules/agent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard, FileSearch, Gavel, FolderKanban, MessageSquare,
  GraduationCap, User, FileText, Shield, Bot, Menu, LogOut, Bell,
  ChevronRight
} from 'lucide-react';

const NAV_ITEMS = {
  contractor: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tenders', label: 'Discover Tenders', icon: FileSearch },
    { id: 'bids', label: 'My Bids', icon: Gavel },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'chat', label: 'Messages', icon: MessageSquare },
    { id: 'events', label: 'Workshops', icon: GraduationCap },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'documents', label: 'Document Vault', icon: FileText },
    { id: 'agent', label: 'AI Assistant', icon: Bot },
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tenders', label: 'Manage Tenders', icon: FileSearch },
    { id: 'bids', label: 'Review Bids', icon: Gavel },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'chat', label: 'Messages', icon: MessageSquare },
    { id: 'events', label: 'Workshops', icon: GraduationCap },
    { id: 'admin', label: 'Admin Panel', icon: Shield },
    { id: 'agent', label: 'AI Assistant', icon: Bot },
  ],
  tender_owner: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tenders', label: 'My Tenders', icon: FileSearch },
    { id: 'bids', label: 'Review Bids', icon: Gavel },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'chat', label: 'Messages', icon: MessageSquare },
    { id: 'agent', label: 'AI Assistant', icon: Bot },
  ],
};

type View = 'dashboard' | 'tenders' | 'tender-detail' | 'bids' | 'projects' | 'project-detail' | 'chat' | 'finance' | 'events' | 'profile' | 'documents' | 'admin' | 'agent';

function SidebarContent({ user, role, navItems, view, setView, unreadCount, logout }: {
  user: { profile?: { fullName?: string; }; email?: string; } | null;
  role: string;
  navItems: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  view: string;
  setView: (view: View, params?: Record<string, string>) => void;
  unreadCount: number;
  logout: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold">A</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm truncate">Afomiya</h2>
            <p className="text-[10px] text-muted-foreground truncate">Tender Ecosystem</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-700 font-semibold text-xs">
              {(user?.profile?.fullName || user?.email || 'U')[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user?.profile?.fullName || user?.email}</p>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5 capitalize">
              {role.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-1 px-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = view === item.id || (item.id === 'tenders' && view === 'tender-detail') || (item.id === 'projects' && view === 'project-detail');
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id as View)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.id === 'chat' && unreadCount > 0 && (
                  <Badge className="ml-auto text-[10px] px-1.5 py-0 bg-red-500 text-white">{unreadCount}</Badge>
                )}
                <ChevronRight className={`h-3 w-3 ml-auto opacity-0 transition-opacity ${isActive ? 'opacity-100' : ''}`} />
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-3">
        <Button variant="ghost" size="sm" className="w-full justify-start text-gray-500 hover:text-red-600"
          onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function AppShell() {
  const { user, logout } = useAuthStore();
  const { view, viewParams, setView } = useNavStore();
  const { fetchNotifications, notifications } = useDataStore();
  const role = user?.role || 'contractor';
  const navItems = NAV_ITEMS[role] || NAV_ITEMS.contractor;
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const renderView = () => {
    switch (view) {
      case 'dashboard': return <DashboardView />;
      case 'tenders': return <TendersView />;
      case 'tender-detail': return <TenderDetailView tenderId={viewParams.id} />;
      case 'bids': return <BidsView />;
      case 'projects': return <ProjectsView />;
      case 'project-detail': return <ProjectDetailView projectId={viewParams.id} />;
      case 'chat': return <ChatView chatId={viewParams.id} />;
      case 'finance': return <ProjectDetailView projectId={viewParams.id} />;
      case 'events': return <EventsView />;
      case 'profile': return <ProfileView />;
      case 'documents': return <DocumentsView />;
      case 'admin': return <AdminView />;
      case 'agent': return <AgentView />;
      default: return <DashboardView />;
    }
  };

  const sidebarProps = { user, role, navItems, view, setView, unreadCount, logout };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 bg-white border-r flex-col flex-shrink-0">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 border-b bg-white flex items-center px-4 gap-3 flex-shrink-0">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-60">
              <SidebarContent {...sidebarProps} />
            </SheetContent>
          </Sheet>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">
              {navItems.find(i => i.id === view)?.label || 'Dashboard'}
            </h1>
          </div>

          <Button variant="ghost" size="icon" className="relative" onClick={() => setView('chat')}>
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
