'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/store';
import { LandingPage } from '@/components/landing-page';
import { AuthGate } from '@/components/auth-gate';
import { Loader2 } from 'lucide-react';

const AppShell = dynamic(() => import('@/components/app-shell').then(m => ({ default: m.AppShell })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  const { user, token, isLoading, fetchMe } = useAuthStore();
  const [showAuth, setShowAuth] = useState(false);

  // If user has a real token, try to fetch their profile
  useEffect(() => {
    if (token && token !== 'guest' && !user) {
      fetchMe();
    }
  }, [token, user, fetchMe]);

  // If fetchMe fails (bad token), the store clears the token — go back to landing
  useEffect(() => {
    if (!isLoading && token === null) {
      setShowAuth(false);
    }
  }, [token, isLoading]);

  // Loading state while checking auth
  if (isLoading && token && token !== 'guest') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // User is authenticated with a real token — show the app
  if (user && token && token !== 'guest') {
    return <AppShell />;
  }

  // Show auth gate (sign in / register)
  if (showAuth || (token === 'guest')) {
    return (
      <AuthGate
        onBack={() => {
          useAuthStore.setState({ token: null });
          setShowAuth(false);
        }}
      />
    );
  }

  // Default: show landing page
  return (
    <LandingPage
      onGetStarted={() => setShowAuth(true)}
    />
  );
}
