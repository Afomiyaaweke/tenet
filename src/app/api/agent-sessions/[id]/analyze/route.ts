import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ensureAgentTables } from '@/lib/ensure-agent-tables';
import { buildDocContext, type ParsedDocument, type ParsedPage } from '@/lib/agent-document';
import { runFullExtraction } from '@/lib/agent-extraction';
import { generateExcel, type BidderRow, type TenderInfo, type KeyTermRow } from '@/lib/agent-excel';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// POST /api/agent-sessions/[id]/analyze — Run AI tender analysis
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureAgentTables();
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

    // Load all indexed or uploaded documents
    const documents = await db.agentDocument.findMany({
      where: {
        sessionId,
        status: { in: ['indexed', 'uploaded'] },
      },
    });

    if (documents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No documents available for analysis. Please upload documents first.' },
        { status: 400 }
      );
    }

    // Build parsed documents from DB records
    const parsedDocs: ParsedDocument[] = documents.map((doc) => {
      let pageTexts: string[] = [];
      try {
        pageTexts = JSON.parse(doc.pageTexts);
      } catch {
        pageTexts = [];
      }

      const pages: ParsedPage[] = pageTexts.map((text, i) => ({
        pageNum: i + 1,
        text,
      }));

      return {
        filename: doc.filename,
        filetype: doc.filetype,
        pages,
        totalPages: doc.pageCount,
      };
    });

    // Build document context for LLM
    const docContext = buildDocContext(parsedDocs);

    if (!docContext.trim()) {
      return NextResponse.json(
        { success: false, error: 'Documents contain no extractable text' },
        { status: 400 }
      );
    }

    // Calculate total page count
    const totalPageCount = parsedDocs.reduce((sum, d) => sum + d.totalPages, 0);

    // Run full extraction
    const extractionResult = await runFullExtraction(docContext, totalPageCount);

    // Create analysis record
    const analysis = await db.agentAnalysis.create({
      data: {
        sessionId,
        type: 'tender_review',
        title: `Tender Analysis — ${session.title}`,
        content: JSON.stringify(extractionResult),
      },
    });

    // Generate Excel artifact
    const bidders: BidderRow[] = extractionResult.bidders.map((b) => ({
      name: b.name.value,
      bidPrice: b.bidPrice?.raw,
      technicalScore: b.technicalScore?.raw,
      commercialScore: b.commercialScore?.raw,
      totalScore: b.totalScore?.raw,
      rank: b.rank?.value,
      compliance: b.compliance?.value,
      duration: b.duration?.value,
      validity: b.validity?.value,
    }));

    const tenderInfo: TenderInfo = {
      title: extractionResult.metadata.title?.value,
      tenderNumber: extractionResult.metadata.tenderNumber?.value,
      issuingAuthority: extractionResult.metadata.issuingAuthority?.value,
      publishedDate: extractionResult.metadata.publishedDate?.value,
      closingDate: extractionResult.metadata.closingDate?.value,
      estimatedValue: extractionResult.metadata.estimatedValue?.raw,
      category: extractionResult.metadata.category?.value,
    };

    const keyTerms: KeyTermRow[] = extractionResult.keyTerms.map((kt) => ({
      term: kt.term,
      description: kt.description,
      category: kt.category,
    }));

    const excelBuffer = generateExcel(bidders, tenderInfo, keyTerms);

    // Save Excel file
    const artifactDir = path.join(process.cwd(), 'public', 'agent-artifacts', sessionId);
    fs.mkdirSync(artifactDir, { recursive: true });

    const excelFilename = `tender-analysis-${Date.now()}.xlsx`;
    const excelFilepath = path.join(artifactDir, excelFilename);
    fs.writeFileSync(excelFilepath, excelBuffer);

    // Create artifact record
    const artifact = await db.agentArtifact.create({
      data: {
        sessionId,
        type: 'excel',
        title: `Tender Analysis Excel`,
        filename: excelFilename,
        filepath: `/agent-artifacts/${sessionId}/${excelFilename}`,
        meta: JSON.stringify({
          analysisId: analysis.id,
          bidderCount: bidders.length,
          keyTermCount: keyTerms.length,
        }),
      },
    });

    // Update session summary
    const compliantCount = bidders.filter((b) => b.compliance?.toLowerCase() === 'compliant').length;
    const summaryText =
      `Analysis of ${documents.length} document(s) with ${totalPageCount} total pages. ` +
      `Extracted ${bidders.length} bidder(s), ${keyTerms.length} key term(s). ` +
      `Overall confidence: ${(extractionResult.overallConfidence * 100).toFixed(1)}%. ` +
      `Compliant bidders: ${compliantCount}/${bidders.length}.`;

    await db.agentSession.update({
      where: { id: sessionId },
      data: { summary: summaryText },
    });

    return NextResponse.json({
      success: true,
      data: {
        analysisId: analysis.id,
        artifactId: artifact.id,
        downloadUrl: artifact.filepath,
        filename: excelFilename,
        bidderCount: bidders.length,
        keyTermCount: keyTerms.length,
        overallConfidence: extractionResult.overallConfidence,
        summary: summaryText,
      },
    });
  } catch (err: any) {
    console.error('Agent analyze error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to run analysis' },
      { status: 500 }
    );
  }
}
