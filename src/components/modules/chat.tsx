'use client';

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type ComponentType,
} from 'react';
import { useAuthStore } from '@/store';
import {
  api,
  type Conversation,
  type ConversationMember,
  type ChatMessageItem,
  type MessageReactionItem,
} from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { io, type Socket } from 'socket.io-client';
import {
  MessageSquare,
  ArrowLeft,
  ArrowUp,
  Search,
  Phone,
  Video,
  MoreVertical,
  MoreHorizontal,
  Check,
  CheckCheck,
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Reply,
  Smile,
  Paperclip,
  Pin,
  Bell,
  BellOff,
  X,
  Plus,
  Edit,
  Copy,
  Flag,
} from 'lucide-react';

// =====================================================
// Types
// =====================================================

type FilterTab = 'all' | 'groups' | 'direct';
type ReadState = 'sent' | 'delivered' | 'read';

type UserSearchResult = {
  id: string;
  email: string;
  profile?: {
    fullName: string;
    jobTitle?: string;
    profilePhoto?: string;
  };
  company?: {
    id: string;
    name: string;
  };
};

type ActiveConv = Conversation & {
  myRole?: 'owner' | 'admin' | 'member';
};

// =====================================================
// Helpers
// =====================================================

const GRADIENT_OPTIONS = [
  'gradient-emerald',
  'gradient-teal',
  'gradient-amber',
  'gradient-rose',
] as const;

const SENDER_COLOR_MAP: Record<string, string> = {
  'gradient-emerald': 'text-emerald-600 dark:text-emerald-400',
  'gradient-teal': 'text-teal-600 dark:text-teal-400',
  'gradient-amber': 'text-amber-600 dark:text-amber-500',
  'gradient-rose': 'text-rose-500 dark:text-rose-400',
};

function getAvatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENT_OPTIONS[Math.abs(hash) % GRADIENT_OPTIONS.length];
}

function getSenderColor(seed: string): string {
  return SENDER_COLOR_MAP[getAvatarGradient(seed)] || 'text-primary';
}

function getUserInitial(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const initials = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  return initials.toUpperCase() || name.charAt(0).toUpperCase() || '?';
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateSeparator(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffDay === 0) return 'Today';
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return date.toLocaleDateString([], { weekday: 'long' });
  return date.toLocaleDateString([], {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function shouldShowDateSeparator(
  messages: ChatMessageItem[],
  index: number
): boolean {
  if (index === 0) return true;
  const prev = new Date(messages[index - 1].createdAt).toDateString();
  const curr = new Date(messages[index].createdAt).toDateString();
  return prev !== curr;
}

function isGroupedWithPrev(
  messages: ChatMessageItem[],
  index: number
): boolean {
  if (index === 0) return false;
  const prev = messages[index - 1];
  const curr = messages[index];
  if (prev.userId !== curr.userId) return false;
  if (shouldShowDateSeparator(messages, index)) return false;
  const diff =
    new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return diff < 5 * 60 * 1000; // 5 minutes
}

function truncate(text: string, n: number): string {
  if (!text) return '';
  return text.length > n ? text.slice(0, n) + '…' : text;
}

const msgVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: (isOwn: boolean) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 30, delay: 0.03 },
  }),
};

const chatItemVariants: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.25, ease: 'easeOut' },
  }),
};

const QUICK_REACT_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const EMOJI_PICKER_LIST = [
  '👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉',
  '👏', '💯', '🤔', '👀', '✅', '❌', '😊', '😎',
  '🙌', '💪', '🚀', '💡',
];

// =====================================================
// Reusable avatar / empty-state components
// =====================================================

