import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { callZAIWithDeadline } from '@/lib/zai';

// Vercel Hobby tier: 10s max function execution.
// ZAI calls for full documents take 20-30s, so we race the AI call against
// a hard 8s deadline. If the AI wins, great. If the deadline wins, we return
// a structured template populated with the user's real data instead of
// letting Vercel kill the function (which would surface as a 504/HTML error).
export const maxDuration = 10;
export const dynamic = 'force-dynamic';

const AI_DEADLINE_MS = 8000;

// Concise prompts — ask for a focused 1-page document, not a 10-section tome.
// Shorter prompts → faster AI completion → more likely to beat the 8s deadline.
const TEMPLATE_PROMPTS: Record<string, string> = {
  'company-profile': `Write a concise Company Profile (about 500 words) with these sections: Overview, Mission, Core Competencies, Past Experience, Contact. Use markdown headings (##). Be professional and specific. Use the supplied company details. Currency: ETB.`,

  'financial-bid': `Write a concise Financial Bid (about 500 words) with these sections: Cover Details, Executive Summary, Cost Breakdown (direct/indirect/contingency/profit), Total Bid Amount, Payment Schedule, Validity. Use markdown headings (##). Include a simple cost table in markdown. Use ETB. Be realistic for the Ethiopian market.`,

  'technical-proposal': `Write a concise Technical Proposal (about 500 words) with these sections: Executive Summary, Technical Approach, Team & Qualifications, Work Schedule, Quality Assurance, Past Performance. Use markdown headings (##). Be specific and actionable.`,

  'tender-specification': `Write a concise Tender Specification (about 500 words) with these sections: Tender Notice, Eligibility, Scope of Work, Technical Specifications, Deliverables, Evaluation Criteria, Submission Requirements. Use markdown headings (##). Reference Ethiopian procurement standards.`,

  'invoice': `Write a professional Invoice (about 300 words) with these sections: Invoice Header, Bill To, Itemized Services (markdown table with description/qty/unit price/amount), Subtotal, VAT 15%, Total, Payment Details. Use ETB. Follow Ethiopian tax rules (15% VAT).`,
};

// ─── Structured fallback templates ──────────────────────────────────────────
// Used when the AI call cannot complete within the deadline. These produce a
// usable, editable document populated with the user's real profile/company
// data — never an empty page or a generic error.

