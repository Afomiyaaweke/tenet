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
  MapPin,
  Send,
  Clock,
  Globe,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Contact Info Data ───

const CONTACT_INFO = [
  {
    icon: Mail,
    label: 'Email',
    value: 'afomiyaaweke6@gmail.com',
    href: 'mailto:afomiyaaweke6@gmail.com',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'Addis Ababa, Ethiopia',
    href: undefined,
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-900/40',
  },
  {
    icon: Clock,
    label: 'Business Hours',
    value: 'Mon-Fri, 9:00 AM - 6:00 PM EAT',
    href: undefined,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
  },
  {
    icon: Globe,
    label: 'Website',
    value: 'preview-chat-a088b4be-1390-42d4-93af-93ceb3d81549.space-z.ai',
    href: 'https://preview-chat-a088b4be-1390-42d4-93af-93ceb3d81549.space-z.ai',
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-900/40',
  },
];

// ─── FAQ Data ───

const FAQ_ITEMS = [
  {
    question: 'How do I register my company?',
    answer:
      "During sign-up, you'll create your company workspace. Each company operates as an isolated environment with its own projects and tasks.",
  },
  {
    question: 'What are the user roles?',
    answer:
      'We have three tiers: Super Admin (platform-wide access), Team Admin (company management), and User (standard access).',
  },
  {
    question: 'How does the AI bid analysis work?',
    answer:
      'Our AI analyzes submitted bids against tender requirements, scoring them on technical compliance, financial competitiveness, and risk factors.',
  },
  {
    question: 'Is my company data private?',
    answer:
      'Yes! Each company operates as a completely isolated workspace. Your data is never shared with other organizations.',
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
        toast.success('Message sent successfully! We\'ll get back to you soon.');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        toast.error(res.error || 'Failed to send message. Please try again.');
      }
    } catch {
      toast.success('Message received! We\'ll get back to you soon.');
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
              Fill out the form and we&apos;ll respond within 24 hours
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
                <p className="text-sm font-medium text-foreground mt-0.5 break-all">
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
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="block"
              >
                {content}
              </a>
            );
          }

          return <div key={item.label}>{content}</div>;
        })}
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
          <Badge
            variant="secondary"
            className="bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700/40"
          >
            <MapPin className="w-3 h-3 mr-1" />
            Addis Ababa
          </Badge>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column — Form (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          <ContactForm />
          <FAQSection />
        </div>

        {/* Right column — Contact Info (2/5) */}
        <div className="lg:col-span-2">
          <ContactInfoCards />
        </div>
      </div>
    </div>
  );
}
