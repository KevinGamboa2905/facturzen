import "server-only";

import { flags, isProduction, absoluteUrl } from "@/lib/env";

// File storage abstraction (logo uploads, and any future user asset).
//
// The calling code never knows where bytes land — it calls put/delete/getUrl.
// Driver selection:
//   • BLOB_READ_WRITE_TOKEN set  → Vercel Blob (works in serverless prod).
//   • dev, no token              → local filesystem under public/uploads.
//   • prod, no token             → a driver that fails LOUDLY but CLEANLY
//                                  (StorageNotConfiguredError) so the UI can say
//                                  "Stockage de fichiers non configuré" instead
//                                  of throwing a raw 500. Vercel's filesystem is
//                                  ephemeral & read-only, so local is never a
//                                  valid prod fallback.

export type StoredFile = { url: string; pathname: string };

export interface StorageDriver {
  put(
    pathname: string,
    data: Buffer | Uint8Array,
    opts?: { contentType?: string },
  ): Promise<StoredFile>;
  delete(pathnameOrUrl: string): Promise<void>;
  getUrl(pathnameOrUrl: string): string;
}

// Thrown when an upload is attempted with no storage configured. Callers should
// catch this and surface a friendly message (see DEPLOY.md).
export class StorageNotConfiguredError extends Error {
  constructor() {
    super("Stockage de fichiers non configuré — voir DEPLOY.md §6.");
    this.name = "StorageNotConfiguredError";
  }
}

const PUBLIC_DIR = "public/uploads";

// --- Local driver (dev) ------------------------------------------------------
const localDriver: StorageDriver = {
  async put(pathname, data) {
    const { writeFile, mkdir } = await import("node:fs/promises");
    const path = await import("node:path");
    const abs = path.join(process.cwd(), PUBLIC_DIR, pathname);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, data);
    return { url: `/uploads/${pathname}`, pathname };
  },
  async delete(pathnameOrUrl) {
    const { unlink } = await import("node:fs/promises");
    const path = await import("node:path");
    const rel = pathnameOrUrl.replace(/^\/uploads\//, "").replace(/^\//, "");
    const abs = path.join(process.cwd(), PUBLIC_DIR, rel);
    await unlink(abs).catch(() => {}); // already gone is fine
  },
  getUrl(pathnameOrUrl) {
    if (/^https?:\/\//.test(pathnameOrUrl)) return pathnameOrUrl;
    const rel = pathnameOrUrl.replace(/^\/uploads\//, "").replace(/^\//, "");
    return `/uploads/${rel}`;
  },
};

// --- Vercel Blob driver (prod / anywhere with a token) -----------------------
const blobDriver: StorageDriver = {
  async put(pathname, data, opts) {
    const { put } = await import("@vercel/blob");
    const body = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const blob = await put(pathname, body, {
      access: "public",
      contentType: opts?.contentType,
      addRandomSuffix: true,
    });
    return { url: blob.url, pathname: blob.pathname };
  },
  async delete(pathnameOrUrl) {
    const { del } = await import("@vercel/blob");
    await del(pathnameOrUrl);
  },
  getUrl(pathnameOrUrl) {
    // Blob returns absolute URLs at upload time; nothing to resolve here.
    return pathnameOrUrl;
  },
};

// --- Disabled driver (prod, no token) ---------------------------------------
const disabledDriver: StorageDriver = {
  async put() {
    throw new StorageNotConfiguredError();
  },
  async delete() {
    /* no-op: nothing was ever stored */
  },
  getUrl(pathnameOrUrl) {
    // Absolute URLs (previously stored) still resolve; relative ones can't.
    return /^https?:\/\//.test(pathnameOrUrl) ? pathnameOrUrl : absoluteUrl(pathnameOrUrl);
  },
};

/** True when uploads can actually be written in the current environment. */
export function isStorageConfigured(): boolean {
  return flags.blob || !isProduction;
}

/** The active storage driver for this environment. */
export const storage: StorageDriver = flags.blob
  ? blobDriver
  : isProduction
    ? disabledDriver
    : localDriver;