function buildFallback(
  templateType: string,
  ctx: {
    companyName: string;
    fullName: string;
    location: string;
    phone: string;
    email: string;
    tin: string;
    license: string;
    skills: string;
    bio: string;
    tenderTitle?: string;
    tenderScope?: string;
    tenderBudget?: string;
    tenderLocation?: string;
    tenderDeadline?: string;
    inputData?: Record<string, string>;
  }
): string {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const C = ctx.companyName || 'Your Company';
  const N = ctx.fullName || '—';
  const L = ctx.location || 'Addis Ababa, Ethiopia';
  const P = ctx.phone || '—';
  const E = ctx.email || '—';
  const T = ctx.tin || '—';

  switch (templateType) {
    case 'company-profile':
      return `# Company Profile — ${C}

**Date:** ${today}
**Location:** ${L}
**TIN:** ${T}

## 1. Overview
${C} is a business operating in ${L}, committed to delivering high-quality products and services to its clients. This profile summarises our capabilities for tender submission purposes.

## 2. Mission
To provide reliable, professional services that meet the needs of our clients while upholding the highest standards of integrity and quality.

## 3. Core Competencies
${ctx.skills ? ctx.skills.split(',').map((s) => `- ${s.trim()}`).join('\n') : '- General business services'}

## 4. Past Experience
${ctx.bio || 'Please add your past project experience here.'}

## 5. Contact Information
- **Representative:** ${N}
- **Phone:** ${P}
- **Email:** ${E}
- **Location:** ${L}
- **TIN:** ${T}

---
_Generated from your TenetBid profile. Edit the sections above to add specific details before submission._`;

    case 'financial-bid':
      return `# Financial Bid Proposal

**Submitted by:** ${C}
**Representative:** ${N}
**TIN:** ${T}
**Date:** ${today}
${ctx.tenderTitle ? `**Tender:** ${ctx.tenderTitle}` : ''}

## 1. Executive Summary
${C} is pleased to submit this financial proposal for the above tender. Our pricing is competitive and transparent, reflecting current Ethiopian market rates.

## 2. Cost Breakdown

| Category | Description | Amount (ETB) |
|---|---|---|
| Direct Costs | Materials, labor, equipment | 0.00 |
| Indirect Costs | Overhead, administration | 0.00 |
| Contingency (5%) | Risk buffer | 0.00 |
| Profit Margin | — | 0.00 |
| **Subtotal** | | **0.00** |

## 3. Total Bid Amount
**ETB 0.00** (zero placeholder — fill in your actual costs)

## 4. Payment Schedule
- 30% advance on contract signing
- 40% on milestone delivery
- 30% on final acceptance

## 5. Bid Validity
This proposal is valid for 120 days from the date above.

## 6. Contact
${N} · ${P} · ${E}

---
_Fill in the cost table above with your actual figures before submission._`;

    case 'technical-proposal':
      return `# Technical Proposal

**Submitted by:** ${C}
**Representative:** ${N}
**Date:** ${today}
${ctx.tenderTitle ? `**Tender:** ${ctx.tenderTitle}` : ''}

## 1. Executive Summary
${C} proposes the following technical approach to deliver the requirements of this tender.

## 2. Technical Approach
${ctx.tenderScope ? `Understanding the scope: ${ctx.tenderScope.slice(0, 300)}` : 'Describe your methodology, work plan, and implementation strategy here.'}

## 3. Team & Qualifications
- **${N}** — Lead
${ctx.skills ? ctx.skills.split(',').map((s) => `- Specialist: ${s.trim()}`).join('\n') : ''}

## 4. Work Schedule
| Phase | Deliverable | Duration |
|---|---|---|
| 1 | Mobilisation | 2 weeks |
| 2 | Execution | TBD |
| 3 | Handover | 1 week |

## 5. Quality Assurance
We commit to industry-standard QA/QC procedures throughout the project lifecycle.

## 6. Past Performance
${ctx.bio || 'Add details of similar projects you have completed.'}

---
_Edit each section above with project-specific details before submission._`;

    case 'tender-specification':
      return `# Tender Specification

**Issued by:** ${C}
**Date:** ${today}
${ctx.inputData?.reference ? `**Reference No.:** ${ctx.inputData.reference}` : ''}

## 1. Tender Notice
${ctx.inputData?.title || 'Tender title'}

## 2. Eligibility
Open to registered companies with valid TIN and relevant licenses.

## 3. Scope of Work
${ctx.inputData?.scope || 'Describe the work, services, or goods required.'}

## 4. Technical Specifications
List the standards, materials, and quality requirements here.

## 5. Deliverables
- Deliverable 1
- Deliverable 2
- Deliverable 3

## 6. Evaluation Criteria
- Technical: 70%
- Financial: 30%

## 7. Submission Requirements
Submit the following documents by the deadline:
- Company profile
- TIN certificate
- Business license
- Technical proposal
- Financial proposal

---
_Edit the placeholders above before publishing this tender._`;

    case 'invoice':
      return `# INVOICE

**From:** ${C}
**TIN:** ${T}
**Date:** ${today}
**Invoice No:** INV-${Date.now().toString().slice(-6)}

---

**Bill To:**
${ctx.inputData?.clientName || 'Client Name'}
${ctx.inputData?.clientAddress || 'Client Address'}

---

## Itemized Services

| # | Description | Qty | Unit Price (ETB) | Amount (ETB) |
|---|---|---|---|---|
| 1 | Service description | 1 | 0.00 | 0.00 |
| 2 | — | — | — | — |

---

## Summary

- **Subtotal:** ETB 0.00
- **VAT (15%):** ETB 0.00
- **Total Due:** **ETB 0.00**

## Payment Details
- **Contact:** ${N} · ${P}
- **Terms:** Due within 30 days

---
_Fill in the table and amounts above before sending to the client._`;

    default:
      return `# Document\n\n_Edit this document to add your content._`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { templateType, inputData, tenderId } = body;

    if (!templateType || !TEMPLATE_PROMPTS[templateType]) {
      return NextResponse.json(
        { success: false, error: 'Invalid template type. Available: company-profile, financial-bid, technical-proposal, tender-specification, invoice' },
        { status: 400 }
      );
    }

    // ─── Build context from user profile + optional tender ────────────────
    const p = user!.profile;
    const c = user!.company;
    const ctx = {
      companyName: c?.name || (inputData?.companyName as string) || '',
      fullName: p?.fullName || '',
      location: p?.location || c?.city || 'Addis Ababa, Ethiopia',
      phone: p?.phone || '',
      email: user!.email,
      tin: p?.tinNumber || c?.tinNumber || '',
      license: p?.licenseNumber || '',
      skills: p?.skillTags || '',
      bio: p?.bio || '',
      inputData,
    };

    // Optional tender enrichment (skip the DB call if not provided — saves latency)
    let tenderTitle: string | undefined;
    let tenderScope: string | undefined;
    let tenderBudget: string | undefined;
    let tenderLocation: string | undefined;
    let tenderDeadline: string | undefined;
    if (tenderId) {
      try {
        const tender = await db.tender.findUnique({ where: { id: tenderId } });
        if (tender) {
          tenderTitle = tender.title;
          tenderScope = tender.scope;
          tenderBudget = `ETB ${Number(tender.budgetMin).toLocaleString()} – ${Number(tender.budgetMax).toLocaleString()}`;
          tenderLocation = tender.location;
          tenderDeadline = new Date(tender.deadline).toLocaleDateString();
        }
      } catch {
        // Tender lookup is optional — ignore failures
      }
    }

    const fullCtx = { ...ctx, tenderTitle, tenderScope, tenderBudget, tenderLocation, tenderDeadline };

    const userContext = `
## User/Company Information:
- Full Name: ${ctx.fullName || 'N/A'}
- Company: ${ctx.companyName || 'N/A'}
- Location: ${ctx.location}
- Phone: ${ctx.phone || 'N/A'}
- TIN: ${ctx.tin || 'N/A'}
- Skills/Expertise: ${ctx.skills || 'N/A'}
- Bio: ${ctx.bio || 'N/A'}
${tenderTitle ? `\n## Tender Information:\n- Title: ${tenderTitle}\n- Scope: ${tenderScope || 'N/A'}\n- Budget: ${tenderBudget || 'N/A'}\n- Location: ${tenderLocation || 'N/A'}\n- Deadline: ${tenderDeadline || 'N/A'}` : ''}
${inputData ? `\n## Additional Input:\n${Object.entries(inputData).map(([k, v]) => `- ${k}: ${v}`).join('\n')}` : ''}`;

    const systemPrompt = TEMPLATE_PROMPTS[templateType];
    const messages = [
      { role: 'system' as const, content: systemPrompt + userContext },
      { role: 'user' as const, content: `Generate the document now. Keep it concise and professional. Use markdown headings.` },
    ];

    // ─── Race the AI call against a hard deadline ─────────────────────────
    // If the AI doesn't finish in time, fall back to a structured template
    // built from the user's real data — never return an empty/error response.
    let response: string | null;
    let usedFallback = false;
    const t0 = Date.now();

    response = await callZAIWithDeadline(messages, AI_DEADLINE_MS);

    if (!response) {
      usedFallback = true;
      response = buildFallback(templateType, fullCtx);
    }

    const elapsed = Date.now() - t0;
    console.log(`[documents/generate] type=${templateType} elapsed=${elapsed}ms fallback=${usedFallback} len=${response.length}`);

    return NextResponse.json({
      success: true,
      data: {
        content: response,
        templateType,
        generatedAt: new Date().toISOString(),
        fallback: usedFallback,
      },
    });
  } catch (err) {
    console.error('Document generation error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to generate document. Please try again.' },
      { status: 500 }
    );
  }
}
