'use client';

import { useEffect } from 'react';
import { useAuthStore, useNavStore } from '@/store';
import { AuthGate } from '@/components/auth-gate';
import { AppShell } from '@/components/app-shell';

export default function Home() {
  const { fetchMe, isLoading, token } = useAuthStore();

  useEffect(() => {
    if (token) {
      fetchMe();
    } else {
      useAuthStore.setState({ isLoading: false });
    }
  }, [token, fetchMe]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading Afomiya...</p>
        </div>
      </div>
    );
  }

  return token ? <AppShell /> : <AuthGate />;
}
