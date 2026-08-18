import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  convertInchesToTwip,
} from 'docx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComplianceRequirement {
  requirement: string;
  category: string;
  ourResponse: string;
  evidence: string;
  status: 'compliant' | 'partial' | 'non-compliant';
}

export interface ApplicationDocInput {
  applicantName: string;
  applicantAddress?: string;
  applicantContact?: string;
  tenderTitle: string;
  tenderNumber?: string;
  issuingAuthority?: string;
  requirements: ComplianceRequirement[];
  extraInstructions?: string;
}

// ---------------------------------------------------------------------------
// Branding Constants
// ---------------------------------------------------------------------------

const BRAND_PRIMARY = 0x0f766e; // teal-700
const BRAND_TEXT = 0x1f2937;    // gray-800
const BRAND_WHITE = 0xffffff;
const FONT_FAMILY = 'Calibri';

// Status colors
const STATUS_COLORS: Record<ComplianceRequirement['status'], number> = {
  compliant: 0x16a34a,     // green-600
  partial: 0xca8a04,       // yellow-600
  'non-compliant': 0xdc2626, // red-600
};

const STATUS_BG_COLORS: Record<ComplianceRequirement['status'], number> = {
  compliant: 0xf0fdf4,     // green-50
  partial: 0xfefce8,       // yellow-50
  'non-compliant': 0xfef2f2, // red-50
};

const STATUS_LABELS: Record<ComplianceRequirement['status'], string> = {
  compliant: 'Compliant',
  partial: 'Partial',
  'non-compliant': 'Non-Compliant',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a numeric hex value to a 6-character hex string expected by docx.
 *  e.g. 0x0f766e → "0f766e" */
function hex6(color: number): string {
  return color.toString(16).padStart(6, '0');
}

/** Standard single-line border definition */
function stdBorder(color: number = BRAND_PRIMARY) {
  return {
    style: BorderStyle.SINGLE,
    size: 1,
    color: hex6(color),
  };
}

const THIN_BORDERS = {
  top: stdBorder(0xd1d5db),
  bottom: stdBorder(0xd1d5db),
  left: stdBorder(0xd1d5db),
  right: stdBorder(0xd1d5db),
};

/** Create a simple paragraph with a text run */
function textParagraph(
  text: string,
  options: {
    bold?: boolean;
    size?: number;
    color?: number;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    spacing?: { before?: number; after?: number };
    font?: string;
  } = {},
): Paragraph {
  return new Paragraph({
    alignment: options.alignment,
    spacing: options.spacing,
    children: [
      new TextRun({
        text,
        bold: options.bold ?? false,
        size: options.size ?? 22,
        color: hex6(options.color ?? BRAND_TEXT),
        font: options.font ?? FONT_FAMILY,
      }),
    ],
  });
}

/** Empty spacer paragraph */
function spacer(points: number = 12): Paragraph {
  return new Paragraph({ spacing: { before: points, after: 0 }, children: [] });
}

/** Create a header cell */
function headerCell(text: string, width: (typeof WidthType)[keyof typeof WidthType] = WidthType.AUTO): TableCell {
  return new TableCell({
    width: { size: width === WidthType.AUTO ? 0 : 20, type: width },
    shading: { fill: hex6(BRAND_PRIMARY), type: 'clear' as const },
    borders: THIN_BORDERS,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text,
            bold: true,
            size: 20,
            color: hex6(BRAND_WHITE),
            font: FONT_FAMILY,
          }),
        ],
      }),
    ],
  });
}

/** Create a data cell */
function dataCell(
  text: string,
  options: {
    bold?: boolean;
    color?: number;
    bgColor?: number;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  } = {},
): TableCell {
  const shading = options.bgColor
    ? { fill: hex6(options.bgColor), type: 'clear' as const }
    : undefined;

  return new TableCell({
    shading,
    borders: THIN_BORDERS,
    children: [
      new Paragraph({
        alignment: options.alignment,
        spacing: { before: 30, after: 30 },
        children: [
          new TextRun({
            text,
            bold: options.bold ?? false,
            size: 20,
            color: hex6(options.color ?? BRAND_TEXT),
            font: FONT_FAMILY,
          }),
        ],
      }),
    ],
  });
}

