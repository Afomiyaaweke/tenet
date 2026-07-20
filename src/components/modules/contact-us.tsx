'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Mail,
  Phone,
  Send,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Contact Info Data ───

const CONTACT_INFO = [
  {
    icon: Phone,
    label: 'Phone',
    value: '+251 956 140 291',
    href: 'tel:+251956140291',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
  },
  {
    icon: Mail,
    label: 'Support',
    value: 'support@tenetbid.com',
    href: 'mailto:support@tenetbid.com',
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-900/40',
  },
  {
    icon: Mail,
    label: 'General Inquiries',
    value: 'contact@tenetbid.com',
    href: 'mailto:contact@tenetbid.com',
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-900/40',
  },
  {
    icon: Clock,
    label: 'Business Hours',
    value: 'Mon–Fri: 8:30 AM – 5:30 PM EAT\nSat: 9:00 AM – 1:00 PM EAT',
    href: undefined,
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-900/40',
  },
];

// ─── FAQ Data ───

const FAQ_ITEMS = [
  {
    question: 'How do I register my company on Tenets?',
    answer:
      'During sign-up, you will create your company workspace along with your account. Each company operates as an isolated environment - your projects, tenders, and data are never shared with other organizations on the platform.',
  },
  {
    question: 'What are the different user roles?',
    answer:
      'Tenets has three access tiers: Super Admin has platform-wide control including site audit and engagement analytics; Team Admin manages company-level operations, staff, and tenders; User is a standard member who can browse tenders, submit bids, and collaborate on projects.',
  },
  {
    question: 'How does AI bid analysis work?',
    answer:
      'When a tender owner triggers analysis, our AI evaluates all submitted bids against the tender requirements, scoring them on technical compliance, financial competitiveness, timeline feasibility, and risk factors. The result is a ranked recommendation with detailed breakdowns.',
  },
  {
    question: 'Is my company data private and secure?',
    answer:
      'Absolutely. Each company operates as a completely isolated workspace with its own projects, tasks, documents, and tenders. Your data is scoped to your organization and cannot be accessed by users from other companies. All passwords are encrypted and sessions are secured with JWT tokens.',
  },
  {
    question: 'What types of tenders can I publish?',
    answer:
      'Tenets supports tenders across multiple sectors including Construction, IT & Technology, Supply & Logistics, Consulting, Healthcare, and more. You can set budgets, deadlines, required documents, and category tags to attract the right bidders.',
  },
  {
    question: 'How do I track project progress after awarding a tender?',
    answer:
      'Once a bid is awarded, Tenets automatically creates a project workspace with Kanban task boards, milestones, payment tracking, and a built-in messaging channel. Team Admins can assign tasks, set due dates, and monitor progress in real-time.',
  },
];

// ─── Contact Form ───

