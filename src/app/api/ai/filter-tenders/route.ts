import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// Allow up to 60s on Vercel Pro (10s on Hobby)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are a tender matching AI. Given a list of tenders and a user's skills/profile,
calculate a match score (0-100) for each tender based on how well the user's skills align with the tender requirements.
Return a JSON object where keys are tender IDs and values are match scores (numbers 0-100).
Also include a "reasoning" field with a brief explanation for each match.
Format: { "matches": [{ "id": "tender_id", "score": 85, "reason": "..." }] }`;

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { skills, budgetMin, budgetMax, location, tenderIds } = body;

    // Fetch tenders
    const tenders = await db.tender.findMany({
      where: {
        ...(tenderIds?.length ? { id: { in: tenderIds } } : {}),
        status: 'open',
      },
      take: 20,
    });

    if (tenders.length === 0) {
      return NextResponse.json({ success: true, data: { matches: [] } });
    }

    // Build context for AI
    const tenderList = tenders.map(t => ({
      id: t.id,
      title: t.title,
      scope: t.scope.substring(0, 200),
      category: t.categoryTags,
      budget: `${t.budgetMin}-${t.budgetMax}`,
      location: t.location,
      requiredDocs: t.requiredDocs,
    }));

    const prompt = `User skills: ${skills || 'Not specified'}
Budget preference: ${budgetMin || 'Any'} - ${budgetMax || 'Any'} ETB
Location preference: ${location || 'Any'}

Tenders to match:
${JSON.stringify(tenderList, null, 2)}

Calculate match scores for each tender. Return ONLY valid JSON.`;

    let response = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const zai = await getZAI();
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          thinking: { type: 'disabled' },
        });
        response = completion.choices[0]?.message?.content || '';
        if (response) break;
      } catch (err) {
        if (attempt === 2) throw err;
        zaiInstance = null;
      }
    }

    // Parse AI response
    let matches: Array<{ id: string; score: number; reason: string }> = [];
    try {
      const cleaned = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      matches = parsed.matches || [];
    } catch {
      // Fallback: simple keyword matching
      matches = tenders.map(t => {
        const userSkills = (skills || '').toLowerCase().split(',');
        const tenderCats = t.categoryTags.toLowerCase().split(',');
        const overlap = userSkills.filter(s => tenderCats.some(c => c.includes(s.trim()))).length;
        const score = Math.min(100, Math.max(20, Math.round((overlap / Math.max(userSkills.length, 1)) * 100)));
        return { id: t.id, score, reason: 'Keyword-based match' };
      });
    }

    return NextResponse.json({ success: true, data: { matches } });
  } catch (err) {
    console.error('AI filter error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to filter tenders' },
      { status: 500 }
    );
  }
}
