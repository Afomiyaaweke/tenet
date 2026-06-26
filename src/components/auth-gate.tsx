'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { TenetsLogo } from '@/components/logo';
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
  Puzzle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Smartphone,
  KeyRound,
  AlertTriangle,
} from 'lucide-react';

const SKILL_OPTIONS = [
  'Construction', 'IT', 'Supply', 'Consulting', 'Engineering',
  'Architecture', 'Electrical', 'Plumbing', 'HVAC', 'Landscaping',
  'Interior Design', 'Project Management', 'Logistics', 'Manufacturing',
  'Healthcare', 'Education', 'Finance', 'Legal', 'Agriculture', 'Telecommunications'
];

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
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-emerald-200">
        {icon}
      </div>
      <span className="text-white/90 text-sm font-medium">{title}</span>
    </div>
  );
}

/* ───────────────────────── Main Component ───────────────────────── */
/* ───────────────────────── Password Strength Meter ───────────────────────── */
function scorePassword(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const colors = ['bg-rose-500', 'bg-rose-500', 'bg-amber-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-600'];
  return { score, label: labels[score], color: colors[score] };
}

/* ───────────────────────── Slide-to-Verify Captcha ───────────────────────── */
function SlideCaptcha({ onVerified }: { onVerified: () => void }) {
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<'idle' | 'dragging' | 'success' | 'fail'>('idle');
  const [target] = useState(() => 180 + Math.floor(Math.random() * 80)); // target px 180–260
  const trackWidth = 320;
  const handleWidth = 44;
  const tolerance = 8;
  const dragRef = React.useRef<{ start: number; startOffset: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (status === 'success') return;
    setStatus('dragging');
    dragRef.current = { start: e.clientX, startOffset: offset };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || status !== 'dragging') return;
    const delta = e.clientX - dragRef.current.start;
    const next = Math.max(0, Math.min(trackWidth - handleWidth, dragRef.current.startOffset + delta));
    setOffset(next);
  };

  const onPointerUp = () => {
    if (status !== 'dragging') return;
    dragRef.current = null;
    if (Math.abs(offset - target) <= tolerance) {
      setStatus('success');
      setTimeout(() => onVerified(), 450);
    } else {
      setStatus('fail');
      setTimeout(() => {
        setStatus('idle');
        setOffset(0);
      }, 700);
    }
  };

  const pieceColor = status === 'success' ? 'bg-emerald-500' : status === 'fail' ? 'bg-rose-500' : 'bg-primary';
  const ringColor = status === 'success' ? 'ring-emerald-300' : status === 'fail' ? 'ring-rose-300' : 'ring-primary/40';

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Puzzle className="w-3.5 h-3.5" /> Security verification — slide to complete
      </div>
      {/* Puzzle canvas */}
      <div className="relative h-12 rounded-xl overflow-hidden border border-border bg-muted/40 select-none">
        {/* pattern background */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, hsl(var(--muted-foreground) / 0.08) 0 6px, transparent 6px 12px), repeating-linear-gradient(-45deg, hsl(var(--muted-foreground) / 0.06) 0 6px, transparent 6px 12px)',
          }}
        />
        {/* target cutout (notch) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg border-2 border-dashed border-muted-foreground/40 bg-background/60"
          style={{ left: target + 4 }}
        />
        {/* moving puzzle piece */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg ${pieceColor} shadow-lg ring-2 ${ringColor} flex items-center justify-center text-white transition-shadow ${status === 'fail' ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
          style={{ left: 4 + offset, transition: status === 'dragging' ? 'none' : 'left 0.25s ease' }}
        >
          {status === 'success' ? <CheckCircle2 className="w-5 h-5" /> : status === 'fail' ? <XCircle className="w-5 h-5" /> : <Puzzle className="w-4 h-4" />}
        </div>
        {/* hint text */}
        {status === 'idle' && (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
            Drag the slider below to fit the puzzle
          </span>
        )}
        {status === 'success' && (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-emerald-600 bg-emerald-50/60 pointer-events-none">
            Verified
          </span>
        )}
      </div>
      {/* Slider track */}
      <div className="relative h-11 rounded-xl bg-muted border border-border overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 ${status === 'success' ? 'bg-emerald-100 dark:bg-emerald-950/40' : status === 'fail' ? 'bg-rose-100 dark:bg-rose-950/40' : 'bg-primary/10'} transition-all`}
          style={{ width: offset + handleWidth }}
        />
        <div
          className="absolute top-0 h-full flex items-center justify-center text-xs font-medium text-muted-foreground pointer-events-none"
          style={{ left: handleWidth, right: 0 }}
        >
          {status === 'success' ? 'Verification complete' : status === 'fail' ? 'Verification failed, retrying…' : 'Slide right to verify'}
        </div>
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`absolute top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg cursor-grab active:cursor-grabbing flex items-center justify-center text-white shadow-md ${pieceColor} ${status === 'success' ? 'cursor-default' : ''} touch-none`}
          style={{ left: 4 + offset, transition: status === 'dragging' ? 'none' : 'left 0.25s ease' }}
        >
          {status === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <ArrowRight className="w-4 h-4" />}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 6-digit Security Code Input ───────────────────────── */
function SecurityCodeInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const inputsRef = React.useRef<(HTMLInputElement | null)[]>([]);
  const chars = value.split('');

  const setChar = (i: number, c: string) => {
    const sanitized = c.replace(/\D/g, '').slice(-1);
    const arr = value.split('');
    arr[i] = sanitized || ' ';
    const next = arr.join('').replace(/ /g, '');
    // pad to length i+1 so typing works
    const padded = (next + '      ').slice(0, 6).replace(/\s/g, '');
    onChange(padded);
    if (sanitized && i < 5) inputsRef.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !chars[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text) {
      e.preventDefault();
      onChange(text);
      inputsRef.current[Math.min(text.length, 5)]?.focus();
    }
  };

  return (
    <div className="flex justify-between gap-2" onPaste={onPaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={chars[i] || ''}
          onChange={(e) => setChar(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border-2 bg-muted/30 focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          style={{ aspectRatio: '1 / 1.15' }}
        />
      ))}
    </div>
  );
}

