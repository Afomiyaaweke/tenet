'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA layer:
 * 1. Registers the service worker (offline support + instant repeat loads)
 * 2. Captures the Android install prompt and shows a custom install banner
 * 3. Marks the app as installed (hides the banner afterwards)
 */
export function PWAProvider() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 1. Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.warn('[PWA] SW registration failed:', err));
    }

    // 2. Capture install prompt (Android Chrome / Edge)
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      // Show banner only if not previously dismissed and not already installed
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      const installed = localStorage.getItem('pwa_installed');
      if (!dismissed && !installed) {
        setTimeout(() => setShowBanner(true), 4000); // let the page settle first
      }
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // 3. Detect installed app (hide banner, skip future prompts)
    const onInstalled = () => {
      localStorage.setItem('pwa_installed', '1');
      setShowBanner(false);
      setInstallEvent(null);
      toast.success('TenetBid installed! Find it on your home screen.', { duration: 6000 });
    };
    window.addEventListener('appinstalled', onInstalled);

    // Standalone display mode check (already running as installed app)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      localStorage.setItem('pwa_installed', '1');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setInstallEvent(null);
  };

  if (!showBanner) return null;

  return (
    <div
      role="dialog"
      aria-label="Install TenetBid app"
      className="fixed bottom-4 left-4 right-4 z-[90] sm:left-auto sm:right-6 sm:w-96 animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur p-4 shadow-2xl">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shrink-0 shadow-md">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Install TenetBid</p>
          <p className="text-xs text-muted-foreground leading-snug mt-0.5">
            Add to your home screen for a full-screen app experience with offline support.
          </p>
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={handleInstall}
              className="h-8 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              Install app
            </button>
            <button
              onClick={() => {
                setShowBanner(false);
                localStorage.setItem('pwa_install_dismissed', '1');
              }}
              className="h-8 px-3 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            setShowBanner(false);
            localStorage.setItem('pwa_install_dismissed', '1');
          }}
          aria-label="Dismiss install banner"
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
