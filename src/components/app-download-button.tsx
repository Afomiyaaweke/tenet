'use client';

import { useState } from 'react';
import {
  Smartphone,
  SquareArrowUp,
  CirclePlus,
  EllipsisVertical,
  Download,
  Check,
  MonitorSmartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePWAInstall } from '@/components/pwa-provider';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Variant = 'nav' | 'hero' | 'dark' | 'big';

const VARIANT_STYLES: Record<Variant, string> = {
  // Compact navbar button — icon only on mobile, icon + label on md+
  nav: 'h-9 px-3 bg-slate-900 text-white text-sm font-semibold rounded-lg border-0 shadow-md shadow-slate-300/40 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200',
  // Hero secondary CTA — matches "Browse Proforma" styling
  hero: 'w-full sm:w-auto h-12 px-7 bg-white text-slate-700 text-sm font-semibold border border-slate-200 shadow-sm hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 rounded-xl',
  // Dark section CTA — matches the outline button on the slate-900 CTA band
  dark: 'h-13 px-8 bg-transparent text-white text-base font-semibold border border-white/30 rounded-xl hover:bg-white/10 hover:text-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-200',
  // Big showcase button in the mobile app section
  big: 'w-full sm:w-auto h-14 px-9 bg-slate-900 text-white text-base font-bold rounded-xl border-0 shadow-xl shadow-slate-300/50 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200',
};

const LABELS: Record<Variant, string> = {
  nav: 'Get App',
  hero: 'Get the Mobile App',
  dark: 'Get the Mobile App',
  big: 'Get the Mobile App',
};

interface InstallStep {
  icon: React.ReactNode;
  text: React.ReactNode;
}

/**
 * "Download the app" button for the landing page.
 *
 * - Android / desktop Chromium: fires the native install dialog — the app
 *   is added to the home screen / desktop in one tap.
 * - iOS Safari / other browsers: opens a step-by-step "Add to Home Screen"
 *   guide (Apple does not allow programmatic install prompts).
 * - Already installed: confirms with a toast.
 */
export function AppDownloadButton({
  variant = 'hero',
  className = '',
}: {
  variant?: Variant;
  className?: string;
}) {
  const { canInstall, isInstalled, platform, promptInstall } = usePWAInstall();
  const [helpOpen, setHelpOpen] = useState(false);

  const handleClick = async () => {
    if (isInstalled) {
      toast.success('TenetBid is already installed on this device.');
      return;
    }
    if (canInstall) {
      const outcome = await promptInstall();
      if (outcome === 'dismissed') {
        toast('No problem — you can install anytime from this button.', { duration: 4000 });
      }
      return;
    }
    // No native prompt (iOS Safari, Firefox, in-app browsers…) → guided steps
    setHelpOpen(true);
  };

  const steps: InstallStep[] =
    platform === 'ios'
      ? [
          {
            icon: <SquareArrowUp className="w-4.5 h-4.5" />,
            text: (
              <>
                Tap the <strong>Share</strong> button in the browser toolbar
              </>
            ),
          },
          {
            icon: <CirclePlus className="w-4.5 h-4.5" />,
            text: (
              <>
                Scroll down and tap <strong>Add to Home Screen</strong>
              </>
            ),
          },
          {
            icon: <Check className="w-4.5 h-4.5" />,
            text: (
              <>
                Tap <strong>Add</strong> — TenetBid lands on your home screen like any app
              </>
            ),
          },
        ]
      : platform === 'android'
        ? [
            {
              icon: <EllipsisVertical className="w-4.5 h-4.5" />,
              text: (
                <>
                  Open your browser&apos;s <strong>menu</strong> (⋮)
                </>
              ),
            },
            {
              icon: <Download className="w-4.5 h-4.5" />,
              text: (
                <>
                  Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>
                </>
              ),
            },
            {
              icon: <Check className="w-4.5 h-4.5" />,
              text: (
                <>
                  Confirm — TenetBid installs to your home screen
                </>
              ),
            },
          ]
        : [
            {
              icon: <MonitorSmartphone className="w-4.5 h-4.5" />,
              text: (
                <>
                  Click the <strong>install</strong> icon in your address bar
                </>
              ),
            },
            {
              icon: <Download className="w-4.5 h-4.5" />,
              text: (
                <>
                  Or open the browser menu and choose <strong>Install TenetBid</strong>
                </>
              ),
            },
            {
              icon: <Check className="w-4.5 h-4.5" />,
              text: (
                <>
                  TenetBid opens in its own app window
                </>
              ),
            },
          ];

  return (
    <>
      <Button
        onClick={handleClick}
        aria-label={
          isInstalled ? 'TenetBid app is installed' : 'Download the TenetBid mobile app'
        }
        className={cn(VARIANT_STYLES[variant], className)}
      >
        {isInstalled ? (
          <Check className={cn('shrink-0', variant === 'nav' ? 'w-4 h-4' : 'w-4.5 h-4.5')} />
        ) : (
          <Smartphone
            className={cn(
              'shrink-0',
              variant === 'nav' ? 'w-4 h-4' : 'w-4.5 h-4.5',
              variant === 'hero' && 'text-orange-500'
            )}
          />
        )}
        <span className={cn(variant === 'nav' && 'hidden md:inline ml-0 md:ml-1.5')}>
          {isInstalled ? 'Installed' : LABELS[variant]}
        </span>
      </Button>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-orange-500" />
              Install the TenetBid App
            </DialogTitle>
            <DialogDescription>
              {platform === 'ios'
                ? 'Add TenetBid to your home screen — takes about 5 seconds.'
                : "Your browser needs one extra step to install the app — here's how."}
            </DialogDescription>
          </DialogHeader>

          <ol className="space-y-4 py-1">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200/60 text-orange-600 flex items-center justify-center">
                    {step.icon}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed pt-1.5">{step.text}</p>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl bg-muted/60 border border-border px-4 py-3">
            {['Free', '~1 MB install', 'Full-screen', 'Works offline'].map((f) => (
              <span key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                {f}
              </span>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
