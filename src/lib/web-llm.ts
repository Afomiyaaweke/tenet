// On-device AI via WebLLM (runs LLMs in the browser using WebGPU).
//
// This is the "local" half of the hybrid AI system. It loads a small model
// (Llama-3.2-1B-Instruct, ~800MB) directly in the browser — no server, no
// API costs, works offline once loaded. The model is cached in IndexedDB so
// subsequent loads are fast.
//
// Use for: quick chat replies, short answers, simple questions.
// Fall back to cloud AI (ZAI) for: document generation, structured review,
// vision/image analysis, long/complex prompts.

import type { MLCEngineInterface, InitProgressReport, ChatCompletionMessageParam } from '@mlc-ai/web-llm';

// Llama-3.2-1B — good balance of size (~800MB) and quality for chat.
// Smaller than Phi-3.5-mini (2GB), smarter than Qwen-0.5B.
const DEFAULT_MODEL = 'Llama-3.2-1B-Instruct-q4f32_1-MLC';

export type LocalAIStatus = 'unloaded' | 'loading' | 'ready' | 'failed' | 'unsupported';

export interface LocalAIState {
  status: LocalAIStatus;
  progress: number; // 0-1
  progressText: string;
  error?: string;
}

type Listener = (state: LocalAIState) => void;

class LocalAIManager {
  private engine: MLCEngineInterface | null = null;
  private loadPromise: Promise<MLCEngineInterface> | null = null;
  private state: LocalAIState = { status: 'unloaded', progress: 0, progressText: '' };
  private listeners = new Set<Listener>();

  getState(): LocalAIState {
    return { ...this.state };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState()); // emit current state immediately
    return () => this.listeners.delete(listener);
  }

  private setState(patch: Partial<LocalAIState>): void {
    this.state = { ...this.state, ...patch };
    const snapshot = this.getState();
    this.listeners.forEach((l) => l(snapshot));
  }

  /**
   * Check if WebGPU is available in the current browser.
   * ~70% of browsers support it (Chrome 113+, Edge 113+, Safari 18+).
   */
  isSupported(): boolean {
    if (typeof navigator === 'undefined') return false;
    return !!(navigator as Navigator & { gpu?: unknown }).gpu;
  }

  /**
   * Load the model. Returns the same promise if already loading/loaded.
   * Safe to call multiple times.
   */
  async load(): Promise<MLCEngineInterface> {
    if (this.engine) return this.engine;
    if (this.loadPromise) return this.loadPromise;

    if (!this.isSupported()) {
      this.setState({ status: 'unsupported', error: 'WebGPU is not available in this browser. Use Chrome 113+, Edge 113+, or Safari 18+.' });
      return Promise.reject(new Error('WebGPU not supported'));
    }

    this.setState({ status: 'loading', progress: 0, progressText: 'Initializing…', error: undefined });
    this.loadPromise = this.doLoad();
    return this.loadPromise;
  }

  private async doLoad(): Promise<MLCEngineInterface> {
    try {
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
      const engine = await CreateMLCEngine(DEFAULT_MODEL, {
        initProgressCallback: (report: InitProgressReport) => {
          this.setState({
            progress: report.progress,
            progressText: report.text,
          });
        },
      });
      this.engine = engine;
      this.setState({ status: 'ready', progress: 1, progressText: 'Model ready' });
      return engine;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.setState({ status: 'failed', error: msg, progressText: 'Load failed' });
      this.loadPromise = null;
      throw err;
    }
  }

  /**
   * Generate a chat completion locally. Returns the text, or null on failure
   * (caller falls back to cloud AI).
   *
   * @param messages - OpenAI-style messages (system + user + assistant)
   * @param deadlineMs - hard deadline; if exceeded, returns null so cloud can take over
   */
  async chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    deadlineMs = 15000,
  ): Promise<string | null> {
    if (!this.engine) {
      try {
        await this.load();
      } catch {
        return null; // can't load → fall back to cloud
      }
    }
    if (!this.engine) return null;

    try {
      const completion = await Promise.race([
        this.engine.chat.completions.create({
          messages: messages as ChatCompletionMessageParam[],
          temperature: 0.7,
          max_tokens: 512, // local model replies are short — keep it fast
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), deadlineMs)),
      ]);

      if (!completion) return null;
      const content = completion.choices?.[0]?.message?.content || '';
      return content.trim() || null;
    } catch {
      return null; // any local error → fall back to cloud
    }
  }

  /**
   * Unload the model to free memory. The model stays cached in IndexedDB
   * so the next load is fast.
   */
  async unload(): Promise<void> {
    if (this.engine) {
      try {
        await this.engine.unload();
      } catch {
        // ignore
      }
      this.engine = null;
      this.loadPromise = null;
      this.setState({ status: 'unloaded', progress: 0, progressText: '' });
    }
  }
}

// Singleton — one model instance per browser tab
export const localAI = new LocalAIManager();

/**
 * Heuristic: should this message be handled by the local model?
 *
 * Local model is good for: short questions, quick explanations, simple chat.
 * Cloud is needed for: generation tasks (write/draft/generate/create/build),
 * analysis (analyze/review/evaluate), long prompts, vision, structured JSON.
 */
export function shouldUseLocalAI(message: string): boolean {
  const lower = message.toLowerCase().trim();
  // Cloud-only keywords (generation/analysis/structured output)
  const cloudKeywords = [
    'generate', 'write', 'draft', 'create', 'build', 'compose',
    'analyze', 'analyse', 'review', 'evaluate', 'assess', 'score',
    'translate', 'convert to json', 'format as',
    'bid proposal', 'tender document', 'executive summary',
  ];
  if (cloudKeywords.some((kw) => lower.includes(kw))) return false;
  // Long prompts → cloud (local model quality drops on long context)
  if (message.length > 500) return false;
  // Short/simple → local
  return true;
}
