'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore, useNavStore, useDataStore } from '@/store';
import { api, Chat, Message } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { MessageSquare, Send, AlertTriangle, ArrowLeft, Users, Hash, ArrowUp, Search, Circle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

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
          ) : filteredChats.map(chat => {
            const title = getChatTitle(chat);
            const subtitle = getChatSubtitle(chat);
            const lastMsg = chat.messages?.[0];
            const isActive = activeChat?.id === chat.id;
            const hasUnread = chat._count?.messages !== undefined && chat._count.messages > 0 && !isActive;
            return (
              <button key={chat.id}
                onClick={() => selectChat(chat)}
                className={`w-full p-3.5 text-left transition-all duration-200 border-b border-border/30 group ${
                  isActive
                    ? 'bg-emerald-50/70 border-l-[3px] border-l-emerald-500'
                    : 'hover:bg-gray-50/80 border-l-[3px] border-l-transparent'
                }`}>
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold ${getAvatarGradient(chat.id)} premium-shadow`}>
                    {chat.contextType === 'project' ? 'P' : 'T'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate flex-1 ${isActive ? 'font-semibold text-emerald-800' : 'font-medium'}`}>
                        {title}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {hasUnread && (
                          <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
                        )}
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize border-emerald-200/60 text-emerald-600">
                          {chat.contextType}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</p>
                    {lastMsg && (
                      <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                        {lastMsg.content}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
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
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold ${getAvatarGradient(activeChat.id)} premium-shadow`}>
                  {activeChat.contextType === 'project' ? 'P' : 'T'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate">{getChatTitle(activeChat)}</h3>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {activeChat.contextType === 'project' ? 'Project Discussion' : 'Tender Discussion'}
                    {activeChat.project?.bid?.user?.profile?.fullName && ` \u00B7 ${activeChat.project.bid.user.profile.fullName}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className="text-[10px] px-2 capitalize border-emerald-200/60 text-emerald-600">
                  {activeChat.contextType}
                </Badge>
                {activeChat._count?.messages !== undefined && (
                  <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-0">
                    <Hash className="h-3 w-3 mr-0.5" />
                    {activeChat._count.messages}
                  </Badge>
                )}
              </div>
            </div>

            {/* ── Messages Area ── */}
            <ScrollArea className="flex-1 p-4 md:p-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <MessageSquare className="h-7 w-7 text-emerald-300" />
                  </div>
                  <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(msg => {
                    const isOwn = msg.userId === user?.id;
                    const isFlagged = flaggedMessages.has(msg.id);
                    const senderName = msg.user?.profile?.fullName || 'User';
                    const gradientClass = getAvatarGradient(msg.userId);
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-2.5 max-w-[75%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                          {/* Avatar */}
                          {!isOwn && (
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[10px] font-semibold ${gradientClass}`}>
                              {getUserInitial(senderName)}
                            </div>
                          )}
                          {/* Bubble */}
                          <div className={`rounded-2xl p-3 ${
                            isOwn
                              ? 'gradient-emerald text-white rounded-tr-sm premium-shadow'
                              : 'bg-emerald-50/80 border border-emerald-100/60 rounded-tl-sm'
                          } ${isFlagged ? 'ring-2 ring-rose-400 ring-offset-1' : ''}`}>
                            {!isOwn && (
                              <p className="text-[11px] font-semibold text-emerald-700 mb-1">
                                {senderName}
                              </p>
                            )}
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                            <div className="flex items-center justify-end gap-1.5 mt-1.5">
                              {isFlagged && (
                                <span className="flex items-center gap-0.5 text-rose-400 text-[10px]">
                                  <AlertTriangle className="h-2.5 w-2.5" /> Flagged
                                </span>
                              )}
                              <p className={`text-[10px] ${isOwn ? 'text-white/50' : 'text-muted-foreground/60'}`}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {typingUsers.length > 0 && (
                    <div className="flex justify-start view-enter">
                      <div className="flex gap-2.5 items-center">
                        <div className="w-7 h-7 rounded-lg gradient-teal flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] text-white font-semibold">...</span>
                        </div>
                        <div className="bg-emerald-50/80 border border-emerald-100/60 rounded-2xl rounded-tl-sm px-4 py-2.5">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

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
                <Button
                  className="gradient-emerald hover:opacity-90 w-11 h-11 rounded-xl premium-shadow transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                  onClick={handleSend}
                  disabled={!newMessage.trim()}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* ── Premium Empty State ── */
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl gradient-emerald flex items-center justify-center mx-auto mb-4 premium-shadow-lg">
                <MessageSquare className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Select a conversation</h3>
              <p className="text-sm text-muted-foreground">Choose a chat from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
