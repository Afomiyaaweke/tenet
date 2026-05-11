import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPT = `You are the Afomiya Tender Ecosystem AI Assistant — a knowledgeable, helpful, and professional AI agent embedded within the Afomiya procurement platform. Your role is to help users navigate the tender ecosystem, provide guidance on bidding strategies, explain platform features, and assist with procurement-related questions.

Key capabilities:
- Help contractors discover relevant tenders and improve their bid quality
- Guide tender owners on writing effective tender specifications
- Explain platform features (KYC verification, bidding workflow, project tracking, etc.)
- Provide procurement best practices and industry insights
- Assist with navigating the platform's modules (Tender Discovery, Bidding Engine, Project Workspace, Communication Hub, Financial Tracking, Capacity Building)
- Help administrators with verification processes and platform management

Platform context:
- The platform serves three roles: Administrator, Contractor/Supplier, and Tender Owner
- Contractors must be verified (KYC Lite) before they can submit bids
- Tenders go through a lifecycle: Draft → Open → Closed → Awarded
- Bids have statuses: Pending Review → Shortlisted → Awarded/Rejected
- Financial tracking is non-custodial (platform doesn't hold funds)
- Communication is context-aware and monitored for safety
- The platform uses Ethiopian Birr (ETB) as currency

Guidelines:
- Be concise but thorough
- Reference specific platform features when relevant
- Provide actionable advice
- Use a professional yet friendly tone
- If you don't know something, say so honestly
- Never recommend circumventing platform policies
- Encourage transparency and trust-building behaviors`;

let zaiInstance: InstanceType<typeof ZAI> | null = null;

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
    const { message, history = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Build context-aware system prompt
    let contextPrompt = SYSTEM_PROMPT;

    // Add user role context
    contextPrompt += `\n\nCurrent user role: ${user!.role}`;
    if (user!.profile) {
      contextPrompt += `\nUser profile: ${user!.profile.fullName}, located in ${user!.profile.location}`;
      if (user!.profile.skillTags) {
        contextPrompt += `\nSkills: ${user!.profile.skillTags}`;
      }
      contextPrompt += `\nVerification status: ${user!.profile.verified ? 'Verified' : 'Pending verification'}`;
    }

    // Add relevant data context based on user role
    try {
      if (user!.role === 'contractor') {
        const [tenderCount, bidCount, projectCount] = await Promise.all([
          db.tender.count({ where: { status: 'open' } }),
          db.bid.count({ where: { userId: user!.id } }),
          db.project.count({ where: { bid: { userId: user!.id }, status: 'active' } }),
        ]);
        contextPrompt += `\n\nCurrent platform data for this user: ${tenderCount} open tenders, ${bidCount} bids submitted, ${projectCount} active projects`;
      } else if (user!.role === 'admin') {
        const [userCount, pendingBids, pendingDocs] = await Promise.all([
          db.user.count(),
          db.bid.count({ where: { status: 'pending_review' } }),
          db.document.count({ where: { status: 'pending' } }),
        ]);
        contextPrompt += `\n\nPlatform stats: ${userCount} users, ${pendingBids} pending bids to review, ${pendingDocs} documents pending verification`;
      }
    } catch (e) {
      // Context enrichment is optional, don't fail the request
    }

    // Build messages array
    const messages = [
      { role: 'assistant' as const, content: contextPrompt },
      ...history.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';

    return NextResponse.json({
      success: true,
      data: {
        response,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Agent error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to get AI response. Please try again.' },
      { status: 500 }
    );
  }
}