/* ───────────────────────── Main Component ───────────────────────── */
type LoginStep = 'credentials' | 'captcha' | 'code';

export function AuthGate({ onBack }: { onBack?: () => void }) {
  const { login, register } = useAuthStore();
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [regData, setRegData] = useState({
    email: '', password: '', fullName: '', phone: '',
    location: '', skillTags: '', bio: '',
  });
  const [loading, setLoading] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Binance-style multi-step login state
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials');
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [sentCode] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [codeError, setCodeError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) return;
    setLoginStep('captcha');
  };

  const handleCaptchaVerified = () => {
    setCaptchaVerified(true);
    setLoginStep('code');
    toast.success('Verification passed — enter the security code sent to your device.');
  };

  const handleFinalLogin = async () => {
    if (securityCode.length !== 6) {
      setCodeError('Please enter the 6-digit code');
      return;
    }
    if (securityCode !== sentCode) {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= 5) {
 toast.error('Too many failed attempts. Please start over.');
        resetLogin();
        return;
      }
      setCodeError(`Incorrect code. ${5 - next} attempt${5 - next === 1 ? '' : 's'} remaining`);
      setSecurityCode('');
      return;
    }
    setCodeError('');
    setLoading(true);
    const ok = await login(loginData.email, loginData.password);
    if (!ok) {
      toast.error('Invalid credentials');
      resetLogin();
    }
    setLoading(false);
  };

  const resetLogin = () => {
    setLoginStep('credentials');
    setCaptchaVerified(false);
    setSecurityCode('');
    setCodeError('');
    setAttempts(0);
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const data = {
      ...regData,
      skillTags: selectedSkills.join(','),
    };
    const ok = await register(data);
    if (!ok) toast.error('Registration failed. Email may already exist.');
    else toast.success('Welcome to Tenets!');
    setLoading(false);
  };

  const pwScore = scorePassword(regData.password);
  const stepIndex = loginStep === 'credentials' ? 0 : loginStep === 'captcha' ? 1 : 2;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Main content area ─── */}
      <div className="flex-1 flex flex-col lg:flex-row">

        {/* ═══════════ LEFT PANEL (Desktop) ═══════════ */}
        <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden gradient-emerald flex-col">
          <FloatingDots />

          <div className="relative z-10 flex flex-col h-full px-12 xl:px-16 py-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-16 animate-[fadeDown_0.6s_ease-out_both]">
              <img src="/logo.png" alt="Tenets" className="w-12 h-12 rounded-xl object-cover border border-white/10" />
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Tenets</h1>
                <p className="text-emerald-200/80 text-xs font-medium tracking-wide uppercase">Tender Ecosystem</p>
              </div>
            </div>

            {/* Main copy */}
            <div className="flex-1 flex flex-col justify-center max-w-lg">
              <h2
                className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.1] mb-4 animate-[slideInLeft_0.7s_ease-out_both]"
              >
                Transforming<br />
                <span className="text-emerald-200">Procurement</span>
              </h2>
              <p
                className="text-emerald-100/70 text-base leading-relaxed mb-10 animate-[slideInLeft_0.7s_ease-out_0.1s_both]"
              >
                Connect with verified contractors, discover tenders, and manage projects — all in one intelligent platform built for Ethiopia&apos;s future.
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
                  title="Secure Payments & Escrow"
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
                  {['bg-amber-400', 'bg-teal-400', 'bg-emerald-300', 'bg-rose-400'].map((bg, i) => (
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
                <p className="text-emerald-200/60 text-sm">
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
            <div className="h-1.5 gradient-emerald" />
            <div className="px-6 pt-6 pb-4 flex items-center gap-3">
              <TenetsLogo size="sm" />
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

              {/* Tab switcher */}
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

              {/* ─── LOGIN FORM (Binance-style multi-step) ─── */}
              {activeTab === 'login' && (
                <div className="animate-[viewEnter_0.3s_ease-out]">
                  {/* Step progress indicator */}
                  <div className="flex items-center justify-center gap-2 mb-6">
                    {['Credentials', 'Verify', 'Security Code'].map((label, i) => (
                      <React.Fragment key={label}>
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              i <= stepIndex
                                ? 'gradient-emerald text-white shadow-md shadow-emerald-500/30'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {i < stepIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                          </div>
                          <span className={`text-xs font-medium hidden sm:inline ${i <= stepIndex ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {label}
                          </span>
                        </div>
                        {i < 2 && <div className={`h-0.5 w-6 sm:w-10 rounded-full ${i < stepIndex ? 'bg-emerald-500' : 'bg-muted'}`} />}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* ─── STEP 1: Credentials ─── */}
                  {loginStep === 'credentials' && (
                    <div className="animate-[viewEnter_0.3s_ease-out]">
                      <div className="mb-5">
                        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                          <Fingerprint className="w-5 h-5 text-primary" /> Secure Sign In
                        </h2>
                        <p className="text-muted-foreground text-sm mt-1">Enter your credentials to continue</p>
                      </div>

                      <form onSubmit={handleCredentialsSubmit} className="space-y-5">
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

                        <Button
                          type="submit"
                          className="w-full h-11 gradient-emerald text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border-0"
                        >
                          <span className="flex items-center gap-2">
                            Continue
                            <ArrowRight className="w-4 h-4" />
                          </span>
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

                  {/* ─── STEP 2: Slide-to-Verify Captcha ─── */}
                  {loginStep === 'captcha' && (
                    <div className="animate-[viewEnter_0.3s_ease-out]">
                      <div className="mb-5">
                        <button
                          type="button"
                          onClick={() => setLoginStep('credentials')}
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 group"
                        >
                          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                          Back
                        </button>
                        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                          <Puzzle className="w-5 h-5 text-primary" /> Security Verification
                        </h2>
                        <p className="text-muted-foreground text-sm mt-1">Complete the puzzle to prove you&apos;re human</p>
                      </div>

                      <div className="p-5 rounded-xl border border-border bg-card/50 space-y-4">
                        <SlideCaptcha onVerified={handleCaptchaVerified} />
                        {captchaVerified && (
                          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium animate-[viewEnter_0.3s_ease-out]">
                            <CheckCircle2 className="w-4 h-4" /> Verification complete — proceeding…
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Protected by Tenets Shield — encrypted &amp; bot-resistant</span>
                      </div>
                    </div>
                  )}

                  {/* ─── STEP 3: 6-digit Security Code (simulated 2FA) ─── */}
                  {loginStep === 'code' && (
                    <div className="animate-[viewEnter_0.3s_ease-out]">
                      <div className="mb-5">
                        <button
                          type="button"
                          onClick={() => setLoginStep('captcha')}
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 group"
                        >
                          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                          Back
                        </button>
                        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                          <Smartphone className="w-5 h-5 text-primary" /> Security Code
                        </h2>
                        <p className="text-muted-foreground text-sm mt-1">
                          Enter the 6-digit code sent to your registered device.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <SecurityCodeInput value={securityCode} onChange={setSecurityCode} disabled={loading} />

                        {codeError && (
                          <div className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
                            <XCircle className="w-4 h-4 shrink-0" /> {codeError}
                          </div>
                        )}

                        <Button
                          type="button"
                          onClick={handleFinalLogin}
                          disabled={loading || securityCode.length !== 6}
                          className="w-full h-11 gradient-emerald text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border-0 disabled:opacity-50 disabled:hover:scale-100"
                        >
                          {loading ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Authenticating...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <KeyRound className="w-4 h-4" />
                              Sign In Securely
                            </span>
                          )}
                        </Button>

                        <button
                          type="button"
                          onClick={() => { setSecurityCode(''); setCodeError(''); toast.info('A new code has been sent.'); }}
                          className="w-full text-center text-xs text-primary hover:underline"
                        >
                          Didn&apos;t receive a code? Resend
                        </button>
                      </div>

                      {/* Demo security code (simulated 2FA) */}
                      <div className="mt-5 p-3 rounded-xl bg-primary/10 border border-primary/20">
                        <div className="flex items-start gap-2.5">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center mt-0.5">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                          </div>
                          <div className="text-sm flex-1">
                            <p className="font-semibold text-primary mb-1">Demo Verification Code</p>
                            <p className="text-primary/70 text-xs leading-relaxed mb-1.5">
                              In production this code is delivered via SMS/email. For this demo, use:
                            </p>
                            <p className="text-primary font-mono text-lg font-bold tracking-[0.3em]">{sentCode}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Account locks after 5 failed attempts for your protection</span>
                      </div>
                    </div>
                  )}

                  {/* Demo credentials box — only on credentials step */}
                  {loginStep === 'credentials' && (
                    <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
                      <div className="flex items-start gap-2.5">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center mt-0.5">
                          <ShieldCheck className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-sm">
                          <p className="font-semibold text-primary mb-1">Demo Credentials</p>
                          <p className="text-primary/70 font-mono text-xs leading-relaxed">
                            admin@tenet.com / Admin@123
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── REGISTER FORM ─── */}
              {activeTab === 'register' && (
                <div className="animate-[viewEnter_0.3s_ease-out]">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-foreground">Create Account</h2>
                    <p className="text-muted-foreground text-sm mt-1">Join the Tenets Tender Ecosystem</p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-6">
                    {/* ── Section 1: Personal Info ── */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-md gradient-emerald flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">1</span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
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
                              <Mail className="w-3 h-3" /> Email *
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
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Lock className="w-3 h-3" /> Password *
                          </Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Min 8 chars with uppercase, lowercase, number, special"
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
                          {regData.password && (
                            <div className="space-y-1 animate-[viewEnter_0.2s_ease-out]">
                              <div className="flex gap-1">
                                {[0, 1, 2, 3, 4].map(i => (
                                  <div
                                    key={i}
                                    className={`h-1 flex-1 rounded-full transition-all ${i < pwScore.score ? pwScore.color : 'bg-muted'}`}
                                  />
                                ))}
                              </div>
                              <p className={`text-[10px] font-medium ${pwScore.score >= 4 ? 'text-emerald-600' : pwScore.score >= 2 ? 'text-amber-600' : 'text-rose-600'}`}>
                                {pwScore.label}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <Phone className="w-3 h-3" /> Phone *
                            </Label>
                            <Input
                              placeholder="+251..."
                              required
                              value={regData.phone}
                              onChange={e => setRegData(d => ({ ...d, phone: e.target.value }))}
                              className="h-10 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" /> Location *
                            </Label>
                            <Input
                              placeholder="City, Region"
                              required
                              value={regData.location}
                              onChange={e => setRegData(d => ({ ...d, location: e.target.value }))}
                              className="h-10 bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Section 2: Professional Details (Optional) ── */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-md gradient-emerald flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">2</span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">Professional Details <span className="text-muted-foreground font-normal">(optional)</span></h3>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3" /> Skill Tags
                            {selectedSkills.length > 0 && (
                              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                                {selectedSkills.length}
                              </span>
                            )}
                          </Label>
                          <div className="flex flex-wrap gap-1.5">
                            {SKILL_OPTIONS.map(skill => {
                              const isSelected = selectedSkills.includes(skill);
                              return (
                                <button
                                  key={skill}
                                  type="button"
                                  onClick={() => toggleSkill(skill)}
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                                    isSelected
                                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20 scale-105'
                                      : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-primary hover:bg-primary/5'
                                  }`}
                                >
                                  {skill}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <FileText className="w-3 h-3" /> Bio / Portfolio
                          </Label>
                          <Textarea
                            placeholder="Brief description of your experience and capabilities"
                            value={regData.bio}
                            onChange={e => setRegData(d => ({ ...d, bio: e.target.value }))}
                            rows={3}
                            className="bg-muted/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 gradient-emerald text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border-0"
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
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Footer inside right panel on desktop, or below on mobile */}
          <footer className="px-6 py-4 text-center border-t border-border lg:border-t lg:py-5">
            <p className="text-xs text-muted-foreground">
              © 2025 Tenets · Transforming Procurement Through Technology
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
        @keyframes shake {
          0%, 100% { transform: translate(-50%, -50%) translateX(0); }
          20% { transform: translate(-50%, -50%) translateX(-6px); }
          40% { transform: translate(-50%, -50%) translateX(6px); }
          60% { transform: translate(-50%, -50%) translateX(-4px); }
          80% { transform: translate(-50%, -50%) translateX(4px); }
        }
      `}</style>
    </div>
  );
}
