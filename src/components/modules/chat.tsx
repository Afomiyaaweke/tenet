'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore, useNavStore, useDataStore } from '@/store';
import { api, Chat, Message } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { MessageSquare, ArrowLeft, Hash, ArrowUp, Search, Circle, Phone, Video, MoreVertical, Check, CheckCheck } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

function getChatTitle(chat: Chat): string {
  if (chat.contextType === 'project' && chat.project?.tender?.title) {
    return chat.project.tender.title;
  }
  if (chat.contextType === 'tender') {
    return 'Tender Discussion';
  }
  return `${chat.contextType === 'project' ? 'Project' : 'Tender'} Chat`;
}

function getChatSubtitle(chat: Chat): string {
  if (chat.project?.bid?.user?.profile?.fullName) {
    return chat.project.bid.user.profile.fullName;
  }
  if (chat.project?.bid?.user?.profile?.companyName) {
    return chat.project.bid.user.profile.companyName;
  }
  return `${chat._count?.messages || 0} messages`;
}

function getUserInitial(name: string): string {
  return name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
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
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatDateSeparator(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffDay === 0) return 'Today';
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return date.toLocaleDateString([], { weekday: 'long' });
  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

function shouldShowDateSeparator(messages: Message[], index: number): boolean {
  if (index === 0) return true;
  const prevDate = new Date(messages[index - 1].createdAt).toDateString();
  const currDate = new Date(messages[index].createdAt).toDateString();
  return prevDate !== currDate;
}

const GRADIENT_OPTIONS = [
  'gradient-emerald',
  'gradient-teal',
  'gradient-amber',
  'gradient-rose',
];

function getAvatarGradient(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENT_OPTIONS[Math.abs(hash) % GRADIENT_OPTIONS.length];
}

const msgVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: (isOwn: boolean) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 30, delay: 0.03 },
  }),
};

const chatItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.25, ease: 'easeOut' },
  }),
};

