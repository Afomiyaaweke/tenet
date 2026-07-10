'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Languages, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'am', label: 'Amharic (አማርኛ)' },
  { code: 'om', label: 'Afaan Oromoo' },
  { code: 'ti', label: 'Tigrinya (ትግርኛ)' },
  { code: 'so', label: 'Somali' },
  { code: 'ar', label: 'Arabic (العربية)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'de', label: 'German (Deutsch)' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'pt', label: 'Portuguese (Português)' },
  { code: 'it', label: 'Italian (Italiano)' },
  { code: 'zh', label: 'Chinese (中文)' },
  { code: 'ja', label: 'Japanese (日本語)' },
  { code: 'ko', label: 'Korean (한국어)' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'ru', label: 'Russian (Русский)' },
  { code: 'sw', label: 'Swahili' },
  { code: 'tr', label: 'Turkish (Türkçe)' },
  { code: 'pl', label: 'Polish (Polski)' },
  { code: 'nl', label: 'Dutch (Nederlands)' },
];

interface TranslationResult {
  translatedText: string;
  targetLang: string;
}

/**
 * Translate text using the backend AI translation API.
 */
async function translateText(
  text: string,
  targetLang: string,
): Promise<TranslationResult> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('tenet_token')
      : null;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/ai/translate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, targetLang }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Translation failed');
  return data.data;
}

/* ───────────────────────── Inline translator button ───────────────────────── */

interface InlineTranslatorProps {
  text: string;
  className?: string;
  size?: 'sm' | 'default';
}

export function InlineTranslator({
  text,
  className = '',
  size = 'sm',
}: InlineTranslatorProps) {
  const [targetLang, setTargetLang] = useState('am');
  const [translating, setTranslating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTranslate = useCallback(async () => {
    if (!text?.trim()) return;
    setTranslating(true);
    setResult(null);
    try {
      const r = await translateText(text, targetLang);
      setResult(r.translatedText);
    } catch {
      toast.error('Translation failed. Please try again.');
    } finally {
      setTranslating(false);
    }
  }, [text, targetLang]);

  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const sizeClasses =
    size === 'sm' ? 'h-7 text-[11px] gap-1 px-2' : 'h-9 text-xs gap-1.5 px-3';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      <Select value={targetLang} onValueChange={setTargetLang}>
        <SelectTrigger
          className={`w-auto min-w-[100px] max-w-[140px] ${sizeClasses} rounded-lg border-border/60 bg-background`}
        >
          <Languages className={`${iconSize} mr-1 text-orange-500`} />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        className={`${sizeClasses} rounded-lg border-orange-200 dark:border-orange-800/40 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30`}
        onClick={handleTranslate}
        disabled={translating || !text?.trim()}
      >
        {translating ? (
          <Loader2 className={`${iconSize} animate-spin`} />
        ) : (
          <Languages className={iconSize} />
        )}
        {translating ? 'Translating...' : 'Translate'}
      </Button>

      {result && (
        <Card className="flex-1 min-w-[200px] border-orange-200/60 dark:border-orange-800/40 bg-orange-50/30 dark:bg-orange-950/10">
          <CardContent className="p-2.5 space-y-1.5">
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
              {result}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-[10px] gap-1 px-1.5 text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-2.5 w-2.5" />
              ) : (
                <Copy className="h-2.5 w-2.5" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ───────────────────────── Full translator panel ───────────────────────── */

interface TranslatorPanelProps {
  text: string;
  title?: string;
  className?: string;
}

export function TranslatorPanel({
  text,
  title = 'Translate Document',
  className = '',
}: TranslatorPanelProps) {
  const [targetLang, setTargetLang] = useState('am');
  const [translating, setTranslating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTranslate = useCallback(async () => {
    if (!text?.trim()) return;
    setTranslating(true);
    setResult(null);
    try {
      const r = await translateText(text, targetLang);
      setResult(r.translatedText);
    } catch {
      toast.error('Translation failed. Please try again.');
    } finally {
      setTranslating(false);
    }
  }, [text, targetLang]);

  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  return (
    <Card className={`border-border/50 ${className}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
            <Languages className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-[10px] text-muted-foreground">
              AI-powered translation for documents and content
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={targetLang} onValueChange={setTargetLang}>
            <SelectTrigger className="w-[180px] h-8 text-xs rounded-lg border-border/60">
              <Languages className="h-3 w-3 mr-1 text-orange-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 rounded-lg border-orange-200 dark:border-orange-800/40 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30"
            onClick={handleTranslate}
            disabled={translating || !text?.trim()}
          >
            {translating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Languages className="h-3 w-3" />
            )}
            {translating ? 'Translating...' : 'Translate'}
          </Button>
        </div>

        {result && (
          <div className="rounded-lg border border-orange-200/60 dark:border-orange-800/40 bg-orange-50/30 dark:bg-orange-950/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">
                Translation (
                {LANGUAGES.find((l) => l.code === targetLang)?.label ||
                  targetLang}
                )
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[10px] gap-1 px-1.5 text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-2.5 w-2.5" />
                ) : (
                  <Copy className="h-2.5 w-2.5" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
              {result}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
