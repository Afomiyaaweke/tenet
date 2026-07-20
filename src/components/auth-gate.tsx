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
  UserCircle,
  Building2,
  Globe,
  Hash,
  CreditCard,
} from 'lucide-react';

const INDUSTRIES = [
  'Construction', 'IT & Technology', 'Healthcare', 'Supply & Logistics', 'Consulting',
  'Engineering', 'Architecture', 'Education', 'Finance', 'Agriculture',
  'Telecommunications', 'Manufacturing', 'Energy', 'Legal', 'General',
];

type RegStep = 1 | 2 | 3 | 4;

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
  if (password.length >= 12) score += 20;
  if (password.length >= 16) score += 10;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;
  if (new Set(password.toLowerCase()).size >= 8) score += 10;

  if (score >= 80) return { score, label: 'Strong', color: 'bg-green-500' };
  if (score >= 60) return { score, label: 'Good', color: 'bg-blue-500' };
  if (score >= 40) return { score, label: 'Fair', color: 'bg-yellow-500' };
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
    { label: 'At least 12 characters', met: password.length >= 12 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
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
    // Role
    role: 'user' as string,
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
    if (!loginData.email || !loginData.password) return;
    setLoading(true);
    try {
      const ok = await login(loginData.email, loginData.password);
      if (!ok) {
        toast.error('Invalid email or password. Please try again.');
      }
    } catch {
      toast.error('Login failed. Please check your connection and try again.');
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
    if (newPassword.length < 12) {
      toast.error('Password must be at least 12 characters');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      toast.error('Password must include uppercase, lowercase, number, and special character');
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
          regData.password.length >= 12 &&
          /[A-Z]/.test(regData.password) &&
          /[a-z]/.test(regData.password) &&
          /[0-9]/.test(regData.password) &&
          /[^A-Za-z0-9]/.test(regData.password) &&
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

  const goNext = () => {
    if (!canGoNext()) return;
    if (regStep < 4) setRegStep((regStep + 1) as RegStep);
  };

  const goBack = () => {
    if (regStep > 1) setRegStep((regStep - 1) as RegStep);
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const ok = await register(regData);
      if (!ok) toast.error('Registration failed. Email may already exist.');
      else toast.success('Welcome to Tenets!');
    } catch {
      toast.error('Registration failed. Please check your connection and try again.');
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
              <img src="/tenets-logo.png" alt="Tenets" className="w-12 h-12 rounded-xl object-cover border border-white/10" />
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Tenets</h1>
                <p className="text-orange-300/80 text-xs font-medium tracking-wide uppercase">Tender Ecosystem</p>
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
                        onChange={e => setLoginData(d => ({ ...d, email: e.target.value }))}
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
                          onChange={e => setLoginData(d => ({ ...d, password: e.target.value }))}
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

                  {/* Anti-phishing security reminder */}
                  <div className="mt-5 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-200/80 leading-relaxed">
                      <span className="font-semibold">Anti-Phishing Notice:</span> Tenets will never ask for your password or security code by email or phone. Always verify the URL before signing in.
                    </p>
                  </div>
                </div>
              )}

              {/* ─── REGISTER FORM (Multi-Step Wizard) ─── */}
              {authMode === 'login' && activeTab === 'register' && (
                <div className="animate-[viewEnter_0.3s_ease-out]">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-foreground">Create Account</h2>
                    <p className="text-muted-foreground text-sm mt-1">Join the Tenets Tender Ecosystem</p>
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
                              placeholder="Min 12 chars with uppercase, lowercase, number, special"
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

                        {/* Account Type */}
                        <div className="p-3 rounded-xl border border-border bg-card/50">
                          <div className="flex items-center gap-2 mb-2">
                            <UserCircle className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-xs font-semibold text-foreground">Account Type</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg gradient-orange flex items-center justify-center text-white">
                              <UserCircle className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">User</p>
                              <p className="text-xs text-muted-foreground">Submit bids, view tenders, manage your profile</p>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-2 ml-10">You can be promoted to Team Admin by your company admin later.</p>
                        </div>
                      </div>

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
              © 2026 Tenets · Transforming Procurement Through Technology
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
