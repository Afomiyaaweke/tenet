'use client';

import { useAIProvider, type AIMode } from '@/components/ai-provider';
import { Cpu, Cloud, Zap, Loader2, Check, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const MODE_LABELS: Record<AIMode, { label: string; icon: typeof Cpu; desc: string }> = {
  auto: { label: 'Auto', icon: Zap, desc: 'Simple → local (free), complex → cloud' },
  local: { label: 'Local', icon: Cpu, desc: 'On-device AI — free, offline, lower quality' },
  cloud: { label: 'Cloud', icon: Cloud, desc: 'Server AI — premium quality, costs tokens' },
};

export function AIModeToggle() {
  const { mode, setMode, localState, loadLocal, localAvailable } = useAIProvider();
  const current = MODE_LABELS[mode];
  const CurrentIcon = current.icon;

  const statusColor =
    mode === 'cloud' ? 'text-blue-400' :
    mode === 'local' ? (localState.status === 'ready' ? 'text-emerald-400' : localState.status === 'loading' ? 'text-amber-400' : 'text-muted-foreground') :
    localAvailable ? 'text-emerald-400' : 'text-muted-foreground';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-muted/60 hover:bg-muted border border-border/60 text-[11px] font-medium transition-colors"
          title="AI mode — choose where AI runs"
        >
          <CurrentIcon className={`h-3.5 w-3.5 ${statusColor}`} />
          <span className="hidden sm:inline">AI: {current.label}</span>
          {localState.status === 'loading' && (
            <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
          )}
          {mode === 'local' && localState.status === 'ready' && (
            <Check className="h-3 w-3 text-emerald-400" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          AI Engine Mode
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {(Object.keys(MODE_LABELS) as AIMode[]).map((m) => {
          const info = MODE_LABELS[m];
          const Icon = info.icon;
          const isActive = mode === m;
          return (
            <DropdownMenuItem
              key={m}
              onClick={() => {
                setMode(m);
                toast.success(`AI mode: ${info.label} — ${info.desc}`);
              }}
              className="flex items-start gap-2.5 py-2.5 cursor-pointer"
            >
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isActive ? 'text-teal-500' : 'text-muted-foreground'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{info.label}</span>
                  {isActive && <Check className="h-3 w-3 text-teal-500" />}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{info.desc}</p>
              </div>
            </DropdownMenuItem>
          );
        })}

        {/* Local model status / load button */}
        {mode !== 'cloud' && (
          <>
            <DropdownMenuSeparator />
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Local model</span>
                <span className={`text-[10px] font-semibold uppercase ${
                  localState.status === 'ready' ? 'text-emerald-500' :
                  localState.status === 'loading' ? 'text-amber-500' :
                  localState.status === 'failed' ? 'text-rose-500' :
                  localState.status === 'unsupported' ? 'text-rose-500' :
                  'text-muted-foreground'
                }`}>
                  {localState.status}
                </span>
              </div>

              {localState.status === 'loading' && (
                <div className="space-y-1">
                  <Progress value={localState.progress * 100} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground truncate">{localState.progressText}</p>
                </div>
              )}

              {localState.status === 'unsupported' && (
                <p className="text-[10px] text-rose-500 leading-snug">
                  WebGPU not available. Use Chrome 113+, Edge 113+, or Safari 18+ to enable local AI.
                </p>
              )}

              {localState.status === 'failed' && (
                <p className="text-[10px] text-rose-500 leading-snug">
                  {localState.error || 'Failed to load local model.'}
                </p>
              )}

              {localState.status === 'unloaded' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[11px]"
                  onClick={() => {
                    loadLocal().catch(() => {
                      toast.error('Could not load local model. Falling back to cloud.');
                    });
                  }}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Load local model (~800MB)
                </Button>
              )}

              {localState.status === 'ready' && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600">
                  <Check className="h-3 w-3" />
                  Model ready — running on your device
                </div>
              )}
            </div>
          </>
        )}

        {mode === 'cloud' && (
          <>
            <DropdownMenuSeparator />
            <div className="p-3">
              <p className="text-[10px] text-muted-foreground leading-snug flex items-start gap-1.5">
                <Cloud className="h-3 w-3 mt-0.5 shrink-0" />
                All AI requests use the cloud server. No local model loaded.
              </p>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
