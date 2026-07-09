// API client for the Tenet Tender Ecosystem

const API_BASE = '/api';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('tenet_token');
  }

  private headers(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async get(path: string, params?: Record<string, string>) {
    const url = new URL(`${API_BASE}${path}`, window.location.origin);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { headers: this.headers() });
    return res.json();
  }

  async post(path: string, data?: unknown) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return res.json();
  }

  async put(path: string, data: unknown) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  async patch(path: string, data: unknown) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  async delete(path: string) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    return res.json();
  }

  async upload(path: string, formData: FormData) {
    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return res.json();
  }
}

export const api = new ApiClient();

// Types

export interface Company {
  id: string;
  name: string;
  registrationNo?: string;
  industry: string;
  tinNumber?: string;
  address?: string;
  city?: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  verified: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  role: 'team_admin' | 'user';
  companyId?: string;
  status: string;
  emailVerified: boolean;
  company?: Company;
  profile?: Profile;
  createdAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  companyId?: string;
  fullName: string;
  jobTitle?: string;
  phone: string;
  location: string;
  address?: string;
  tinNumber?: string;
  licenseNumber?: string;
  skillTags: string;
  bio?: string;
  logoUrl?: string;
  profilePhoto?: string;
  verified: boolean;
  company?: Company;
}

export interface BidAnalysis {
  id: string;
  tenderId: string;
  summary: string; // JSON string
  rankings: string; // JSON string of array
  budgetAnalysis: string;
  recommendation: string;
  riskSummary: string;
  createdBy: string;
  createdAt: string;
}

export interface BidAnalysisResult {
  summary: { totalBids: number; averageScore: number };
  applicants: Array<{
    rank: number;
    name: string;
    company: string;
    overallScore: number;
    technicalScore: number;
    financialScore: number;
    strengths: string[];
    weaknesses: string[];
    recommendation: string;
    riskLevel: 'low' | 'medium' | 'high';
  }>;
  budgetAnalysis: string;
  riskSummary: string;
  finalRecommendation: string;
}

export interface Document {
  id: string;
  userId: string;
  docType: string;
  fileUrl: string;
  fileName: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface Tender {
  id: string;
  title: string;
  scope: string;
  budgetMin: number;
  budgetMax: number;
  deadline: string;
  location: string;
  categoryTags: string;
  requiredDocs: string;
  status: 'draft' | 'open' | 'closed' | 'awarded' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  matchScore?: number;
  _count?: { bids: number };
}

/**
 * A tender fetched live from an external public procurement API
 * (World Bank, EU TED, UNGM, etc.). Extends the local Tender shape so
 * existing card components can render it, plus carries provenance metadata.
 */
export interface LiveTender extends Tender {
  source: string;
  externalId: string;
  externalUrl: string;
  currency: string;
  borrower?: string;
  supplier?: string;
  contractType?: string;
  signingDate?: string;
  region?: string;
}

/**
 * Metadata describing an external tender data source — derived from the
 * uploaded API coverage document (Document2.pdf). Used to render the
 * "Data Sources" reference panel inside the Live Tenders view.
 */
export interface DataSource {
  id: string;
  name: string;
  coverage: string;
  access: string;
  link: string;
  live: boolean;
  accent: string;
}

export interface Bid {
  id: string;
  tenderId: string;
  userId: string;
  technicalProposal: string;
  financialProposal: number;
  timeline: string;
  attachments: string;
  status: 'pending_review' | 'shortlisted' | 'awarded' | 'rejected';
  rejectionNote?: string;
  createdAt: string;
  tender?: { id: string; title: string; status: string };
  user?: { id: string; email: string; profile?: { fullName: string; jobTitle?: string }; company?: { id: string; name: string } };
}

export interface Project {
  id: string;
  tenderId: string;
  bidId: string;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  contractValue: number;
  createdAt: string;
  tender?: { id: string; title: string; categoryTags: string };
  bid?: { id: string; financialProposal: number; timeline: string; user?: { profile?: { fullName: string } } };
  tasks?: Task[];
  milestones?: Milestone[];
  payments?: Payment[];
  chat?: Chat;
  _count?: { tasks: number; payments: number; milestones: number };
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  dueDate?: string;
  order: number;
  createdAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  dueDate: string;
  completed: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  projectId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  paymentDate: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  projectId?: string;
  tenderId?: string;
  contextType: 'tender' | 'project';
  createdAt: string;
  messages?: Message[];
  project?: {
    id: string;
    status: string;
    tender?: { id: string; title: string };
    bid?: { user?: { id: string; email: string; profile?: { fullName: string; jobTitle?: string } } };
  };
  _count?: { messages: number };
}

export interface Message {
  id: string;
  chatId: string;
  userId: string;
  content: string;
  flagged: boolean;
  read: boolean;
  createdAt: string;
  user?: { id: string; email: string; profile?: { fullName: string } };
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  location: string;
  capacity: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  category: 'workshop' | 'training' | 'seminar';
  createdAt: string;
  registrations?: { id: string; userId: string; attended: boolean }[];
  _count?: { registrations: number };
  isRegistered?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  link?: string;
  createdAt: string;
}

// ==========================================
// TELEGRAM-STYLE MESSAGING (Conversations)
// ==========================================

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  lastReadAt?: string;
  muted: boolean;
  pinned: boolean;
  user: {
    id: string;
    email: string;
    profile?: {
      fullName: string;
      jobTitle?: string;
      profilePhoto?: string;
    };
  };
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'channel' | 'project';
  title?: string;
  description?: string;
  avatarUrl?: string;
  createdBy: string;
  tenderId?: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  members?: ConversationMember[];
  messages?: ChatMessageItem[];
  _count?: { messages: number };
  unreadCount?: number;
  pinned?: boolean;
  muted?: boolean;
  lastReadAt?: string;
  myRole?: 'owner' | 'admin' | 'member';
}

export interface MessageReactionItem {
  id: string;
  emoji: string;
  userId: string;
  user: { id: string; profile?: { fullName: string } };
}

export interface ChatMessageItem {
  id: string;
  conversationId: string;
  userId: string;
  content: string;
  replyToId?: string;
  editedAt?: string;
  deletedAt?: string;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentName?: string;
  flagged: boolean;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile?: { fullName: string; profilePhoto?: string };
  };
  replyTo?: {
    id: string;
    content: string;
    userId: string;
    user?: { profile?: { fullName: string } };
  } | null;
  reactions: MessageReactionItem[];
}