/** Status cell with background color */
function statusCell(status: ComplianceRequirement['status']): TableCell {
  return dataCell(STATUS_LABELS[status], {
    bold: true,
    color: STATUS_COLORS[status],
    bgColor: STATUS_BG_COLORS[status],
    alignment: AlignmentType.CENTER,
  });
}

// ---------------------------------------------------------------------------
// Document Sections
// ---------------------------------------------------------------------------

function coverPage(input: ApplicationDocInput): Paragraph[] {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return [
    spacer(2400),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: 'COMPLIANCE & APPLICATION DOCUMENT',
          bold: true,
          size: 44,
          color: hex6(BRAND_PRIMARY),
          font: FONT_FAMILY,
        }),
      ],
    }),
    spacer(200),
    // Horizontal rule (teal)
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: hex6(BRAND_PRIMARY) },
      },
      children: [],
    }),
    spacer(100),
    textParagraph(input.applicantName, {
      bold: true,
      size: 32,
      color: BRAND_TEXT,
      alignment: AlignmentType.CENTER,
    }),
    spacer(100),
    ...(input.applicantAddress
      ? [textParagraph(input.applicantAddress, { size: 22, alignment: AlignmentType.CENTER })]
      : []),
    ...(input.applicantContact
      ? [textParagraph(input.applicantContact, { size: 22, alignment: AlignmentType.CENTER })]
      : []),
    spacer(400),
    textParagraph('Tender: ' + input.tenderTitle, {
      bold: true,
      size: 24,
      color: BRAND_PRIMARY,
      alignment: AlignmentType.CENTER,
    }),
    ...(input.tenderNumber
      ? [textParagraph('Tender Number: ' + input.tenderNumber, { size: 22, alignment: AlignmentType.CENTER })]
      : []),
    ...(input.issuingAuthority
      ? [textParagraph('Issuing Authority: ' + input.issuingAuthority, { size: 22, alignment: AlignmentType.CENTER })]
      : []),
    spacer(400),
    textParagraph('Date: ' + today, { size: 22, alignment: AlignmentType.CENTER }),
    // Page break after cover
    new Paragraph({
      children: [new PageBreak()],
    }),
  ];
}

function executiveSummary(requirements: ComplianceRequirement[]): Paragraph[] {
  const compliant = requirements.filter((r) => r.status === 'compliant').length;
  const partial = requirements.filter((r) => r.status === 'partial').length;
  const nonCompliant = requirements.filter((r) => r.status === 'non-compliant').length;
  const total = requirements.length;
  const complianceRate = total > 0 ? ((compliant / total) * 100).toFixed(1) : '0.0';

  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: '1. Executive Summary',
          bold: true,
          size: 28,
          color: hex6(BRAND_PRIMARY),
          font: FONT_FAMILY,
        }),
      ],
    }),
    textParagraph(
      `This document provides a comprehensive compliance assessment against the specified tender requirements. ` +
        `Of the ${total} requirements evaluated, ${compliant} are fully compliant, ${partial} are partially compliant, ` +
        `and ${nonCompliant} are non-compliant, yielding an overall compliance rate of ${complianceRate}%.`,
      { size: 22 },
    ),
    spacer(80),
    textParagraph('Compliance Overview:', { bold: true, size: 22 }),
    spacer(40),
    textParagraph(`  •  Compliant:         ${compliant} requirement(s)`, {
      size: 22,
      color: 0x16a34a,
    }),
    textParagraph(`  •  Partial:           ${partial} requirement(s)`, {
      size: 22,
      color: 0xca8a04,
    }),
    textParagraph(`  •  Non-Compliant:     ${nonCompliant} requirement(s)`, {
      size: 22,
      color: 0xdc2626,
    }),
    textParagraph(`  •  Compliance Rate:   ${complianceRate}%`, {
      bold: true,
      size: 22,
    }),
    spacer(80),
    ...(nonCompliant > 0
      ? [
          textParagraph(
            '⚠ Attention: There are non-compliant items that require mitigation strategies before submission. ' +
              'Please review Section 5 (Compliance Gaps) for details.',
            { size: 22, color: 0xdc2626, bold: true },
          ),
        ]
      : []),
    ...(partial > 0 && nonCompliant === 0
      ? [
          textParagraph(
            'ℹ Note: Some items are only partially compliant. Please review Section 5 for mitigation guidance.',
            { size: 22, color: 0xca8a04 },
          ),
        ]
      : []),
  ];
}

