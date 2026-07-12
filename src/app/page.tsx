'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store';
import { LandingPage } from '@/components/landing-page';
import { AuthGate } from '@/components/auth-gate';
import { AppShell } from '@/components/app-shell';

type AppScreen = 'landing' | 'auth' | 'app';

export default function Home() {
  const { fetchMe, isLoading, token } = useAuthStore();
  const [screen, setScreen] = useState<AppScreen>('landing');
  const [mounted, setMounted] = useState(false);

  // Wait until after hydration to read client-only state (localStorage token)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (token) {
      fetchMe();
    } else {
      useAuthStore.setState({ isLoading: false });
    }
  }, [token, fetchMe]);

  // Before mount, always render the landing page to match server HTML
  // This prevents hydration mismatch when localStorage has a token
  if (!mounted) {
    return <LandingPage onGetStarted={() => {}} />;
  }

  // Derive screen from token — when token appears, go to app
  const activeScreen: AppScreen = token ? 'app' : screen;

  if (isLoading && token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading Published Tender World Bank...</p>
        </div>
      </div>
    );
  }

  if (activeScreen === 'app') {
    return <AppShell />;
  }

  if (activeScreen === 'auth') {
    return <AuthGate onBack={() => setScreen('landing')} />;
  }

  return <LandingPage onGetStarted={() => setScreen('auth')} />;
}
