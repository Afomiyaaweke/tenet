'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Bot, Send, User, Sparkles, Trash2, Lightbulb, Zap,
  FileSearch, Gavel, Shield, FolderKanban, TrendingUp
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const SUGGESTIONS = [
  'How can I improve my bid submissions?',
  'What tenders match my skills?',
  'Explain the bidding workflow',
  'How do I get verified on the platform?',
  'What are the best practices for tender creation?',
  'Help me understand the payment tracking system',
];

const ROLE_QUICK_ACTIONS: Record<string, { label: string; prompt: string; icon: React.ElementType }[]> = {
  contractor: [
    { label: 'Show my matching tenders', prompt: 'Show me tenders that match my skills and profile', icon: FileSearch },
    { label: 'Check my bid status', prompt: 'What is the current status of my bids?', icon: Gavel },
    { label: 'Help me write a bid proposal', prompt: 'Help me write a compelling bid proposal for a construction tender', icon: TrendingUp },
  ],
  admin: [
    { label: 'Show pending reviews', prompt: 'Show me all pending reviews that need my attention', icon: Shield },
    { label: 'Platform health check', prompt: 'Give me a platform health check summary', icon: TrendingUp },
    { label: 'Help me verify a user', prompt: 'What should I check when verifying a user on the platform?', icon: FileSearch },
  ],
  tender_owner: [
    { label: 'Help me write a tender', prompt: 'Help me write a clear and effective tender specification', icon: FileSearch },
    { label: 'Show bids on my tenders', prompt: 'Show me the bids submitted on my tenders', icon: Gavel },
    { label: 'Project status overview', prompt: 'Give me an overview of my project statuses', icon: FolderKanban },
  ],
};

function formatAIContent(content: string): React.ReactNode[] {
  const lines = content.split('\n');
  const result: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const key = `line-${i}`;

    // Bullet point lines
    const bulletMatch = line.match(/^[\s]*[-*•]\s+(.*)/);
    if (bulletMatch) {
      const bulletContent = bulletMatch[1];
      result.push(
        <div key={key} className="flex items-start gap-2 ml-2">
          <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
          <span>{formatInline(bulletContent)}</span>
        </div>
      );
      continue;
    }

    // Numbered list lines
    const numberedMatch = line.match(/^[\s]*(\d+)[.)]\s+(.*)/);
    if (numberedMatch) {
      const num = numberedMatch[1];
      const numberedContent = numberedMatch[2];
      result.push(
        <div key={key} className="flex items-start gap-2 ml-2">
          <span className="text-emerald-600 font-medium flex-shrink-0">{num}.</span>
          <span>{formatInline(numberedContent)}</span>
        </div>
      );
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      result.push(<div key={key} className="h-2" />);
      continue;
    }

    // Regular line
    result.push(<div key={key}>{formatInline(line)}</div>);
  }

  return result;
}

function formatInline(text: string): React.ReactNode {
  // Process **bold** and *italic* inline formatting
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let partKey = 0;

  while (remaining.length > 0) {
    // Match **bold**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Match *italic*
    const italicMatch = remaining.match(/\*(.+?)\*/);

    let firstMatch: { index: number; length: number; content: string; type: 'bold' | 'italic' } | null = null;

    if (boldMatch && boldMatch.index !== undefined) {
      firstMatch = { index: boldMatch.index, length: boldMatch[0].length, content: boldMatch[1], type: 'bold' };
    }

    if (italicMatch && italicMatch.index !== undefined) {
      if (!firstMatch || italicMatch.index < firstMatch.index) {
        firstMatch = { index: italicMatch.index, length: italicMatch[0].length, content: italicMatch[1], type: 'italic' };
      }
    }

    if (firstMatch) {
      // Text before the match
      if (firstMatch.index > 0) {
        parts.push(<span key={`t-${partKey++}`}>{remaining.slice(0, firstMatch.index)}</span>);
      }
      // The formatted content
      if (firstMatch.type === 'bold') {
        parts.push(<strong key={`b-${partKey++}`} className="font-semibold">{firstMatch.content}</strong>);
      } else {
        parts.push(<em key={`i-${partKey++}`} className="italic">{firstMatch.content}</em>);
      }
      remaining = remaining.slice(firstMatch.index + firstMatch.length);
    } else {
      parts.push(<span key={`t-${partKey++}`}>{remaining}</span>);
      break;
    }
  }

  return <>{parts}</>;
}

export function AgentView() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const role = user?.role || 'contractor';
  const quickActions = ROLE_QUICK_ACTIONS[role] || ROLE_QUICK_ACTIONS.contractor;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (message?: string) => {
    const content = message || input.trim();
    if (!content || loading) return;

    setInput('');
    const userMsg: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await api.post('/agent', { message: content, history });

      if (res.success) {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: res.data.response,
          timestamp: res.data.timestamp,
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        toast.error('Failed to get AI response');
      }
    } catch {
      toast.error('AI assistant unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-4 border-b bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Afomiya AI Assistant</h3>
            <p className="text-xs text-muted-foreground">Your procurement & platform guide</p>
          </div>
          <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">AI Powered</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-emerald-600" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Welcome to Afomiya AI</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                I&apos;m your AI assistant for the tender ecosystem. Ask me about tenders, bidding strategies, platform features, or procurement best practices.
              </p>
            </div>

            <div className="w-full max-w-lg">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-medium text-muted-foreground">Try asking...</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTIONS.map((suggestion, i) => (
                  <button key={i}
                    onClick={() => handleSend(suggestion)}
                    className="text-left p-3 rounded-lg border hover:bg-emerald-50 hover:border-emerald-200 transition-colors text-sm text-muted-foreground hover:text-emerald-700">
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Role-specific Quick Actions */}
            <div className="w-full max-w-lg">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-emerald-500" />
                <p className="text-sm font-medium text-muted-foreground">Quick actions for {role.replace('_', ' ')}s</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <Button key={i} variant="outline" size="sm"
                      className="gap-2 text-xs hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
                      onClick={() => handleSend(action.prompt)}>
                      <Icon className="h-3.5 w-3.5" />
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-gray-200 text-gray-600'
                      : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'
                  }`}>
                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`rounded-2xl p-4 ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="text-sm leading-relaxed space-y-1">
                        {formatAIContent(msg.content)}
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    )}
                    <p className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-emerald-200' : 'text-muted-foreground'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Quick Actions (shown when conversation is active) */}
      {messages.length > 0 && !loading && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <Button key={i} variant="outline" size="sm"
                  className="gap-1.5 text-xs whitespace-nowrap flex-shrink-0 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
                  onClick={() => handleSend(action.prompt)}>
                  <Icon className="h-3 w-3" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-white flex-shrink-0">
        <div className="flex gap-2">
          <Input
            placeholder="Ask me anything about the tender ecosystem..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={loading}
            className="flex-1"
          />
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 px-4"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          AI Assistant powered by Afomiya &middot; Responses are generated and may not always be accurate
        </p>
      </div>
    </div>
  );
}
