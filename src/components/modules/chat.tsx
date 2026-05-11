'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore, useNavStore, useDataStore } from '@/store';
import { api, Chat, Message } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { MessageSquare, Send, AlertTriangle, ArrowLeft, Users } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex max-w-5xl mx-auto">
      {/* Chat List */}
      <div className="w-72 border-r bg-white flex-shrink-0 flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm">Conversations</h3>
        </div>
        <ScrollArea className="flex-1">
          {chats.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              No conversations yet
            </div>
          ) : chats.map(chat => (
            <button key={chat.id}
              onClick={() => selectChat(chat)}
              className={`w-full p-3 text-left hover:bg-gray-50 transition-colors border-b ${
                activeChat?.id === chat.id ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : ''
              }`}>
              <p className="text-sm font-medium truncate">{chat.contextType === 'project' ? 'Project' : 'Tender'} Chat</p>
              <p className="text-xs text-muted-foreground">{chat.contextType}</p>
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">{activeChat.contextType === 'project' ? 'Project' : 'Tender'} Discussion</h3>
                <p className="text-xs text-muted-foreground">Chat ID: {activeChat.id.slice(0, 8)}...</p>
              </div>
              <Badge variant="outline" className="text-xs">{activeChat.contextType}</Badge>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : messages.map(msg => {
                const isOwn = msg.userId === user?.id;
                const isFlagged = flaggedMessages.has(msg.id);
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-lg p-3 ${
                      isOwn ? 'bg-emerald-600 text-white' : 'bg-gray-100'
                    } ${isFlagged ? 'ring-2 ring-red-400' : ''}`}>
                      {!isOwn && (
                        <p className={`text-xs font-medium mb-1 ${isOwn ? 'text-emerald-100' : 'text-emerald-700'}`}>
                          {msg.user?.profile?.fullName || 'User'}
                        </p>
                      )}
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isOwn ? 'text-emerald-200' : 'text-muted-foreground'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                      {isFlagged && (
                        <div className="flex items-center gap-1 mt-1 text-red-400 text-xs">
                          <AlertTriangle className="h-3 w-3" /> Flagged
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {typingUsers.length > 0 && (
                <p className="text-xs text-muted-foreground italic">Someone is typing...</p>
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <Input placeholder="Type a message..." value={newMessage}
                  onChange={e => handleTyping(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()} />
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSend}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
