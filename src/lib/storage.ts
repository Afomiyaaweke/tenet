/**
 * Unified storage abstraction for file uploads.
 *
 * - In development (no BLOB_READ_WRITE_TOKEN): saves files to local /uploads/ directory
 * - In production (BLOB_READ_WRITE_TOKEN set): uploads to Vercel Blob
 *
 * This ensures compatibility with Vercel's ephemeral read-only filesystem
 * while preserving local filesystem behavior for development.
 */

import { writeFile, mkdir, unlink, readFile } from 'fs/promises';
import path from 'path';
import { put, del, head } from '@vercel/blob';

// ─── Environment Detection ────────────────────────────────────────────────

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const USE_VERCEL_BLOB = !!BLOB_TOKEN;
const UPLOAD_DIR = process.cwd() + '/uploads';

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Sanitize filename to prevent path traversal attacks
 */
function sanitizeFilename(filename: string): string {
  const basename = filename.replace(/^.*[\\/]/, '');
  return basename.replace(/[\x00<>:"|?*\s]/g, '_');
}

/**
 * Determine if a URL is a Vercel Blob URL
 */
function isBlobUrl(url: string): boolean {
  return url.includes('.blob.vercel-storage.com') || url.includes('.public.blob.vercel-storage.com');
}

/**
 * Extract the blob pathname from a Vercel Blob URL.
 * E.g., "https://xxx.public.blob.vercel-storage.com/folder/filename.jpg" → "folder/filename.jpg"
 */
function extractBlobPathname(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname.slice(1); // remove leading slash
  } catch {
    // If it's not a full URL (e.g., a relative path like /uploads/filename.jpg),
    // it's not a blob URL - return empty
    return '';
  }
}

// ─── Upload ────────────────────────────────────────────────────────────────

export interface UploadResult {
  url: string;  // Full URL (local relative path or Vercel Blob absolute URL)
  key: string;  // Storage key (filename portion used for identification)
}

/**
 * Upload a file to the appropriate storage backend.
 *
 * @param file - The File object to upload
 * @param subPath - Optional sub-path within uploads (e.g., "profile-photos")
 * @returns UploadResult with url and key
 *
 * Examples:
 * - Local dev: { url: "/uploads/profile-photos/user-photo.jpg", key: "profile-photos/user-photo.jpg" }
 * - Vercel: { url: "https://xxx.blob.vercel-storage.com/profile-photos/user-photo.jpg", key: "profile-photos/user-photo.jpg" }
 */
export async function uploadFile(file: File, subPath?: string): Promise<UploadResult> {
  const safeName = sanitizeFilename(file.name);
  const safeExt = path.extname(safeName).toLowerCase();
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${safeExt}`;

  // Build the storage key (path within the storage)
  const key = subPath ? `${subPath}/${uniqueName}` : uniqueName;

  if (USE_VERCEL_BLOB) {
    // ── Vercel Blob ──
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const blob = await put(key, buffer, {
      access: 'public',
      contentType: file.type || undefined,
      token: BLOB_TOKEN,
    });

    return {
      url: blob.url,
      key: key,
    };
  }

  // ── Local filesystem ──
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const dirPath = subPath ? path.join(UPLOAD_DIR, subPath) : UPLOAD_DIR;
  const filePath = path.join(dirPath, uniqueName);

  await mkdir(dirPath, { recursive: true });
  await writeFile(filePath, buffer);

  const url = subPath ? `/uploads/${subPath}/${uniqueName}` : `/uploads/${uniqueName}`;

  return {
    url,
    key,
  };
}

// ─── Delete ────────────────────────────────────────────────────────────────

/**
 * Delete a file from the appropriate storage backend.
 *
 * @param urlOrKey - Either the full URL or a storage key
 *   - For local: "/uploads/filename.jpg" or "/uploads/profile-photos/filename.jpg"
 *   - For Vercel: "https://xxx.blob.vercel-storage.com/folder/filename.jpg"
 *
 * Silently succeeds if the file doesn't exist (no error thrown).
 */
export async function deleteFile(urlOrKey: string): Promise<void> {
  if (!urlOrKey) return;

  if (USE_VERCEL_BLOB) {
    // ── Vercel Blob ──
    if (isBlobUrl(urlOrKey)) {
      // It's a full Vercel Blob URL — delete directly
      await del(urlOrKey, { token: BLOB_TOKEN });
    } else if (urlOrKey.startsWith('/uploads/')) {
      // Legacy local URL stored in DB — extract key and try to delete
      // This handles migration: old local URLs may still be in the database
      // In Vercel environment, we can't delete local files (they don't exist)
      // So we just silently skip
      console.log(`Skipping delete of legacy local URL in Vercel environment: ${urlOrKey}`);
    }
    return;
  }

  // ── Local filesystem ──
  try {
    if (urlOrKey.startsWith('/uploads/')) {
      // Relative URL — convert to filesystem path
      const filePath = path.join(process.cwd(), urlOrKey);
      await unlink(filePath);
    } else if (isBlobUrl(urlOrKey)) {
      // Vercel Blob URL stored in DB — can't delete from local filesystem
      // This handles the edge case where a blob URL ends up in local dev DB
      console.log(`Cannot delete Vercel Blob URL in local environment: ${urlOrKey}`);
    } else {
      // Might be a raw filesystem path
      await unlink(urlOrKey);
    }
  } catch {
    // File may already be deleted or not exist — that's OK
  }
}

// ─── Read (for OCR and other processing) ───────────────────────────────────

/**
 * Get the raw Buffer content of a stored file.
 *
 * Used by OCR processing and other backend operations that need
 * to read file content from storage.
 *
 * @param fileUrl - The URL as stored in the database
 *   - Local: "/uploads/filename.jpg"
 *   - Vercel: "https://xxx.blob.vercel-storage.com/folder/filename.jpg"
 * @returns Buffer with the file contents
 */
export async function getFileBuffer(fileUrl: string): Promise<Buffer> {
  if (!fileUrl) {
    throw new Error('No file URL provided');
  }

  if (isBlobUrl(fileUrl)) {
    // ── Vercel Blob: fetch the public URL ──
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from Vercel Blob: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ── Local filesystem ──
  if (fileUrl.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), fileUrl);
    return await readFile(filePath);
  }

  // Fallback: treat as a filesystem path
  return await readFile(fileUrl);
}

// ─── Storage Mode Info ─────────────────────────────────────────────────────

/**
 * Returns the current storage mode for logging/debugging
 */
export function getStorageMode(): 'local' | 'vercel-blob' {
  return USE_VERCEL_BLOB ? 'vercel-blob' : 'local';
}

/**
 * Check if a URL is accessible as a local file.
 * Useful for determining whether OCR can read directly from disk
 * vs. needs to fetch via HTTP.
 */
export function isLocalFileUrl(url: string): boolean {
  return url.startsWith('/uploads/');
}
