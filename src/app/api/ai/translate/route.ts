import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', am: 'Amharic', om: 'Afaan Oromoo', ti: 'Tigrinya',
  so: 'Somali', ar: 'Arabic', fr: 'French', de: 'German',
  es: 'Spanish', pt: 'Portuguese', it: 'Italian', zh: 'Chinese',
  ja: 'Japanese', ko: 'Korean', hi: 'Hindi', ru: 'Russian',
  sw: 'Swahili', tr: 'Turkish', pl: 'Polish', nl: 'Dutch',
};

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { text, targetLang } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 },
      );
    }

    if (!targetLang || !LANGUAGE_NAMES[targetLang]) {
      return NextResponse.json(
        { success: false, error: 'Invalid target language' },
        { status: 400 },
      );
    }

    // Truncate very long text to avoid token limits
    const truncatedText = text.length > 8000 ? text.slice(0, 8000) + '...' : text;
    const targetName = LANGUAGE_NAMES[targetLang];

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are a professional translator. Translate the following text to ${targetName}. Only output the translation — no explanations, no notes, no original text. Preserve formatting, lists, and structure.`,
        },
        {
          role: 'user',
          content: truncatedText,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const translatedText = completion.choices[0]?.message?.content?.trim() || '';

    return NextResponse.json({
      success: true,
      data: {
        translatedText,
        targetLang,
        targetName,
      },
    });
  } catch (err) {
    console.error('[POST /api/ai/translate] error:', err);
    return NextResponse.json(
      { success: false, error: 'Translation failed' },
      { status: 500 },
    );
  }
}
