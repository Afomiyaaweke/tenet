/**
 * agent-document.ts
 * Document processing library for the AI agent.
 *
 * Parses PDF, DOCX, TXT/MD, XLSX/XLS/CSV files into page-chunked text,
 * builds LLM context strings with page markers, and generates AI summaries.
 */

import { getZAI } from '@/lib/zai';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedPage {
  pageNum: number;
  text: string;
}

export interface ParsedDocument {
  filename: string;
  filetype: string;
  pages: ParsedPage[];
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Characters per simulated "page" for text-based formats (DOCX, TXT, MD) */
const CHARS_PER_PAGE = 3000;

/** Max characters per page when building LLM context */
const MAX_PAGE_CHARS = 4000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Split a string into chunks of roughly `chunkSize` characters,
 * breaking at the last newline within each chunk when possible.
 */
function chunkText(text: string, chunkSize: number): string[] {
  if (!text.length) return [];

  const chunks: string[] = [];
  let offset = 0;

  while (offset < text.length) {
    let end = offset + chunkSize;

    if (end >= text.length) {
      // Last chunk — take the rest
      chunks.push(text.slice(offset));
      break;
    }

    // Try to break at the last newline within the window
    const lastNewline = text.lastIndexOf('\n', end);
    if (lastNewline > offset) {
      end = lastNewline + 1; // include the newline in the current chunk
    }

    chunks.push(text.slice(offset, end));
    offset = end;
  }

  return chunks;
}

/**
 * Derive a short filetype label from the filename extension.
 */
function getFiletype(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || '';
  const typeMap: Record<string, string> = {
    pdf: 'pdf',
    docx: 'docx',
    doc: 'doc',
    txt: 'txt',
    md: 'markdown',
    xlsx: 'xlsx',
    xls: 'xls',
    csv: 'csv',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    webp: 'image',
    gif: 'image',
    bmp: 'image',
    tiff: 'image',
    tif: 'image',
  };
  return typeMap[ext] || ext;
}

/**
 * Map a filename extension to a MIME type (used for base64 data-URLs).
 */
function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || '';
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    txt: 'text/plain',
    md: 'text/markdown',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    csv: 'text/csv',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    tif: 'image/tiff',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

// ---------------------------------------------------------------------------
// Format-specific parsers
// ---------------------------------------------------------------------------

/**
 * Parse a PDF buffer using VLM (Vision Language Model) via z-ai-web-dev-sdk.
 * The entire PDF is sent as a base64 data-URL; the VLM extracts text page by page.
 * We ask the model to delimit pages so we can split the response.
 */
async function parsePDF(filename: string, buffer: Buffer): Promise<ParsedDocument> {
  const base64Data = buffer.toString('base64');
  const mimeType = getMimeType(filename);
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  const zai = await getZAI();

  const response = await zai.chat.completions.createVision({
    model: 'default',
    messages: [
      {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'You are an expert OCR system. Extract ALL text from the provided PDF document precisely. Preserve structure, headings, tables, and formatting. For each page, start with a line that says exactly "--- Page N ---" (where N is the page number). Output only the extracted text with page markers, no other commentary.',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract all text from this PDF document. Mark each page with "--- Page N ---" on its own line.',
          },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  });

  const rawText = response.choices?.[0]?.message?.content || '';

  // Split by the page markers the model was asked to produce
  const pagePattern = /--- Page (\d+) ---/;
  const lines = rawText.split('\n');
  const pages: ParsedPage[] = [];
  let currentPageNum = 1;
  let currentPageLines: string[] = [];

  for (const line of lines) {
    const match = line.trim().match(pagePattern);
    if (match) {
      // Flush previous page
      const text = currentPageLines.join('\n').trim();
      if (text) {
        pages.push({ pageNum: currentPageNum, text });
      }
      currentPageNum = parseInt(match[1], 10);
      currentPageLines = [];
    } else {
      currentPageLines.push(line);
    }
  }

  // Flush the last page
  const lastText = currentPageLines.join('\n').trim();
  if (lastText) {
    pages.push({ pageNum: currentPageNum, text: lastText });
  }

  // Fallback: if no page markers were found, treat the whole text as page 1
  if (pages.length === 0 && rawText.trim()) {
    pages.push({ pageNum: 1, text: rawText.trim() });
  }

  return {
    filename,
    filetype: 'pdf',
    pages,
    totalPages: pages.length,
  };
}

/**
 * Parse a DOCX buffer using mammoth, then chunk the extracted text
 * into simulated pages of ~3000 characters.
 */
async function parseDOCX(filename: string, buffer: Buffer): Promise<ParsedDocument> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;

  const chunks = chunkText(text, CHARS_PER_PAGE);
  const pages: ParsedPage[] = chunks.map((chunk, i) => ({
    pageNum: i + 1,
    text: chunk,
  }));

  return {
    filename,
    filetype: 'docx',
    pages,
    totalPages: pages.length,
  };
}

/**
 * Parse a plain-text file (TXT/MD) as UTF-8 and chunk into pages.
 */
function parsePlainText(filename: string, buffer: Buffer): ParsedDocument {
  const ext = filename.toLowerCase().split('.').pop() || '';
  const text = buffer.toString('utf-8');

  const chunks = chunkText(text, CHARS_PER_PAGE);
  const pages: ParsedPage[] = chunks.map((chunk, i) => ({
    pageNum: i + 1,
    text: chunk,
  }));

  return {
    filename,
    filetype: ext === 'md' ? 'markdown' : 'txt',
    pages,
    totalPages: pages.length,
  };
}

/**
 * Parse a spreadsheet (XLSX/XLS/CSV) using the xlsx library.
 * Each sheet becomes a "page" with rows formatted as tab-separated text.
 */
function parseSpreadsheet(filename: string, buffer: Buffer): ParsedDocument {
  const ext = filename.toLowerCase().split('.').pop() || '';
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const pages: ParsedPage[] = [];

  for (let s = 0; s < workbook.SheetNames.length; s++) {
    const sheetName = workbook.SheetNames[s];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet || !sheet['!ref']) {
      // Empty sheet
      pages.push({
        pageNum: s + 1,
        text: `[Sheet: ${sheetName}]\n(empty)`,
      });
      continue;
    }

    // Convert sheet to an array of rows (arrays of cell values)
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Format as text with a header line for the sheet name
    const lines: string[] = [`[Sheet: ${sheetName}]`];

    for (const row of rows) {
      if (Array.isArray(row)) {
        lines.push(
          row
            .map((cell) => (cell === null || cell === undefined ? '' : String(cell)))
            .join('\t')
        );
      }
    }

    pages.push({
      pageNum: s + 1,
      text: lines.join('\n'),
    });
  }