function UserAvatar({
  userId,
  name,
  photoUrl,
  size = 40,
  rounded = 'rounded-xl',
  className = '',
}: {
  userId: string;
  name?: string;
  photoUrl?: string;
  size?: number;
  rounded?: string;
  className?: string;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name || 'avatar'}
        style={{ width: size, height: size }}
        className={`${rounded} object-cover flex-shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.35) }}
      className={`${rounded} flex items-center justify-center text-white font-semibold flex-shrink-0 ${getAvatarGradient(
        userId
      )} premium-shadow ${className}`}
    >
      {getUserInitial(name)}
    </div>
  );
}

function GroupAvatar({
  seed,
  title,
  avatarUrl,
  size = 40,
  rounded = 'rounded-xl',
}: {
  seed: string;
  title?: string;
  avatarUrl?: string;
  size?: number;
  rounded?: string;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={title || 'group'}
        style={{ width: size, height: size }}
        className={`${rounded} object-cover flex-shrink-0`}
      />
    );
  }
  const letter = (title || 'G').trim().charAt(0).toUpperCase();
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
      className={`${rounded} flex items-center justify-center text-white font-semibold flex-shrink-0 ${getAvatarGradient(
        seed
      )} premium-shadow`}
    >
      {letter || <Users style={{ width: size * 0.5, height: size * 0.5 }} />}
    </div>
  );
}

function EmptyState({
  icon: Icon = MessageSquare,
  title,
  subtitle,
  size = 'lg',
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'lg';
}) {
  const dim = size === 'lg' ? 'w-20 h-20' : 'w-14 h-14';
  const iconCls = size === 'lg' ? 'h-10 w-10' : 'h-7 w-7';
  return (
    <div
 className="flex flex-col items-center justify-center text-center gap-3 p-6 animate-[fadeIn_0.3s_ease-out]"
 >
      <div
        className={`${dim} rounded-2xl gradient-emerald flex items-center justify-center premium-shadow-lg`}
      >
        <Icon className={`${iconCls} text-white`} />
      </div>
      <div>
        <h3 className="text-base font-semibold mb-1">{title}</h3>
        {subtitle && (
          <p className="text-sm text-muted-foreground max-w-xs">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Member picker (reused by NewGroup / NewDirect / AddMember)
// =====================================================

function MemberPicker({
  excludedIds = [],
  onSelect,
  placeholder = 'Search users by name or email…',
}: {
  excludedIds?: string[];
  onSelect: (user: UserSearchResult) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const excludedKey = excludedIds.join(',');

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/users/search', { q: query.trim() });
        if (res.success) {
          const excluded = new Set(excludedIds);
          setResults(
            (res.data || []).filter(
              (u: UserSearchResult) => !excluded.has(u.id)
            )
          );
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, excludedKey, excludedIds]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 text-sm pl-8 bg-muted/50 border-border/40 rounded-lg"
        />
      </div>
      {loading && <p className="text-xs text-muted-foreground px-1">Searching…</p>}
      {!loading && query.trim() && results.length === 0 && (
        <p className="text-xs text-muted-foreground px-1">No users found.</p>
      )}
      {!loading && results.length > 0 && (
        <div className="border border-border/40 rounded-lg max-h-56 overflow-y-auto divide-y divide-border/20">
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => onSelect(u)}
              className="w-full flex items-center gap-3 p-2 hover:bg-muted/50 transition-colors text-left"
            >
              <UserAvatar
                userId={u.id}
                name={u.profile?.fullName}
                photoUrl={u.profile?.profilePhoto}
                size={32}
                rounded="rounded-full"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {u.profile?.fullName || u.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <Plus className="h-4 w-4 text-primary flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// New Group / New Direct dialogs
// =====================================================

function NewGroupDialog({
  open,
  onOpenChange,
  onCreated,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (conv: Conversation) => void;
  currentUserId: string;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<UserSearchResult[]>([]);
  const [creating, setCreating] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setSelected([]);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Group name is required');
      return;
    }
    if (selected.length === 0) {
      toast.error('Add at least one member');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post('/conversations', {
        type: 'group',
        title: title.trim(),
        description: description.trim() || undefined,
        memberIds: selected.map((u) => u.id),
      });
      if (res.success) {
        toast.success('Group created');
        onCreated(res.data as Conversation);
        reset();
        onOpenChange(false);
      } else {
        toast.error(res.error || 'Failed to create group');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Group</DialogTitle>
          <DialogDescription>
            Create a group conversation with other users.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Group name *
            </label>
            <Input
              placeholder="e.g. Project Alpha Team"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Description (optional)
            </label>
            <Textarea
              placeholder="What's this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="bg-muted/50 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Add members *
            </label>
            <MemberPicker
              excludedIds={[currentUserId, ...selected.map((u) => u.id)]}
              onSelect={(u) => setSelected((prev) => [...prev, u])}
            />
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selected.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full"
                  >
                    {u.profile?.fullName || u.email}
                    <button
                      onClick={() =>
                        setSelected((prev) =>
                          prev.filter((x) => x.id !== u.id)
                        )
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="gradient-emerald"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? 'Creating…' : 'Create Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewDirectDialog({
  open,
  onOpenChange,
  onCreated,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (conv: Conversation) => void;
  currentUserId: string;
}) {
  const [busy, setBusy] = useState(false);

  const handleSelect = async (u: UserSearchResult) => {
    setBusy(true);
    try {
      const res = await api.post('/conversations', {
        type: 'direct',
        memberIds: [u.id],
      });
      if (res.success) {
        toast.success(`Conversation with ${u.profile?.fullName || u.email}`);
        onCreated(res.data as Conversation);
        onOpenChange(false);
      } else {
        toast.error(res.error || 'Failed to start conversation');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Direct Message</DialogTitle>
          <DialogDescription>
            Search for a user to start a 1:1 conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <MemberPicker
            excludedIds={[currentUserId]}
            onSelect={handleSelect}
            placeholder="Search by name or email…"
          />
          {busy && (
            <p className="text-xs text-muted-foreground mt-2 px-1">
              Starting conversation…
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// Conversation list
// =====================================================

function ConversationList({
  conversations,
  activeConvId,
  onSelect,
  onlineUsers,
  typingByConv,
  searchQuery,
  onSearchChange,
  filterTab,
  onFilterChange,
  onNewGroup,
  onNewDirect,
  currentUserId,
}: {
  conversations: Conversation[];
  activeConvId?: string;
  onSelect: (conv: Conversation) => void;
  onlineUsers: Set<string>;
  typingByConv: Record<string, string[]>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterTab: FilterTab;
  onFilterChange: (t: FilterTab) => void;
  onNewGroup: () => void;
  onNewDirect: () => void;
  currentUserId: string;
}) {
  return (
    <div className="flex flex-col h-full min-h-0 bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg gradient-emerald">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            Messages
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-primary/10"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onNewGroup}>
                <Users className="h-4 w-4 mr-2" />
                New Group
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onNewDirect}>
                <MessageSquare className="h-4 w-4 mr-2" />
                New Direct Message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            placeholder="Search conversations…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 text-sm pl-8 bg-muted/50 border-border/40 rounded-lg focus:border-primary"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'groups', 'direct'] as const).map((t) => (
            <button
              key={t}
              onClick={() => onFilterChange(t)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors capitalize ${
                filterTab === t
                  ? 'gradient-emerald text-white premium-shadow'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {/* List */}
      <ScrollArea className="flex-1 min-h-0">
        {conversations.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={MessageSquare}
              title="No conversations yet"
              subtitle="Start a new group or direct message to begin."
              size="sm"
            />
          </div>
        ) : (
          conversations.map((conv, i) => (
              <ConversationListItem
                key={conv.id}
                conv={conv}
                active={conv.id === activeConvId}
                index={i}
                onlineUsers={onlineUsers}
                typingUsers={typingByConv[conv.id] || []}
                currentUserId={currentUserId}
                onSelect={onSelect}
              />
            ))
)}
      </ScrollArea>
    </div>
  );
}

function ConversationListItem({
  conv,
  active,
  index,
  onlineUsers,
  typingUsers,
  currentUserId,
  onSelect,
}: {
  conv: Conversation;
  active: boolean;
  index: number;
  onlineUsers: Set<string>;
  typingUsers: string[];
  currentUserId: string;
  onSelect: (conv: Conversation) => void;
}) {
  const myMembership = conv.members?.find((m) => m.userId === currentUserId);
  const pinned = !!(myMembership?.pinned || (conv as Conversation & { pinned?: boolean }).pinned);
  const muted = !!myMembership?.muted;
  const unread = conv.unreadCount || 0;

  // Title and avatar resolution
  let title = conv.title || '';
  let photoUrl: string | undefined;
  let otherUserId: string | undefined;
  if (conv.type === 'direct') {
    const other = conv.members?.find((m) => m.userId !== currentUserId);
    title = other?.user.profile?.fullName || other?.user.email || 'Direct Message';
    photoUrl = other?.user.profile?.profilePhoto;
    otherUserId = other?.userId;
  } else if (!title) {
    title = conv.type === 'channel' ? 'Channel' : 'Untitled Group';
  }

  // Last message preview
  const lastMsg = conv.messages?.[0];
  const typingOthers = typingUsers.filter((u) => u !== currentUserId);
  let previewText = '';
  let previewTime = conv.updatedAt;
  if (typingOthers.length > 0) {
    previewText = 'typing…';
  } else if (lastMsg) {
    const senderName =
      lastMsg.userId === currentUserId
        ? 'You'
        : lastMsg.user?.profile?.fullName?.split(' ')[0] || 'User';
    previewText =
      conv.type === 'direct' ? lastMsg.content : `${senderName}: ${lastMsg.content}`;
    previewTime = lastMsg.createdAt;
  } else {
    previewText = 'No messages yet';
  }

  const isOnline = otherUserId ? onlineUsers.has(otherUserId) : false;

  return (
    <button
 onClick={() => onSelect(conv)}
 className={`w-full p-3 text-left transition-colors duration-150 border-b border-border/20 group relative ${
 active ? 'bg-primary/10' : 'hover:bg-muted/50'
 } animate-[fadeIn_0.3s_ease-out]`}
 >
      {active && (
        <div
 layoutId="activeConvBar"
 className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full gradient-emerald"
 />
      )}
      {pinned && !active && (
        <Pin className="absolute top-2 right-2 h-3 w-3 text-muted-foreground/60" />
      )}
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          {conv.type === 'direct' ? (
            <UserAvatar
              userId={otherUserId || conv.id}
              name={title}
              photoUrl={photoUrl}
              size={44}
              rounded="rounded-full"
            />
          ) : (
            <GroupAvatar
              seed={conv.id}
              title={title}
              avatarUrl={conv.avatarUrl}
              size={44}
              rounded="rounded-full"
            />
          )}
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p
              className={`text-sm truncate flex-1 flex items-center gap-1 ${
                active
                  ? 'font-semibold'
                  : unread > 0
                    ? 'font-semibold'
                    : 'font-medium'
              }`}
            >
              <span className="truncate">{title}</span>
              {muted && (
                <BellOff className="h-3 w-3 text-muted-foreground/60 flex-shrink-0" />
              )}
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {unread > 0 && (
                <span
 className="min-w-[18px] h-[18px] px-1 rounded-full gradient-emerald text-white text-[10px] font-bold flex items-center justify-center premium-shadow animate-[fadeIn_0.3s_ease-out]"
 >
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
                {previewTime ? formatRelativeTime(previewTime) : ''}
              </span>
            </div>
          </div>
          <p
            className={`text-[11px] truncate mt-0.5 ${
              typingOthers.length > 0
                ? 'text-primary font-medium'
                : 'text-muted-foreground'
            }`}
          >
            {truncate(previewText, 48)}
          </p>
        </div>
      </div>
    </button>
  );
}

// =====================================================
// Reactions
// =====================================================

function QuickReactButton({ onReact }: { onReact: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground transition-colors"
        title="Add reaction"
      >
        <Plus className="h-3 w-3" />
      </button>
      {open && (
          <div
 className="absolute z-50 bottom-8 right-0 bg-card border border-border rounded-full shadow-lg p-1 flex items-center gap-0.5 animate-[fadeIn_0.3s_ease-out]"
 >
            {QUICK_REACT_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => {
                  onReact(e);
                  setOpen(false);
                }}
                className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-sm transition-transform hover:scale-125"
              >
                {e}
              </button>
            ))}
          </div>
        )}
</div>
  );
}

function MessageReactions({
  reactions,
  currentUserId,
  onReact,
}: {
  reactions: MessageReactionItem[];
  currentUserId: string;
  onReact: (emoji: string) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { count: number; mine: boolean; users: string[] }
    >();
    for (const r of reactions) {
      const entry = map.get(r.emoji) || { count: 0, mine: false, users: [] };
      entry.count += 1;
      if (r.userId === currentUserId) entry.mine = true;
      entry.users.push(r.user?.profile?.fullName || 'User');
      map.set(r.emoji, entry);
    }
    return Array.from(map.entries());
  }, [reactions, currentUserId]);

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {grouped.map(([emoji, info]) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className={`inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[11px] font-medium transition-all hover:scale-105 ${
            info.mine
              ? 'gradient-emerald text-white premium-shadow'
              : 'bg-muted text-foreground hover:bg-muted/70'
          }`}
          title={info.users.join(', ')}
        >
          <span>{emoji}</span>
          <span>{info.count}</span>
        </button>
      ))}
      <QuickReactButton onReact={onReact} />
    </div>
  );
}

// =====================================================
// Message bubble
// =====================================================

function MessageBubble({
  message,
  isOwn,
  isGroup,
  isGrouped,
  currentUserId,
  readState,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onCopy,
  canDelete,
}: {
  message: ChatMessageItem;
  isOwn: boolean;
  isGroup: boolean;
  isGrouped: boolean;
  currentUserId: string;
  readState?: ReadState;
  onReply: (m: ChatMessageItem) => void;
  onEdit: (m: ChatMessageItem) => void;
  onDelete: (m: ChatMessageItem) => void;
  onReact: (m: ChatMessageItem, emoji: string) => void;
  onCopy: (m: ChatMessageItem) => void;
  canDelete: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const senderName = message.user?.profile?.fullName || 'User';
  const hasAttachment = !!message.attachmentUrl;
  const isImage = message.attachmentType === 'image' && hasAttachment;

  const handleReact = (emoji: string) => onReact(message, emoji);

  return (
    <div
 className={`group relative flex ${
 isOwn ? 'justify-end' : 'justify-start'
 } ${isGrouped ? 'mt-0.5' : 'mt-3'} animate-[fadeIn_0.3s_ease-out]`}
 >
      <div
        className={`flex gap-2 max-w-[80%] md:max-w-[68%] ${
          isOwn ? 'flex-row-reverse' : ''
        }`}
      >
        {/* Avatar spacer (only for non-own) */}
        {!isOwn && (
          <div className="w-7 flex-shrink-0">
            {!isGrouped && (
              <UserAvatar
                userId={message.userId}
                name={senderName}
                photoUrl={message.user?.profile?.profilePhoto}
                size={28}
                rounded="rounded-full"
              />
            )}
          </div>
        )}

        <div
          className={`flex flex-col ${
            isOwn ? 'items-end' : 'items-start'
          } min-w-0`}
        >
          <div
            className={`relative rounded-2xl ${
              isOwn
                ? 'gradient-emerald text-white rounded-tr-sm premium-shadow'
                : 'bg-muted text-foreground rounded-tl-sm'
            } ${
              isGrouped ? (isOwn ? 'rounded-tr-2xl' : 'rounded-tl-2xl') : ''
            } ${message.flagged ? 'ring-2 ring-rose-400' : ''} px-3 py-2`}
          >
            {/* Sender name for group, non-own, non-grouped */}
            {!isOwn && !isGrouped && isGroup && (
              <p
                className={`text-[11px] font-semibold mb-0.5 ${getSenderColor(
                  message.userId
                )}`}
              >
                {senderName}
              </p>
            )}
            {/* Reply preview */}
            {message.replyTo && (
              <div
                className={`mb-1.5 pl-2 border-l-2 ${
                  isOwn ? 'border-white/50' : 'border-primary/60'
                }`}
              >
                <p
                  className={`text-[10px] font-semibold ${
                    isOwn ? 'text-white/85' : 'text-primary'
                  }`}
                >
                  {message.replyTo.userId === currentUserId
                    ? 'You'
                    : message.replyTo.user?.profile?.fullName || 'User'}
                </p>
                <p
                  className={`text-[11px] truncate max-w-[200px] ${
                    isOwn ? 'text-white/70' : 'text-muted-foreground'
                  }`}
                >
                  {truncate(message.replyTo.content, 60)}
                </p>
              </div>
            )}
            {/* Attachment */}
            {hasAttachment && (
              <div className="mb-1">
                {isImage ? (
                  <img
                    src={message.attachmentUrl}
                    alt={message.attachmentName || 'attachment'}
                    className="rounded-lg max-w-full max-h-60"
                  />
                ) : (
                  <a
                    href={message.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
                      isOwn
                        ? 'bg-white/15 hover:bg-white/25'
                        : 'bg-background hover:bg-background/70'
                    }`}
                  >
                    <Paperclip className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {message.attachmentName || 'Download'}
                    </span>
                  </a>
                )}
              </div>
            )}
            {/* Content */}
            {message.content && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}
            {/* Meta row */}
            <div
              className={`flex items-center justify-end gap-1 mt-0.5 ${
                isOwn ? '' : 'text-muted-foreground'
              }`}
            >
              {message.flagged && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-400 mr-1">
                  <Flag className="h-2.5 w-2.5" />
                  Flagged
                </span>
              )}
              {message.editedAt && (
                <span
                  className={`text-[10px] ${
                    isOwn ? 'text-white/60' : 'text-muted-foreground/70'
                  }`}
                >
                  edited
                </span>
              )}
              <span
                className={`text-[10px] ${
                  isOwn ? 'text-white/60' : 'text-muted-foreground/70'
                }`}
              >
                {formatMessageTime(message.createdAt)}
              </span>
              {isOwn &&
                (readState === 'read' ? (
                  <CheckCheck className="h-3 w-3 text-sky-200" />
                ) : readState === 'delivered' ? (
                  <CheckCheck className="h-3 w-3 text-white/60" />
                ) : (
                  <Check className="h-3 w-3 text-white/60" />
                ))}
            </div>

            {/* Hover action bar (desktop) */}
            <div
              className={`hidden md:flex absolute top-0 ${
                isOwn
                  ? 'left-0 -translate-x-full pr-1'
                  : 'right-0 translate-x-full pl-1'
              } opacity-0 group-hover:opacity-100 transition-opacity items-center`}
            >
              <div className="flex items-center gap-0.5 bg-card border border-border rounded-full shadow-md p-0.5">
                <button
                  onClick={() => onReact(message, '👍')}
                  className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center text-xs"
                  title="React"
                >
                  👍
                </button>
                <button
                  onClick={() => onReply(message)}
                  className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center"
                  title="Reply"
                >
                  <Reply className="h-3 w-3" />
                </button>
                {isOwn && (
                  <button
                    onClick={() => onEdit(message)}
                    className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center"
                    title="Edit"
                  >
                    <Edit className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={() => onCopy(message)}
                  className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center"
                  title="Copy"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center"
                      title="More"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isOwn ? 'start' : 'end'}>
                    <DropdownMenuItem onSelect={() => onReply(message)}>
                      <Reply className="h-3.5 w-3.5 mr-2" /> Reply
                    </DropdownMenuItem>
                    {isOwn && (
                      <DropdownMenuItem onSelect={() => onEdit(message)}>
                        <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => onCopy(message)}>
                      <Copy className="h-3.5 w-3.5 mr-2" /> Copy
                    </DropdownMenuItem>
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-rose-600"
                          onSelect={() => onDelete(message)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mobile action menu trigger */}
            <div className="md:hidden absolute -top-2 right-0">
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`w-5 h-5 rounded-full bg-card border border-border shadow-sm flex items-center justify-center ${
                      isOwn ? 'text-foreground' : 'text-foreground'
                    }`}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onReact(message, '👍')}>
                    <span className="mr-2">👍</span> React
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onReply(message)}>
                    <Reply className="h-3.5 w-3.5 mr-2" /> Reply
                  </DropdownMenuItem>
                  {isOwn && (
                    <DropdownMenuItem onSelect={() => onEdit(message)}>
                      <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => onCopy(message)}>
                    <Copy className="h-3.5 w-3.5 mr-2" /> Copy
                  </DropdownMenuItem>
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-rose-600"
                        onSelect={() => onDelete(message)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {/* Reactions */}
          <MessageReactions
            reactions={message.reactions || []}
            currentUserId={currentUserId}
            onReact={handleReact}
          />
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Typing indicator
// =====================================================

function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const label =
    names.length === 1
      ? `${names[0]} is typing…`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing…`
        : `${names[0]} and ${names.length - 1} others are typing…`;
  return (
    <div
 className="flex justify-start mt-2 px-9 animate-[fadeIn_0.3s_ease-out]"
 >
      <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
 key={i}
 className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
 />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">{label}</span>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Emoji picker (input toolbar)
// =====================================================

function EmojiPickerButton({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted"
        onClick={() => setOpen((o) => !o)}
      >
        <Smile className="h-4 w-4" />
      </Button>
      {open && (
          <div
 className="absolute bottom-10 left-0 z-50 bg-card border border-border rounded-xl shadow-lg p-2 grid grid-cols-8 gap-1 w-64 animate-[fadeIn_0.3s_ease-out]"
 >
            {EMOJI_PICKER_LIST.map((e) => (
              <button
                key={e}
                onClick={() => {
                  onPick(e);
                  setOpen(false);
                }}
                className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-base"
              >
                {e}
              </button>
            ))}
          </div>
        )}
</div>
  );
}

// =====================================================
// Group info panel
// =====================================================

function MemberRow({
  member,
  isSelf,
  canManage,
  onRemove,
  onLeave,
}: {
  member: ConversationMember;
  isSelf: boolean;
  canManage: boolean;
  onRemove: () => void;
  onLeave: () => void;
}) {
  const isOwner = member.role === 'owner';
  const canBeRemoved = canManage && !isSelf && !isOwner;
  return (
    <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30">
      <UserAvatar
        userId={member.userId}
        name={member.user.profile?.fullName}
        photoUrl={member.user.profile?.profilePhoto}
        size={32}
        rounded="rounded-full"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {member.user.profile?.fullName || member.user.email}
          {isSelf && (
            <span className="text-muted-foreground ml-1">(You)</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {member.user.email}
        </p>
      </div>
      <Badge
        variant={isOwner ? 'default' : 'secondary'}
        className="text-[10px] capitalize"
      >
        {isOwner ? 'Owner' : member.role === 'admin' ? 'Admin' : 'Member'}
      </Badge>
      {canBeRemoved && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-6 h-6 rounded hover:bg-muted flex items-center justify-center">
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-rose-600"
              onSelect={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {isSelf && !isOwner && (
        <button
          onClick={onLeave}
          className="text-xs text-rose-600 hover:underline ml-1"
        >
          Leave
        </button>
      )}
    </div>
  );
}

function GroupInfoPanel({
  conv,
  currentUserId,
  onClose,
  onUpdated,
  onDeleted,
  onAddMember,
  onRemoveMember,
  onLeave,
  onToggleMute,
  onTogglePin,
  variant = 'panel',
}: {
  conv: Conversation;
  currentUserId: string;
  onClose: () => void;
  onUpdated: (conv: Conversation) => void;
  onDeleted: () => void;
  onAddMember: (user: UserSearchResult) => void;
  onRemoveMember: (userId: string) => void;
  onLeave: () => void;
  onToggleMute: () => void;
  onTogglePin: () => void;
  variant?: 'panel' | 'dialog';
}) {
  const myMembership = conv.members?.find((m) => m.userId === currentUserId);
  const myRole = myMembership?.role;
  const canEdit = myRole === 'owner' || myRole === 'admin';
  const muted = !!myMembership?.muted;
  const pinned = !!(myMembership?.pinned || conv.pinned);

  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [titleValue, setTitleValue] = useState(conv.title || '');
  const [descValue, setDescValue] = useState(conv.description || '');
  const [showAddMember, setShowAddMember] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Local edit drafts are initialized from conv on mount (useState lazy init).
  // The parent uses key={conv.id} so the panel remounts on conversation change.

  const saveTitle = async () => {
    if (!titleValue.trim()) {
      toast.error('Title cannot be empty');
      return;
    }
    const res = await api.patch(`/conversations/${conv.id}`, {
      title: titleValue.trim(),
    });
    if (res.success) {
      onUpdated(res.data);
      setEditingTitle(false);
      toast.success('Group name updated');
    } else {
      toast.error(res.error || 'Failed to update');
    }
  };
  const saveDesc = async () => {
    const res = await api.patch(`/conversations/${conv.id}`, {
      description: descValue.trim(),
    });
    if (res.success) {
      onUpdated(res.data);
      setEditingDesc(false);
      toast.success('Description updated');
    } else {
      toast.error(res.error || 'Failed to update');
    }
  };
  const handleDelete = async () => {
    const res = await api.delete(`/conversations/${conv.id}`);
    if (res.success) {
      toast.success('Group deleted');
      onDeleted();
    } else {
      toast.error(res.error || 'Failed to delete group');
    }
  };

  const containerClass =
    variant === 'dialog'
      ? 'flex flex-col h-full bg-card'
      : 'flex flex-col h-full bg-card';

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between flex-shrink-0">
        <h3 className="font-semibold text-sm">Group Info</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {/* Avatar + title */}
          <div className="flex flex-col items-center text-center gap-2 pb-3 border-b border-border/30">
            <GroupAvatar
              seed={conv.id}
              title={conv.title}
              avatarUrl={conv.avatarUrl}
              size={80}
              rounded="rounded-2xl"
            />
            {editingTitle ? (
              <div className="flex items-center gap-1 w-full max-w-xs">
                <Input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  className="h-8 text-sm text-center"
                  autoFocus
                />
                <Button
                  size="sm"
                  className="gradient-emerald h-8 px-2"
                  onClick={saveTitle}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => {
                    setEditingTitle(false);
                    setTitleValue(conv.title || '');
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-base">
                  {conv.title || 'Untitled Group'}
                </h3>
                {canEdit && (
                  <button
                    onClick={() => setEditingTitle(true)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {conv.members?.length || 0} members
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Description
            </p>
            {editingDesc ? (
              <div className="space-y-2">
                <Textarea
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  rows={3}
                  className="bg-muted/50 resize-none"
                  autoFocus
                />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="gradient-emerald h-7"
                    onClick={saveDesc}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7"
                    onClick={() => {
                      setEditingDesc(false);
                      setDescValue(conv.description || '');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                  {conv.description ||
                    (canEdit ? 'Add a description…' : 'No description')}
                </p>
                {canEdit && (
                  <button
                    onClick={() => setEditingDesc(true)}
                    className="text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Members */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {conv.members?.length || 0} Members
              </p>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setShowAddMember(true)}
                >
                  <UserPlus className="h-3 w-3 mr-1" /> Add
                </Button>
              )}
            </div>
            <div className="space-y-1">
              {conv.members?.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  isSelf={m.userId === currentUserId}
                  canManage={canEdit}
                  onRemove={() => onRemoveMember(m.userId)}
                  onLeave={onLeave}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Settings */}
          <div className="space-y-1">
            <button
              onClick={onToggleMute}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50"
            >
              {muted ? (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Bell className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm">
                {muted ? 'Unmute notifications' : 'Mute notifications'}
              </span>
            </button>
            <button
              onClick={onTogglePin}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <Pin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {pinned ? 'Unpin conversation' : 'Pin conversation'}
                </span>
              </div>
              {pinned && (
                <Badge variant="secondary" className="text-[10px]">
                  Pinned
                </Badge>
              )}
            </button>
          </div>

          {/* Danger zone */}
          <div className="pt-2">
            {myRole === 'owner' ? (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full">
                      <Button
                        variant="outline"
                        className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete Group
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Owners can delete the group permanently
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button
                variant="outline"
                className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                onClick={onLeave}
              >
                Leave Group
              </Button>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Add member sub-dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <MemberPicker
              excludedIds={[
                currentUserId,
                ...(conv.members?.map((m) => m.userId) || []),
              ]}
              onSelect={(u) => {
                onAddMember(u);
                setShowAddMember(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete group?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All messages will be permanently
              lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================================
// Main ChatView component
// =====================================================

export function ChatView({ chatId }: { chatId?: string }) {
  const { user } = useAuthStore();
  const currentUserId = user?.id || '';

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<ActiveConv | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessageItem | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessageItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [showConvSearch, setShowConvSearch] = useState(false);
  const [convSearchQuery, setConvSearchQuery] = useState('');
  const [typingByConv, setTypingByConv] = useState<Record<string, string[]>>(
    {}
  );
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [readReceipts, setReadReceipts] = useState<Record<string, ReadState>>(
    {}
  );
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showListMobile, setShowListMobile] = useState(true);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showNewDirect, setShowNewDirect] = useState(false);
  const [sending, setSending] = useState(false);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const activeConvIdRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessageItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastTypingEmitRef = useRef<number>(0);
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Sync refs
  useEffect(() => {
    activeConvIdRef.current = activeConv?.id || null;
  }, [activeConv]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    const res = await api.get('/conversations');
    if (res.success) {
      setConversations(res.data as Conversation[]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Select a conversation
  const selectConversation = useCallback(
    async (conv: Conversation) => {
      // Leave previous room
      if (
        activeConvIdRef.current &&
        activeConvIdRef.current !== conv.id
      ) {
        socketRef.current?.emit('leave-conversation', {
          conversationId: activeConvIdRef.current,
        });
      }
      setActiveConv(conv as ActiveConv);
      setMessages([]);
      setReplyTo(null);
      setEditingMsg(null);
      setInput('');
      setReadReceipts({});
      setShowConvSearch(false);
      setConvSearchQuery('');
      setShowInfoPanel(false);
      setShowListMobile(false);
      // Join new room
      socketRef.current?.emit('join-conversation', {
        conversationId: conv.id,
      });
      // Fetch full details
      try {
        const res = await api.get(`/conversations/${conv.id}`);
        if (res.success) {
          setActiveConv(res.data as ActiveConv);
          setMessages(res.data.messages || []);
          // Mark read
          api.post(`/conversations/${conv.id}/read`);
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conv.id ? { ...c, unreadCount: 0 } : c
            )
          );
        }
      } catch {
        toast.error('Failed to load conversation');
      }
    },
    []
  );

  // Deep-link via chatId prop
  useEffect(() => {
    if (chatId && conversations.length > 0 && !activeConv) {
      const conv = conversations.find((c) => c.id === chatId);
      if (conv) selectConversation(conv);
    }
  }, [chatId, conversations, activeConv, selectConversation]);

  // Typing emit helpers
  const emitTyping = useCallback(() => {
    if (!activeConvIdRef.current || !currentUserId) return;
    const now = Date.now();
    if (now - lastTypingEmitRef.current > 2000) {
      socketRef.current?.emit('conversation-typing', {
        conversationId: activeConvIdRef.current,
        userId: currentUserId,
      });
      lastTypingEmitRef.current = now;
    }
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
    }
    typingStopTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('conversation-stop-typing', {
        conversationId: activeConvIdRef.current,
        userId: currentUserId,
      });
      lastTypingEmitRef.current = 0;
    }, 2000);
  }, [currentUserId]);

  const emitStopTyping = useCallback(() => {
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }
    if (activeConvIdRef.current && currentUserId) {
      socketRef.current?.emit('conversation-stop-typing', {
        conversationId: activeConvIdRef.current,
        userId: currentUserId,
      });
    }
    lastTypingEmitRef.current = 0;
  }, [currentUserId]);

  // Send message
  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || !activeConv || sending) return;
    setSending(true);
    setInput('');
    const replyToId = replyTo?.id;
    setReplyTo(null);
    emitStopTyping();
    try {
      const res = await api.post(`/conversations/${activeConv.id}/messages`, {
        content,
        replyToId,
      });
      if (res.success) {
        const msg: ChatMessageItem = res.data;
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
        setReadReceipts((prev) => ({ ...prev, [msg.id]: 'sent' }));
        // Simulated delivered after 1.5s
        setTimeout(() => {
          setReadReceipts((prev) =>
            prev[msg.id] === 'read'
              ? prev
              : { ...prev, [msg.id]: 'delivered' }
          );
        }, 1500);
        // Emit socket event
        socketRef.current?.emit('conversation-message', {
          conversationId: activeConv.id,
          message: msg,
        });
      } else {
        toast.error(res.error || 'Failed to send message');
        setInput(content);
        if (replyToId) {
          const r = messagesRef.current.find((m) => m.id === replyToId);
          if (r) setReplyTo(r);
        }
      }
    } finally {
      setSending(false);
    }
  }, [input, activeConv, sending, replyTo, emitStopTyping]);

  // Save edit
  const handleSaveEdit = useCallback(async () => {
    const content = input.trim();
    if (!editingMsg || !activeConv || !content) return;
    try {
      const res = await api.patch(
        `/conversations/${activeConv.id}/messages/${editingMsg.id}`,
        { content }
      );
      if (res.success) {
        const updated: ChatMessageItem = res.data;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingMsg.id
              ? {
                  ...m,
                  content: updated.content,
                  editedAt: updated.editedAt,
                }
              : m
          )
        );
        socketRef.current?.emit('conversation-edit-message', {
          conversationId: activeConv.id,
          messageId: editingMsg.id,
          content: updated.content,
          editedAt: updated.editedAt,
        });
        setEditingMsg(null);
        setInput('');
      } else {
        toast.error(res.error || 'Failed to edit message');
      }
    } catch {
      toast.error('Failed to edit message');
    }
  }, [input, editingMsg, activeConv]);

  // Delete message
  const handleDelete = useCallback(
    async (m: ChatMessageItem) => {
      if (!activeConv) return;
      try {
        const res = await api.delete(
          `/conversations/${activeConv.id}/messages/${m.id}`
        );
        if (res.success) {
          setMessages((prev) => prev.filter((x) => x.id !== m.id));
          socketRef.current?.emit('conversation-delete-message', {
            conversationId: activeConv.id,
            messageId: m.id,
          });
          toast.success('Message deleted');
        } else {
          toast.error(res.error || 'Failed to delete message');
        }
      } catch {
        toast.error('Failed to delete message');
      }
    },
    [activeConv]
  );

  // React
  const handleReact = useCallback(
    async (m: ChatMessageItem, emoji: string) => {
      if (!activeConv) return;
      try {
        const res = await api.post(
          `/conversations/${activeConv.id}/messages/${m.id}/reactions`,
          { emoji }
        );
        if (res.success) {
          const reactions: MessageReactionItem[] = res.data;
          setMessages((prev) =>
            prev.map((x) =>
              x.id === m.id ? { ...x, reactions } : x
            )
          );
          socketRef.current?.emit('conversation-reaction', {
            conversationId: activeConv.id,
            messageId: m.id,
            emoji,
            userId: currentUserId,
            reactions,
          });
        }
      } catch {
        toast.error('Failed to react');
      }
    },
    [activeConv, currentUserId]
  );

  // Reply
  const handleReply = useCallback((m: ChatMessageItem) => {
    setReplyTo(m);
    setEditingMsg(null);
  }, []);

  // Edit
  const handleEdit = useCallback((m: ChatMessageItem) => {
    setEditingMsg(m);
    setReplyTo(null);
    setInput(m.content);
  }, []);

  // Copy
  const handleCopy = useCallback((m: ChatMessageItem) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(m.content || '').then(
        () => toast.success('Copied to clipboard'),
        () => toast.error('Failed to copy')
      );
    }
  }, []);

  // Cancel reply / edit
  const cancelReply = useCallback(() => setReplyTo(null), []);
  const cancelEdit = useCallback(() => {
    setEditingMsg(null);
    setInput('');
  }, []);

  // Input change with typing emit
  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);
      if (editingMsg) return;
      if (value.trim()) {
        emitTyping();
      } else {
        emitStopTyping();
      }
    },
    [editingMsg, emitTyping, emitStopTyping]
  );

  // Insert emoji
  const handleEmojiPick = useCallback((emoji: string) => {
    setInput((prev) => prev + emoji);
  }, []);

  // New conversation created
  const handleNewConvCreated = useCallback(
    (conv: Conversation) => {
      fetchConversations();
      selectConversation(conv);
    },
    [fetchConversations, selectConversation]
  );

  // Group info panel actions
  const handleAddMember = useCallback(
    async (u: UserSearchResult) => {
      if (!activeConv) return;
      try {
        const res = await api.post(`/conversations/${activeConv.id}/members`, {
          userIds: [u.id],
        });
        if (res.success) {
          toast.success(`${u.profile?.fullName || u.email} added`);
          // Refetch conversation details
          const detail = await api.get(`/conversations/${activeConv.id}`);
          if (detail.success) {
            setActiveConv(detail.data as ActiveConv);
          }
          fetchConversations();
        } else {
          toast.error(res.error || 'Failed to add member');
        }
      } catch {
        toast.error('Failed to add member');
      }
    },
    [activeConv, fetchConversations]
  );

  const handleRemoveMember = useCallback(
    async (userId: string) => {
      if (!activeConv) return;
      try {
        const res = await api.delete(
          `/conversations/${activeConv.id}/members/${userId}`
        );
        if (res.success) {
          toast.success('Member removed');
          const detail = await api.get(`/conversations/${activeConv.id}`);
          if (detail.success) {
            setActiveConv(detail.data as ActiveConv);
          }
          fetchConversations();
        } else {
          toast.error(res.error || 'Failed to remove member');
        }
      } catch {
        toast.error('Failed to remove member');
      }
    },
    [activeConv, fetchConversations]
  );

  const handleLeave = useCallback(async () => {
    if (!activeConv) return;
    try {
      const res = await api.delete(
        `/conversations/${activeConv.id}/members/${currentUserId}`
      );
      if (res.success) {
        toast.success('You left the group');
        socketRef.current?.emit('leave-conversation', {
          conversationId: activeConv.id,
        });
        setActiveConv(null);
        setMessages([]);
        setShowInfoPanel(false);
        setShowListMobile(true);
        fetchConversations();
      } else {
        toast.error(res.error || 'Failed to leave group');
      }
    } catch {
      toast.error('Failed to leave group');
    }
  }, [activeConv, currentUserId, fetchConversations]);

  const handleDeleteGroup = useCallback(() => {
    socketRef.current?.emit('leave-conversation', {
      conversationId: activeConv?.id,
    });
    setActiveConv(null);
    setMessages([]);
    setShowInfoPanel(false);
    setShowListMobile(true);
    fetchConversations();
  }, [activeConv, fetchConversations]);

  const handleToggleMute = useCallback(() => {
    if (!activeConv) return;
    const myMembership = activeConv.members?.find(
      (m) => m.userId === currentUserId
    );
    const newMuted = !myMembership?.muted;
    setActiveConv((prev) =>
      prev
        ? {
            ...prev,
            members: prev.members?.map((m) =>
              m.userId === currentUserId ? { ...m, muted: newMuted } : m
            ),
          }
        : prev
    );
    toast.success(newMuted ? 'Notifications muted' : 'Notifications unmuted');
  }, [activeConv, currentUserId]);

  const handleTogglePin = useCallback(() => {
    if (!activeConv) return;
    const myMembership = activeConv.members?.find(
      (m) => m.userId === currentUserId
    );
    const newPinned = !myMembership?.pinned;
    setActiveConv((prev) =>
      prev ? { ...prev, pinned: newPinned } : prev
    );
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConv.id
          ? {
              ...c,
              pinned: newPinned,
              members: c.members?.map((m) =>
                m.userId === currentUserId
                  ? { ...m, pinned: newPinned }
                  : m
              ),
            }
          : c
      )
    );
    toast.success(newPinned ? 'Conversation pinned' : 'Conversation unpinned');
  }, [activeConv, currentUserId]);

  // Back button (mobile)
  const handleBack = useCallback(() => {
    if (activeConvIdRef.current) {
      socketRef.current?.emit('leave-conversation', {
        conversationId: activeConvIdRef.current,
      });
    }
    setActiveConv(null);
    setMessages([]);
    setShowListMobile(true);
    setShowInfoPanel(false);
    fetchConversations();
  }, [fetchConversations]);

  // Socket setup (single effect, on mount / when user becomes available)
  useEffect(() => {
    if (!currentUserId) return;
    const sock = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
    });
    socketRef.current = sock;

    sock.on('connect', () => {
      sock.emit('user-identity', { userId: currentUserId });
      sock.emit('user-presence', {
        userId: currentUserId,
        status: 'online',
      });
    });

    sock.on(
      'user-presence',
      (data: { userId: string; status: 'online' | 'offline' }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          if (data.status === 'online') next.add(data.userId);
          else next.delete(data.userId);
          return next;
        });
      }
    );

    sock.on(
      'conversation-message',
      (data: { conversationId: string; message: ChatMessageItem }) => {
        const { conversationId, message } = data;
        const isActive = activeConvIdRef.current === conversationId;
        const isMine = message.userId === currentUserId;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== conversationId) return c;
            return {
              ...c,
              messages: [message],
              updatedAt: message.createdAt,
              unreadCount:
                isMine || isActive ? 0 : (c.unreadCount || 0) + 1,
            };
          })
        );
        if (isActive) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) {
              return prev.map((m) =>
                m.id === message.id ? { ...m, ...message } : m
              );
            }
            return [...prev, message];
          });
          if (!isMine) {
            api.post(`/conversations/${conversationId}/read`);
          }
        }
      }
    );

    sock.on(
      'conversation-edit-message',
      (data: {
        conversationId: string;
        messageId: string;
        content: string;
        editedAt: string;
      }) => {
        if (activeConvIdRef.current === data.conversationId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.messageId
                ? {
                    ...m,
                    content: data.content,
                    editedAt: data.editedAt,
                  }
                : m
            )
          );
        }
      }
    );

    sock.on(
      'conversation-delete-message',
      (data: { conversationId: string; messageId: string }) => {
        if (activeConvIdRef.current === data.conversationId) {
          setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
        }
      }
    );

    sock.on(
      'conversation-reaction',
      (data: {
        conversationId: string;
        messageId: string;
        reactions: MessageReactionItem[];
      }) => {
        if (activeConvIdRef.current === data.conversationId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.messageId
                ? { ...m, reactions: data.reactions }
                : m
            )
          );
        }
      }
    );

    sock.on(
      'conversation-typing',
      (data: { conversationId: string; userId: string }) => {
        if (data.userId === currentUserId) return;
        setTypingByConv((prev) => {
          const curr = prev[data.conversationId] || [];
          if (curr.includes(data.userId)) return prev;
          return { ...prev, [data.conversationId]: [...curr, data.userId] };
        });
      }
    );

    sock.on(
      'conversation-stop-typing',
      (data: { conversationId: string; userId: string }) => {
        setTypingByConv((prev) => {
          const curr = prev[data.conversationId] || [];
          const next = curr.filter((u) => u !== data.userId);
          return { ...prev, [data.conversationId]: next };
        });
      }
    );

    sock.on(
      'conversation-read',
      (data: { conversationId: string; userId: string }) => {
        if (data.userId === currentUserId) return;
        if (activeConvIdRef.current === data.conversationId) {
          setReadReceipts((prev) => {
            const next = { ...prev };
            for (const m of messagesRef.current) {
              if (m.userId === currentUserId && next[m.id] !== 'read') {
                next[m.id] = 'read';
              }
            }
            return next;
          });
        }
      }
    );

    return () => {
      sock.emit('user-presence', {
        userId: currentUserId,
        status: 'offline',
      });
      sock.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ESC to cancel edit/reply
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingMsg) {
          cancelEdit();
        } else if (replyTo) {
          cancelReply();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingMsg, replyTo, cancelEdit, cancelReply]);

  // Filtered + sorted conversations
  const sortedConversations = useMemo(() => {
    let list = conversations;
    if (filterTab === 'groups') {
      list = list.filter((c) => c.type === 'group' || c.type === 'channel');
    } else if (filterTab === 'direct') {
      list = list.filter((c) => c.type === 'direct');
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => {
        if (c.title?.toLowerCase().includes(q)) return true;
        return c.members?.some((m) =>
          (m.user.profile?.fullName || '').toLowerCase().includes(q)
        );
      });
    }
    // Pinned-first, then updatedAt desc
    return [...list].sort((a, b) => {
      const aP = a.pinned ? 1 : 0;
      const bP = b.pinned ? 1 : 0;
      if (aP !== bP) return bP - aP;
      return (
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });
  }, [conversations, filterTab, searchQuery]);

  // Filtered messages (in-chat search)
  const visibleMessages = useMemo(() => {
    if (!showConvSearch || !convSearchQuery.trim()) return messages;
    const q = convSearchQuery.toLowerCase();
    return messages.filter((m) => m.content.toLowerCase().includes(q));
  }, [messages, showConvSearch, convSearchQuery]);

  // Active conversation derived state
  const isGroup =
    activeConv?.type === 'group' || activeConv?.type === 'channel';
  const activeOtherUser =
    activeConv?.type === 'direct'
      ? activeConv.members?.find((m) => m.userId !== currentUserId)
      : undefined;
  const activeOtherUserId = activeOtherUser?.userId;
  const isOtherOnline = activeOtherUserId
    ? onlineUsers.has(activeOtherUserId)
    : false;
  const activeTypingUsers = (
    activeConv ? typingByConv[activeConv.id] || [] : []
  ).filter((u) => u !== currentUserId);
  const activeTypingNames = activeTypingUsers.map((uid) => {
    const m = activeConv?.members?.find((mm) => mm.userId === uid);
    return m?.user.profile?.fullName || 'User';
  });

  const activeTitle = isGroup
    ? activeConv?.title || 'Untitled Group'
    : activeOtherUser?.user.profile?.fullName ||
      activeOtherUser?.user.email ||
      'Direct Message';

  const activeSubtitle = isGroup
    ? activeTypingNames.length > 0
      ? activeTypingNames.length === 1
        ? `${activeTypingNames[0]} is typing…`
        : `${activeTypingNames.length} typing…`
      : `${activeConv?.members?.length || 0} members`
    : activeTypingNames.length > 0
      ? 'typing…'
      : isOtherOnline
        ? 'online'
        : 'last seen recently';

  const myRole =
    activeConv?.members?.find((m) => m.userId === currentUserId)?.role ||
    activeConv?.myRole;
  const canDeleteAny = myRole === 'owner' || myRole === 'admin';

  const activeOtherPhoto = activeOtherUser?.user.profile?.profilePhoto;

  // Render
  return (
    <div className="h-[calc(100vh-3.5rem)] max-w-7xl mx-auto view-enter flex">
      {/* Left pane — conversation list */}
      <div
        className={`${
          showListMobile ? 'flex' : 'hidden'
        } md:flex w-full md:w-80 lg:w-96 flex-shrink-0 flex-col min-h-0 border-r border-border/40`}
      >
        <ConversationList
          conversations={sortedConversations}
          activeConvId={activeConv?.id}
          onSelect={selectConversation}
          onlineUsers={onlineUsers}
          typingByConv={typingByConv}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterTab={filterTab}
          onFilterChange={setFilterTab}
          onNewGroup={() => setShowNewGroup(true)}
          onNewDirect={() => setShowNewDirect(true)}
          currentUserId={currentUserId}
        />
      </div>

      {/* Middle pane — active conversation or empty */}
      <div
        className={`${
          showListMobile ? 'hidden' : 'flex'
        } md:flex flex-1 flex-col min-w-0 min-h-0 bg-background`}
      >
        {activeConv ? (
          <>
            {/* Header bar */}
            <div className="px-3 py-2.5 border-b border-border/40 bg-card/80 backdrop-blur-md flex items-center justify-between flex-shrink-0 gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden flex-shrink-0 h-8 w-8 rounded-lg"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <button
                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                  onClick={() => isGroup && setShowInfoPanel(true)}
                >
                  <div className="relative flex-shrink-0">
                    {isGroup ? (
                      <GroupAvatar
                        seed={activeConv.id}
                        title={activeTitle}
                        avatarUrl={activeConv.avatarUrl}
                        size={40}
                        rounded="rounded-full"
                      />
                    ) : (
                      <UserAvatar
                        userId={activeOtherUserId || activeConv.id}
                        name={activeTitle}
                        photoUrl={activeOtherPhoto}
                        size={40}
                        rounded="rounded-full"
                      />
                    )}
                    {isOtherOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {activeTitle}
                    </h3>
                    <p
                      className={`text-[11px] truncate ${
                        activeTypingNames.length > 0
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {activeSubtitle}
                    </p>
                  </div>
                </button>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-primary/10"
                  onClick={() => setShowConvSearch((s) => !s)}
                  title="Search in chat"
                >
                  <Search className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-primary/10"
                  onClick={() => toast.info('Calls coming soon')}
                  title="Call"
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-primary/10"
                  onClick={() => toast.info('Calls coming soon')}
                  title="Video call"
                >
                  <Video className="h-4 w-4" />
                </Button>
                {isGroup && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-primary/10"
                    onClick={() => setShowInfoPanel(true)}
                    title="Group info"
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* In-chat search bar */}
            {showConvSearch && (
                <div
 className="border-b border-border/40 bg-card overflow-hidden animate-[fadeIn_0.3s_ease-out]"
 >
                  <div className="p-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                    <Input
                      placeholder="Search messages…"
                      value={convSearchQuery}
                      onChange={(e) => setConvSearchQuery(e.target.value)}
                      className="h-8 text-sm pl-8 bg-muted/50 border-border/40 rounded-lg"
                      autoFocus
                    />
                  </div>
                </div>
              )}
{/* Messages area */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-3 md:p-4 min-h-full">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[40vh]">
                    <EmptyState
                      icon={MessageSquare}
                      title="No messages yet"
                      subtitle="Say hello to start the conversation."
                      size="sm"
                    />
                  </div>
                ) : (
                  <div className="space-y-0">
                    {visibleMessages.map((msg, idx) => {
                      const isOwn = msg.userId === currentUserId;
                      const grouped = isGroupedWithPrev(messages, idx);
                      const showDateSep = shouldShowDateSeparator(
                        messages,
                        idx
                      );
                      // If searching, never group and never show date sep
                      const effectiveGrouped = showConvSearch
                        ? false
                        : grouped;
                      const effectiveShowDate = showConvSearch
                        ? false
                        : showDateSep;
                      const canDelete = isOwn || canDeleteAny;
                      return (
                        <div key={msg.id}>
                          {effectiveShowDate && (
                            <div
 className="flex items-center justify-center my-4 animate-[fadeIn_0.3s_ease-out]"
 >
                              <div className="bg-muted/60 text-muted-foreground text-[10px] font-medium px-3 py-1 rounded-full">
                                {formatDateSeparator(msg.createdAt)}
                              </div>
                            </div>
                          )}
                          <MessageBubble
                            message={msg}
                            isOwn={isOwn}
                            isGroup={!!isGroup}
                            isGrouped={effectiveGrouped}
                            currentUserId={currentUserId}
                            readState={readReceipts[msg.id]}
                            onReply={handleReply}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onReact={handleReact}
                            onCopy={handleCopy}
                            canDelete={canDelete}
                          />
                        </div>
                      );
                    })}
                    {/* Typing indicator */}
                    {activeTypingNames.length > 0 && !showConvSearch && (
                        <TypingIndicator names={activeTypingNames} />
                      )}
<div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Reply / edit bar */}
            {(replyTo || editingMsg) && (
                <div
 className="border-t border-border/40 bg-card overflow-hidden animate-[fadeIn_0.3s_ease-out]"
 >
                  <div className="px-3 py-2 flex items-center gap-2 border-l-4 border-primary">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-primary">
                        {editingMsg
                          ? 'Editing message'
                          : `Replying to ${
                              replyTo?.userId === currentUserId
                                ? 'yourself'
                                : replyTo?.user?.profile?.fullName || 'User'
                            }`}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {truncate(
                          (editingMsg || replyTo)?.content || '',
                          80
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() =>
                        editingMsg ? cancelEdit() : cancelReply()
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
{/* Input area */}
            <div className="p-2.5 border-t border-border/40 bg-card flex-shrink-0">
              <div className="flex items-end gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted flex-shrink-0"
                  onClick={() => toast.info('File attachments coming soon')}
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <EmojiPickerButton onPick={handleEmojiPick} />
                <div className="flex-1 min-w-0 relative">
                  <Textarea
                    placeholder={
                      editingMsg ? 'Edit your message…' : 'Type a message…'
                    }
                    value={input}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Enter' &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        if (editingMsg) handleSaveEdit();
                        else handleSend();
                      }
                    }}
                    rows={1}
                    className="resize-none min-h-[36px] max-h-32 bg-muted/50 border-border/50 focus:border-primary rounded-xl py-2 px-3 text-sm"
                  />
                </div>
                {editingMsg ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-lg"
                      onClick={cancelEdit}
                      title="Cancel edit"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="active:scale-[0.92] transition-transform">
                      <Button
                        className="gradient-emerald hover:opacity-90 h-9 w-9 rounded-lg premium-shadow transition-all disabled:opacity-50"
                        onClick={handleSaveEdit}
                        disabled={!input.trim()}
                        title="Save edit"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="active:scale-[0.92] transition-transform">
                    <Button
                      className="gradient-emerald hover:opacity-90 h-9 w-9 rounded-lg premium-shadow transition-all disabled:opacity-50"
                      onClick={handleSend}
                      disabled={!input.trim() || sending}
                      title="Send"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={MessageSquare}
              title="Select a conversation"
              subtitle="Choose a chat from the list to start messaging."
            />
          </div>
        )}
      </div>

      {/* Right pane — group info panel (desktop) */}
      {isGroup && activeConv && (
        showInfoPanel && (
            <div
 className="hidden md:flex w-80 lg:w-96 flex-shrink-0 border-l border-border/40 flex-col min-h-0 overflow-hidden transition-[width] duration-700" style={{ width: 'auto' }}
 >
              <GroupInfoPanel
                key={`panel-${activeConv.id}`}
                conv={activeConv}
                currentUserId={currentUserId}
                onClose={() => setShowInfoPanel(false)}
                onUpdated={(c) => {
                  setActiveConv((prev) =>
                    prev
                      ? {
                          ...prev,
                          title: c.title,
                          description: c.description,
                          avatarUrl: c.avatarUrl,
                          members: c.members,
                        }
                      : prev
                  );
                  fetchConversations();
                }}
                onDeleted={handleDeleteGroup}
                onAddMember={handleAddMember}
                onRemoveMember={handleRemoveMember}
                onLeave={handleLeave}
                onToggleMute={handleToggleMute}
                onTogglePin={handleTogglePin}
                variant="panel"
              />
            </div>
          )
      )}

      {/* Mobile info panel as dialog */}
      {isGroup && activeConv && (
        <Dialog open={showInfoPanel} onOpenChange={setShowInfoPanel}>
          <DialogContent className="sm:max-w-md h-[85vh] p-0 overflow-hidden md:hidden">
            <GroupInfoPanel
              key={`dialog-${activeConv.id}`}
              conv={activeConv}
              currentUserId={currentUserId}
              onClose={() => setShowInfoPanel(false)}
              onUpdated={(c) => {
                setActiveConv((prev) =>
                  prev
                    ? {
                        ...prev,
                        title: c.title,
                        description: c.description,
                        avatarUrl: c.avatarUrl,
                        members: c.members,
                      }
                    : prev
                );
                fetchConversations();
              }}
              onDeleted={handleDeleteGroup}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
              onLeave={handleLeave}
              onToggleMute={handleToggleMute}
              onTogglePin={handleTogglePin}
              variant="dialog"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* New group dialog */}
      <NewGroupDialog
        open={showNewGroup}
        onOpenChange={setShowNewGroup}
        onCreated={handleNewConvCreated}
        currentUserId={currentUserId}
      />
      {/* New direct dialog */}
      <NewDirectDialog
        open={showNewDirect}
        onOpenChange={setShowNewDirect}
        onCreated={handleNewConvCreated}
        currentUserId={currentUserId}
      />
    </div>
  );
}