export function ChatView({ chatId }: { chatId?: string }) {
  const { user } = useAuthStore();
  const { setView } = useNavStore();
  const { chats, fetchChats } = useDataStore();
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [flaggedMessages, setFlaggedMessages] = useState<Set<string>>(new Set());
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChats();
    // Connect to WebSocket
    const newSocket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
    });
    newSocket.on('connect', () => console.log('Chat WS connected'));
    newSocket.on('message-received', (msg: Message & { user?: { profile?: { fullName: string } } }) => {
      setMessages(prev => [...prev, msg]);
    });
    newSocket.on('message-flagged', (data: { chatId: string; messageId: string; content: string }) => {
      setFlaggedMessages(prev => new Set(prev).add(data.messageId));
      toast.warning('Message flagged for review', { description: 'Potentially suspicious content detected' });
    });
    newSocket.on('typing', (data: { userId: string }) => {
      if (data.userId !== user?.id) setTypingUsers(prev => [...prev.filter(u => u !== data.userId), data.userId]);
    });
    newSocket.on('stop-typing', (data: { userId: string }) => {
      setTypingUsers(prev => prev.filter(u => u !== data.userId));
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(newSocket);

    return () => { newSocket.disconnect(); };
  }, []);

  const selectChat = useCallback(async (chat: Chat) => {
    setActiveChat(chat);
    setShowSidebar(false);
    socket?.emit('join-chat', { chatId: chat.id });
    const res = await api.get(`/chats/${chat.id}/messages`);
    if (res.success) setMessages(res.data);
  }, [socket]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (chatId && chats.length > 0) {
      const chat = chats.find(c => c.id === chatId);
      if (chat) selectChat(chat);
    }
  }, [chatId, chats, selectChat]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSend = async () => {
    if (!newMessage.trim() || !activeChat) return;
    const content = newMessage.trim();
    setNewMessage('');

    // Send via API for persistence
    await api.post(`/chats/${activeChat.id}/messages`, { content });

    // Send via WebSocket for real-time
    socket?.emit('send-message', { chatId: activeChat.id, userId: user?.id, content });
    socket?.emit('stop-typing', { chatId: activeChat.id, userId: user?.id });
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    if (activeChat) {
      socket?.emit('typing', { chatId: activeChat.id, userId: user?.id });
      // Auto stop typing after 2s
      setTimeout(() => socket?.emit('stop-typing', { chatId: activeChat.id, userId: user?.id }), 2000);
    }
  };

  const handleBack = () => {
    setActiveChat(null);
    setShowSidebar(true);
    setMessages([]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredChats = searchQuery
    ? chats.filter(c => getChatTitle(c).toLowerCase().includes(searchQuery.toLowerCase()))
    : chats;

  // Compute unread counts per chat
  const getUnreadCount = (chat: Chat): number => {
    if (activeChat?.id === chat.id) return 0;
    const total = chat._count?.messages || 0;
    return total > 2 ? Math.min(total, 9) : 0; // Simulated: show count if many messages
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex max-w-5xl mx-auto view-enter">
      {/* ── Premium Chat List Sidebar ── */}
      <div className={`${activeChat && !showSidebar ? 'hidden' : 'flex'} md:flex w-full md:w-80 flex-shrink-0 flex-col bg-white border-r border-border/40`}>
        {/* Sidebar Header */}
        <div className="px-4 py-3.5 border-b border-border/40">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-emerald">
                <MessageSquare className="h-3.5 w-3.5 text-white" />
              </div>
              Conversations
            </h3>
            {chats.length > 0 && (
              <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-0">
                {chats.length}
              </Badge>
            )}
          </div>
          {chats.length > 3 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 text-xs pl-8 bg-gray-50/80 border-border/40 rounded-lg focus:border-emerald-300"
              />
            </div>
          )}
        </div>

        {/* Chat Items */}
        <ScrollArea className="flex-1">
          {chats.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl gradient-emerald flex items-center justify-center mx-auto mb-3 premium-shadow">
                <MessageSquare className="h-7 w-7 text-white" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No conversations yet</p>
              <p className="text-xs text-muted-foreground">Start a chat from a tender or project</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredChats.map((chat, i) => {
                const title = getChatTitle(chat);
                const subtitle = getChatSubtitle(chat);
                const lastMsg = chat.messages?.[0];
                const isActive = activeChat?.id === chat.id;
                const unreadCount = getUnreadCount(chat);
                const lastTime = lastMsg?.createdAt || chat.createdAt;
                return (
                  <motion.button key={chat.id}
                    custom={i}
                    variants={chatItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    layout
                    onClick={() => selectChat(chat)}
                    className={`w-full p-3.5 text-left transition-colors duration-150 border-b border-border/20 group relative ${
                      isActive
                        ? 'bg-emerald-50/70'
                        : 'hover:bg-gray-50/80'
                    }`}>
                    {/* Active indicator bar */}
                    {isActive && (
                      <motion.div
                        layoutId="activeChatBar"
                        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-emerald-500"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-semibold ${getAvatarGradient(chat.id)} premium-shadow`}>
                          {chat.contextType === 'project' ? 'P' : 'T'}
                        </div>
                        {/* Online indicator dot */}
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate flex-1 ${isActive ? 'font-semibold text-emerald-800' : unreadCount > 0 ? 'font-semibold' : 'font-medium'}`}>
                            {title}
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[10px] text-muted-foreground/60">{formatRelativeTime(lastTime)}</span>
                            {unreadCount > 0 && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="min-w-[18px] h-[18px] rounded-full gradient-emerald text-white text-[10px] font-bold flex items-center justify-center premium-shadow"
                              >
                                {unreadCount}
                              </motion.span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-[11px] text-muted-foreground truncate flex-1">{lastMsg?.content || subtitle}</p>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize border-emerald-200/60 text-emerald-600 ml-2 flex-shrink-0">
                            {chat.contextType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          )}
        </ScrollArea>
      </div>

      {/* ── Chat Area ── */}
      <div className={`${!activeChat && showSidebar ? 'hidden' : 'flex'} md:flex flex-1 flex-col min-w-0`}>
        {activeChat ? (
          <>
            {/* ── Premium Chat Header ── */}
            <div className="px-4 py-3 border-b border-border/40 bg-white/80 backdrop-blur-md flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <Button variant="ghost" size="icon" className="md:hidden flex-shrink-0 h-8 w-8 rounded-lg"
                  onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="relative flex-shrink-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-semibold ${getAvatarGradient(activeChat.id)} premium-shadow`}>
                    {activeChat.contextType === 'project' ? 'P' : 'T'}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate">{getChatTitle(activeChat)}</h3>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {activeChat.contextType === 'project' ? 'Project Discussion' : 'Tender Discussion'}
                    {activeChat.project?.bid?.user?.profile?.fullName && ` \u00B7 ${activeChat.project.bid.user.profile.fullName}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* ── Messages Area ── */}
            <ScrollArea className="flex-1 p-4 md:p-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3">
                  <div className="w-16 h-16 rounded-2xl gradient-emerald flex items-center justify-center premium-shadow-lg">
                    <MessageSquare className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Start the conversation</p>
                  <p className="text-xs text-muted-foreground max-w-[240px] text-center">Send a message to begin discussing this {activeChat.contextType}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((msg, idx) => {
                    const isOwn = msg.userId === user?.id;
                    const isFlagged = flaggedMessages.has(msg.id);
                    const senderName = msg.user?.profile?.fullName || 'User';
                    const gradientClass = getAvatarGradient(msg.userId);
                    const showDateSep = shouldShowDateSeparator(messages, idx);

                    // Check if same sender as previous message for grouping
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const isGrouped = prevMsg && prevMsg.userId === msg.userId && !shouldShowDateSeparator(messages, idx)
                      && (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) < 300000; // 5 min

                    return (
                      <div key={msg.id}>
                        {/* Date Separator */}
                        {showDateSep && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center justify-center my-4"
                          >
                            <div className="bg-muted/60 text-muted-foreground text-[10px] font-medium px-3 py-1 rounded-full">
                              {formatDateSeparator(msg.createdAt)}
                            </div>
                          </motion.div>
                        )}

                        <motion.div
                          custom={isOwn}
                          variants={msgVariants}
                          initial="hidden"
                          animate="visible"
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}
                        >
                          <div className={`flex gap-2.5 max-w-[75%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                            {/* Avatar - only show for non-grouped messages */}
                            {!isOwn && !isGrouped && (
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[10px] font-semibold ${gradientClass}`}>
                                {getUserInitial(senderName)}
                              </div>
                            )}
                            {/* Spacer for grouped messages */}
                            {!isOwn && isGrouped && <div className="w-7 flex-shrink-0" />}

                            {/* Bubble */}
                            <div className={`rounded-2xl ${
                              isOwn
                                ? 'gradient-emerald text-white rounded-tr-sm premium-shadow'
                                : 'bg-emerald-50/80 border border-emerald-100/60 rounded-tl-sm'
                            } ${isGrouped ? (isOwn ? 'rounded-tr-2xl' : 'rounded-tl-2xl') : ''} ${
                              isFlagged ? 'ring-2 ring-rose-400 ring-offset-1' : ''
                            } ${isGrouped ? 'px-3 py-1.5' : 'p-3'}`}>
                              {!isOwn && !isGrouped && (
                                <p className="text-[11px] font-semibold text-emerald-700 mb-1">
                                  {senderName}
                                </p>
                              )}
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                              <div className="flex items-center justify-end gap-1.5 mt-1">
                                {isFlagged && (
                                  <span className="flex items-center gap-0.5 text-rose-400 text-[10px]">
                                    Flagged
                                  </span>
                                )}
                                <p className={`text-[10px] ${isOwn ? 'text-white/50' : 'text-muted-foreground/60'}`}>
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                {/* Read receipt for own messages */}
                                {isOwn && (
                                  <CheckCheck className="h-3 w-3 text-white/50" />
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  <AnimatePresence>
                    {typingUsers.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="flex justify-start mt-3"
                      >
                        <div className="flex gap-2.5 items-center">
                          <div className="w-7 h-7 rounded-lg gradient-teal flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] text-white font-semibold">...</span>
                          </div>
                          <div className="bg-emerald-50/80 border border-emerald-100/60 rounded-2xl rounded-tl-sm px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="flex gap-0.5">
                                <motion.span
                                  className="w-1.5 h-1.5 bg-emerald-400 rounded-full"
                                  animate={{ y: [0, -4, 0] }}
                                  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                                />
                                <motion.span
                                  className="w-1.5 h-1.5 bg-emerald-400 rounded-full"
                                  animate={{ y: [0, -4, 0] }}
                                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                                />
                                <motion.span
                                  className="w-1.5 h-1.5 bg-emerald-400 rounded-full"
                                  animate={{ y: [0, -4, 0] }}
                                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                                />
                              </div>
                              <span className="text-[10px] text-emerald-600 font-medium ml-1">typing...</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* ── Premium Input Area ── */}
            <div className="p-4 border-t border-border/40 bg-white flex-shrink-0">
              <div className="flex gap-2 items-end">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={e => handleTyping(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  className="flex-1 bg-gray-50/80 border-border/50 focus:border-emerald-300 focus:ring-emerald-200/40 rounded-xl h-11"
                />
                <motion.div whileTap={{ scale: 0.92 }}>
                  <Button
                    className="gradient-emerald hover:opacity-90 w-11 h-11 rounded-xl premium-shadow transition-all disabled:opacity-50"
                    onClick={handleSend}
                    disabled={!newMessage.trim()}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </>
        ) : (
          /* ── Premium Empty State ── */
          <div className="hidden md:flex flex-1 items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-2xl gradient-emerald flex items-center justify-center mx-auto mb-4 premium-shadow-lg">
                <MessageSquare className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Select a conversation</h3>
              <p className="text-sm text-muted-foreground">Choose a chat from the sidebar to start messaging</p>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