function complianceSummaryTable(requirements: ComplianceRequirement[]): Paragraph[] {
  const compliant = requirements.filter((r) => r.status === 'compliant').length;
  const partial = requirements.filter((r) => r.status === 'partial').length;
  const nonCompliant = requirements.filter((r) => r.status === 'non-compliant').length;
  const total = requirements.length;

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          headerCell('Status'),
          headerCell('Count'),
          headerCell('Percentage'),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Compliant', { bold: true, color: STATUS_COLORS.compliant, bgColor: STATUS_BG_COLORS.compliant, alignment: AlignmentType.CENTER }),
          dataCell(String(compliant), { alignment: AlignmentType.CENTER }),
          dataCell(total > 0 ? ((compliant / total) * 100).toFixed(1) + '%' : '0.0%', { alignment: AlignmentType.CENTER }),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Partial', { bold: true, color: STATUS_COLORS.partial, bgColor: STATUS_BG_COLORS.partial, alignment: AlignmentType.CENTER }),
          dataCell(String(partial), { alignment: AlignmentType.CENTER }),
          dataCell(total > 0 ? ((partial / total) * 100).toFixed(1) + '%' : '0.0%', { alignment: AlignmentType.CENTER }),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Non-Compliant', { bold: true, color: STATUS_COLORS['non-compliant'], bgColor: STATUS_BG_COLORS['non-compliant'], alignment: AlignmentType.CENTER }),
          dataCell(String(nonCompliant), { alignment: AlignmentType.CENTER }),
          dataCell(total > 0 ? ((nonCompliant / total) * 100).toFixed(1) + '%' : '0.0%', { alignment: AlignmentType.CENTER }),
        ],
      }),
      new TableRow({
        children: [
          dataCell('Total', { bold: true, alignment: AlignmentType.CENTER }),
          dataCell(String(total), { bold: true, alignment: AlignmentType.CENTER }),
          dataCell('100.0%', { bold: true, alignment: AlignmentType.CENTER }),
        ],
      }),
    ],
  });

  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 120 },
      children: [
        new TextRun({
          text: '2. Compliance Summary',
          bold: true,
          size: 28,
          color: hex6(BRAND_PRIMARY),
          font: FONT_FAMILY,
        }),
      ],
    }),
    textParagraph('The following table summarises the overall compliance status:', { size: 22 }),
    spacer(80),
    table as unknown as Paragraph,
  ];
}

function complianceMatrix(requirements: ComplianceRequirement[]): Paragraph[] {
  const dataRows = requirements.map(
    (r) =>
      new TableRow({
        children: [
          dataCell(r.requirement),
          dataCell(r.category, { alignment: AlignmentType.CENTER }),
          dataCell(r.ourResponse),
          dataCell(r.evidence),
          statusCell(r.status),
        ],
      }),
  );

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          headerCell('Requirement'),
          headerCell('Category'),
          headerCell('Our Response'),
          headerCell('Evidence'),
          headerCell('Status'),
        ],
      }),
      ...dataRows,
    ],
  });

  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 120 },
      children: [
        new TextRun({
          text: '3. Requirements Compliance Matrix',
          bold: true,
          size: 28,
          color: hex6(BRAND_PRIMARY),
          font: FONT_FAMILY,
        }),
      ],
    }),
    textParagraph(
      'The matrix below details each requirement alongside our response, supporting evidence, and compliance status.',
      { size: 22 },
    ),
    spacer(80),
    table as unknown as Paragraph,
  ];
}

