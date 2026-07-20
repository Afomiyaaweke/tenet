export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  company: string | null;
}

export interface Tender {
  id: string;
  title: string;
  organization: string;
  category: string;
  deadline: string;
  budget: string;
  description: string;
  requirements: string;
  location: string;
  status: string;
  bidCount: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: { name: string; company: string | null };
}

export const CATEGORIES = [
  'Construction',
  'IT',
  'Healthcare',
  'Education',
  'Energy',
  'Agriculture',
  'Transport',
  'Consulting',
];

export const STATUS_COLORS: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  closed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  awarded: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

export function parseRequirements(requirements: string): string[] {
  try {
    const parsed = JSON.parse(requirements);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function isDeadlineSoon(deadline: string): boolean {
  const d = new Date(deadline);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

export function isDeadlinePast(deadline: string): boolean {
  return new Date(deadline).getTime() < Date.now();
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
