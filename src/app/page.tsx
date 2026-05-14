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

  useEffect(() => {
    if (token) {
      fetchMe();
    } else {
      useAuthStore.setState({ isLoading: false });
    }
  }, [token, fetchMe]);

  // Derive screen from token — when token appears, go to app
  const activeScreen: AppScreen = token ? 'app' : screen;

  if (isLoading && token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading Tenet...</p>
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
