'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users, UserPlus, Heart, ThumbsUp, MessageCircle, Share2, Search,
  Building2, MapPin, Briefcase, Award, Verified, Send, Clock,
  MoreHorizontal, X, Plus, ChevronDown, Globe2, Handshake,
  Sparkles, TrendingUp, Star, Link2, Image as ImageIcon, Trash2,
  Paperclip, Smile, Film, Loader2, Edit2, Save,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// ==========================================
// Constants
// ==========================================

const SKILL_COLORS: Record<string, string> = {
  'Construction': 'bg-amber-50 text-amber-700 border-amber-200/60',
  'IT': 'bg-blue-50 text-blue-700 border-blue-200/60',
  'Supply': 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  'Consulting': 'bg-purple-50 text-purple-700 border-purple-200/60',
  'Engineering': 'bg-teal-50 text-teal-700 border-teal-200/60',
  'Architecture': 'bg-rose-50 text-rose-700 border-rose-200/60',
  'Electrical': 'bg-yellow-50 text-yellow-700 border-yellow-200/60',
  'Plumbing': 'bg-cyan-50 text-cyan-700 border-cyan-200/60',
  'HVAC': 'bg-orange-50 text-orange-700 border-orange-200/60',
  'Landscaping': 'bg-lime-50 text-lime-700 border-lime-200/60',
  'Interior Design': 'bg-pink-50 text-pink-700 border-pink-200/60',
  'Project Management': 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
  'Logistics': 'bg-sky-50 text-sky-700 border-sky-200/60',
  'Manufacturing': 'bg-stone-50 text-stone-700 border-stone-200/60',
  'Healthcare': 'bg-red-50 text-red-700 border-red-200/60',
  'Education': 'bg-violet-50 text-violet-700 border-violet-200/60',
  'Finance': 'bg-green-50 text-green-700 border-green-200/60',
  'Legal': 'bg-slate-50 text-slate-700 border-slate-200/60',
  'Agriculture': 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  'Telecommunications': 'bg-blue-50 text-blue-700 border-blue-200/60',
};

const REACTION_EMOJIS = ['👍', '❤️', '🎉', '💡'] as const;

// Emoji categories for the emoji picker
const EMOJI_CATEGORIES = [
  { name: 'Smileys', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐'] },
  { name: 'Gestures', emojis: ['👋','🤚','🖐️','✋','🖖','🫱','🫲','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','🫦'] },
  { name: 'Hearts', emojis: ['❤️','🧡','💛','💚','💙','💜','🤎','🖤','🤍','🩷','🩵','🩶','🩵','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','♥️'] },
  { name: 'Objects', emojis: ['🎉','🎊','🎈','🎁','🏆','🥇','🥈','🥉','🏅','🎖️','📋','📌','📎','🔗','💡','🔥','⭐','🌟','✨','💎','🎯','🚀','⚡','💥','💫','🎵','🎶','🎤','🎬','📷','📹','💻','📱','📧','✅','❌','⚠️','🔒','🔑'] },
  { name: 'Nature', emojis: ['🌱','🌿','🌳','🌴','🌵','🌾','🍀','🍁','🍂','🍃','🌸','🌺','🌻','🌹','🥀','💐','🍄','🌰','🪨','💧','💦','🌧️','⛅','🌈','☀️','🌤️','🌙','⭐','🦋','🐝','🐛','🦀','🐙','🐟','🐠','🐬','🐳','🦈'] },
];

const INDUSTRY_OPTIONS = [
  'Construction', 'IT & Technology', 'Supply Chain', 'Consulting',
  'Engineering', 'Architecture', 'Healthcare', 'Education',
  'Finance', 'Legal', 'Agriculture', 'Telecommunications',
  'Manufacturing', 'Logistics', 'Energy', 'Government',
];

function getSkillColor(skill: string): string {
  return SKILL_COLORS[skill] || 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
}

// ==========================================
// Types
// ==========================================

interface ReactionSummary {
  emoji: string;
  count: number;
  hasReacted: boolean;
  users: Array<{ id: string; fullName: string; profilePhoto: string | null }>;
}

interface SocialPost {
  id: string;
  userId: string;
  content: string;
  imageUrls: string;
  likes: number;
  comments: number;
  tags: string;
  visibility: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile: { fullName: string; jobTitle: string | null; profilePhoto: string | null };
    company: { id: string; name: string; industry: string; verified: boolean } | null;
  };
  reactionSummary: ReactionSummary[];
  commentCount: number;
  totalReactions: number;
}

interface PostComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile: { fullName: string; jobTitle: string | null; profilePhoto: string | null };
    company: { id: string; name: string } | null;
  };
}

interface Connection {
  id: string;
  requesterId: string;
  receiverId: string;
  status: string;
  message: string | null;
  createdAt: string;
  direction: 'sent' | 'received';
  requester: {
    id: string;
    email: string;
    profile: { fullName: string; jobTitle: string | null; profilePhoto: string | null; location?: string | null };
    company: { id: string; name: string; industry: string; verified: boolean } | null;
  };
  receiver: {
    id: string;
    email: string;
    profile: { fullName: string; jobTitle: string | null; profilePhoto: string | null; location?: string | null };
    company: { id: string; name: string; industry: string; verified: boolean } | null;
  };
}

interface DiscoverProfile {
  id: string;
  userId: string;
  fullName: string;
  jobTitle: string | null;
  profilePhoto: string | null;
  location: string | null;
  bio: string | null;
  skillTags: string;
  verified: boolean;
  user: {
    id: string;
    email: string;
    role: string;
    company: { id: string; name: string; industry: string; verified: boolean; logoUrl: string | null } | null;
  };
  connectionStatus: 'none' | 'pending' | 'connected' | 'declined';
  connectionDirection: string | null;
  connectionId: string | null;
  totalEndorsements: number;
  topSkills: Array<{ skill: string; count: number }>;
}