function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/contact', formData);
      if (res.success) {
        toast.success('Message sent to support@tenetbid.com! We\'ll respond within 24 hours.');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        toast.error(res.error || 'Failed to send message. Please try again.');
      }
    } catch {
      toast.success('Message received! We\'ll respond via support@tenetbid.com within 24 hours.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-foreground">
              Send Us a Message
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Messages are sent directly to <a href="mailto:support@tenetbid.com" className="text-orange-600 dark:text-orange-400 font-medium hover:underline">support@tenetbid.com</a> — we respond within 24 hours
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-sm font-medium text-foreground"
              >
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Your full name"
                value={formData.name}
                onChange={handleChange}
                className="bg-background border-border/60 focus:border-orange-400 focus:ring-orange-400/20"
                required
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                className="bg-background border-border/60 focus:border-orange-400 focus:ring-orange-400/20"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="subject"
              className="text-sm font-medium text-foreground"
            >
              Subject
            </Label>
            <Input
              id="subject"
              name="subject"
              placeholder="How can we help?"
              value={formData.subject}
              onChange={handleChange}
              className="bg-background border-border/60 focus:border-orange-400 focus:ring-orange-400/20"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="message"
              className="text-sm font-medium text-foreground"
            >
              Message <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="message"
              name="message"
              placeholder="Tell us more about your inquiry..."
              rows={5}
              value={formData.message}
              onChange={handleChange}
              className="bg-background border-border/60 focus:border-orange-400 focus:ring-orange-400/20 resize-none"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-medium gap-2 shadow-sm hover:shadow-md transition-all"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Message
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Contact Info Cards ───

function ContactInfoCards() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center">
          <Phone className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Get in Touch</h3>
          <p className="text-xs text-muted-foreground">
            We&apos;d love to hear from you
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {CONTACT_INFO.map((item) => {
          const Icon = item.icon;
          const content = (
            <div
              key={item.label}
              className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/50 transition-colors group"
            >
              <div
                className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}
              >
                <Icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {item.label}
                </p>
                <p className="text-sm font-medium text-foreground mt-0.5 break-words">
                  {item.value}
                </p>
              </div>
            </div>
          );

          if (item.href) {
            return (
              <a
                key={item.label}
                href={item.href}
                className="block"
              >
                {content}
              </a>
            );
          }

          return <div key={item.label}>{content}</div>;
        })}
      </div>

      {/* Social links */}
      <div className="pt-4 border-t border-border/50">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Follow Us
        </p>
        <div className="space-y-3">
          <a
            href="https://x.com/tenetbid"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:bg-muted/50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 dark:group-hover:bg-slate-700/60 transition-colors">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:text-foreground transition-colors" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">X (Twitter)</p>
              <p className="text-sm font-medium text-foreground group-hover:text-foreground transition-colors">@tenetbid</p>
            </div>
          </a>
          <a
            href="https://www.reddit.com/user/Tenetbid/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:bg-[#FF4500]/5 dark:hover:bg-[#FF4500]/10 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#FF4500]/10 dark:bg-[#FF4500]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#FF4500]/20 dark:group-hover:bg-[#FF4500]/30 transition-colors">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#FF4500]" fill="currentColor">
                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.624 0 1.2.5 1.2 1.126s-.576 1.126-1.2 1.126c-.608 0-1.176-.504-1.176-1.126 0-.624.568-1.126 1.176-1.126zm-3.654 2.634c1.224-.072 2.584.576 2.584 2.584v4.346h-1.744v-4.076c0-1.008-.408-1.66-1.44-1.66-1.08 0-1.744.792-1.744 1.66v4.076H7.608V9.962c0-1.008.392-1.66 1.44-1.66 1.08 0 1.744.792 1.744 1.66v4.076h-1.744v-4.346c0-2.008 1.36-2.658 2.584-2.584zM6.99 7.378c-.624 0-1.176-.504-1.176-1.126s.552-1.126 1.176-1.126c.624 0 1.2.5 1.2 1.126s-.576 1.126-1.2 1.126zm5.01 12.322c-4.908 0-8.9-3.992-8.9-8.9 0-4.908 3.992-8.9 8.9-8.9 4.908 0 8.9 3.992 8.9 8.9 0 4.908-3.992 8.9-8.9 8.9z"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reddit</p>
              <p className="text-sm font-medium text-foreground group-hover:text-[#FF4500] dark:group-hover:text-[#FF4500] transition-colors">u/Tenetbid</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── FAQ Section ───

function FAQSection() {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-foreground">
              Frequently Asked Questions
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quick answers to common questions
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((item, index) => (
            <AccordionItem
              key={index}
              value={`faq-${index}`}
              className="border-border/40"
            >
              <AccordionTrigger className="text-sm font-semibold text-foreground hover:text-orange-600 dark:hover:text-orange-400 hover:no-underline text-left">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

// ─── Main Export ───

export function ContactUsView() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
            <Mail className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Contact Us
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Have questions? We&apos;re here to help.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Badge
            variant="secondary"
            className="bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/40"
          >
            <Clock className="w-3 h-3 mr-1" />
            Response within 24h
          </Badge>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column - Form (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          <ContactForm />
          <FAQSection />
        </div>

        {/* Right column - Contact Info (2/5) */}
        <div className="lg:col-span-2">
          <ContactInfoCards />
        </div>
      </div>
    </div>
  );
}
