'use client';

import { Button } from '@/components/ui/button';
import { TenetsLogo } from '@/components/logo';
import { CommentSection } from '@/components/comment-section';
import {
  ShieldCheck,
  BrainCircuit,
  FileSearch,
  Gavel,
  FolderKanban,
  Sparkles,
  ArrowRight,
  CheckCircle,
  BarChart3,
  Bot,
  Users,
  Zap,
  ChevronRight,
} from 'lucide-react';

/* ───────────────────────── Animated Background ───────────────────────── */
function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient orbs */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-slate-500/10 blur-[100px] animate-[float1_20s_ease-in-out_infinite]" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-500/8 blur-[100px] animate-[float2_25s_ease-in-out_infinite]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-slate-400/5 blur-[80px] animate-[float1_18s_ease-in-out_infinite_3s]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating dots */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-slate-500/20"
          style={{
            top: `${15 + (i * 41) % 70}%`,
            left: `${10 + (i * 59) % 80}%`,
            animation: `pulse-dot ${3 + (i % 3)}s ease-in-out ${i * 0.4}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

/* ───────────────────────── Feature Card ───────────────────────── */
function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <div
      className="group relative bg-card rounded-2xl border border-border p-6 hover:shadow-xl hover:shadow-slate-500/5 hover:border-slate-200/60 transition-all duration-500 animate-[fadeUp_0.6s_ease-out_both]"
      style={{ animationDelay: delay }}
    >
      <div className="absolute inset-0 rounded-2xl bg-slate-900 opacity-0 group-hover:opacity-[0.02] transition-opacity duration-500" />
      <div className="relative">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mb-4 shadow-lg shadow-slate-300/50 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/* ───────────────────────── Step Card ───────────────────────── */
function StepCard({
  number,
  title,
  description,
  delay,
}: {
  number: string;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <div
      className="flex items-start gap-4 animate-[fadeUp_0.6s_ease-out_both]"
      style={{ animationDelay: delay }}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-300/40">
        <span className="text-white font-bold text-sm">{number}</span>
      </div>
      <div>
        <h4 className="text-base font-bold text-foreground mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/* ───────────────────────── Stat Card ───────────────────────── */
function StatCard({ value, label, delay }: { value: string; label: string; delay: string }) {
  return (
    <div
      className="text-center animate-[fadeUp_0.5s_ease-out_both]"
      style={{ animationDelay: delay }}
    >
      <p className="text-3xl sm:text-4xl font-extrabold text-slate-900">{value}</p>
      <p className="text-sm text-muted-foreground mt-1 font-medium">{label}</p>
    </div>
  );
}

/* ───────────────────────── Main Component ───────────────────────── */
export function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ═══════════ NAVBAR ═══════════ */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <TenetsLogo size="sm" />

            {/* Nav Links (desktop) */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              <a href="#community" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Community</a>
            </nav>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={onGetStarted}
              >
                Sign In
              </Button>
              <Button
                className="bg-slate-900 text-white font-semibold border-0 shadow-lg shadow-slate-300/40 hover:shadow-slate-400/60 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                onClick={onGetStarted}
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden">
        <HeroBackground />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200/60 rounded-full px-4 py-1.5 mb-8 animate-[fadeUp_0.5s_ease-out_both]">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-semibold text-orange-700">AI-Powered Tender Management</span>
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1] mb-6 animate-[fadeUp_0.6s_ease-out_0.1s_both]"
            >
              Transform Your{' '}
              <span className="text-orange-500">Procurement</span>{' '}
              Workflow
            </h1>

            <p
              className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto animate-[fadeUp_0.6s_ease-out_0.2s_both]"
            >
              Discover tenders, prepare documents with AI, submit winning bids, and manage projects — all in one intelligent platform.
            </p>

            {/* CTA Button */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto animate-[fadeUp_0.6s_ease-out_0.3s_both]"
            >
              <Button
                className="w-full sm:w-auto h-12 px-8 bg-slate-900 text-white font-semibold border-0 shadow-lg shadow-slate-300/40 hover:shadow-slate-400/60 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 rounded-xl"
                onClick={onGetStarted}
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-6 mt-8 animate-[fadeUp_0.6s_ease-out_0.4s_both]">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground font-medium">Free to start</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground font-medium">No credit card required</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground font-medium">AI-powered</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ STATS BAR ═══════════ */}
      <section className="border-y border-border bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard value="10+" label="Data Sources" delay="0s" />
            <StatCard value="AI" label="Powered" delay="0.1s" />
            <StatCard value="Smart" label="Matching" delay="0.2s" />
            <StatCard value="Secure" label="Platform" delay="0.3s" />
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200/60 rounded-full px-4 py-1.5 mb-4">
              <Zap className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-semibold text-orange-700">Powerful Features</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
              Everything You Need to Win Tenders
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From discovery to award, Tenets streamlines every step of your procurement journey with AI-powered tools.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<FileSearch className="w-6 h-6 text-white" />}
              title="Smart Tender Discovery"
              description="AI matches you with the most relevant tenders based on your skills, experience, and preferences. Never miss an opportunity."
              delay="0s"
            />
            <FeatureCard
              icon={<Bot className="w-6 h-6 text-white" />}
              title="AI Document Studio"
              description="Generate professional bid proposals, company profiles, financial bids, and technical proposals with AI assistance."
              delay="0.1s"
            />
            <FeatureCard
              icon={<Gavel className="w-6 h-6 text-white" />}
              title="Intelligent Bidding"
              description="AI analyzes requirements and helps you craft competitive bids. Get insights on pricing, timelines, and win probability."
              delay="0.2s"
            />
            <FeatureCard
              icon={<BrainCircuit className="w-6 h-6 text-white" />}
              title="AI Applicant Analyzer"
              description="Automatically evaluate and rank applicants based on qualifications, experience, and bid quality. Make data-driven awards."
              delay="0.3s"
            />
            <FeatureCard
              icon={<FolderKanban className="w-6 h-6 text-white" />}
              title="Project Management"
              description="Track milestones, manage deliverables, and collaborate with teams. Keep every project on schedule and within budget."
              delay="0.4s"
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6 text-white" />}
              title="Tender Analytics"
              description="Comprehensive dashboards with export capabilities. Analyze trends, track performance, and make informed decisions."
              delay="0.5s"
            />
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
              Get Started in 3 Simple Steps
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              No complicated setup. Sign up, discover tenders, and start winning — it&apos;s that simple.
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-10">
            <StepCard
              number="1"
              title="Create Your Account"
              description="Sign up in seconds with just your email. No role selection needed — everyone can post and apply to tenders."
              delay="0s"
            />
            <StepCard
              number="2"
              title="Discover & Prepare"
              description="Browse tenders matched to your skills. Use AI to prepare winning documents, proposals, and bids automatically."
              delay="0.15s"
            />
            <StepCard
              number="3"
              title="Submit & Win"
              description="Submit your AI-enhanced bids with confidence. Tender owners use AI to analyze and award the best applicants fairly."
              delay="0.3s"
            />
          </div>
        </div>
      </section>

      {/* ═══════════ COMMUNITY / COMMENT SECTION ═══════════ */}
      <CommentSection />

      {/* ═══════════ CTA SECTION ═══════════ */}
      <section className="relative overflow-hidden">
        <div className="bg-slate-900 py-20 sm:py-28">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-[60px]" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-white/5 blur-[60px]" />
          </div>
          <div className="relative max-w-3xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Ready to Transform Your Tender Workflow?
            </h2>
            <p className="text-slate-300/80 text-lg mb-10 max-w-xl mx-auto">
              Start discovering, preparing, and winning tenders with AI-powered tools.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-white text-slate-900 font-bold shadow-xl shadow-slate-900/20 hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 h-13 px-8 rounded-xl"
                onClick={onGetStarted}
              >
                Get Started for Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 font-semibold h-13 px-8 rounded-xl"
                onClick={onGetStarted}
              >
                Sign In
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="bg-gray-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <TenetsLogo size="sm" className="mb-4" />
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                Transforming procurement through intelligent technology. Connect, prepare, and win with AI.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">Product</h4>
              <ul className="space-y-2.5">
                {['Tender Discovery', 'AI Doc Studio', 'Smart Bidding', 'Analytics'].map((item) => (
                  <li key={item}>
                    <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">Company</h4>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">About Us</a></li>
                <li><a href="#community" className="text-sm text-gray-400 hover:text-white transition-colors">Community</a></li>
                <li><a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">How It Works</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li><span className="text-sm text-gray-400">Privacy Policy</span></li>
                <li><span className="text-sm text-gray-400">Terms of Service</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">&copy; 2025 Tenets &middot; Transforming Procurement Through Technology</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-gray-500">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">Community driven</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-medium">Verified & Secure</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

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
        @keyframes pulse-dot {
          0% { opacity: 0.3; transform: scale(1); }
          100% { opacity: 0.7; transform: scale(1.5); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
