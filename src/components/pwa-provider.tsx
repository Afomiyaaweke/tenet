'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type PWAPlatform = 'android' | 'ios' | 'desktop';

export interface PWAInstallState {
  /** Native install prompt is available (Android Chrome/Edge, desktop Chromium) */
  canInstall: boolean;
  /** App is already installed / running in standalone mode */
  isInstalled: boolean;
  /** Best-effort platform detection used to show the right install steps */
  platform: PWAPlatform;
  isMobile: boolean;
  /** Trigger the native install dialog. Returns the user's choice. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

const PWAContext = createContext<PWAInstallState | null>(null);

/**
 * Shared hook for triggering the PWA install flow from anywhere
 * (landing page download button, banner, etc.)
 */
export function usePWAInstall(): PWAInstallState {
  const ctx = useContext(PWAContext);
  if (!ctx) throw new Error('usePWAInstall must be used inside <PWAProvider>');
  return ctx;
}

function detectPlatform(): PWAPlatform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  // iPadOS 13+ reports itself as Mac with touch support
  const iosLike =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (iosLike) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

/**
 * PWA layer:
 * 1. Registers the service worker (offline support + instant repeat loads)
 * 2. Captures the native install prompt and shares it via usePWAInstall()
 * 3. Shows a passive install banner a few seconds after load (Chromium only)
 * 4. Marks the app as installed (hides the banner afterwards)
 */
export function PWAProvider({ children }: { children: ReactNode }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<PWAPlatform>('desktop');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 1. Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.warn('[PWA] SW registration failed:', err));
    }

    // Platform + installed state (deferred out of the effect body)
    queueMicrotask(() => {
      setPlatform(detectPlatform());
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (standalone) {
        localStorage.setItem('pwa_installed', '1');
        setInstalled(true);
      }
    });

    // 2. Capture install prompt (Android Chrome / Edge, desktop Chromium)
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      // Auto banner only if not previously dismissed and not already installed
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      const wasInstalled = localStorage.getItem('pwa_installed');
      if (!dismissed && !wasInstalled) {
        setTimeout(() => setShowBanner(true), 4000); // let the page settle first
      }
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // 3. Detect installed app (hide banner, remember choice)
    const onInstalled = () => {
      localStorage.setItem('pwa_installed', '1');
      setInstalled(true);
      setInstallEvent(null);
      setShowBanner(false);
      toast.success('TenetBid installed! Find it on your home screen.', { duration: 6000 });
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(
    async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
      if (!installEvent) return 'unavailable';
      try {
        await installEvent.prompt();
        const { outcome } = await installEvent.userChoice;
        if (outcome === 'accepted') {
          localStorage.setItem('pwa_installed', '1');
          setInstalled(true);
        }
        return outcome;
      } catch {
        return 'unavailable';
      } finally {
        setInstallEvent(null);
        setShowBanner(false);
      }
    },
    [installEvent]
  );

  const value: PWAInstallState = {
    canInstall: installEvent !== null,
    isInstalled: installed,
    platform,
    isMobile: platform !== 'desktop',
    promptInstall,
  };

  return (
    <PWAContext.Provider value={value}>
      {children}

      {/* Passive install banner (Chromium browsers only) */}
      {!showBanner ? null : (
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
                  onClick={promptInstall}
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
      )}
    </PWAContext.Provider>
  );
}
