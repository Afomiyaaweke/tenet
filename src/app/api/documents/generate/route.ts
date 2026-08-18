import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// Allow up to 60s on Vercel Pro (10s on Hobby)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const TEMPLATE_PROMPTS: Record<string, string> = {
  'company-profile': `You are a professional business document writer. Generate a comprehensive Company Profile document based on the provided information. The document should include:

1. **Company Overview** - Brief introduction, mission, vision
2. **Company History** - Founding date, key milestones
3. **Organizational Structure** - Leadership team, departments
4. **Core Competencies** - Key skills, expertise areas, certifications
5. **Portfolio & Experience** - Past projects, notable achievements
6. **Financial Summary** - Revenue range, financial health indicators
7. **Quality & Compliance** - Certifications, standards compliance
8. **Contact Information** - Address, phone, email, website

Format the document professionally with clear sections. Use Ethiopian business context. Currency should be ETB. Keep it professional and suitable for tender submissions.`,

  'financial-bid': `You are a professional financial bid document writer. Generate a detailed Financial Bid proposal based on the provided tender and company information. The document should include:

1. **Cover Page** - Tender reference, company name, submission date
2. **Executive Summary** - Brief overview of the financial proposal
3. **Cost Breakdown** - Detailed itemized costs organized by:
   - Direct Costs (materials, labor, equipment)
   - Indirect Costs (overhead, administration)
   - Contingency (5-10% of total)
   - Profit Margin
4. **Pricing Summary** - Total bid amount with subtotals per category
5. **Payment Schedule** - Proposed milestone-based payment plan
6. **Value Proposition** - Cost-effectiveness justification
7. **Validity Period** - Bid validity (typically 90-120 days)
8. **Terms & Conditions** - Financial terms, warranty provisions

Format professionally. Use ETB currency. Include realistic cost estimates based on Ethiopian market rates.`,

  'technical-proposal': `You are a professional technical proposal writer. Generate a detailed Technical Proposal based on the provided tender and company information. The document should include:

1. **Cover Page** - Tender reference, company name, submission date
2. **Executive Summary** - Understanding of requirements and proposed approach
3. **Technical Approach** - Methodology, work plan, implementation strategy
4. **Team & Qualifications** - Key personnel, their roles and qualifications
5. **Work Schedule** - Timeline with milestones and deliverables
6. **Quality Assurance Plan** - QA/QC procedures, testing protocols
7. **Risk Assessment** - Identified risks and mitigation strategies
8. **Past Performance** - Similar projects completed successfully
9. **Equipment & Resources** - Available equipment, technology, infrastructure
10. **Health, Safety & Environment** - HSE policies and compliance

Format professionally. Be specific and actionable. Reference Ethiopian standards where applicable.`,

  'tender-specification': `You are a professional tender specification writer. Generate a detailed Tender Specification document based on the provided information. The document should include:

1. **Tender Notice** - Reference number, title, issuing organization
2. **General Conditions** - Eligibility, qualification requirements
3. **Scope of Work** - Detailed description of work/services required
4. **Technical Specifications** - Standards, materials, quality requirements
5. **Deliverables** - Expected outputs, timelines, milestones
6. **Evaluation Criteria** - Technical (70%) and Financial (30%) scoring
7. **Submission Requirements** - Documents, format, deadline
8. **Contract Terms** - Duration, payment terms, warranties
9. **Compliance Requirements** - Legal, regulatory, certifications
10. **Contact & Clarifications** - Q&A process, site visits

Format professionally. Be clear and unambiguous. Reference Ethiopian procurement laws and standards.`,

  'invoice': `You are a professional invoice document generator. Generate a detailed Invoice based on the provided project and payment information. The document should include:

1. **Invoice Header** - Company name, company logo, invoice number, date
2. **Bill To** - Client name, address, contact information
3. **Project Reference** - Tender title, project reference number
4. **Itemized Services** - Description, quantity, unit price, amount
5. **Subtotal** - Sum of all items
6. **Tax (VAT 15%)** - Ethiopian VAT calculation
7. **Total Amount** - Subtotal + Tax
8. **Payment Details** - Bank account, payment terms, due date
9. **Notes** - Thank you message, payment instructions

Format professionally. Use ETB currency. Follow Ethiopian tax regulations (15% VAT).`,
};

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
    const { templateType, inputData, tenderId } = body;

    if (!templateType || !TEMPLATE_PROMPTS[templateType]) {
      return NextResponse.json(
        { success: false, error: 'Invalid template type. Available: company-profile, financial-bid, technical-proposal, tender-specification, invoice' },
        { status: 400 }
      );
    }

    // Build context from user profile
    let userContext = `\n\n## User/Company Information:\n`;
    if (user!.profile) {
      userContext += `- Full Name: ${user!.profile.fullName}\n`;
      userContext += `- Company: ${user!.company?.name || 'N/A'}\n`;
      userContext += `- Location: ${user!.profile.location}\n`;
      userContext += `- Phone: ${user!.profile.phone}\n`;
      userContext += `- TIN Number: ${user!.profile.tinNumber || 'N/A'}\n`;
      userContext += `- License Number: ${user!.profile.licenseNumber || 'N/A'}\n`;
      userContext += `- Skills/Expertise: ${user!.profile.skillTags || 'N/A'}\n`;
      userContext += `- Bio: ${user!.profile.bio || 'N/A'}\n`;
    }

    // Add tender context if provided
    if (tenderId) {
      const tender = await db.tender.findUnique({ where: { id: tenderId } });
      if (tender) {
        userContext += `\n## Tender Information:\n`;
        userContext += `- Title: ${tender.title}\n`;
        userContext += `- Scope: ${tender.scope}\n`;
        userContext += `- Budget Range: ETB ${tender.budgetMin.toLocaleString()} - ${tender.budgetMax.toLocaleString()}\n`;
        userContext += `- Location: ${tender.location}\n`;
        userContext += `- Deadline: ${new Date(tender.deadline).toLocaleDateString()}\n`;
        userContext += `- Category Tags: ${tender.categoryTags}\n`;
        userContext += `- Required Documents: ${tender.requiredDocs || 'N/A'}\n`;
      }
    }

    // Add any additional input data
    if (inputData) {
      userContext += `\n## Additional Input Data:\n`;
      Object.entries(inputData).forEach(([key, value]) => {
        userContext += `- ${key}: ${value}\n`;
      });
    }

    const systemPrompt = TEMPLATE_PROMPTS[templateType];

    const messages = [
      { role: 'system' as const, content: systemPrompt + userContext },
      { role: 'user' as const, content: `Please generate a professional ${templateType.replace(/-/g, ' ')} document based on the provided information. Make it detailed, realistic, and ready for use. Format with clear markdown headings and sections.` },
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
        zaiInstance = null;
      }
    }

    if (!response) {
      response = 'Unable to generate document. Please try again.';
    }

    return NextResponse.json({
      success: true,
      data: {
        content: response,
        templateType,
        generatedAt: new Date().toISOString(),
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
