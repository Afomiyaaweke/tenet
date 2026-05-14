'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(loginData.email, loginData.password);
    if (!ok) toast.error('Invalid credentials');
    setLoading(false);
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
    else toast.success('Welcome to Tenet!');
    setLoading(false);
  };

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
              <img src="/logo.jpg" alt="Tenet" className="w-12 h-12 rounded-xl object-cover border border-white/10" />
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Tenet</h1>
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
        <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 bg-white">
          {/* Mobile header with gradient bar */}
          <div className="lg:hidden">
            <div className="h-1.5 gradient-emerald" />
            <div className="px-6 pt-6 pb-4 flex items-center gap-3">
              <img src="/logo.jpg" alt="Tenet" className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-emerald-500/20" />
              <div>
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">Tenet</h1>
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Tender Ecosystem</p>
              </div>
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
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6 group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  Back to home
                </button>
              )}

              {/* Tab switcher */}
              <div className="mb-8">
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      activeTab === 'login'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Welcome Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      activeTab === 'register'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              </div>

              {/* ─── LOGIN FORM ─── */}
              {activeTab === 'login' && (
                <div className="animate-[viewEnter_0.3s_ease-out]">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
                    <p className="text-gray-500 text-sm mt-1">Enter your credentials to access the platform</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        Email Address
                      </Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginData.email}
                        onChange={e => setLoginData(d => ({ ...d, email: e.target.value }))}
                        required
                        className="h-11 bg-gray-50/80 border-gray-200 focus:bg-white focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-gray-400" />
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
                          className="h-11 bg-gray-50/80 border-gray-200 focus:bg-white focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-200 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
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
                          Signing in...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Sign In
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      )}
                    </Button>
                  </form>

                  {/* Demo credentials box */}
                  <div className="mt-6 p-4 rounded-xl bg-emerald-50/80 border border-emerald-100">
                    <div className="flex items-start gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mt-0.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-sm">
                        <p className="font-semibold text-emerald-800 mb-1">Demo Credentials</p>
                        <p className="text-emerald-700/70 font-mono text-xs leading-relaxed">
                          admin@tenet.com / Admin@123
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── REGISTER FORM ─── */}
              {activeTab === 'register' && (
                <div className="animate-[viewEnter_0.3s_ease-out]">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
                    <p className="text-gray-500 text-sm mt-1">Join the Tenet Tender Ecosystem</p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-6">
                    {/* ── Section 1: Personal Info ── */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-md gradient-emerald flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">1</span>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-800">Personal Information</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                              <User className="w-3 h-3" /> Full Name *
                            </Label>
                            <Input
                              placeholder="Your full name"
                              required
                              value={regData.fullName}
                              onChange={e => setRegData(d => ({ ...d, fullName: e.target.value }))}
                              className="h-10 bg-gray-50/80 border-gray-200 focus:bg-white focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-200 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                              <Mail className="w-3 h-3" /> Email *
                            </Label>
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              required
                              value={regData.email}
                              onChange={e => setRegData(d => ({ ...d, email: e.target.value }))}
                              className="h-10 bg-gray-50/80 border-gray-200 focus:bg-white focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-200 text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                            <Lock className="w-3 h-3" /> Password *
                          </Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Min 8 chars with uppercase, lowercase, number, special"
                              required
                              value={regData.password}
                              onChange={e => setRegData(d => ({ ...d, password: e.target.value }))}
                              className="h-10 bg-gray-50/80 border-gray-200 focus:bg-white focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-200 text-sm pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                              <Phone className="w-3 h-3" /> Phone *
                            </Label>
                            <Input
                              placeholder="+251..."
                              required
                              value={regData.phone}
                              onChange={e => setRegData(d => ({ ...d, phone: e.target.value }))}
                              className="h-10 bg-gray-50/80 border-gray-200 focus:bg-white focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-200 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" /> Location *
                            </Label>
                            <Input
                              placeholder="City, Region"
                              required
                              value={regData.location}
                              onChange={e => setRegData(d => ({ ...d, location: e.target.value }))}
                              className="h-10 bg-gray-50/80 border-gray-200 focus:bg-white focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-200 text-sm"
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
                        <h3 className="text-sm font-semibold text-gray-800">Professional Details <span className="text-gray-400 font-normal">(optional)</span></h3>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3" /> Skill Tags
                            {selectedSkills.length > 0 && (
                              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
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
                                      : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/50'
                                  }`}
                                >
                                  {skill}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                            <FileText className="w-3 h-3" /> Bio / Portfolio
                          </Label>
                          <Textarea
                            placeholder="Brief description of your experience and capabilities"
                            value={regData.bio}
                            onChange={e => setRegData(d => ({ ...d, bio: e.target.value }))}
                            rows={3}
                            className="bg-gray-50/80 border-gray-200 focus:bg-white focus:border-emerald-400 focus:ring-emerald-400/20 transition-all duration-200 text-sm resize-none"
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
          <footer className="px-6 py-4 text-center border-t border-gray-100 lg:border-t lg:py-5">
            <p className="text-xs text-gray-400">
              © 2025 Tenet · Transforming Procurement Through Technology
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