function complianceGaps(requirements: ComplianceRequirement[]): Paragraph[] {
  const gaps = requirements.filter(
    (r) => r.status === 'non-compliant' || r.status === 'partial',
  );

  if (gaps.length === 0) {
    return [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 120 },
        children: [
          new TextRun({
            text: '4. Compliance Gaps & Mitigation',
            bold: true,
            size: 28,
            color: hex6(BRAND_PRIMARY),
            font: FONT_FAMILY,
          }),
        ],
      }),
      textParagraph(
        'No compliance gaps identified. All requirements are fully compliant.',
        { size: 22, color: 0x16a34a },
      ),
    ];
  }

  const nonCompliantItems = gaps.filter((r) => r.status === 'non-compliant');
  const partialItems = gaps.filter((r) => r.status === 'partial');

  const paragraphs: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 120 },
      children: [
        new TextRun({
          text: '4. Compliance Gaps & Mitigation',
          bold: true,
          size: 28,
          color: hex6(BRAND_PRIMARY),
          font: FONT_FAMILY,
        }),
      ],
    }),
    textParagraph(
      'The following items require attention and mitigation before final submission:',
      { size: 22 },
    ),
    spacer(80),
  ];

  if (nonCompliantItems.length > 0) {
    paragraphs.push(
      textParagraph('Non-Compliant Items:', { bold: true, size: 22, color: 0xdc2626 }),
    );
    nonCompliantItems.forEach((item, idx) => {
      paragraphs.push(
        textParagraph(`${idx + 1}. ${item.requirement} [${item.category}]`, {
          bold: true,
          size: 20,
          color: 0xdc2626,
        }),
      );
      paragraphs.push(
        textParagraph(
          `   Current Response: ${item.ourResponse || 'No response provided'}`,
          { size: 20 },
        ),
      );
      paragraphs.push(
        textParagraph(
          `   Mitigation: Develop a compliant response, engage subject-matter experts, or seek clarification from the issuing authority. ` +
            `Consider whether a waiver or deviation request is appropriate.`,
          { size: 20, color: 0x6b7280 },
        ),
      );
      paragraphs.push(spacer(40));
    });
  }

  if (partialItems.length > 0) {
    paragraphs.push(
      textParagraph('Partially Compliant Items:', { bold: true, size: 22, color: 0xca8a04 }),
    );
    partialItems.forEach((item, idx) => {
      paragraphs.push(
        textParagraph(`${idx + 1}. ${item.requirement} [${item.category}]`, {
          bold: true,
          size: 20,
          color: 0xca8a04,
        }),
      );
      paragraphs.push(
        textParagraph(
          `   Current Response: ${item.ourResponse || 'No response provided'}`,
          { size: 20 },
        ),
      );
      paragraphs.push(
        textParagraph(
          `   Mitigation: Supplement the existing response with additional evidence, refine the approach to meet all sub-clauses, ` +
            `or provide a bridging plan to full compliance within an agreed timeframe.`,
          { size: 20, color: 0x6b7280 },
        ),
      );
      paragraphs.push(spacer(40));
    });
  }

  return paragraphs;
}

function extraInstructionsSection(extraInstructions?: string): Paragraph[] {
  if (!extraInstructions) return [];

  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 120 },
      children: [
        new TextRun({
          text: '5. Additional Instructions',
          bold: true,
          size: 28,
          color: hex6(BRAND_PRIMARY),
          font: FONT_FAMILY,
        }),
      ],
    }),
    textParagraph(extraInstructions, { size: 22 }),
  ];
}

