import { create } from 'zustand';
import { User, Company, Tender, Bid, Project, EventItem, Chat, Notification, Document, BidAnalysis } from '@/lib/api';
import { api } from '@/lib/api';

// Auth Store
interface AuthState {
  user: User | null;
  company: Company | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: Record<string, string>) => Promise<boolean>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  company: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('tenet_token') : null,
  isLoading: true,

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success) {
      localStorage.setItem('tenet_token', res.data.token);
      set({ user: res.data.user, token: res.data.token });
      return true;
    }
    return false;
  },

  register: async (data) => {
    const res = await api.post('/auth/register', data);
    if (res.success) {
      localStorage.setItem('tenet_token', res.data.token);
      set({ user: res.data.user, token: res.data.token });
      return true;
    }
    return false;
  },

  logout: () => {
    localStorage.removeItem('tenet_token');
    set({ user: null, company: null, token: null });
  },

  fetchMe: async () => {
    const res = await api.get('/auth/me');
    if (res.success) {
      set({ user: res.data, company: res.data?.company || null, isLoading: false });
    } else {
      localStorage.removeItem('tenet_token');
      set({ user: null, company: null, token: null, isLoading: false });
    }
  },

  setUser: (user) => set({ user }),
}));

// Navigation Store
type View = 'dashboard' | 'tenders' | 'live-tenders' | 'tender-detail' | 'tender-compare' | 'bid-compare' | 'bid-analysis' | 'bids' | 'projects' | 'project-detail' | 'chat' | 'finance' | 'events' | 'profile' | 'documents' | 'agent' | 'staff' | 'contact-us' | 'privacy-policy';

interface NavState {
  view: View;
  viewParams: Record<string, string>;
  setView: (view: View, params?: Record<string, string>) => void;
}

export const useNavStore = create<NavState>((set) => ({
  view: 'dashboard',
  viewParams: {},
  setView: (view, params = {}) => set({ view, viewParams: params }),
}));

// Data Stores
interface DataState {
  tenders: Tender[];
  bids: Bid[];
  projects: Project[];
  events: EventItem[];
  documents: Document[];
  chats: Chat[];
  notifications: Notification[];
  bidAnalyses: BidAnalysis[];
  loading: Record<string, boolean>;

  fetchTenders: (params?: Record<string, string>) => Promise<void>;
  fetchBids: (params?: Record<string, string>) => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchEvents: () => Promise<void>;
  fetchDocuments: () => Promise<void>;
  fetchChats: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchCompany: (companyId: string) => Promise<void>;
  fetchBidAnalyses: (tenderId: string) => Promise<void>;
  setLoading: (key: string, val: boolean) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  tenders: [],
  bids: [],
  projects: [],
  events: [],
  documents: [],
  chats: [],
  notifications: [],
  bidAnalyses: [],
  loading: {},

  fetchTenders: async (params) => {
    get().setLoading('tenders', true);
    const res = await api.get('/tenders', params);
    if (res.success) set({ tenders: res.data });
    get().setLoading('tenders', false);
  },

  fetchBids: async (params) => {
    get().setLoading('bids', true);
    const res = await api.get('/bids', params);
    if (res.success) set({ bids: res.data });
    get().setLoading('bids', false);
  },

  fetchProjects: async () => {
    get().setLoading('projects', true);
    const res = await api.get('/projects');
    if (res.success) set({ projects: res.data });
    get().setLoading('projects', false);
  },

  fetchEvents: async () => {
    get().setLoading('events', true);
    const res = await api.get('/events');
    if (res.success) set({ events: res.data });
    get().setLoading('events', false);
  },

  fetchDocuments: async () => {
    get().setLoading('documents', true);
    const res = await api.get('/documents');
    if (res.success) set({ documents: res.data });
    get().setLoading('documents', false);
  },

  fetchChats: async () => {
    get().setLoading('chats', true);
    const res = await api.get('/chats');
    if (res.success) set({ chats: res.data });
    get().setLoading('chats', false);
  },

  fetchNotifications: async () => {
    const res = await api.get('/notifications');
    if (res.success) set({ notifications: res.data });
  },

  fetchCompany: async (companyId) => {
    get().setLoading('company', true);
    const res = await api.get(`/companies/${companyId}`);
    if (res.success) {
      useAuthStore.setState({ company: res.data });
    }
    get().setLoading('company', false);
  },

  fetchBidAnalyses: async (tenderId) => {
    get().setLoading('bidAnalyses', true);
    const res = await api.get('/bid-analysis', { tenderId });
    if (res.success) set({ bidAnalyses: res.data });
    get().setLoading('bidAnalyses', false);
  },

  setLoading: (key, val) => set((s) => ({ loading: { ...s.loading, [key]: val } })),
}));
