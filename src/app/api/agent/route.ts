import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPT = `You are the Tenets Tender Ecosystem AI Assistant — an intelligent, helpful, and professional AI agent embedded within the Tenets procurement platform. You serve as a comprehensive guide, advisor, and assistant for all platform users.

## Your Identity
- Name: Tenets AI Assistant
- Purpose: Help users navigate, understand, and maximize value from the Tenets Tender Ecosystem
- Tone: Professional yet approachable, concise but thorough, action-oriented

## Platform Overview
Tenets is a digital tender ecosystem designed for the Ethiopian procurement marketplace. It connects users/suppliers, team admins, and platform administrators in a transparent, trust-based environment.

## Core Modules You Must Know

### Module 1: Identity & Profile Management (KYC Lite)
- Users register with email/password and complete profile (individual or company)
- Users must upload verification documents (business license, tax clearance, portfolio)
- Admins review and approve documents → users get "Verified" badge
- Only verified users can submit bids
- Profile includes: skills tags, location, TIN, license number, bio

### Module 2: Tender Discovery & Smart Matching
- Admins create tenders with: title, scope of work, budget range (ETB), deadline, location, category tags
- Smart Matching: system matches tender category tags with user skill tags
- Match score = tag overlap percentage
- Users can search/filter tenders by category, budget, location, deadline
- Tender statuses: Draft → Open → Closed → Awarded → Cancelled

### Module 3: Bidding Engine
- Verified users submit bids: technical proposal, financial proposal (ETB), timeline, attachments
- Bid statuses: Pending Review → Shortlisted → Awarded / Rejected
- Only admins can change bid status (enforce workflow: pending→shortlisted→awarded)
- When a bid is awarded, a Project Workspace is automatically created
- Users can only submit one bid per tender

### Module 4: Project Workspace & Task Workflow
- Created automatically when a bid is awarded
- Kanban board with 3 columns: To Do, In Progress, Done
- Milestone tracking with deadline alerts (amber within 48h, red when overdue)
- Both admins and assigned user can access workspace

### Module 5: Communication Hub
- Context-aware chat linked to specific tenders or projects
- No free-form messaging — all conversations are business-context bound
- Safety monitoring: suspicious phrases flagged (off-platform payments, bypass, under-the-table)
- Real-time via WebSocket, messages stored in database

### Module 6: Financial Tracking (Non-Custodial)
- Platform does NOT hold funds — payments happen externally
- Contract value locked from winning bid's financial proposal
- Payment log tracks: amount, method (Bank Transfer, CBE Birr, Cash, Check), reference, date
- Visual progress bar showing payment completion percentage
- Users can generate branded PDF invoices

### Module 7: Capacity Building
- Admins create workshops, training sessions, seminars
- Users register with one click (capacity limits enforced)
- Event statuses: Upcoming → Ongoing → Completed → Cancelled

## User Roles & Permissions
- **Administrator (super_admin/team_admin)**: Full access, create tenders, verify users, review bids, manage all projects, log payments
- **User/Supplier**: Browse tenders, submit bids (if verified), manage awarded projects, chat, attend events

## Key Business Rules
- Currency: Ethiopian Birr (ETB)
- Users MUST be verified before bidding
- One bid per user per tender
- Bid workflow is sequential: cannot skip Shortlisted
- Financial tracking is non-custodial (regulatory pragmatism)
- All communication is monitored for platform safety

## Your Response Guidelines
1. **Be contextual**: Reference the user's role, skills, and platform data when giving advice
2. **Be actionable**: Give specific steps, not vague suggestions
3. **Be platform-aware**: Reference specific Tenets features by name
4. **Be honest**: If you don't know something or if a feature doesn't exist yet, say so
5. **Be safe**: Never recommend circumventing platform policies, verification, or financial tracking
6. **Encourage trust**: Promote transparency, verification, and documentation
7. **Format well**: Use bullet points, numbered steps, and clear sections for complex answers
8. **Stay current**: Base advice on the user's actual data when available (open tenders, bid status, etc.)`;

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
    const { message, history = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Limit message length
    if (message.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Message too long. Please keep it under 2000 characters.' },
        { status: 400 }
      );
    }

    // Build context-aware system prompt
    let contextPrompt = SYSTEM_PROMPT;

    // Add user role and profile context
    contextPrompt += `\n\n## Current User Context`;
    contextPrompt += `\n- Role: ${user!.role}`;
    if (user!.profile) {
      contextPrompt += `\n- Name: ${user!.profile.fullName}`;
      contextPrompt += `\n- Job title: ${user!.profile.jobTitle || 'N/A'}`;
      contextPrompt += `\n- Location: ${user!.profile.location}`;
      if (user!.company?.name) contextPrompt += `\n- Company: ${user!.company.name}`;
      if (user!.profile.skillTags) contextPrompt += `\n- Skills: ${user!.profile.skillTags}`;
      contextPrompt += `\n- Verified: ${user!.profile.verified ? 'Yes' : 'No'}`;
    }

    // Enrich with real-time platform data
    try {
      if (user!.role === 'user') {
        const [openTenders, totalBids, activeProjects, recentTenders] = await Promise.all([
          db.tender.count({ where: { status: 'open' } }),
          db.bid.count({ where: { userId: user!.id } }),
          db.project.count({ where: { bid: { userId: user!.id }, status: 'active' } }),
          db.tender.findMany({
            where: { status: 'open' },
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { title: true, budgetMin: true, budgetMax: true, categoryTags: true, deadline: true, location: true },
          }),
        ]);

        contextPrompt += `\n\n## Your Live Platform Data`;
        contextPrompt += `\n- Open tenders available: ${openTenders}`;
        contextPrompt += `\n- Your total bids submitted: ${totalBids}`;
        contextPrompt += `\n- Your active projects: ${activeProjects}`;

        if (recentTenders.length > 0) {
          contextPrompt += `\n\n## Latest Open Tenders (recommend these if relevant):`;
          recentTenders.forEach((t, i) => {
            contextPrompt += `\n${i + 1}. "${t.title}" — ETB ${t.budgetMin.toLocaleString()}-${t.budgetMax.toLocaleString()}, Categories: ${t.categoryTags}, Location: ${t.location}, Deadline: ${new Date(t.deadline).toLocaleDateString()}`;
          });
        }

        // Calculate skill match for recommendations
        if (user!.profile?.skillTags) {
          const userSkills = user!.profile.skillTags.split(',').map(s => s.trim().toLowerCase());
          const matchedTenders = recentTenders.filter(t => {
            const tags = t.categoryTags.split(',').map(s => s.trim().toLowerCase());
            return tags.some(tag => userSkills.includes(tag));
          });
          if (matchedTenders.length > 0) {
            contextPrompt += `\n\n## Tenders Matching Your Skills:`;
            matchedTenders.forEach(t => {
              const tags = t.categoryTags.split(',').map(s => s.trim().toLowerCase());
              const matchCount = tags.filter(tag => userSkills.includes(tag)).length;
              contextPrompt += `\n- "${t.title}" — ${matchCount} skill matches`;
            });
          }
        }
      } else if (user!.role === 'super_admin' || user!.role === 'team_admin') {
        // Company isolation: team_admin only sees their own company's data
        const companyFilter = user!.role === 'super_admin' ? {} : (user!.companyId ? { companyId: user!.companyId } : {});
        const tenderCompanyFilter = user!.role === 'super_admin' ? {} : (user!.companyId ? { tender: { companyId: user!.companyId } } : {});
        const docCompanyFilter = user!.role === 'super_admin' ? {} : (user!.companyId ? { companyId: user!.companyId } : {});

        const [userCount, pendingBids, pendingDocs, openTenders, activeProjects] = await Promise.all([
          db.user.count(user!.role !== 'super_admin' && user!.companyId ? { where: { companyId: user!.companyId } } : {}),
          db.bid.count({ where: { status: 'pending_review', ...tenderCompanyFilter } }),
          db.document.count({ where: { status: 'pending', ...docCompanyFilter } }),
          db.tender.count({ where: { status: 'open' } }),
          db.project.count({ where: { status: 'active', ...companyFilter } }),
        ]);
        contextPrompt += `\n\n## Platform Stats (Live)`;
        contextPrompt += `\n- Total users: ${userCount}`;
        contextPrompt += `\n- Open tenders: ${openTenders}`;
        contextPrompt += `\n- Pending bids to review: ${pendingBids}`;
        contextPrompt += `\n- Documents pending verification: ${pendingDocs}`;
        contextPrompt += `\n- Active projects: ${activeProjects}`;
      } else {
        // All other users (standard users / bidders)
        const [openTenders, myBids] = await Promise.all([
          db.tender.count({ where: { status: 'open' } }),
          db.bid.count({ where: { userId: user!.id } }),
        ]);
        contextPrompt += `\n\n## Your Data`;
        contextPrompt += `\n- Open tenders available: ${openTenders}`;
        contextPrompt += `\n- Your bids submitted: ${myBids}`;
      }
    } catch {
      // Context enrichment is optional, don't fail the request
    }

    // Build messages array with history
    const messages = [
      { role: 'system' as const, content: contextPrompt },
      ...history.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // Get AI response with retry
    let response = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const zai = await getZAI();
        const completion = await zai.chat.completions.create({
          messages,
          thinking: { type: 'disabled' },
        });
        response = completion.choices[0]?.message?.content || '';
        if (response) break;
      } catch (err) {
        if (attempt === 2) throw err;
        // Reset ZAI instance on failure
        zaiInstance = null;
      }
    }

    if (!response) {
      response = 'I apologize, but I was unable to generate a response. Please try again.';
    }

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