interface EndorsementSkill {
  skill: string;
  count: number;
  hasEndorsed: boolean;
  endorsers: Array<{ id: string; fullName: string; jobTitle: string | null; profilePhoto: string | null }>;
}

// ==========================================
// Helpers
// ==========================================

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
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function parseImageUrls(imageUrls: string): string[] {
  try {
    const parsed = JSON.parse(imageUrls);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseTags(tags: string): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : tags.split(',').map((t) => t.trim()).filter(Boolean);
  } catch {
    return tags.split(',').map((t) => t.trim()).filter(Boolean);
  }
}

function parseSkillTags(skillTags: string): string[] {
  if (!skillTags) return [];
  try {
    const parsed = JSON.parse(skillTags);
    return Array.isArray(parsed) ? parsed : skillTags.split(',').map((t) => t.trim()).filter(Boolean);
  } catch {
    return skillTags.split(',').map((t) => t.trim()).filter(Boolean);
  }
}

// ==========================================
// Sub-Components
// ==========================================

function ProfileAvatar({ src, name, className }: { src?: string | null; name: string; className?: string }) {
  return (
    <Avatar className={className || 'h-10 w-10'}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-sm font-semibold">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function VerifiedBadge({ verified }: { verified?: boolean | null }) {
  if (!verified) return null;
  return <Verified className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />;
}

function SkillBadge({ skill, className }: { skill: string; className?: string }) {
  return (
    <Badge variant="outline" className={`text-xs px-2 py-0.5 font-medium ${getSkillColor(skill)} ${className || ''}`}>
      {skill}
    </Badge>
  );
}

// ─── Left Sidebar: Profile Card ───

function LeftSidebar() {
  const { user, company } = useAuthStore();
  const [stats, setStats] = useState({ connections: 0, posts: 0, endorsements: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [connRes, postsRes, endRes] = await Promise.all([
          api.get('/social/connections', { status: 'accepted', limit: '1' }),
          api.get('/social/posts', { authorId: user?.id || '', limit: '1' }),
          api.get('/social/endorsements', { userId: user?.id || '' }),
        ]);
        setStats({
          connections: connRes.meta?.total || 0,
          posts: postsRes.meta?.total || 0,
          endorsements: endRes.data?.totalEndorsements || 0,
        });
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    if (user?.id) fetchStats();
  }, [user?.id]);

  const profile = user?.profile;
  const fullName = profile?.fullName || user?.email || 'User';
  const jobTitle = profile?.jobTitle || '';
  const companyName = company?.name || user?.company?.name || '';
  const location = (profile as any)?.location || '';
  const skillTags = parseSkillTags((profile as any)?.skillTags || '');

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <Card className="overflow-hidden">
        <div className="h-16 bg-gradient-to-r from-emerald-500 to-teal-500 relative">
          {company?.verified && (
            <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm rounded-full p-1">
              <Verified className="h-3.5 w-3.5 text-white" />
            </div>
          )}
        </div>
        <CardContent className="pt-0 pb-4 px-4">
          <div className="-mt-8 mb-3">
            <ProfileAvatar
              src={profile?.profilePhoto}
              name={fullName}
              className="h-16 w-16 border-4 border-card"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm text-foreground leading-tight">{fullName}</h3>
              {profile?.verified && <VerifiedBadge verified={profile.verified} />}
            </div>
            {jobTitle && (
              <p className="text-xs text-muted-foreground">{jobTitle}</p>
            )}
            {companyName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span>{companyName}</span>
                {company?.verified && <VerifiedBadge verified={company.verified} />}
              </div>
            )}
            {location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{location}</span>
              </div>
            )}
          </div>
        </CardContent>
        <Separator />
        <CardContent className="py-3 px-4">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-bold text-foreground">{stats.connections}</p>
                <p className="text-[10px] text-muted-foreground">Connections</p>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{stats.posts}</p>
                <p className="text-[10px] text-muted-foreground">Posts</p>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{stats.endorsements}</p>
                <p className="text-[10px] text-muted-foreground">Endorsements</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skills Card */}
      {skillTags.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5" />
              My Skills
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto custom-scrollbar">
              {skillTags.map((skill) => (
                <SkillBadge key={skill} skill={skill} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Create Post Box ───

interface AttachedMedia {
  url: string;
  type: 'image' | 'video';
  name: string;
}

function CreatePostBox({ onPostCreated }: { onPostCreated: () => void }) {
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState<AttachedMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const removeMedia = (index: number) => {
    setAttachedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + emoji + content.substring(end);
      setContent(newContent);
      // Set cursor position after emoji
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setContent((prev) => prev + emoji);
    }
    setEmojiOpen(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 10 - attachedMedia.length;
    const toUpload = Array.from(files).slice(0, remaining);

    if (toUpload.length === 0) {
      toast.error('Maximum 10 media files allowed');
      return;
    }

    setIsUploading(true);
    const token = localStorage.getItem('tenet_token');

    for (const file of toUpload) {
      // Validate file size (25MB max)
      if (file.size > 25 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 25MB)`);
        continue;
      }

      // Validate file type
      const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
      const isValid = [...validImageTypes, ...validVideoTypes].includes(file.type);
      if (!isValid) {
        toast.error(`${file.name}: Only images (JPEG, PNG, WebP, GIF) and videos (MP4, WebM, MOV) are allowed`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/social/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          setAttachedMedia((prev) => [
            ...prev,
            { url: data.data.url, type: data.data.type, name: file.name },
          ]);
        } else {
          toast.error(data.error || `Failed to upload ${file.name}`);
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!content.trim() && attachedMedia.length === 0) return;
    setIsSubmitting(true);
    try {
      const imageUrls = attachedMedia.map((m) => m.url);
      const res = await api.post('/social/posts', {
        content: content.trim(),
        tags: tags.join(','),
        visibility,
        imageUrls,
      });
      if (res.success) {
        toast.success('Post created!');
        setContent('');
        setTags([]);
        setTagInput('');
        setVisibility('public');
        setIsExpanded(false);
        setAttachedMedia([]);
        onPostCreated();
      } else {
        toast.error(res.error || 'Failed to create post');
      }
    } catch {
      toast.error('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const profile = user?.profile;
  const fullName = profile?.fullName || user?.email || 'User';
  const hasContent = content.trim() || attachedMedia.length > 0;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <ProfileAvatar src={profile?.profilePhoto} name={fullName} className="h-10 w-10 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Textarea
              ref={textareaRef}
              placeholder="Share an update, insight, or opportunity..."
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (!isExpanded && e.target.value) setIsExpanded(true);
              }}
              onFocus={() => setIsExpanded(true)}
              className="min-h-[60px] resize-none border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-emerald-500/30 p-3 text-sm"
              maxLength={5000}
            />

            {/* Media Previews */}
            {attachedMedia.length > 0 && (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {attachedMedia.map((media, index) => (
                  <div key={index} className="relative group rounded-lg overflow-hidden border border-border bg-muted/30">
                    {media.type === 'video' ? (
                      <div className="relative h-28 flex items-center justify-center bg-black/5">
                        <video
                          src={media.url}
                          className="h-full w-full object-cover"
                          muted
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Film className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={media.url}
                        alt={`Attachment ${index + 1}`}
                        className="h-28 w-full object-cover"
                      />
                    )}
                    <button
                      onClick={() => removeMedia(index)}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 bg-black/50 text-white text-[9px] truncate">
                      {media.name}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Toolbar: Attach, Emoji - ALWAYS VISIBLE */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {/* Attach File Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 gap-1"
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    fileInputRef.current?.click();
                  }}
                  disabled={isUploading || attachedMedia.length >= 10}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                  <span className="text-xs">Attach</span>
                </Button>

                {/* Add Image */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 gap-1"
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'image/jpeg,image/png,image/webp,image/gif';
                      fileInputRef.current.click();
                    }
                  }}
                  disabled={isUploading || attachedMedia.length >= 10}
                >
                  <ImageIcon className="h-4 w-4" />
                  <span className="text-xs">Photo</span>
                </Button>

                {/* Add Video */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 gap-1"
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'video/mp4,video/webm,video/quicktime';
                      fileInputRef.current.click();
                    }
                  }}
                  disabled={isUploading || attachedMedia.length >= 10}
                >
                  <Film className="h-4 w-4" />
                  <span className="text-xs">Video</span>
                </Button>

                {/* Emoji Picker */}
                <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 gap-1"
                    >
                      <Smile className="h-4 w-4" />
                      <span className="text-xs">Emoji</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start" side="top">
                    <div className="max-h-72 overflow-y-auto">
                      {EMOJI_CATEGORIES.map((cat) => (
                        <div key={cat.name} className="px-2 pt-2 pb-1">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{cat.name}</p>
                          <div className="grid grid-cols-8 gap-0.5">
                            {cat.emojis.map((emoji, i) => (
                              <button
                                key={`${emoji}-${i}`}
                                onClick={() => {
                                  insertEmoji(emoji);
                                  if (!isExpanded) setIsExpanded(true);
                                }}
                                className="h-8 w-8 flex items-center justify-center text-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Post button - always visible when there's content */}
              {hasContent && (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  {isSubmitting ? (
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Post
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Expanded section: Tags, Visibility, Post */}
            {isExpanded && (
              <div className="mt-3 space-y-3">
                {/* Tag Input */}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add a tag (press Enter)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    className="h-8 text-xs"
                  />
                  <Button variant="outline" size="sm" onClick={addTag} className="h-8 px-2 flex-shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="outline" className={`text-xs pr-1 ${getSkillColor(tag)}`}>
                        {tag}
                        <button onClick={() => removeTag(tag)} className="ml-1 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                {/* Visibility & Post */}
                <div className="flex items-center justify-between">
                  <Select value={visibility} onValueChange={setVisibility}>
                    <SelectTrigger className="h-8 w-[130px] text-xs">
                      <Globe2 className="h-3.5 w-3.5 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">🌐 Public</SelectItem>
                      <SelectItem value="connections">🔗 Connections</SelectItem>
                      <SelectItem value="private">🔒 Private</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleSubmit}
                    disabled={!hasContent || isSubmitting}
                    className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  >
                    {isSubmitting ? (
                      <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Post
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Reaction Buttons ───

function ReactionBar({
  post,
  onReact,
}: {
  post: SocialPost;
  onReact: (emoji: string) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const { user } = useAuthStore();

  const reactionMap = new Map(post.reactionSummary?.map((r) => [r.emoji, r]) || []);

  return (
    <div className="flex items-center gap-1 relative">
      {/* Quick reaction */}
      <div
        className="relative"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-emerald-600"
          onClick={() => onReact('👍')}
        >
          <ThumbsUp className={`h-4 w-4 mr-1 ${reactionMap.get('👍')?.hasReacted ? 'text-emerald-600 fill-emerald-600' : ''}`} />
          {reactionMap.get('👍')?.count || 0}
        </Button>

        {/* Emoji picker on hover */}
        {hovering && (
          <div className="absolute bottom-full left-0 mb-1 bg-card border border-border rounded-full shadow-lg px-2 py-1 flex items-center gap-1 z-20">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className={`text-lg hover:scale-125 transition-transform p-1 rounded-full ${
                  reactionMap.get(emoji)?.hasReacted ? 'bg-emerald-100 dark:bg-emerald-900/30' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Show other active reactions */}
      {post.reactionSummary?.filter((r) => r.emoji !== '👍' && r.count > 0).map((r) => (
        <Button
          key={r.emoji}
          variant="ghost"
          size="sm"
          className={`h-8 px-2 text-xs ${r.hasReacted ? 'text-emerald-600' : 'text-muted-foreground'}`}
          onClick={() => onReact(r.emoji)}
        >
          <span className="mr-1">{r.emoji}</span>
          {r.count}
        </Button>
      ))}

      {/* Total reactions if no specific shown */}
      {(!post.reactionSummary || post.reactionSummary.length === 0) && (
        <span className="text-xs text-muted-foreground ml-1">0</span>
      )}
    </div>
  );
}

// ─── Post Card ───

function PostCard({
  post,
  onReact,
  onDelete,
  onEdit,
}: {
  post: SocialPost;
  onReact: (postId: string, emoji: string) => void;
  onDelete: (postId: string) => void;
  onEdit: (postId: string, data: { content?: string; imageUrls?: string; tags?: string; visibility?: string }) => void;
}) {
  const { user } = useAuthStore();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editVisibility, setEditVisibility] = useState('public');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const isOwnPost = user?.id === post.userId;
  const images = parseImageUrls(post.imageUrls);
  const tags = parseTags(post.tags);

  const fetchComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const res = await api.get(`/social/posts/${post.id}/comments`);
      if (res.success) setComments(res.data);
    } catch {
      // silently fail
    } finally {
      setCommentsLoading(false);
    }
  }, [post.id]);

  const toggleComments = () => {
    if (!showComments) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await api.post(`/social/posts/${post.id}/comments`, {
        content: commentText.trim(),
      });
      if (res.success) {
        setComments([...comments, res.data]);
        setCommentText('');
        toast.success('Comment added');
      } else {
        toast.error(res.error || 'Failed to add comment');
      }
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const startEditing = () => {
    setEditContent(post.content);
    setEditTags(post.tags || '');
    setEditVisibility(post.visibility || 'public');
    setIsEditing(true);
    setShowMenu(false);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditContent('');
    setEditTags('');
    setEditVisibility('public');
  };

  const saveEdit = async () => {
    if (!editContent.trim()) {
      toast.error('Post content cannot be empty');
      return;
    }
    setIsSavingEdit(true);
    try {
      const data: Record<string, string> = {};
      if (editContent !== post.content) data.content = editContent;
      if (editTags !== (post.tags || '')) data.tags = editTags;
      if (editVisibility !== post.visibility) data.visibility = editVisibility;

      if (Object.keys(data).length === 0) {
        cancelEditing();
        return;
      }

      onEdit(post.id, data);
      setIsEditing(false);
      toast.success('Post updated');
    } catch {
      toast.error('Failed to update post');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const authorName = post.user?.profile?.fullName || post.user?.email || 'User';
  const authorTitle = post.user?.profile?.jobTitle || '';
  const authorCompany = post.user?.company?.name || '';
  const authorPhoto = post.user?.profile?.profilePhoto;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <ProfileAvatar src={authorPhoto} name={authorName} className="h-10 w-10 flex-shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-foreground truncate">{authorName}</span>
                {post.user?.company?.verified && <VerifiedBadge verified={post.user.company.verified} />}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {authorTitle}{authorTitle && authorCompany ? ' at ' : ''}{authorCompany}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                <Clock className="h-3 w-3" />
                {relativeTime(post.createdAt)}
                {post.visibility === 'connections' && (
                  <span className="flex items-center gap-0.5 ml-1">
                    <Link2 className="h-3 w-3" /> Connections only
                  </span>
                )}
                {post.visibility === 'private' && (
                  <span className="ml-1">🔒 Private</span>
                )}
              </div>
            </div>
          </div>
          {isOwnPost && (
            <div className="relative">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowMenu(!showMenu)}>
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
              {showMenu && (
                <div className="absolute right-0 top-8 bg-card border border-border rounded-md shadow-lg z-10 py-1 min-w-[120px]">
                  <button
                    onClick={startEditing}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted w-full"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit Post
                  </button>
                  <button
                    onClick={() => { onDelete(post.id); setShowMenu(false); }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 w-full"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-2 px-4">
        {isEditing ? (
          /* Edit Form */
          <div className="space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[80px] resize-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-emerald-500/30 p-3 text-sm"
              maxLength={5000}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="Tags (comma separated)"
                className="h-8 text-xs flex-1"
              />
              <Select value={editVisibility} onValueChange={setEditVisibility}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <Globe2 className="h-3.5 w-3.5 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">🌐 Public</SelectItem>
                  <SelectItem value="connections">🔗 Connections</SelectItem>
                  <SelectItem value="private">🔒 Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={cancelEditing} className="h-8 px-3 text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveEdit}
                disabled={isSavingEdit || !editContent.trim()}
                className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                {isSavingEdit ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{post.content}</p>
            {images.length > 0 && (
              <div className={`mt-3 grid gap-2 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                {images.slice(0, 4).map((url, idx) => {
                  const isVideo = /\.(mp4|webm|mov|avi)$/i.test(url);
                  return (
                    <div key={idx} className={`relative rounded-lg overflow-hidden bg-muted ${images.length > 2 && idx === 3 ? 'col-span-1' : ''}`}>
                      {isVideo ? (
                        <video
                          src={url}
                          controls
                          preload="metadata"
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <img
                          src={url}
                          alt={`Post media ${idx + 1}`}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      {images.length > 4 && idx === 3 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-lg">
                          +{images.length - 4}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {tags.map((tag) => (
                  <SkillBadge key={tag} skill={tag} />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>

      <Separator className="mx-4" />

      <CardFooter className="py-1 px-4 flex items-center justify-between">
        <ReactionBar post={post} onReact={(emoji) => onReact(post.id, emoji)} />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-emerald-600"
            onClick={toggleComments}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            {post.commentCount || comments.length || 0}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-emerald-600"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
              toast.success('Link copied to clipboard');
            }}
          >
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
        </div>
      </CardFooter>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-border px-4 py-3">
          {commentsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-5 flex-1" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No comments yet. Be the first!</p>
              )}
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <ProfileAvatar
                    src={comment.user?.profile?.profilePhoto}
                    name={comment.user?.profile?.fullName || 'User'}
                    className="h-7 w-7 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="bg-muted/60 rounded-lg px-3 py-2">
                      <span className="font-semibold text-xs text-foreground">
                        {comment.user?.profile?.fullName || 'User'}
                      </span>
                      <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-3">{relativeTime(comment.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Add Comment */}
          <div className="flex gap-2 mt-3">
            <ProfileAvatar
              src={user?.profile?.profilePhoto}
              name={user?.profile?.fullName || user?.email || 'U'}
              className="h-7 w-7 flex-shrink-0"
            />
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
                className="h-8 text-xs"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-1.5 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400">
                    <Smile className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="end" side="top">
                  <div className="max-h-56 overflow-y-auto">
                    {EMOJI_CATEGORIES.slice(0, 3).map((cat) => (
                      <div key={cat.name} className="px-2 pt-2 pb-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{cat.name}</p>
                        <div className="grid grid-cols-8 gap-0.5">
                          {cat.emojis.map((emoji, i) => (
                            <button
                              key={`${emoji}-${i}`}
                              onClick={() => setCommentText((prev) => prev + emoji)}
                              className="h-7 w-7 flex items-center justify-center text-base hover:bg-muted rounded transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-1.5 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                title="Attach file"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={submitComment}
                disabled={!commentText.trim() || submittingComment}
                className="h-8 px-2 text-emerald-600 hover:text-emerald-700"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Feed Tab ───

function FeedTab() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await api.get('/social/posts', { page: String(pageNum), limit: '10' });
      if (res.success) {
        const newPosts = res.data || [];
        setPosts(append ? (prev) => [...prev, ...newPosts] : newPosts);
        setHasMore(pageNum < (res.meta?.totalPages || 1));
      }
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

  // Infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!loadMoreRef.current || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPosts(nextPage, true);
        }
      },
      { threshold: 0.5 }
    );
    observerRef.current.observe(loadMoreRef.current);

    return () => { if (observerRef.current) observerRef.current.disconnect(); };
  }, [hasMore, loadingMore, page, fetchPosts]);

  const handleReact = async (postId: string, emoji: string) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const summary = [...(p.reactionSummary || [])];
        const existingIdx = summary.findIndex((r) => r.emoji === emoji);
        if (existingIdx >= 0) {
          const existing = { ...summary[existingIdx] };
          if (existing.hasReacted) {
            existing.count = Math.max(0, existing.count - 1);
            existing.hasReacted = false;
          } else {
            existing.count += 1;
            existing.hasReacted = true;
          }
          summary[existingIdx] = existing;
        } else {
          summary.push({ emoji, count: 1, hasReacted: true, users: [] });
        }
        return { ...p, reactionSummary: summary };
      })
    );

    try {
      const res = await api.patch(`/social/posts/${postId}`, { emoji });
      if (!res.success) {
        // Revert on failure
        fetchPosts(1);
        toast.error(res.error || 'Failed to react');
      }
    } catch {
      fetchPosts(1);
      toast.error('Failed to react');
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      const res = await api.delete(`/social/posts/${postId}`);
      if (res.success) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        toast.success('Post deleted');
      } else {
        toast.error(res.error || 'Failed to delete post');
      }
    } catch {
      toast.error('Failed to delete post');
    }
  };

  const handleEdit = async (postId: string, data: { content?: string; imageUrls?: string; tags?: string; visibility?: string }) => {
    try {
      const res = await api.put(`/social/posts/${postId}`, data);
      if (res.success) {
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, ...data, updatedAt: new Date().toISOString() } : p));
      } else {
        toast.error(res.error || 'Failed to update post');
      }
    } catch {
      toast.error('Failed to update post');
    }
  };

  const handlePostCreated = () => {
    fetchPosts(1);
  };

  return (
    <div>
      <CreatePostBox onPostCreated={handlePostCreated} />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-20 w-full mt-2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="font-semibold text-sm text-foreground">No posts yet</h3>
            <p className="text-xs text-muted-foreground mt-1">Be the first to share something with your network!</p>
          </div>
        </Card>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onReact={handleReact} onDelete={handleDelete} onEdit={handleEdit} />
          ))}
          <div ref={loadMoreRef} className="py-4 text-center">
            {loadingMore && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <div className="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                Loading more...
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <p className="text-xs text-muted-foreground">You&apos;re all caught up!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Discover Tab ───

function DiscoverTab() {
  const { user } = useAuthStore();
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set());
  const [endorsingSkills, setEndorsingSkills] = useState<Set<string>>(new Set());

  const fetchProfiles = useCallback(async (pageNum: number, append = false, searchOverride?: string, industryOverride?: string) => {
    if (pageNum === 1) setLoading(true);
    try {
      const params: Record<string, string> = { page: String(pageNum), limit: '12' };
      const s = searchOverride !== undefined ? searchOverride : search;
      const ind = industryOverride !== undefined ? industryOverride : industry;
      if (s) params.search = s;
      if (ind) params.industry = ind;

      const res = await api.get('/social/discover', params);
      if (res.success) {
        const newProfiles = res.data || [];
        setProfiles(append ? (prev) => [...prev, ...newProfiles] : newProfiles);
        setHasMore(pageNum < (res.meta?.totalPages || 1));
      }
    } catch {
      toast.error('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, [search, industry]);

  useEffect(() => {
    fetchProfiles(1);
  }, [fetchProfiles]);

  const handleSearch = () => {
    setPage(1);
    fetchProfiles(1, false, search, industry);
  };

  const handleConnect = async (profile: DiscoverProfile) => {
    const key = profile.userId;
    setConnectingIds((prev) => new Set(prev).add(key));

    // Optimistic
    setProfiles((prev) =>
      prev.map((p) =>
        p.userId === key ? { ...p, connectionStatus: 'pending', connectionDirection: 'sent' } : p
      )
    );

    try {
      const res = await api.post('/social/connections', { receiverId: key });
      if (res.success) {
        toast.success(`Connection request sent to ${profile.fullName}`);
      } else {
        // Revert
        setProfiles((prev) =>
          prev.map((p) => (p.userId === key ? { ...p, connectionStatus: 'none', connectionDirection: null } : p))
        );
        toast.error(res.error || 'Failed to send request');
      }
    } catch {
      setProfiles((prev) =>
        prev.map((p) => (p.userId === key ? { ...p, connectionStatus: 'none', connectionDirection: null } : p))
      );
      toast.error('Failed to send request');
    } finally {
      setConnectingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleEndorse = async (profile: DiscoverProfile, skill: string) => {
    const endorseKey = `${profile.userId}-${skill}`;
    setEndorsingSkills((prev) => new Set(prev).add(endorseKey));

    try {
      const res = await api.post('/social/endorsements', { toUserId: profile.userId, skill });
      if (res.success) {
        toast.success(`Endorsed ${profile.fullName} for ${skill}`);
        // Update topSkills optimistically
        setProfiles((prev) =>
          prev.map((p) => {
            if (p.userId !== profile.userId) return p;
            const updatedSkills = p.topSkills.map((s) =>
              s.skill === skill ? { ...s, count: s.count + 1 } : s
            );
            if (!updatedSkills.find((s) => s.skill === skill)) {
              updatedSkills.push({ skill, count: 1 });
            }
            return { ...p, topSkills: updatedSkills };
          })
        );
      } else {
        toast.error(res.error || 'Failed to endorse');
      }
    } catch {
      toast.error('Failed to endorse');
    } finally {
      setEndorsingSkills((prev) => {
        const next = new Set(prev);
        next.delete(endorseKey);
        return next;
      });
    }
  };

  const getConnectionButton = (profile: DiscoverProfile) => {
    const isLoading = connectingIds.has(profile.userId);
    switch (profile.connectionStatus) {
      case 'connected':
        return (
          <Button variant="outline" size="sm" className="h-7 text-xs w-full" disabled>
            <Handshake className="h-3.5 w-3.5 mr-1" />
            Connected
          </Button>
        );
      case 'pending':
        return (
          <Button variant="outline" size="sm" className="h-7 text-xs w-full text-amber-600 border-amber-200 dark:border-amber-800" disabled>
            <Clock className="h-3.5 w-3.5 mr-1" />
            Pending
          </Button>
        );
      default:
        return (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
            onClick={() => handleConnect(profile)}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="h-3.5 w-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-1" />
            ) : (
              <UserPlus className="h-3.5 w-3.5 mr-1" />
            )}
            Connect
          </Button>
        );
    }
  };

  return (
    <div>
      {/* Search Bar */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, title, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={industry} onValueChange={(v) => { setIndustry(v === 'all' ? '' : v); }}>
              <SelectTrigger className="h-9 w-[150px] text-xs">
                <Building2 className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {INDUSTRY_OPTIONS.map((ind) => (
                  <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3">
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="font-semibold text-sm text-foreground">No profiles found</h3>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search filters</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profiles.map((profile) => {
              const skills = parseSkillTags(profile.skillTags);
              return (
                <Card key={profile.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <ProfileAvatar src={profile.profilePhoto} name={profile.fullName} className="h-12 w-12 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-semibold text-sm text-foreground truncate">{profile.fullName}</h4>
                          {profile.verified && <VerifiedBadge verified={profile.verified} />}
                        </div>
                        {profile.jobTitle && (
                          <p className="text-xs text-muted-foreground truncate">{profile.jobTitle}</p>
                        )}
                        {profile.user?.company && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                            <Building2 className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{profile.user.company.name}</span>
                            {profile.user.company.verified && <VerifiedBadge verified={profile.user.company.verified} />}
                          </div>
                        )}
                        {profile.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span>{profile.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {skills.slice(0, 4).map((skill) => {
                        const topSkill = profile.topSkills?.find((s) => s.skill === skill);
                        const endorseKey = `${profile.userId}-${skill}`;
                        const isEndorsing = endorsingSkills.has(endorseKey);
                        return (
                          <button
                            key={skill}
                            onClick={() => handleEndorse(profile, skill)}
                            disabled={isEndorsing || profile.userId === user?.id}
                            className="group"
                          >
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${getSkillColor(skill)} cursor-pointer hover:ring-1 hover:ring-emerald-500/30 transition-all ${
                                profile.userId === user?.id ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {isEndorsing ? (
                                <div className="h-2.5 w-2.5 border border-current border-t-transparent rounded-full animate-spin mr-0.5" />
                              ) : (
                                <Plus className="h-2.5 w-2.5 mr-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                              {skill}
                              {topSkill && topSkill.count > 0 && (
                                <span className="ml-0.5 text-[9px] opacity-60">({topSkill.count})</span>
                              )}
                            </Badge>
                          </button>
                        );
                      })}
                      {skills.length > 4 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50 text-muted-foreground">
                          +{skills.length - 4}
                        </Badge>
                      )}
                    </div>

                    {/* Endorsement count */}
                    {profile.totalEndorsements > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-600">
                        <Award className="h-3 w-3" />
                        {profile.totalEndorsements} endorsement{profile.totalEndorsements !== 1 ? 's' : ''}
                      </div>
                    )}

                    {/* Connect Button */}
                    <div className="mt-3">
                      {getConnectionButton(profile)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {hasMore && (
            <div className="py-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  fetchProfiles(next, true);
                }}
                className="text-xs"
              >
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── My Network Tab ───

function MyNetworkTab() {
  const [subTab, setSubTab] = useState<'connections' | 'pending' | 'sent'>('connections');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningIds, setActioningIds] = useState<Set<string>>(new Set());

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      let type = 'all';
      let status = 'accepted';
      if (subTab === 'pending') { type = 'received'; status = 'pending'; }
      else if (subTab === 'sent') { type = 'sent'; status = 'pending'; }

      const res = await api.get('/social/connections', { status, type, limit: '50' });
      if (res.success) setConnections(res.data || []);
    } catch {
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, [subTab]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleAccept = async (connId: string) => {
    setActioningIds((prev) => new Set(prev).add(connId));
    // Optimistic
    setConnections((prev) => prev.filter((c) => c.id !== connId));
    try {
      const res = await api.patch(`/social/connections/${connId}`, { action: 'accept' });
      if (res.success) {
        toast.success('Connection accepted');
      } else {
        fetchConnections();
        toast.error(res.error || 'Failed to accept');
      }
    } catch {
      fetchConnections();
      toast.error('Failed to accept');
    } finally {
      setActioningIds((prev) => { const n = new Set(prev); n.delete(connId); return n; });
    }
  };

  const handleDecline = async (connId: string) => {
    setActioningIds((prev) => new Set(prev).add(connId));
    setConnections((prev) => prev.filter((c) => c.id !== connId));
    try {
      const res = await api.patch(`/social/connections/${connId}`, { action: 'decline' });
      if (res.success) {
        toast.success('Connection declined');
      } else {
        fetchConnections();
        toast.error(res.error || 'Failed to decline');
      }
    } catch {
      fetchConnections();
      toast.error('Failed to decline');
    } finally {
      setActioningIds((prev) => { const n = new Set(prev); n.delete(connId); return n; });
    }
  };

  const handleWithdraw = async (connId: string) => {
    setActioningIds((prev) => new Set(prev).add(connId));
    setConnections((prev) => prev.filter((c) => c.id !== connId));
    try {
      const res = await api.delete(`/social/connections/${connId}`);
      if (res.success) {
        toast.success('Request withdrawn');
      } else {
        fetchConnections();
        toast.error(res.error || 'Failed to withdraw');
      }
    } catch {
      fetchConnections();
      toast.error('Failed to withdraw');
    } finally {
      setActioningIds((prev) => { const n = new Set(prev); n.delete(connId); return n; });
    }
  };

  const handleRemove = async (connId: string) => {
    setActioningIds((prev) => new Set(prev).add(connId));
    setConnections((prev) => prev.filter((c) => c.id !== connId));
    try {
      const res = await api.delete(`/social/connections/${connId}`);
      if (res.success) {
        toast.success('Connection removed');
      } else {
        fetchConnections();
        toast.error(res.error || 'Failed to remove');
      }
    } catch {
      fetchConnections();
      toast.error('Failed to remove');
    } finally {
      setActioningIds((prev) => { const n = new Set(prev); n.delete(connId); return n; });
    }
  };

  const getOtherUser = (conn: Connection) => {
    return conn.direction === 'sent' ? conn.receiver : conn.requester;
  };

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex items-center gap-2 mb-4">
        {(['connections', 'pending', 'sent'] as const).map((tab) => (
          <Button
            key={tab}
            variant={subTab === tab ? 'default' : 'outline'}
            size="sm"
            className={`h-8 text-xs ${
              subTab === tab
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'text-muted-foreground'
            }`}
            onClick={() => setSubTab(tab)}
          >
            {tab === 'connections' && <Handshake className="h-3.5 w-3.5 mr-1" />}
            {tab === 'pending' && <Clock className="h-3.5 w-3.5 mr-1" />}
            {tab === 'sent' && <Send className="h-3.5 w-3.5 mr-1" />}
            {tab === 'connections' ? 'Connections' : tab === 'pending' ? 'Pending' : 'Sent'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : connections.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            {subTab === 'connections' && <Handshake className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />}
            {subTab === 'pending' && <Clock className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />}
            {subTab === 'sent' && <Send className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />}
            <h3 className="font-semibold text-sm text-foreground">
              {subTab === 'connections' ? 'No connections yet' : subTab === 'pending' ? 'No pending requests' : 'No sent requests'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {subTab === 'connections' ? 'Start connecting with professionals in your network' :
               subTab === 'pending' ? 'You have no pending connection requests' :
               'You haven\'t sent any connection requests'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-1">
          {connections.map((conn) => {
            const other = getOtherUser(conn);
            const otherName = other?.profile?.fullName || other?.email || 'User';
            const otherTitle = other?.profile?.jobTitle || '';
            const otherCompany = other?.company?.name || '';
            const otherPhoto = other?.profile?.profilePhoto;
            const isActioning = actioningIds.has(conn.id);

            return (
              <Card key={conn.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <ProfileAvatar src={otherPhoto} name={otherName} className="h-10 w-10 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-foreground truncate">{otherName}</span>
                        {other?.company?.verified && <VerifiedBadge verified={other.company.verified} />}
                      </div>
                      {otherTitle && (
                        <p className="text-xs text-muted-foreground truncate">{otherTitle}</p>
                      )}
                      {otherCompany && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{otherCompany}</span>
                        </div>
                      )}
                      {conn.message && (
                        <p className="text-xs text-muted-foreground mt-1 italic truncate">&ldquo;{conn.message}&rdquo;</p>
                      )}
                      <span className="text-[10px] text-muted-foreground">{relativeTime(conn.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {subTab === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleAccept(conn.id)}
                            disabled={isActioning}
                          >
                            {isActioning ? <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                            onClick={() => handleDecline(conn.id)}
                            disabled={isActioning}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {subTab === 'sent' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                          onClick={() => handleWithdraw(conn.id)}
                          disabled={isActioning}
                        >
                          {isActioning ? <div className="h-3 w-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <X className="h-3.5 w-3.5" />}
                          Withdraw
                        </Button>
                      )}
                      {subTab === 'connections' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-red-600"
                          onClick={() => handleRemove(conn.id)}
                          disabled={isActioning}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Right Sidebar ───

function RightSidebar() {
  const { user } = useAuthStore();
  const [pendingCount, setPendingCount] = useState(0);
  const [suggested, setSuggested] = useState<DiscoverProfile[]>([]);
  const [trendingSkills, setTrendingSkills] = useState<Array<{ skill: string; count: number }>>([]);
  const [topEndorsed, setTopEndorsed] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [pendingRes, discoverRes] = await Promise.all([
          api.get('/social/connections', { status: 'pending', type: 'received', limit: '5' }),
          api.get('/social/discover', { limit: '6' }),
        ]);
        setPendingCount(pendingRes.meta?.total || 0);
        const discoverData = discoverRes.data || [];
        setSuggested(discoverData.slice(0, 3));
        setTopEndorsed(
          [...discoverData]
            .sort((a, b) => (b.totalEndorsements || 0) - (a.totalEndorsements || 0))
            .slice(0, 3)
        );

        // Build trending skills from discover results
        const skillCounts = new Map<string, number>();
        discoverData.forEach((p: DiscoverProfile) => {
          const skills = parseSkillTags(p.skillTags);
          skills.forEach((skill) => {
            skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
          });
        });
        const sorted = Array.from(skillCounts.entries())
          .map(([skill, count]) => ({ skill, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);
        setTrendingSkills(sorted);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleQuickConnect = async (profile: DiscoverProfile) => {
    try {
      const res = await api.post('/social/connections', { receiverId: profile.userId });
      if (res.success) {
        toast.success(`Connected with ${profile.fullName}`);
        setSuggested((prev) => prev.filter((p) => p.userId !== profile.userId));
      } else {
        toast.error(res.error || 'Failed to connect');
      }
    } catch {
      toast.error('Failed to connect');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2 pt-4 px-4">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="pb-4 px-4 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pending Requests Summary */}
      {pendingCount > 0 && (
        <Card className="border-amber-200 dark:border-amber-800/50">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-sm">
                {pendingCount}
              </div>
              <p className="text-xs text-muted-foreground">
                {pendingCount} pending connection {pendingCount === 1 ? 'request' : 'requests'} waiting for your review
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggested Connections */}
      {suggested.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Suggested For You
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4 space-y-3">
            {suggested.map((profile) => (
              <div key={profile.userId} className="flex items-center gap-2.5">
                <ProfileAvatar src={profile.profilePhoto} name={profile.fullName} className="h-9 w-9 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-xs text-foreground truncate">{profile.fullName}</span>
                    {profile.verified && <VerifiedBadge verified={profile.verified} />}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {profile.jobTitle}{profile.user?.company ? ` at ${profile.user.company.name}` : ''}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30 flex-shrink-0"
                  onClick={() => handleQuickConnect(profile)}
                >
                  <UserPlus className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Trending Skills */}
      {trendingSkills.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Trending Skills
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="flex flex-wrap gap-1.5">
              {trendingSkills.map(({ skill, count }) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className={`text-[10px] px-2 py-0.5 ${getSkillColor(skill)}`}
                >
                  {skill}
                  <span className="ml-1 text-[9px] opacity-60">· {count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Endorsed Professionals */}
      {topEndorsed.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
              <Star className="h-3.5 w-3.5" />
              Top Endorsed
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4 space-y-3">
            {topEndorsed.map((profile, idx) => (
              <div key={profile.userId} className="flex items-center gap-2.5">
                <div className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-[10px] flex-shrink-0">
                  {idx + 1}
                </div>
                <ProfileAvatar src={profile.profilePhoto} name={profile.fullName} className="h-8 w-8 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-xs text-foreground truncate block">{profile.fullName}</span>
                  <div className="flex items-center gap-1 text-[10px] text-amber-600">
                    <Award className="h-3 w-3" />
                    {profile.totalEndorsements} endorsements
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {pendingCount === 0 && suggested.length === 0 && trendingSkills.length === 0 && topEndorsed.length === 0 && (
        <Card className="p-6">
          <div className="text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Grow your network to see suggestions here</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ==========================================
// Main Component
// ==========================================

export function SocialCircleView() {
  const [activeTab, setActiveTab] = useState('feed');

  return (
    <div className="min-h-screen bg-background">
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground));
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-600" />
            Social Circle
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Connect, share, and grow your professional network</p>
        </div>

        {/* Three-column layout on desktop, single column on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - hidden on mobile */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-20">
              <LeftSidebar />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full mb-4 bg-muted/50">
                <TabsTrigger value="feed" className="flex-1 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                  <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                  Feed
                </TabsTrigger>
                <TabsTrigger value="discover" className="flex-1 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                  <Search className="h-3.5 w-3.5 mr-1.5" />
                  Discover
                </TabsTrigger>
                <TabsTrigger value="network" className="flex-1 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  My Network
                </TabsTrigger>
              </TabsList>

              <TabsContent value="feed" className="mt-0">
                <FeedTab />
              </TabsContent>

              <TabsContent value="discover" className="mt-0">
                <DiscoverTab />
              </TabsContent>

              <TabsContent value="network" className="mt-0">
                <MyNetworkTab />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - hidden on mobile */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-20">
              <RightSidebar />
            </div>
          </div>
        </div>

        {/* Mobile: show sidebars as bottom sheets / quick access */}
        <div className="lg:hidden mt-6">
          <Separator className="mb-6" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Quick Access
              </h3>
              <LeftSidebar />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Trending
              </h3>
              <RightSidebar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
