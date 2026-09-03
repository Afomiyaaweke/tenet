import type { ComponentType } from 'react';
import {
  FileSearch, Gavel, Globe2, Users, Mail, Lock,
  ClipboardList, ChartColumn, Trophy, Bot, User, Crown,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export function getNavItemsForRole(role: string, accountType?: string): NavSection[] {
  const main: NavSection = {
    label: 'MAIN',
    items: [
      { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
      { id: 'tenders', label: 'Tenders', icon: FileSearch },
      { id: 'live-tenders', label: 'Live Tenders', icon: Globe2 },
      { id: 'bids', label: 'Bids', icon: Gavel },
      { id: 'applicants', label: 'Published Tenders', icon: ClipboardList },
    ],
  };

  const tools: NavSection = {
    label: 'TOOLS',
    items: [
      { id: 'profile', label: 'Profile', icon: User },
      { id: 'ai-doc-studio', label: 'AI Doc Studio', icon: Bot },
      { id: 'tender-analyzer', label: 'Tender Analyzer', icon: ChartColumn },
    ],
  };

  const support: NavSection = {
    label: 'SUPPORT',
    items: [
      { id: 'contact-us', label: 'Contact Us', icon: Mail },
      { id: 'privacy-policy', label: 'Privacy Policy', icon: Lock },
    ],
  };

  // Personal accounts: no Team Management (they have no company/team)
  const isPersonal = accountType === 'personal';

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

  return [
    main,
    { label: 'MANAGE', items: [
      ...(!isPersonal ? [{ id: 'team-management', label: 'Team Management', icon: Users }] : []),
      { id: 'social-circle', label: 'Social Circle', icon: Users },
    ] },
    tools,
    support,
  ];
}