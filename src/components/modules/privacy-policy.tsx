'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Download,
  FileText,
  Shield,
  ChevronRight,
  Mail,
  Menu,
  X,
} from 'lucide-react';

// ─── Privacy Policy Sections Data ───

interface PolicySection {
  id: string;
  title: string;
  content: React.ReactNode;
}

const POLICY_SECTIONS: PolicySection[] = [
  {
    id: 'what-info',
    title: 'What Information Do We Collect?',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          We collect information that you provide directly to us, information collected automatically, and information from third-party sources.
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-muted/50 border border-border/40">
            <h4 className="text-sm font-semibold text-foreground mb-2">Personal Information</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Email address, phone number, job title, usernames, passwords, contact preferences, billing addresses, payment data, names, business licences, and certificates.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border/40">
            <h4 className="text-sm font-semibold text-foreground mb-2">Sensitive Information</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Financial data and biometric data. When we process sensitive information, we apply appropriate safeguards and comply with applicable legal requirements.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border/40">
            <h4 className="text-sm font-semibold text-foreground mb-2">Automatically Collected Information</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              IP address, browser and device information, log and usage data, device data, and location data. This information is collected automatically when you use our services.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'how-process',
    title: 'How Do We Process Your Information?',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          We process your information for the following purposes:
        </p>
        <ul className="space-y-2">
          {[
            'Account creation and management',
            'User communications and support',
            'Marketing and targeted advertising',
            'Security and fraud prevention',
            'Service improvement and analytics',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <ChevronRight className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: 'legal-bases',
    title: 'What Legal Bases Do We Rely On?',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          We rely on the following legal bases to process your personal information:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { title: 'Consent', desc: 'When you have given us explicit consent to process your data for specific purposes.' },
            { title: 'Performance of Contract', desc: 'When processing is necessary to fulfill our contractual obligations to you.' },
            { title: 'Legitimate Interests', desc: 'When necessary for our legitimate business interests, balanced against your rights.' },
            { title: 'Legal Obligations', desc: 'When processing is required to comply with applicable laws and regulations.' },
            { title: 'Vital Interests', desc: 'When necessary to protect the vital interests of you or another person.' },
          ].map((item) => (
            <div key={item.title} className="p-3 rounded-lg bg-muted/50 border border-border/40">
              <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'when-share',
    title: 'When and With Whom Do We Share?',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          We may share your information in the following situations:
        </p>
        <ul className="space-y-2">
          {[
            'Business transfers — In connection with a merger, acquisition, or sale of assets.',
            'Affiliates — With our affiliated companies under common control.',
            'Business partners — With trusted third parties who assist us in operating our services.',
            'Other users — When you interact with collaborative features on the platform.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <ChevronRight className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and Tracking Technologies',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          We use cookies and similar tracking technologies for the following purposes:
        </p>
        <div className="flex flex-wrap gap-2">
          {['Security', 'Preferences', 'Analytics', 'Advertising'].map((purpose) => (
            <Badge
              key={purpose}
              variant="secondary"
              className="bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/40"
            >
              {purpose}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You can manage your cookie preferences through your browser settings. Please note that disabling certain cookies may affect the functionality of our services.
        </p>
      </div>
    ),
  },
  {
    id: 'ai-products',
    title: 'AI-Based Products',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          We offer AI-powered products including:
        </p>
        <ul className="space-y-2">
          {[
            'AI document generation — Automated creation of documents based on your inputs.',
            'AI text analysis — Intelligent analysis and processing of text content.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <ChevronRight className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You can opt out of AI-based features at any time through your account settings.
        </p>
      </div>
    ),
  },
  {
    id: 'social-logins',
    title: 'Social Logins',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          We may collect profile information from social media providers when you choose to log in through social accounts. This may include your name, email address, and profile picture, depending on the permissions you grant.
        </p>
      </div>
    ),
  },
  {
    id: 'international-transfers',
    title: 'International Transfers',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your information may be transferred to and processed in countries other than your own. We implement appropriate safeguards including:
        </p>
        <ul className="space-y-2">
          {[
            'Standard Contractual Clauses (SCCs)',
            'Binding Corporate Rules (BCRs)',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <ChevronRight className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: 'how-long',
    title: 'How Long Do We Keep Information?',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          We retain your personal information only for as long as necessary to fulfill the purposes described in this policy. In most cases, we will not retain your data for longer than <strong className="text-foreground">6 months past account termination</strong>, unless a longer retention period is required by law.
        </p>
      </div>
    ),
  },
  {
    id: 'privacy-rights',
    title: 'Your Privacy Rights',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Depending on your location, you may have the following rights:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            'Right of Access',
            'Right of Rectification',
            'Right of Erasure',
            'Right of Restriction',
            'Right of Data Portability',
            'Right to Object to Automated Decisions',
          ].map((right) => (
            <div
              key={right}
              className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/40"
            >
              <Shield className="h-4 w-4 text-orange-500 flex-shrink-0" />
              <span className="text-xs font-medium text-foreground">{right}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'dnt',
    title: 'Do-Not-Track Controls',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          We honor Do-Not-Track (DNT) signals. When we detect a DNT signal from your browser, we will take steps to limit tracking and data collection in accordance with our commitment to respecting your privacy preferences.
        </p>
      </div>
    ),
  },
  {
    id: 'us-rights',
    title: 'US Resident Rights',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you are a resident of the United States, you have specific rights under the California Consumer Privacy Act (CCPA) and applicable state privacy laws, including:
        </p>
        <ul className="space-y-2">
          {[
            'Right to know what personal information is collected',
            'Right to request deletion of personal information',
            'Right to opt out of the sale of personal information',
            'Right to non-discrimination for exercising your rights',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <ChevronRight className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: 'other-region-rights',
    title: 'Other Region Rights',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you are located outside the United States, you may have additional rights under:
        </p>
        <div className="flex flex-wrap gap-2">
          {['GDPR (EU)', 'UK GDPR', 'PIPEDA (Canada)'].map((regulation) => (
            <Badge
              key={regulation}
              variant="secondary"
              className="bg-slate-100 text-slate-700 border-slate-200/60 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700/40"
            >
              {regulation}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          These regulations provide you with rights regarding access, correction, deletion, and portability of your data, among others.
        </p>
      </div>
    ),
  },
  {
    id: 'updates',
    title: 'Updates to This Notice',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          We may update this privacy policy from time to time. When we make changes, we will notify you by revising the &ldquo;Last updated&rdquo; date at the top of this page and, in some cases, provide additional notice such as adding a statement to our homepage or sending you a notification.
        </p>
      </div>
    ),
  },
  {
    id: 'contact',
    title: 'Contact Us',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you have any questions or concerns about this privacy policy, please contact us at:
        </p>
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/40">
          <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center flex-shrink-0">
            <Mail className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</p>
            <a
              href="mailto:afomiyaaweke6@gmail.com"
              className="text-sm font-medium text-orange-600 dark:text-orange-400 hover:underline"
            >
              afomiyaaweke6@gmail.com
            </a>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'review-data',
    title: 'Review, Update, or Delete Data',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          You can review, update, or delete your personal data by:
        </p>
        <ul className="space-y-2">
          {[
            'Visiting your account settings within the platform',
            'Contacting us directly at afomiyaaweke6@gmail.com',
            'Submitting a formal data subject access request',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <ChevronRight className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We will respond to your request within the timeframe required by applicable law.
        </p>
      </div>
    ),
  },
];

// ─── Sidebar Navigation ───

function SidebarNav({
  sections,
  activeId,
  onNavigate,
}: {
  sections: PolicySection[];
  activeId: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <nav className="space-y-1">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onNavigate(section.id)}
          className={`
            w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150
            ${
              activeId === section.id
                ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border-l-2 border-orange-500'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }
          `}
        >
          <span className="line-clamp-2">{section.title}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── Main Export ───

export function PrivacyPolicyView() {
  const [activeId, setActiveId] = useState('what-info');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );

    POLICY_SECTIONS.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
      setMobileNavOpen(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
            <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Last updated June 23, 2026
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/40"
          >
            Tenet
          </Badge>
          <a href="/api/privacy-policy/pdf" download>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800/40 dark:text-orange-400 dark:hover:bg-orange-950/30"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </a>
        </div>
      </div>

      {/* Mobile nav toggle */}
      <div className="lg:hidden mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="w-full gap-2 justify-start border-border/60"
        >
          {mobileNavOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
          {mobileNavOpen ? 'Hide' : 'Show'} Section Navigation
        </Button>
        {mobileNavOpen && (
          <Card className="mt-2 border-border/50 shadow-sm">
            <CardContent className="p-3">
              <ScrollArea className="max-h-64">
                <SidebarNav
                  sections={POLICY_SECTIONS}
                  activeId={activeId}
                  onNavigate={scrollToSection}
                />
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left sidebar — sticky on desktop */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-20">
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Sections
                  </span>
                </div>
                <Separator className="mb-3" />
                <ScrollArea className="max-h-[calc(100vh-200px)]">
                  <SidebarNav
                    sections={POLICY_SECTIONS}
                    activeId={activeId}
                    onNavigate={scrollToSection}
                  />
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3">
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6 md:p-8 space-y-0">
              {POLICY_SECTIONS.map((section, index) => (
                <div key={section.id} id={section.id}>
                  {index > 0 && <Separator className="my-8 opacity-40" />}
                  <div className="scroll-mt-20">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 text-xs font-bold flex-shrink-0 mt-0.5">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h2 className="text-lg md:text-xl font-bold text-foreground">
                        {section.title}
                      </h2>
                    </div>
                    <div className="pl-10">{section.content}</div>
                  </div>
                </div>
              ))}

              {/* Footer */}
              <Separator className="my-8 opacity-40" />
              <div className="pl-10">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This privacy policy is effective as of June 23, 2026 and applies to all users of the Tenets platform.
                  For questions about this policy, please contact us at{' '}
                  <a
                    href="mailto:afomiyaaweke6@gmail.com"
                    className="text-orange-600 dark:text-orange-400 hover:underline font-medium"
                  >
                    afomiyaaweke6@gmail.com
                  </a>
                  .
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
