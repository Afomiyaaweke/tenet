import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getZAI } from '@/lib/zai';
import { generateComplianceDocx, type ApplicationDocInput, type ComplianceRequirement } from '@/lib/agent-docgen';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// POST /api/agent-sessions/[id]/prepare — Prepare compliance DOCX
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id: sessionId } = await params;

    // Verify session belongs to user
    const session = await db.agentSession.findUnique({
      where: { id: sessionId },
      select: { userId: true, title: true },
    });

    if (!session || session.userId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      applicantName,
      applicantAddress,
      applicantContact,
      extraInstructions,
    } = body;

    if (!applicantName || typeof applicantName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'applicantName is required' },
        { status: 400 }
      );
    }

    // Get latest analysis from session
    const latestAnalysis = await db.agentAnalysis.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestAnalysis) {
      return NextResponse.json(
        { success: false, error: 'No analysis found for this session. Run analysis first.' },
        { status: 400 }
      );
    }

    // Extract requirements from analysis content
    let analysisContent: any;
    try {
      analysisContent = JSON.parse(latestAnalysis.content);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Analysis data is corrupted' },
        { status: 500 }
      );
    }

    // Extract key terms as requirements from analysis
    const keyTerms: Array<{ term: string; description: string; category: string }> =
      analysisContent.keyTerms || [];

    // Use LLM to generate compliance responses for each requirement
    const zai = await getZAI();
    const requirements: ComplianceRequirement[] = [];

    for (const kt of keyTerms) {
      try {
        const complianceResponse = await zai.chat.completions.create({
          model: 'default',
          messages: [
            {
              role: 'system',
              content:
                'You are a procurement compliance expert. Given a tender requirement, generate: ' +
                '1) A concise response stating how the applicant meets this requirement, ' +
                '2) Supporting evidence or documentation, ' +
                '3) A compliance status: "compliant", "partial", or "non-compliant". ' +
                'Respond in JSON format: { "response": "...", "evidence": "...", "status": "compliant|partial|non-compliant" }. ' +
                'Be conservative — only mark "compliant" if clearly satisfied.',
            },
            {
              role: 'user',
              content:
                `Requirement: ${kt.term}\n` +
                `Description: ${kt.description}\n` +
                `Category: ${kt.category}\n` +
                `Applicant: ${applicantName}\n` +
                (extraInstructions ? `Additional Context: ${extraInstructions}\n` : '') +
                `Generate a compliance response.`,
            },
          ],
        });

        const responseText = complianceResponse.choices?.[0]?.message?.content?.trim() || '';

        let parsed: { response?: string; evidence?: string; status?: string };
        try {
          // Try to extract JSON from the response (may have markdown code fences)
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch {
          parsed = {};
        }

        const validStatuses = ['compliant', 'partial', 'non-compliant'] as const;
        const status: ComplianceRequirement['status'] = validStatuses.includes(parsed.status as any)
          ? (parsed.status as ComplianceRequirement['status'])
          : 'partial';

        requirements.push({
          requirement: kt.term,
          category: kt.category,
          ourResponse: parsed.response || 'Under review — pending detailed assessment.',
          evidence: parsed.evidence || 'To be documented.',
          status,
        });
      } catch (llmErr) {
        // If LLM fails for a single requirement, add a placeholder
        console.warn(`Compliance generation failed for requirement: ${kt.term}`, llmErr);
        requirements.push({
          requirement: kt.term,
          category: kt.category,
          ourResponse: 'Assessment pending — requires manual review.',
          evidence: 'To be determined.',
          status: 'partial',
        });
      }
    }

    // If no key terms were extracted, add a default requirement
    if (requirements.length === 0) {
      requirements.push({
        requirement: 'General Compliance',
        category: 'compliance',
        ourResponse: 'Compliance assessment requires additional review of tender requirements.',
        evidence: 'Analysis data did not contain specific requirements.',
        status: 'partial',
      });
    }

    // Build ApplicationDocInput
    const docInput: ApplicationDocInput = {
      applicantName,
      applicantAddress: applicantAddress || undefined,
      applicantContact: applicantContact || undefined,
      tenderTitle: session.title,
      tenderNumber: analysisContent.metadata?.tenderNumber?.value,
      issuingAuthority: analysisContent.metadata?.issuingAuthority?.value,
      requirements,
      extraInstructions: extraInstructions || undefined,
    };

    // Generate DOCX
    const docxBuffer = await generateComplianceDocx(docInput);

    // Save DOCX file
    const artifactDir = path.join(process.cwd(), 'public', 'agent-artifacts', sessionId);
    fs.mkdirSync(artifactDir, { recursive: true });

    const docxFilename = `compliance-document-${Date.now()}.docx`;
    const docxFilepath = path.join(artifactDir, docxFilename);
    fs.writeFileSync(docxFilepath, docxBuffer);

    // Create artifact record
    const artifact = await db.agentArtifact.create({
      data: {
        sessionId,
        type: 'docx',
        title: `Compliance Document — ${applicantName}`,
        filename: docxFilename,
        filepath: `/agent-artifacts/${sessionId}/${docxFilename}`,
        meta: JSON.stringify({
          analysisId: latestAnalysis.id,
          applicantName,
          requirementCount: requirements.length,
          compliantCount: requirements.filter((r) => r.status === 'compliant').length,
          partialCount: requirements.filter((r) => r.status === 'partial').length,
          nonCompliantCount: requirements.filter((r) => r.status === 'non-compliant').length,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        artifactId: artifact.id,
        downloadUrl: artifact.filepath,
        filename: docxFilename,
        requirementCount: requirements.length,
        compliantCount: requirements.filter((r) => r.status === 'compliant').length,
        partialCount: requirements.filter((r) => r.status === 'partial').length,
        nonCompliantCount: requirements.filter((r) => r.status === 'non-compliant').length,
      },
    });
  } catch (err: any) {
    console.error('Agent prepare error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to prepare compliance document' },
      { status: 500 }
    );
  }
}