function declarationAndSignatures(input: ApplicationDocInput): Paragraph[] {
  const sectionNumber = input.extraInstructions ? '6' : '5';

  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 120 },
      children: [
        new TextRun({
          text: `${sectionNumber}. Declaration & Signatures`,
          bold: true,
          size: 28,
          color: hex6(BRAND_PRIMARY),
          font: FONT_FAMILY,
        }),
      ],
    }),
    textParagraph(
      'I/we hereby declare that all information provided in this compliance document is true, complete, and accurate ' +
        'to the best of my/our knowledge and belief. I/we understand that any false declaration, omission, or ' +
        'misrepresentation may result in disqualification from the tender process and may lead to further legal or ' +
        'contractual consequences.',
      { size: 22 },
    ),
    spacer(40),
    textParagraph(
      'I/we further confirm that the responses and evidence provided for each requirement have been ' +
        'reviewed and verified by the relevant subject-matter experts within our organisation.',
      { size: 22 },
    ),
    spacer(200),

    // Signature line 1 — Applicant
    new Paragraph({
      spacing: { before: 0, after: 0 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 1, color: hex6(BRAND_TEXT) },
      },
      children: [new TextRun({ text: ' ', size: 22 })],
    }),
    textParagraph('Authorised Signatory: ' + input.applicantName, {
      bold: true,
      size: 20,
    }),
    textParagraph('Title / Position: ________________________________', { size: 20 }),
    textParagraph('Date: ________________________________', { size: 20 }),
    spacer(200),

    // Signature line 2 — Witness / Counter-signatory
    new Paragraph({
      spacing: { before: 0, after: 0 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 1, color: hex6(BRAND_TEXT) },
      },
      children: [new TextRun({ text: ' ', size: 22 })],
    }),
    textParagraph('Witness / Counter-Signatory: ________________________________', {
      bold: true,
      size: 20,
    }),
    textParagraph('Title / Position: ________________________________', { size: 20 }),
    textParagraph('Date: ________________________________', { size: 20 }),
  ];
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

/**
 * Generate a professional compliance/application DOCX document.
 *
 * Sections:
 *  1. Cover Page
 *  2. Executive Summary
 *  3. Compliance Summary Table
 *  4. Requirements Compliance Matrix
 *  5. Compliance Gaps & Mitigation
 *  6. (Optional) Additional Instructions
 *  7. Declaration & Signatures
 *
 * Features:
 *  - Teal-700 branding with Calibri font
 *  - Headers with document title, footers with "Page X of Y"
 *  - Color-coded compliance status cells
 *  - Professional formatting and spacing
 */
export async function generateComplianceDocx(input: ApplicationDocInput): Promise<Buffer> {
  const { requirements } = input;

  // Build all sections
  const cover = coverPage(input);
  const summary = executiveSummary(requirements);
  const summaryTable = complianceSummaryTable(requirements);
  const matrix = complianceMatrix(requirements);
  const gaps = complianceGaps(requirements);
  const extra = extraInstructionsSection(input.extraInstructions);
  const declaration = declarationAndSignatures(input);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_FAMILY,
            size: 22,
            color: hex6(BRAND_TEXT),
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 0 },
                border: {
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 2,
                    color: hex6(BRAND_PRIMARY),
                  },
                },
                children: [
                  new TextRun({
                    text: `Compliance Document — ${input.tenderTitle}`,
                    italics: true,
                    size: 16,
                    color: hex6(BRAND_PRIMARY),
                    font: FONT_FAMILY,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Page ',
                    size: 16,
                    color: hex6(0x9ca3af),
                    font: FONT_FAMILY,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: hex6(0x9ca3af),
                    font: FONT_FAMILY,
                  }),
                  new TextRun({
                    text: ' of ',
                    size: 16,
                    color: hex6(0x9ca3af),
                    font: FONT_FAMILY,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: hex6(0x9ca3af),
                    font: FONT_FAMILY,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...cover,
          ...summary,
          ...summaryTable,
          ...matrix,
          ...gaps,
          ...extra,
          ...declaration,
        ],
      },
    ],
  });

  const buffer: Buffer = await Packer.toBuffer(doc);
  return buffer;
}
