'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Bot, Send, User, Sparkles, Trash2, Lightbulb, Zap,
  FileSearch, Gavel, Shield, FolderKanban, TrendingUp,
  ArrowUp, Copy, Check, MessageSquare, RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

const FOLLOW_UP_SUGGESTIONS: Record<string, string[]> = {
  contractor: [
    'What documents do I need for verification?',
    'How are bids evaluated?',
    'Can you explain the shortlisting process?',
    'What happens after a bid is awarded?',
  ],
  admin: [
    'What are the red flags in bid submissions?',
    'How do I handle suspicious activity?',
    'What reports are available?',
    'How to manage platform users?',
  ],
  tender_owner: [
    'How do I evaluate bids fairly?',
    'What should I include in a tender scope?',
    'How does project tracking work?',
    'What are the payment milestones?',
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
          <span className="text-emerald-600 font-semibold flex-shrink-0">{num}.</span>
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
        parts.push(<strong key={`b-${partKey++}`} className="font-semibold text-foreground">{firstMatch.content}</strong>);
      } else {
        parts.push(<em key={`i-${partKey++}`} className="italic text-muted-foreground">{firstMatch.content}</em>);
      }
      remaining = remaining.slice(firstMatch.index + firstMatch.length);
    } else {
      parts.push(<span key={`t-${partKey++}`}>{remaining}</span>);
      break;
    }
  }

  return <>{parts}</>;
}

const msgVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: (isUser: boolean) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 350, damping: 28 },
  }),
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function AgentView() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const role = user?.role || 'contractor';
  const quickActions = ROLE_QUICK_ACTIONS[role] || ROLE_QUICK_ACTIONS.contractor;
  const followUps = FOLLOW_UP_SUGGESTIONS[role] || FOLLOW_UP_SUGGESTIONS.contractor;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = useCallback(async (message?: string) => {
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
  }, [input, loading, messages]);

  const clearChat = () => {
    setMessages([]);
  };

  const copyMessage = (idx: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
    toast.success('Copied to clipboard');
  };

  const lastAssistantIdx = messages.length > 0
    ? messages.map((m, i) => m.role === 'assistant' ? i : -1).filter(i => i >= 0).pop()
    : -1;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col max-w-4xl mx-auto view-enter">
      {/* ── Premium Header ── */}
      <div className="px-5 py-3.5 border-b border-border/50 bg-white/80 backdrop-blur-md flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-10 h-10 rounded-xl gradient-emerald flex items-center justify-center premium-shadow"
          >
            <Bot className="h-5 w-5 text-white" />
          </motion.div>
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              AI Assistant
              <Badge className="text-[9px] px-1.5 py-0 gradient-emerald text-white border-0 font-medium">AI Powered</Badge>
            </h3>
            <p className="text-[11px] text-muted-foreground">Your procurement & platform guide</p>
          </div>
        </div>
        {messages.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={() => handleSend(messages[messages.length - 1]?.content)}
              className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Regenerate">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={clearChat}
              className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 transition-colors rounded-lg">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Messages Area ── */}
      <ScrollArea className="flex-1 p-4 md:p-6">
        {messages.length === 0 ? (
          /* ── Premium Empty State ── */
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center min-h-[50vh] gap-8"
          >
            <motion.div variants={itemVariants} className="relative">
              <div className="w-24 h-24 rounded-2xl gradient-emerald flex items-center justify-center premium-shadow-lg">
                <Sparkles className="h-12 w-12 text-white" />
              </div>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-lg gradient-amber flex items-center justify-center premium-shadow"
              >
                <Zap className="h-4 w-4 text-white" />
              </motion.div>
            </motion.div>
            <motion.div variants={itemVariants} className="text-center">
              <h3 className="text-2xl font-bold tracking-tight mb-2">
                Welcome to <span className="text-gradient-emerald">Afomiya AI</span>
              </h3>
              <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
                I&apos;m your AI assistant for the tender ecosystem. Ask me about tenders, bidding strategies, platform features, or procurement best practices.
              </p>
            </motion.div>

            {/* Suggestion Pills */}
            <motion.div variants={itemVariants} className="w-full max-w-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 rounded-md bg-amber-50">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Try asking</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion, i) => (
                  <motion.button key={i}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSend(suggestion)}
                    className="text-left px-3.5 py-2 rounded-full border border-emerald-200/80 bg-white hover:bg-emerald-50 hover:border-emerald-300 transition-colors duration-200 text-xs text-muted-foreground hover:text-emerald-700 premium-shadow">
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Role-specific Quick Actions */}
            <motion.div variants={itemVariants} className="w-full max-w-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 rounded-md gradient-emerald">
                  <Zap className="h-3.5 w-3.5 text-white" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick actions for {role.replace('_', ' ')}s
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <motion.button key={i}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors duration-200 text-xs font-medium premium-shadow"
                      onClick={() => handleSend(action.prompt)}>
                      <Icon className="h-3.5 w-3.5 text-emerald-500" />
                      {action.label}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* ── Conversation Messages ── */
          <div className="space-y-5 pb-4">
            <AnimatePresence mode="popLayout">
              {messages.map((msg, i) => (
                <motion.div
                  key={`msg-${i}`}
                  custom={msg.role === 'user'}
                  variants={msgVariants}
                  initial="hidden"
                  animate="visible"
                  layout
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'user'
                        ? 'gradient-emerald text-white premium-shadow'
                        : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    {/* Bubble */}
                    <div className="group relative">
                      <div className={`rounded-2xl p-4 ${
                        msg.role === 'user'
                          ? 'gradient-emerald text-white rounded-tr-sm premium-shadow'
                          : 'bg-emerald-50/80 text-foreground rounded-tl-sm border border-emerald-100/60'
                      }`}>
                        {msg.role === 'assistant' ? (
                          <div className="text-sm leading-relaxed space-y-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:text-muted-foreground">
                            {formatAIContent(msg.content)}
                          </div>
                        ) : (
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                        )}
                        <div className="flex items-center justify-between mt-2.5 gap-2">
                          <p className={`text-[10px] ${
                            msg.role === 'user' ? 'text-white/60' : 'text-muted-foreground/60'
                          }`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {/* Copy button - appears on hover */}
                          {msg.role === 'assistant' && (
                            <motion.button
                              initial={{ opacity: 0 }}
                              whileHover={{ opacity: 1 }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-emerald-100/80"
                              onClick={() => copyMessage(i, msg.content)}
                            >
                              {copiedIdx === i ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              )}
                            </motion.button>
                          )}
                        </div>
                      </div>

                      {/* Follow-up suggestions after last assistant message */}
                      {msg.role === 'assistant' && i === lastAssistantIdx && !loading && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="mt-3 space-y-2"
                        >
                          <div className="flex items-center gap-1.5">
                            <MessageSquare className="h-3 w-3 text-emerald-500" />
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Follow up</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {followUps.slice(0, 3).map((question, qi) => (
                              <motion.button
                                key={qi}
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleSend(question)}
                                className="text-left px-3 py-1.5 rounded-full border border-emerald-200/60 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors duration-200 text-[11px] text-muted-foreground premium-shadow"
                              >
                                {question}
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading Animation */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-3 max-w-[80%]">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-emerald-50/80 rounded-2xl rounded-tl-sm p-4 border border-emerald-100/60">
                      <div className="flex items-center gap-2.5">
                        <div className="flex gap-0.5">
                          <motion.span
                            className="w-2 h-2 bg-emerald-400 rounded-full"
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                          />
                          <motion.span
                            className="w-2 h-2 bg-emerald-400 rounded-full"
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                          />
                          <motion.span
                            className="w-2 h-2 bg-emerald-400 rounded-full"
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                          />
                        </div>
                        <span className="text-xs text-emerald-600 font-medium">Thinking...</span>
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

      {/* ── Quick Actions Strip (shown when conversation is active) ── */}
      {messages.length > 0 && !loading && (
        <div className="px-5 py-2.5 border-t border-border/40 bg-emerald-50/30">
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.button key={i}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-200/60 bg-white text-xs font-medium whitespace-nowrap flex-shrink-0 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors duration-200"
                  onClick={() => handleSend(action.prompt)}>
                  <Icon className="h-3 w-3 text-emerald-500" />
                  {action.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Premium Input Area ── */}
      <div className="p-4 md:px-6 md:py-4 border-t border-border/40 bg-white flex-shrink-0">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Input
              placeholder="Ask me anything about the tender ecosystem..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={loading}
              className="flex-1 pr-10 bg-gray-50/80 border-border/50 focus:border-emerald-300 focus:ring-emerald-200/40 rounded-xl h-11"
            />
          </div>
          <motion.div whileTap={{ scale: 0.92 }}>
            <Button
              className="gradient-emerald hover:opacity-90 w-11 h-11 rounded-xl premium-shadow transition-all disabled:opacity-50"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-2 text-center">
          AI Assistant powered by Afomiya &middot; Responses are generated and may not always be accurate
        </p>
      </div>
    </div>
  );
}
