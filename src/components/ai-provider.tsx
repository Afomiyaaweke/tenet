// AI mode provider — controls the hybrid AI routing.
//
// Three modes:
// - "auto": simple queries → local (WebLLM), complex → cloud (ZAI). Default.
// - "local": always local (free, offline, but lower quality). User opt-in.
// - "cloud": always cloud (premium quality, costs API tokens). Current behavior.
//
// Persists the user's choice in localStorage so it survives reloads.

'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { localAI, type LocalAIState, type LocalAIStatus } from '@/lib/web-llm';

export type AIMode = 'auto' | 'local' | 'cloud';

interface AIProviderState {
  mode: AIMode;
  setMode: (mode: AIMode) => void;
  localState: LocalAIState;
  loadLocal: () => Promise<void>;
  unloadLocal: () => Promise<void>;
  // True if local AI is actually usable right now (supported + opted in)
  localAvailable: boolean;
}

const AIContext = createContext<AIProviderState | null>(null);

const STORAGE_KEY = 'tenet_ai_mode';

function getInitialMode(): AIMode {
  if (typeof window === 'undefined') return 'auto';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'local' || saved === 'cloud' || saved === 'auto') return saved;
  return 'auto';
}

export function AIProvider({ children }: { children: ReactNode }) {
  // Lazy init from localStorage — safe to read on first render (client only)
  const [mode, setModeState] = useState<AIMode>(() =>
    typeof window !== 'undefined'
      ? ((): AIMode => {
          const saved = localStorage.getItem(STORAGE_KEY);
          return saved === 'local' || saved === 'cloud' || saved === 'auto' ? saved : 'auto';
        })()
      : 'auto'
  );
  const [localState, setLocalState] = useState<LocalAIState>({
    status: 'unloaded' as LocalAIStatus,
    progress: 0,
    progressText: '',
  });

  // Subscribe to local AI load progress
  useEffect(() => {
    const unsub = localAI.subscribe((state) => {
      setLocalState(state);
    });
    return unsub;
  }, []);

  const setMode = useCallback((newMode: AIMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // ignore storage errors
    }
    // In "local" or "auto" mode, start loading the model preemptively
    if (newMode === 'local' || (newMode === 'auto' && localAI.isSupported())) {
      localAI.load().catch(() => {
        // errors are surfaced via localState
      });
    }
  }, []);

  const loadLocal = useCallback(async () => {
    await localAI.load();
  }, []);

  const unloadLocal = useCallback(async () => {
    await localAI.unload();
  }, []);

  const localAvailable =
    localAI.isSupported() &&
    (localState.status === 'ready' || localState.status === 'loading');

  return (
    <AIContext.Provider
      value={{ mode, setMode, localState, loadLocal, unloadLocal, localAvailable }}
    >
      {children}
    </AIContext.Provider>
  );
}

export function useAIProvider(): AIProviderState {
  const ctx = useContext(AIContext);
  if (!ctx) {
    throw new Error('useAIProvider must be used within an AIProvider');
  }
  return ctx;
}
