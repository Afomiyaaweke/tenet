'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { TenetLogo } from '@/components/logo';
import {
  ShieldCheck,
  BrainCircuit,
  Lock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
  User,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  FileText,
  Fingerprint,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Globe,
  Hash,
  CreditCard,
  Users,
} from 'lucide-react';

const INDUSTRIES = [
  'Construction', 'IT & Technology', 'Healthcare', 'Supply & Logistics', 'Consulting',
  'Engineering', 'Architecture', 'Education', 'Finance', 'Agriculture',
  'Telecommunications', 'Manufacturing', 'Energy', 'Legal', 'General',
];

type RegStep = 1 | 2 | 3 | 4;

/* ───────────────────────── Social Login Buttons ───────────────────────── */

const SOCIAL_PROVIDERS = [
  {
    id: 'google',
    name: 'Google',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none">
        <path d="M22.56 12.24c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C8.07 21.68 10.88 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 8.07 1 4.48 3.29 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="#0A66C2">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.139 1.45-2.139 2.935v5.671H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="currentColor">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.145 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.621.242 2.842.118 3.145.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none">
        <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
        <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
        <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
        <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
      </svg>
    ),
  },
];

function SocialLoginButtons({ mode, loading, onLoadingChange }: { mode: 'login' | 'register'; loading: boolean; onLoadingChange: (loading: boolean) => void }) {
  const { socialLogin, login } = useAuthStore();
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleSocialLogin = async (providerId: string) => {
    // First, check if the provider is configured by hitting the API
    setSocialLoading(providerId);
    onLoadingChange(true);

    try {
      const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const checkUrl = `${appUrl}/api/auth/social?provider=${providerId}`;

      // Fetch the URL to check if provider is configured
      const response = await fetch(checkUrl, { method: 'GET', redirect: 'manual' });

      // If the response is HTML (type oauth-error), the provider is not configured
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        toast.info(`${providerId.charAt(0).toUpperCase() + providerId.slice(1)} sign-in is coming soon! Please use email & password for now.`, { duration: 5000 });
        setSocialLoading(null);
        onLoadingChange(false);
        return;
      }

      // If we got a redirect (opaque redirect response), the provider IS configured
      // Open OAuth in a popup window for the full flow
      const redirectUrl = `${appUrl}/api/auth/social?provider=${providerId}`;
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      const popup = window.open(
        redirectUrl,
        `${providerId}Login`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,resizable=yes`
      );

      // Listen for the callback message from the popup
      const handleMessage = async (event: MessageEvent) => {
        // Handle OAuth error (e.g., provider not configured)
        if (event.data?.type === 'oauth-error' && event.data?.provider === providerId) {
          window.removeEventListener('message', handleMessage);
          toast.error(event.data?.error || `${providerId} login is not available yet.`);
          setSocialLoading(null);
          onLoadingChange(false);
          popup?.close();
          return;
        }
        // Handle successful OAuth callback
        if (event.data?.type === 'oauth-callback' && event.data?.provider === providerId) {
          window.removeEventListener('message', handleMessage);
          if (event.data?.code) {
            const result = await socialLogin(providerId, event.data.code);
            if (!result.success) {
              toast.error(result.error || `${providerId} login failed`);
            } else {
              toast.success('Welcome to TenetBid!');
            }
          }
          setSocialLoading(null);
          onLoadingChange(false);
          popup?.close();
        }
      };

      window.addEventListener('message', handleMessage);

      // Fallback: if popup is closed without completing, clean up
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setSocialLoading(null);
          onLoadingChange(false);
        }
      }, 1000);

    } catch (error) {
      toast.error(`Failed to connect. Please use email/password to sign in.`);
      setSocialLoading(null);
      onLoadingChange(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 text-muted-foreground uppercase tracking-wider font-medium">
            {mode === 'login' ? 'Or continue with' : 'Or sign up with'}
          </span>
        </div>
      </div>

      {/* Social buttons grid with Coming Soon badges */}
      <div className="grid grid-cols-2 gap-2.5">
        {SOCIAL_PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            disabled={loading || !!socialLoading}
            onClick={() => handleSocialLogin(provider.id)}
            className="relative flex items-center justify-center gap-2 h-10 px-3 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 group"
          >
            {socialLoading === provider.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              provider.icon
            )}
            <span>{provider.name}</span>
            {/* Coming Soon badge */}
            <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[9px] font-bold leading-none rounded-full bg-orange-500/90 text-white shadow-sm">
              Soon
            </span>
          </button>
        ))}
      </div>

      {/* Hint text */}
      <p className="text-center text-xs text-muted-foreground/70">
        Social sign-in coming soon — use email &amp; password for now
      </p>
    </div>
  );
}

const REG_STEP_META: Record<RegStep, { label: string; icon: React.ElementType }> = {
  1: { label: 'Account', icon: Lock },
  2: { label: 'Company', icon: Building2 },
  3: { label: 'Personal', icon: User },
  4: { label: 'Review', icon: CheckCircle2 },
};

/* ───────────────────────── Animated Background Dots ───────────────────────── */
function FloatingDots() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large blurred circles */}
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/[0.04] animate-[float1_18s_ease-in-out_infinite]" />
      <div className="absolute top-1/3 -right-16 w-56 h-56 rounded-full bg-white/[0.06] animate-[float2_22s_ease-in-out_infinite]" />
      <div className="absolute bottom-1/4 left-1/4 w-40 h-40 rounded-full bg-white/[0.05] animate-[float3_16s_ease-in-out_infinite]" />
      <div className="absolute -bottom-10 right-1/3 w-64 h-64 rounded-full bg-white/[0.03] animate-[float1_20s_ease-in-out_infinite_2s]" />

      {/* Small dots grid */}
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-white/[0.15]"
          style={{
            top: `${10 + (i * 37) % 80}%`,
            left: `${5 + (i * 53) % 90}%`,
            animation: `pulse-dot ${2 + (i % 3)}s ease-in-out ${i * 0.3}s infinite alternate`,
          }}
        />
      ))}

      {/* Decorative ring */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-white/[0.04] animate-[spin-slow_60s_linear_infinite]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full border border-white/[0.06] animate-[spin-slow_45s_linear_infinite_reverse]" />
    </div>
  );
}

/* ───────────────────────── Feature Highlight ───────────────────────── */
function FeatureHighlight({ icon, title, delay }: { icon: React.ReactNode; title: string; delay: string }) {
  return (
    <div
      className="flex items-center gap-3 animate-[slideInLeft_0.5s_ease-out_both]"
      style={{ animationDelay: delay }}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-orange-200">
        {icon}
      </div>
      <span className="text-white/90 text-sm font-medium">{title}</span>
    </div>
  );
}

/* ───────────────────────── Password Strength Meter ───────────────────────── */
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 10;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[a-z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 20;
  if (/[^A-Za-z0-9]/.test(password)) score += 5;  // bonus only
  if (new Set(password.toLowerCase()).size >= 8) score += 5;

  if (score >= 70) return { score, label: 'Strong', color: 'bg-green-500' };
  if (score >= 50) return { score, label: 'Good', color: 'bg-blue-500' };
  if (score >= 30) return { score, label: 'Fair', color: 'bg-yellow-500' };
  return { score, label: 'Weak', color: 'bg-red-500' };
}

function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, color } = getPasswordStrength(password);
  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex gap-1">
        {[25, 50, 75, 100].map(threshold => (
          <div key={threshold} className="h-1.5 flex-1 rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-300 ${score >= threshold ? color : 'bg-transparent'}`}
              style={{ width: score >= threshold ? '100%' : '0%' }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">Strength:</span>
        <span className={`text-xs font-medium ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-blue-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>{label}</span>
      </div>
    </div>
  );
}

function PasswordRequirements({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
  ];
  return (
    <div className="space-y-1 mt-2">
      {checks.map(({ label, met }) => (
        <div key={label} className="flex items-center gap-1.5">
          {met ? (
            <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
          ) : (
            <div className="w-3 h-3 rounded-full border border-muted-foreground/30 flex-shrink-0" />
          )}
          <span className={`text-xs ${met ? 'text-green-600' : 'text-muted-foreground'}`}>{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Step Indicator ───────────────────────── */
function StepIndicator({ currentStep, totalSteps = 4 }: { currentStep: RegStep; totalSteps?: number }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {Array.from({ length: totalSteps }, (_, i) => (i + 1) as RegStep).map((step, i) => {
        const meta = REG_STEP_META[step];
        const isCompleted = currentStep > step;
        const isCurrent = currentStep === step;
        const Icon = meta.icon;
        return (
          <React.Fragment key={step}>
            <div className="flex items-center gap-1.5">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isCompleted || isCurrent
                    ? 'gradient-orange text-white shadow-md shadow-orange-500/30'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                {meta.label}
              </span>
            </div>
            {i < totalSteps - 1 && (
              <div className={`h-0.5 w-4 sm:w-8 rounded-full ${currentStep > step ? 'bg-orange-500' : 'bg-muted'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Social Proof ───────────────────────── */

interface PublicCompany {
  name: string;
  industry: string;
  logoUrl: string | null;
  city: string | null;
  country: string;
  vanitySlug: string | null;
}

function SocialProof() {
  const [companies, setCompanies] = useState<PublicCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/companies/public')
      .then((r) => r.json())
      .then((res) => { if (res.success) setCompanies(res.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="pt-4 border-t border-border/50">
        <div className="flex items-center gap-1.5 mb-3">
          <Users className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Who Else Is Here?</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-7 w-20 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (companies.length === 0) return null;

  return (
    <div className="pt-4 border-t border-border/50">
      <div className="flex items-center gap-1.5 mb-3">
        <Users className="w-3 h-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Who Else Is Here?</span>
        <span className="text-[10px] text-emerald-500 flex items-center gap-0.5 ml-auto">
          <ShieldCheck className="w-2.5 h-2.5" /> {companies.length}+ verified
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {companies.slice(0, 8).map((c, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/40 border border-border/50"
            title={c.city ? `${c.city}, ${c.country}` : c.country}
          >
            {c.logoUrl ? (
              <img src={c.logoUrl} alt={c.name} className="w-3.5 h-3.5 rounded object-cover" />
            ) : (
              <div className="w-3.5 h-3.5 rounded bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                <span className="text-[7px] font-bold text-primary">{c.name.charAt(0)}</span>
              </div>
            )}
            <span className="text-[10px] font-medium truncate max-w-[80px]">{c.name}</span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground mt-2 italic">
        Join verified companies building their quality reputation on TenetBid.
      </p>
    </div>
  );
}

/* ───────────────────────── Main Component ───────────────────────── */

export function AuthGate({ onBack }: { onBack?: () => void }) {
  const { login, register } = useAuthStore();
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [regData, setRegData] = useState({
    email: '', password: '',
    // Personal
    fullName: '', jobTitle: '', phone: '', location: '',
    // Company
    companyName: '', companyIndustry: '', companyTinNumber: '',
    companyRegistrationNo: '', companyPhone: '', companyCity: '',
    companyCountry: '', companyEmail: '', companyWebsite: '',

  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [regStep, setRegStep] = useState<RegStep>(1);

  // Forgot / Reset password state
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password' | 'forgot-sent' | 'reset-password'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [tokenValidation, setTokenValidation] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [authError, setAuthError] = useState('');

  // Handle ?token=xxx in URL for email reset links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setAuthMode('reset-password');
      // Clean up URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Debounced token validation — checks the code against the server as user types
  useEffect(() => {
    if (!resetToken || resetToken.length < 10) {
      setTokenValidation('idle');
      return;
    }

    const timer = setTimeout(async () => {
      setTokenValidation('checking');
      try {
        const { api } = await import('@/lib/api');
        const res = await api.get(`/auth/validate-reset-token?token=${encodeURIComponent(resetToken)}`);
        setTokenValidation(res.valid ? 'valid' : 'invalid');
      } catch {
        setTokenValidation('idle'); // Network error — don't block
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [resetToken]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!loginData.email || !loginData.password) return;
    setLoading(true);
    try {
      const result = await login(loginData.email, loginData.password);
      if (!result.success) {
        const errMsg = result.error || 'Invalid email or password. Please try again.';
        setAuthError(errMsg);
        toast.error(errMsg);
      }
    } catch {
      const errMsg = 'Login failed. Please check your connection and try again.';
      setAuthError(errMsg);
      toast.error(errMsg);
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setLoading(true);
    try {
      const { api } = await import('@/lib/api');
      const res = await api.post('/auth/forgot-password', { email: forgotEmail });
      if (res.success) {
        // Always show the confirmation screen to prevent email enumeration
        // The reset token is sent ONLY to the user's email - never in the API response
        setResetToken(''); // Clear any previous token
        setTokenValidation('idle');
        setAuthMode('forgot-sent');
      } else {
        toast.error(res.error || 'Failed to process request');
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error('Password must include uppercase, lowercase, and number');
      return;
    }
    setLoading(true);
    try {
      const { api } = await import('@/lib/api');
      const res = await api.post('/auth/reset-password', {
        token: resetToken,
        newPassword,
        confirmPassword,
      });
      if (res.success) {
        setResetSuccess(true);
        toast.success('Password reset successfully! You can now sign in.');
      } else {
        toast.error(res.error || 'Failed to reset password');
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setLoading(false);
  };

  /* ─── Registration step navigation ─── */
  const canGoNext = (): boolean => {
    switch (regStep) {
      case 1:
        return !!regData.email &&
          !!regData.password &&
          regData.password.length >= 8 &&
          /[A-Z]/.test(regData.password) &&
          /[a-z]/.test(regData.password) &&
          /[0-9]/.test(regData.password) &&
          !!regConfirmPassword &&
          regData.password === regConfirmPassword;
      case 2:
        return !!regData.companyName;
      case 3:
        return !!regData.fullName;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const goNext = async () => {
    if (!canGoNext()) return;
    setAuthError('');
    if (regStep < 4) setRegStep((regStep + 1) as RegStep);
  };

  const goBack = () => {
    if (regStep > 1) setRegStep((regStep - 1) as RegStep);
  };

  const handleRegister = async () => {
    setLoading(true);
    setAuthError('');
    try {
      const result = await register(regData);
      if (!result.success) {
        // If the email is already registered, auto-switch to login form
        if (result.error?.toLowerCase().includes('already') || result.error?.toLowerCase().includes('registered')) {
          toast.success('Welcome back! Switching to Sign In...', { duration: 4000 });
          setActiveTab('login');
          setLoginData(d => ({ ...d, email: regData.email || d.email }));
          setRegStep(1);
        } else {
          const errMsg = result.error || 'Registration failed. Please try again.';
          setAuthError(errMsg);
          toast.error(errMsg);
        }
      }
      else toast.success('Welcome to TenetBid!');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Registration failed. Please check your connection and try again.';
      setAuthError(errMsg);
      toast.error(errMsg);
    }
    setLoading(false);
  };



  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Main content area ─── */}
      <div className="flex-1 flex flex-col lg:flex-row">

        {/* ═══════════ LEFT PANEL (Desktop) ═══════════ */}
        <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden gradient-slate flex-col">
          <FloatingDots />

          <div className="relative z-10 flex flex-col h-full px-12 xl:px-16 py-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-16 animate-[fadeDown_0.6s_ease-out_both]">
              <img src="/logo.png" alt="TenetBid Logo" width={56} height={56} className="aspect-square object-cover rounded-lg shadow-md" />
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">TenetBid</h1>
                <p className="text-orange-300/80 text-xs font-medium tracking-wide uppercase">Procurement Platform</p>
              </div>
            </div>

            {/* Main copy */}
            <div className="flex-1 flex flex-col justify-center max-w-lg">
              <h2
                className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.1] mb-4 animate-[slideInLeft_0.7s_ease-out_both]"
              >
                Transforming<br />
                <span className="text-orange-300">Procurement</span>
              </h2>
              <p
                className="text-orange-100/70 text-base leading-relaxed mb-10 animate-[slideInLeft_0.7s_ease-out_0.1s_both]"
              >
                Connect with verified users, discover tenders, and manage projects - all in one intelligent platform built for Ethiopia&apos;s future.
              </p>

              {/* Feature highlights */}
              <div className="space-y-4 mb-12">
                <FeatureHighlight
                  icon={<ShieldCheck className="w-5 h-5" />}
                  title="Verified Contractors & Vendors"
                  delay="0.2s"
                />
                <FeatureHighlight
                  icon={<BrainCircuit className="w-5 h-5" />}
                  title="AI-Powered Smart Matching"
                  delay="0.3s"
                />
                <FeatureHighlight
                  icon={<Lock className="w-5 h-5" />}
                  title="End-to-End Encryption"
                  delay="0.4s"
                />
              </div>
            </div>

            {/* Bottom trust line */}
            <div
              className="animate-[fadeUp_0.6s_ease-out_0.5s_both]"
            >
              <div className="flex items-center gap-3 pt-8 border-t border-white/10">
                <div className="flex -space-x-2">
                  {['bg-amber-400', 'bg-orange-400', 'bg-orange-300', 'bg-rose-400'].map((bg, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full ${bg} border-2 border-white/20 flex items-center justify-center`}
                    >
                      <span className="text-[10px] font-bold text-white/90">
                        {['AD', 'SK', 'MB', 'TN'][i]}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-orange-200/60 text-sm">
                  Trusted by <span className="text-white font-semibold">500+</span> organizations across Ethiopia
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ RIGHT PANEL (Form) ═══════════ */}
        <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 bg-background">
          {/* Mobile header with gradient bar */}
          <div className="lg:hidden">
            <div className="h-1.5 gradient-slate" />
            <div className="px-6 pt-6 pb-4 flex items-center gap-3">
              <TenetLogo size="sm" />
            </div>
          </div>

          {/* Form content */}
          <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-14 xl:px-20 py-6 lg:py-10">
            <div
              className="w-full max-w-md mx-auto animate-[viewEnter_0.5s_ease-out]"
            >
              {/* Back button */}
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  Back to home
                </button>
              )}

              {/* Tab switcher - hidden when in forgot/reset mode */}
              {authMode === 'login' && (
              <div className="mb-8">
                <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      activeTab === 'login'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Welcome Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      activeTab === 'register'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              </div>
              )}

              {/* ─── FORGOT PASSWORD FORM ─── */}
              {authMode === 'forgot-password' && (
                <div className="animate-[viewEnter_0.3s_ease-out]">
                  <div className="mb-5">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 group"
                    >
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                      Back to Sign In
                    </button>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                      <Mail className="w-5 h-5 text-primary" /> Forgot Password
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">Enter your email and we&apos;ll send you a reset link</p>
                  </div>

                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email" className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        Email Address
                      </Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="you@example.com"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        required
                        autoComplete="username"
                        className="h-11 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 gradient-orange text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border-0 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending Reset Link...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Send Reset Link
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      )}
                    </Button>
                  </form>
                </div>
              )}

              {/* ─── FORGOT PASSWORD SENT CONFIRMATION ─── */}
              {authMode === 'forgot-sent' && (
                <div className="animate-[viewEnter_0.3s_ease-out]">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                      <Mail className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h2>
                    <p className="text-muted-foreground text-sm mb-1">
                      We&apos;ve sent a password reset code to <span className="font-semibold text-foreground">{forgotEmail}</span>
                    </p>
                    <p className="text-muted-foreground text-xs mb-6">
                      The code expires in 15 minutes. Check your spam folder if you don&apos;t see it.
                    </p>

                    <div className="space-y-3">
                      <Button
                        type="button"
                        onClick={() => setAuthMode('reset-password')}
                        className="w-full h-11 gradient-orange text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border-0"
                      >
                        <span className="flex items-center gap-2">
                          I Have My Reset Code
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </Button>
                      <div className="p-4 rounded-xl bg-muted/50 border border-border">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          You can also click the reset link directly in the email to auto-fill the code. Can&apos;t find it? Check your spam folder or try a different email.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border">
                      <button
                        type="button"
                        onClick={() => { setAuthMode('login'); setResetToken(''); setTokenValidation('idle'); }}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto group"
                      >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        Back to Sign In
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── RESET PASSWORD FORM ─── */}
              {authMode === 'reset-password' && (
                <div className="animate-[viewEnter_0.3s_ease-out]">
                  <div className="mb-5">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 group"
                    >
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                      Back to Sign In
                    </button>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                      <Lock className="w-5 h-5 text-primary" /> Reset Password
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">Enter the reset code from your email and your new password</p>
                  </div>

                  {resetSuccess ? (
                    <div className="text-center py-6 animate-[viewEnter_0.3s_ease-out]">
                      <div className="w-14 h-14 rounded-full gradient-orange flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2">Password Reset!</h3>
                      <p className="text-sm text-muted-foreground mb-6">Your password has been successfully reset. You can now sign in with your new password.</p>
                      <Button
                        type="button"
                        onClick={() => { setAuthMode('login'); setResetSuccess(false); setTokenValidation('idle'); }}
                        className="h-11 gradient-orange text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border-0 px-8"
                      >
                        Sign In Now
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleResetPassword} className="space-y-5">
                      {/* Reset Token Input */}
                      <div className="space-y-2">
                        <Label htmlFor="reset-token" className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Fingerprint className="w-3.5 h-3.5 text-muted-foreground" />
                          Reset Code
                        </Label>
                        <div className="relative">
                          <Input
                            id="reset-token"
                            type="text"
                            placeholder="Paste the reset code from your email"
                            value={resetToken}
                            onChange={e => setResetToken(e.target.value)}
                            required
                            className={`h-11 bg-muted/50 border-border focus:bg-background transition-all duration-200 font-mono text-sm pr-10 ${
                              tokenValidation === 'valid'
                                ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                                : tokenValidation === 'invalid'
                                ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                                : 'focus:border-primary focus:ring-primary/20'
                            }`}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {tokenValidation === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                            {tokenValidation === 'valid' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            {tokenValidation === 'invalid' && <XCircle className="w-4 h-4 text-red-400" />}
                          </div>
                        </div>
                        {tokenValidation === 'valid' && (
                          <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Code verified — enter your new password below
                          </p>
                        )}
                        {tokenValidation === 'invalid' && (
                          <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Invalid or expired code — please request a new one
                          </p>
                        )}
                        {tokenValidation === 'idle' && (
                          <p className="text-xs text-muted-foreground">
                            This code was sent to your email. It expires in 15 minutes.
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                          New Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                            className="h-11 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                          Confirm Password
                        </Label>
                        <Input
                          id="confirm-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          required
                          autoComplete="new-password"
                          className="h-11 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200"
                        />
                      </div>

                      <PasswordStrengthMeter password={newPassword} />
                      <PasswordRequirements password={newPassword} />

                      <Button
                        type="submit"
                        disabled={loading || tokenValidation === 'invalid' || tokenValidation === 'checking' || !resetToken || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 12 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)}
                        className="w-full h-11 gradient-orange text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border-0 disabled:opacity-50 disabled:hover:scale-100"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Resetting Password...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Reset Password
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </form>
                  )}
                </div>
              )}

              {/* ─── LOGIN FORM (direct sign in) ─── */}
              {authMode === 'login' && activeTab === 'login' && (
                <div className="animate-[viewEnter_0.3s_ease-out]">
                  <div className="mb-5">
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                      <Fingerprint className="w-5 h-5 text-primary" /> Secure Sign In
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">Enter your credentials to continue</p>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-5">
                    {/* Inline error message */}
                    {authError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-sm animate-[viewEnter_0.2s_ease-out]">
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>{authError}</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        Email Address
                      </Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginData.email}
                        onChange={e => { setLoginData(d => ({ ...d, email: e.target.value })); setAuthError(''); }}
                        required
                        autoComplete="username"
                        className="h-11 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={loginData.password}
                          onChange={e => { setLoginData(d => ({ ...d, password: e.target.value })); setAuthError(''); }}
                          required
                          autoComplete="current-password"
                          className="h-11 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Forgot Password link */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => { setAuthMode('forgot-password'); setForgotEmail(loginData.email); }}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 gradient-orange text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border-0"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span className="flex items-center gap-2">
                          Sign In
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      )}
                    </Button>
                  </form>

                  {/* Social Login Options */}
                  <div className="mt-5">
                    <SocialLoginButtons mode="login" loading={loading} onLoadingChange={setLoading} />
                  </div>

                  {/* Anti-phishing security reminder */}
                  <div className="mt-5 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-200/80 leading-relaxed">
                      <span className="font-semibold">Anti-Phishing Notice:</span> TenetBid will never ask for your password or security code by email or phone. Always verify the URL before signing in.
                    </p>
                  </div>
                </div>
              )}

              {/* ─── REGISTER FORM (Multi-Step Wizard) ─── */}
              {authMode === 'login' && activeTab === 'register' && (
                <div className="animate-[viewEnter_0.3s_ease-out]">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-foreground">Create Account</h2>
                    <p className="text-muted-foreground text-sm mt-1">Join the TenetBid Procurement Platform</p>
                  </div>

                  {/* Step indicator */}
                  <StepIndicator currentStep={regStep} />

                  {/* ─── STEP 1: Email & Password ─── */}
                  {regStep === 1 && (
                    <div className="animate-[viewEnter_0.3s_ease-out] space-y-4">
                      <div className="mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-md gradient-orange flex items-center justify-center">
                            <Lock className="w-3.5 h-3.5 text-white" />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">Account Credentials</h3>
                        </div>
                        <p className="text-xs text-muted-foreground ml-8">Set up your email and password</p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Mail className="w-3 h-3" /> Email Address *
                          </Label>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            required
                            value={regData.email}
                            onChange={e => setRegData(d => ({ ...d, email: e.target.value }))}
                            className="h-10 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Lock className="w-3 h-3" /> Password *
                          </Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Min 8 chars with uppercase, lowercase, number"
                              required
                              value={regData.password}
                              onChange={e => setRegData(d => ({ ...d, password: e.target.value }))}
                              className="h-10 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <PasswordStrengthMeter password={regData.password} />
                          <PasswordRequirements password={regData.password} />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Lock className="w-3 h-3" /> Confirm Password *
                          </Label>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Re-enter your password"
                            required
                            value={regConfirmPassword}
                            onChange={e => setRegConfirmPassword(e.target.value)}
                            className="h-10 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm"
                          />
                          {regConfirmPassword && regData.password !== regConfirmPassword && (
                            <p className="text-xs text-red-500">Passwords do not match</p>
                          )}
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={goNext}
                        disabled={!canGoNext()}
                        className="w-full h-11 gradient-orange text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border-0 disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <span className="flex items-center gap-2">
                            Continue
                            <ArrowRight className="w-4 h-4" />
                          </span>
                      </Button>

                      {/* Social Registration Options */}
                      <SocialLoginButtons mode="register" loading={loading} onLoadingChange={setLoading} />

                      {/* Who Else Is Here? — Social Proof */}
                      <SocialProof />
                    </div>
                  )}

                  {/* ─── STEP 2: Company Information ─── */}
                  {regStep === 2 && (
                    <div className="animate-[viewEnter_0.3s_ease-out] space-y-4">
                      <div className="mb-2">
                        <button
                          type="button"
                          onClick={goBack}
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 group"
                        >
                          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                          Back
                        </button>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-md gradient-orange flex items-center justify-center">
                            <Building2 className="w-3.5 h-3.5 text-white" />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">Company Information</h3>
                        </div>
                        <p className="text-xs text-muted-foreground ml-8">Company name is required. Other details are optional.</p>
                      </div>

                      <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Building2 className="w-3 h-3" /> Company Name *
                          </Label>
                          <Input
                            placeholder="e.g. ABC Construction PLC"
                            required
                            value={regData.companyName}
                            onChange={e => setRegData(d => ({ ...d, companyName: e.target.value }))}
                            className="h-10 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3" /> Industry
                          </Label>
                          <select
                            value={regData.companyIndustry}
                            onChange={e => setRegData(d => ({ ...d, companyIndustry: e.target.value }))}
                            className="h-10 w-full rounded-md border border-border bg-muted/50 px-3 text-sm text-foreground focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200"
                          >
                            <option value="">Select industry...</option>
                            {INDUSTRIES.map(ind => (
                              <option key={ind} value={ind}>{ind}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <Hash className="w-3 h-3" /> TIN Number
                            </Label>
                            <Input
                              placeholder="TIN..."
                              value={regData.companyTinNumber}
                              onChange={e => setRegData(d => ({ ...d, companyTinNumber: e.target.value }))}
                              className="h-10 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <CreditCard className="w-3 h-3" /> Registration No
                            </Label>
                            <Input
                              placeholder="REG..."
                              value={regData.companyRegistrationNo}
                              onChange={e => setRegData(d => ({ ...d, companyRegistrationNo: e.target.value }))}
                              className="h-10 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Phone className="w-3 h-3" /> Company Phone
                          </Label>
                          <Input
                            placeholder="+251..."
                            value={regData.companyPhone}
                            onChange={e => setRegData(d => ({ ...d, companyPhone: e.target.value }))}
                            className="h-10 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" /> City
                            </Label>
                            <Input
                              placeholder="Addis Ababa"
                              value={regData.companyCity}
                              onChange={e => setRegData(d => ({ ...d, companyCity: e.target.value }))}
                              className="h-10 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <Globe className="w-3 h-3" /> Country
                            </Label>
                            <Input
                              placeholder="Ethiopia"
                              value={regData.companyCountry}
                              onChange={e => setRegData(d => ({ ...d, companyCountry: e.target.value }))}
                              className="h-10 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Mail className="w-3 h-3" /> Company Email
                          </Label>
                          <Input
                            type="email"
                            placeholder="info@company.com"
                            value={regData.companyEmail}
                            onChange={e => setRegData(d => ({ ...d, companyEmail: e.target.value }))}
                            className="h-10 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Globe className="w-3 h-3" /> Website
                          </Label>
                          <Input
                            placeholder="https://company.com"
                            value={regData.companyWebsite}
                            onChange={e => setRegData(d => ({ ...d, companyWebsite: e.target.value }))}
                            className="h-10 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={goNext}
                        disabled={!canGoNext()}
                        className="w-full h-11 gradient-orange text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border-0 disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <span className="flex items-center gap-2">
                          Continue
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </Button>
                    </div>
                  )}

                  {/* ─── STEP 3: Personal Information ─── */}
                  {regStep === 3 && (
                    <div className="animate-[viewEnter_0.3s_ease-out] space-y-4">
                      <div className="mb-2">
                        <button
                          type="button"
                          onClick={goBack}
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 group"
                        >
                          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                          Back
                        </button>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-md gradient-orange flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-white" />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
                        </div>
                        <p className="text-xs text-muted-foreground ml-8">Tell us about yourself</p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <User className="w-3 h-3" /> Full Name *
                          </Label>
                          <Input
                            placeholder="Your full name"
                            required
                            value={regData.fullName}
                            onChange={e => setRegData(d => ({ ...d, fullName: e.target.value }))}
                            className="h-10 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3" /> Job Title
                          </Label>
                          <Input
                            placeholder="Project Manager, CEO, etc."
                            value={regData.jobTitle}
                            onChange={e => setRegData(d => ({ ...d, jobTitle: e.target.value }))}
                            className="h-10 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <Phone className="w-3 h-3" /> Phone
                            </Label>
                            <Input
                              placeholder="+251..."
                              value={regData.phone}
                              onChange={e => setRegData(d => ({ ...d, phone: e.target.value }))}
                              className="h-10 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" /> Location
                            </Label>
                            <Input
                              placeholder="City, Region"
                              value={regData.location}
                              onChange={e => setRegData(d => ({ ...d, location: e.target.value }))}
                              className="h-10 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={goNext}
                        disabled={!canGoNext()}
                        className="w-full h-11 gradient-orange text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border-0 disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <span className="flex items-center gap-2">
                          Continue
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </Button>
                    </div>
                  )}

                  {/* ─── STEP 4: Review & Submit ─── */}
                  {regStep === 4 && (
                    <div className="animate-[viewEnter_0.3s_ease-out] space-y-4">
                      <div className="mb-2">
                        <button
                          type="button"
                          onClick={goBack}
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 group"
                        >
                          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                          Back
                        </button>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-md gradient-orange flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">Review & Submit</h3>
                        </div>
                        <p className="text-xs text-muted-foreground ml-8">Confirm your details before creating your account</p>
                      </div>

                      <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
                        {/* Account */}
                        <div className="p-3 rounded-xl border border-border bg-card/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Lock className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-xs font-semibold text-foreground">Account</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Email</span>
                              <span className="text-foreground font-medium">{regData.email}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Password</span>
                              <span className="text-foreground font-medium">••••••••</span>
                            </div>
                          </div>
                        </div>

                        {/* Company */}
                        <div className="p-3 rounded-xl border border-border bg-card/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-xs font-semibold text-foreground">Company</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Name</span>
                              <span className="text-foreground font-medium">{regData.companyName}</span>
                            </div>
                            {regData.companyIndustry && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Industry</span>
                                <span className="text-foreground font-medium">{regData.companyIndustry}</span>
                              </div>
                            )}
                            {regData.companyTinNumber && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">TIN</span>
                                <span className="text-foreground font-medium">{regData.companyTinNumber}</span>
                              </div>
                            )}
                            {regData.companyRegistrationNo && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Reg. No</span>
                                <span className="text-foreground font-medium">{regData.companyRegistrationNo}</span>
                              </div>
                            )}
                            {regData.companyPhone && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Phone</span>
                                <span className="text-foreground font-medium">{regData.companyPhone}</span>
                              </div>
                            )}
                            {(regData.companyCity || regData.companyCountry) && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Location</span>
                                <span className="text-foreground font-medium">{[regData.companyCity, regData.companyCountry].filter(Boolean).join(', ')}</span>
                              </div>
                            )}
                            {regData.companyEmail && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Email</span>
                                <span className="text-foreground font-medium">{regData.companyEmail}</span>
                              </div>
                            )}
                            {regData.companyWebsite && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Website</span>
                                <span className="text-foreground font-medium">{regData.companyWebsite}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Personal */}
                        <div className="p-3 rounded-xl border border-border bg-card/50">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-xs font-semibold text-foreground">Personal</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Full Name</span>
                              <span className="text-foreground font-medium">{regData.fullName}</span>
                            </div>
                            {regData.jobTitle && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Job Title</span>
                                <span className="text-foreground font-medium">{regData.jobTitle}</span>
                              </div>
                            )}
                            {regData.phone && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Phone</span>
                                <span className="text-foreground font-medium">{regData.phone}</span>
                              </div>
                            )}
                            {regData.location && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Location</span>
                                <span className="text-foreground font-medium">{regData.location}</span>
                              </div>
                            )}
                          </div>
                        </div>


                      </div>

                      {authError && regStep === 4 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span>{authError}</span>
                        </div>
                      )}

                      <Button
                        type="button"
                        onClick={handleRegister}
                        disabled={loading}
                        className="w-full h-11 gradient-orange text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border-0 disabled:opacity-50 disabled:hover:scale-100"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Creating Account...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Create Account
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer inside right panel on desktop, or below on mobile */}
          <footer className="px-6 py-4 text-center border-t border-border lg:border-t lg:py-5">
            <p className="text-xs text-muted-foreground">
              © 2026 TenetBid
            </p>
          </footer>
        </div>
      </div>

      {/* ─── Global keyframe styles ─── */}
      <style jsx global>{`
        @keyframes float1 {
          0%, 100% { transform: translateY(0) translateX(0) scale(1); }
          50% { transform: translateY(-30px) translateX(15px) scale(1.05); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0) translateX(0) scale(1); }
          50% { transform: translateY(25px) translateX(-20px) scale(1.08); }
        }
        @keyframes float3 {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        @keyframes pulse-dot {
          0% { opacity: 0.2; transform: scale(1); }
          100% { opacity: 0.5; transform: scale(1.5); }
        }
        @keyframes spin-slow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