  // Fallback for workbooks with no sheets
  if (pages.length === 0) {
    pages.push({ pageNum: 1, text: '(empty workbook)' });
  }

  const filetype = ext === 'csv' ? 'csv' : ext === 'xls' ? 'xls' : 'xlsx';

  return {
    filename,
    filetype,
    pages,
    totalPages: pages.length,
  };
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parse a file buffer into page-chunked text.
 *
 * Dispatches to the appropriate format-specific parser based on the file
 * extension in `filename`.
 *
 * Supported formats:
 * - PDF  → VLM-based text extraction (async)
 * - DOCX → mammoth text extraction (async)
 * - TXT / MD → plain-text chunking
 * - XLSX / XLS / CSV → spreadsheet parsing with one "page" per sheet
 *
 * @param filename  The original file name (used for extension detection and metadata)
 * @param buffer    The raw file bytes
 * @returns         A ParsedDocument with pages of extracted text
 */

/**
 * Parse an image buffer using VLM (Vision Language Model) for OCR.
 * Works the same way as PDF parsing — sends the image to the VLM to extract text.
 */
async function parseImage(filename: string, buffer: Buffer): Promise<ParsedDocument> {
  const base64Data = buffer.toString('base64');
  const mimeType = getMimeType(filename);
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  const zai = await getZAI();

  const response = await zai.chat.completions.createVision({
    model: 'default',
    messages: [
      {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'You are an expert OCR system. Extract ALL text from the provided image precisely. Preserve structure, headings, tables, and formatting. Output only the extracted text, no other commentary.',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract all text from this image.',
          },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  });

  const rawText = response.choices?.[0]?.message?.content || '';

  if (!rawText.trim()) {
    return {
      filename,
      filetype: 'image',
      pages: [{ pageNum: 1, text: '(No text could be extracted from this image)' }],
      totalPages: 1,
    };
  }

  return {
    filename,
    filetype: 'image',
    pages: [{ pageNum: 1, text: rawText.trim() }],
    totalPages: 1,
  };
}

export async function parseDocument(
  filename: string,
  buffer: Buffer
): Promise<ParsedDocument> {
  const ext = filename.toLowerCase().split('.').pop() || '';

  switch (ext) {
    case 'pdf':
      return parsePDF(filename, buffer);

    case 'docx':
    case 'doc':
      return parseDOCX(filename, buffer);

    case 'txt':
    case 'md':
      return parsePlainText(filename, buffer);

    case 'xlsx':
    case 'xls':
    case 'csv':
      return parseSpreadsheet(filename, buffer);

    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
    case 'gif':
    case 'bmp':
    case 'tiff':
    case 'tif':
      return parseImage(filename, buffer);

    default: {
      // Unknown format — attempt to read as UTF-8 text as a best-effort fallback
      const filetype = getFiletype(filename);
      const text = buffer.toString('utf-8');
      const chunks = chunkText(text, CHARS_PER_PAGE);
      const pages: ParsedPage[] = chunks.map((chunk, i) => ({
        pageNum: i + 1,
        text: chunk,
      }));
      return { filename, filetype, pages, totalPages: pages.length };
    }
  }
}

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

/**
 * Build an LLM context string from one or more parsed documents.
 *
 * Each page is prefixed with a marker like `[filename p.1]` and truncated
 * to 4000 characters. Pages are separated by blank lines.
 *
 * @param docs  One or more parsed documents
 * @returns     A single context string ready to be injected into an LLM prompt
 */
export function buildDocContext(docs: ParsedDocument[]): string {
  if (!docs.length) return '';

  const parts: string[] = [];

  for (const doc of docs) {
    for (const page of doc.pages) {
      const marker = `[${doc.filename} p.${page.pageNum}]`;
      const truncatedText =
        page.text.length > MAX_PAGE_CHARS
          ? page.text.slice(0, MAX_PAGE_CHARS) + '…[truncated]'
          : page.text;
      parts.push(`${marker}\n${truncatedText}`);
    }
  }

  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// AI summarisation
// ---------------------------------------------------------------------------

/**
 * Generate a 2-3 sentence summary of a document's content using AI.
 *
 * @param pages  The parsed pages of a single document
 * @returns      A brief summary string
 */
export async function summarizeDocument(pages: ParsedPage[]): Promise<string> {
  if (!pages.length) return 'Empty document — no content to summarize.';

  // Combine all page text (truncate to avoid oversized prompts)
  const MAX_SUMMARY_INPUT = 8000;
  const fullText = pages.map((p) => p.text).join('\n\n');
  const inputText =
    fullText.length > MAX_SUMMARY_INPUT
      ? fullText.slice(0, MAX_SUMMARY_INPUT) + '…[truncated]'
      : fullText;

  const zai = await getZAI();

  const response = await zai.chat.completions.create({
    model: 'default',
    messages: [
      {
        role: 'system',
        content:
          'You are a concise document summarizer. Given document text, produce a 2-3 sentence summary that captures the key points, purpose, and main content. Output only the summary, no extra commentary.',
      },
      {
        role: 'user',
        content: `Summarize the following document in 2-3 sentences:\n\n${inputText}`,
      },
    ],
  });

  const summary = response.choices?.[0]?.message?.content?.trim() || '';
  return summary || 'Unable to generate summary.';
}
