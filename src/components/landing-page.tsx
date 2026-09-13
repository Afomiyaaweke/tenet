'use client';

import { Button } from '@/components/ui/button';
import { TenetLogo } from '@/components/logo';
import { CommentSection } from '@/components/comment-section';
import { AppDownloadButton } from '@/components/app-download-button';
import {
  ShieldCheck,
  BrainCircuit,
  FileSearch,
  Gavel,
  FolderKanban,
  Sparkles,
  ArrowRight,
  CheckCircle,
  ChartColumn,
  Bot,
  Users,
  Zap,
  ChevronRight,
  Phone,
  Mail,
  Trophy,
  Store,
  Smartphone,
  Home,
  Bell,
  WifiOff,
  HardDriveDownload,
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

/* ───────────────────────── App Feature Bullet ───────────────────────── */
function AppBullet({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 shadow-lg shadow-slate-300/40">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

/* ───────────────────────── Phone Mockup ───────────────────────── */
function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[260px] sm:w-[290px] animate-[fadeUp_0.7s_ease-out_0.2s_both]">
      {/* Glow */}
      <div className="absolute -inset-8 bg-orange-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Frame */}
      <div className="relative rounded-[2.6rem] border-[9px] border-slate-900 bg-slate-900 shadow-2xl shadow-slate-400/40">
        <div
          className="relative rounded-[2.1rem] overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"
          style={{ aspectRatio: '9 / 18.5' }}
        >
          {/* Notch */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full z-10" />

          {/* Screen */}
          <div className="pt-12 px-4 pb-3 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-orange-500 flex items-center justify-center text-white text-[10px] font-black">T</div>
                <span className="text-white text-xs font-bold">TenetBid</span>
              </div>
              <Bell className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Stat chips */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
                <p className="text-orange-400 text-sm font-extrabold">2000+</p>
                <p className="text-slate-400 text-[9px]">Live Tenders</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
                <p className="text-orange-400 text-sm font-extrabold">7</p>
                <p className="text-slate-400 text-[9px]">AI Tools</p>
              </div>
            </div>

            {/* Tender cards */}
            {[1, 2].map((n) => (
              <div key={n} className="rounded-xl bg-white/5 border border-white/10 p-3 mb-2">
                <div className="h-2 w-3/4 rounded bg-slate-500/50 mb-1.5" />
                <div className="h-1.5 w-1/2 rounded bg-slate-600/50 mb-2.5" />
                <div className="flex items-center justify-between">
                  <div className="h-1.5 w-14 rounded bg-orange-500/60" />
                  <span className="text-[8px] font-bold text-white bg-orange-500 rounded-full px-2 py-0.5">Apply</span>
                </div>
              </div>
            ))}

            {/* Bottom nav */}
            <div className="mt-auto flex items-center justify-around rounded-2xl bg-white/5 border border-white/10 py-2.5 mx-1">
              <Home className="w-4 h-4 text-orange-400" />
              <FileSearch className="w-4 h-4 text-slate-400" />
              <FolderKanban className="w-4 h-4 text-slate-400" />
              <Users className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -left-5 sm:-left-12 top-20 bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 flex items-center gap-1.5 animate-[float2_6s_ease-in-out_infinite]">
        <Zap className="w-3.5 h-3.5 text-orange-500" />
        <span className="text-[11px] font-semibold text-slate-700">Opens instantly</span>
      </div>
      <div className="absolute -right-3 sm:-right-10 bottom-28 bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 flex items-center gap-1.5 animate-[float1_7s_ease-in-out_infinite]">
        <WifiOff className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-[11px] font-semibold text-slate-700">Works offline</span>
      </div>
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
            <TenetLogo size="sm" />

            {/* Nav Links (desktop) */}
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              <a href="/marketplace" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Proforma</a>
              <a href="/leaderboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Leaderboard</a>
              <a href="#community" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Reviews</a>
            </nav>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <AppDownloadButton variant="nav" />
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
              Discover tenders, prepare documents with AI, submit winning bids, and manage projects - all in one intelligent platform.
            </p>

            {/* CTA Button */}
            <div
              className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:max-w-2xl mx-auto animate-[fadeUp_0.6s_ease-out_0.3s_both]"
            >
              <Button
                className="w-full sm:w-auto h-12 px-8 bg-slate-900 text-white font-semibold border-0 shadow-lg shadow-slate-300/40 hover:shadow-slate-400/60 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 rounded-xl"
                onClick={onGetStarted}
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <a
                href="/marketplace"
                className="w-full sm:w-auto h-12 px-8 inline-flex items-center justify-center gap-1.5 bg-white text-slate-700 font-semibold border border-slate-200 shadow-sm hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 rounded-xl text-sm"
              >
                <Store className="w-4 h-4 text-emerald-500" />
                Browse Proforma
              </a>
              <AppDownloadButton variant="hero" />
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
            <StatCard value="25+" label="Data Sources" delay="0s" />
            <StatCard value="2000+" label="Live Tenders" delay="0.1s" />
            <StatCard value="7" label="AI Tools" delay="0.2s" />
            <StatCard value="256-bit" label="Encryption" delay="0.3s" />
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
              From discovery to award, our platform streamlines every step of your procurement journey with AI-powered tools.
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
              icon={<ChartColumn className="w-6 h-6 text-white" />}
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
              No complicated setup. Sign up, discover tenders, and start winning - it&apos;s that simple.
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-10">
            <StepCard
              number="1"
              title="Create Your Account"
              description="Sign up in seconds with just your email. No role selection needed - everyone can post and apply to tenders."
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

      {/* ═══════════ MOBILE APP ═══════════ */}
      <section id="get-the-app" className="py-20 sm:py-28 border-t border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            {/* Copy */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200/60 rounded-full px-4 py-1.5 mb-5">
                <Smartphone className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-xs font-semibold text-orange-700">Mobile App</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
                Take TenetBid <span className="text-orange-500">Everywhere</span> You Go
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto lg:mx-0">
                Install TenetBid as a real app on your phone — straight from the browser. No app store, no big download, done in seconds.
              </p>

              <div className="space-y-4 mb-9 text-left max-w-md mx-auto lg:mx-0">
                <AppBullet
                  icon={<Smartphone className="w-5 h-5 text-white" />}
                  title="Full-screen app experience"
                  text="Your own home-screen icon, no browser bars — it feels like a native app."
                />
                <AppBullet
                  icon={<Zap className="w-5 h-5 text-white" />}
                  title="Opens instantly"
                  text="Smart caching means the app loads in a blink, every time."
                />
                <AppBullet
                  icon={<WifiOff className="w-5 h-5 text-white" />}
                  title="Works offline"
                  text="Browse cached tenders and documents even without internet."
                />
                <AppBullet
                  icon={<HardDriveDownload className="w-5 h-5 text-white" />}
                  title="Tiny install"
                  text="Around 1 MB — no 50 MB download from an app store."
                />
              </div>

              <div className="flex flex-col items-center gap-3 lg:items-start">
                <AppDownloadButton variant="big" />
                <p className="text-xs text-muted-foreground">
                  Android · iPhone · Desktop — installs right from your browser
                </p>
              </div>
            </div>

            {/* Phone mockup */}
            <PhoneMockup />
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
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-white text-slate-900 font-bold shadow-xl shadow-slate-900/20 hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 h-13 px-8 rounded-xl"
                onClick={onGetStarted}
              >
                Get Started for Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <AppDownloadButton variant="dark" />
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <TenetLogo size="sm" className="mb-4" />
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                Transforming procurement through intelligent technology. Connect, prepare, and win with AI.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">Product</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Tender Discovery', href: '#features' },
                  { label: 'AI Doc Studio', href: '#features' },
                  { label: 'Smart Bidding', href: '#features' },
                  { label: 'Analytics', href: '#features' },
                  { label: 'Mobile App', href: '#get-the-app' },
                ].map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-sm text-gray-400 hover:text-white transition-colors">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">Company</h4>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">About Us</a></li>
                <li><a href="/marketplace" className="text-sm text-gray-400 hover:text-white transition-colors">Proforma</a></li>
                <li><a href="/leaderboard" className="text-sm text-gray-400 hover:text-white transition-colors">Leaderboard</a></li>
                <li><a href="#community" className="text-sm text-gray-400 hover:text-white transition-colors">Community</a></li>
                <li><a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">How It Works</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">Contact</h4>
              <ul className="space-y-2.5">
                <li>
                  <a href="tel:+251956140291" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    +251 956 140 291
                  </a>
                </li>
                <li>
                  <a href="mailto:support@tenetbid.com" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    support@tenetbid.com
                  </a>
                </li>
                <li>
                  <a href="mailto:contact@tenetbid.com" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    contact@tenetbid.com
                  </a>
                </li>
              </ul>
            </div>

            {/* Social & Legal */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">Social</h4>
              <ul className="space-y-2.5 mb-6">
                <li>
                  <a href="https://x.com/tenetbid" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    @tenetbid
                  </a>
                </li>
                <li>
                  <a href="https://www.reddit.com/user/Tenetbid/" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-[#FF4500] transition-colors flex items-center gap-2 group">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 group-hover:text-[#FF4500]" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.624 0 1.2.5 1.2 1.126s-.576 1.126-1.2 1.126c-.608 0-1.176-.504-1.176-1.126 0-.624.568-1.126 1.176-1.126zm-3.654 2.634c1.224-.072 2.584.576 2.584 2.584v4.346h-1.744v-4.076c0-1.008-.408-1.66-1.44-1.66-1.08 0-1.744.792-1.744 1.66v4.076H7.608V9.962c0-1.008.392-1.66 1.44-1.66 1.08 0 1.744.792 1.744 1.66v4.076h-1.744v-4.346c0-2.008 1.36-2.658 2.584-2.584zM6.99 7.378c-.624 0-1.176-.504-1.176-1.126s.552-1.126 1.176-1.126c.624 0 1.2.5 1.2 1.126s-.576 1.126-1.2 1.126zm5.01 12.322c-4.908 0-8.9-3.992-8.9-8.9 0-4.908 3.992-8.9 8.9-8.9 4.908 0 8.9 3.992 8.9 8.9 0 4.908-3.992 8.9-8.9 8.9z"/></svg>
                    <span className="group-hover:text-[#FF4500]">u/Tenetbid</span>
                  </a>
                </li>
              </ul>
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li><span className="text-sm text-gray-400">Privacy Policy</span></li>
                <li><span className="text-sm text-gray-400">Terms of Service</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">&copy; 2026 TenetBid</p>
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
