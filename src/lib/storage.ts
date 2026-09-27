// Storage abstraction for ticket attachments.
// Provider priority: Vercel Blob (BLOB_READ_WRITE_TOKEN) → S3-compatible
// (S3_* env vars) → local /tmp (development fallback only).
// Callers use uploadFile() — never touch provider SDKs directly.

import type { S3Client } from "@aws-sdk/client-s3";

export type UploadResult = { key: string; url?: string };
export type StorageProvider = "vercel-blob" | "s3" | "local";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function validateUpload(mime: string, size: number) {
  if (!ALLOWED_MIME.has(mime)) throw new Error(`File type not allowed: ${mime}`);
  if (size > MAX_BYTES) throw new Error("File exceeds 10 MB limit");
  if (size <= 0) throw new Error("File is empty");
}

/** Strip directories and unsafe characters so the key can never escape its prefix. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  const trimmed = cleaned.replace(/^[._]+/, "") || "file";
  return trimmed.slice(0, 100);
}

function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type S3Config = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle: boolean;
};

/**
 * Returns the S3 configuration when every required variable is set,
 * otherwise null (caller falls through to the next provider).
 * "auto"/empty region is normalized because SigV4 signing requires
 * a concrete region string.
 */
export function getS3Config(): S3Config | null {
  const endpoint = (process.env.S3_ENDPOINT ?? "").trim();
  const accessKeyId = (process.env.S3_ACCESS_KEY ?? "").trim();
  const secretAccessKey = (process.env.S3_SECRET_KEY ?? "").trim();
  const bucket = (process.env.S3_BUCKET ?? "").trim();
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return null;
  const rawRegion = (process.env.S3_REGION ?? "").trim().toLowerCase();
  const region = !rawRegion || rawRegion === "auto" ? "us-east-1" : rawRegion;
  return {
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    bucket,
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true").toLowerCase() !== "false",
  };
}

let cachedS3: S3Client | null = null;

async function s3Client(cfg: S3Config): Promise<S3Client> {
  if (cachedS3) return cachedS3;
  const { S3Client } = await import("@aws-sdk/client-s3");
  cachedS3 = new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    forcePathStyle: cfg.forcePathStyle,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
  return cachedS3;
}

function s3KeyFor(fileName: string): string {
  const now = new Date();
  const ym = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `attachments/${ym}/${randomSuffix()}-${sanitizeFileName(fileName)}`;
}

/**
 * Upload to the S3-compatible bucket. Retries once on transport-level
 * failure, then surfaces the provider message to the caller.
 */
export async function uploadToS3(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  cfg: S3Config
): Promise<UploadResult> {
  validateUpload(mimeType, buffer.length);
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await s3Client(cfg);
  const key = s3KeyFor(fileName);
  const body = new Uint8Array(buffer);
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: cfg.bucket,
          Key: key,
          Body: body,
          ContentType: mimeType,
        })
      );
      return { key };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `S3 upload failed after 2 attempts: ${toErrorMessage(lastError)}`
  );
}

export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown storage error";
  }
}

/** Which provider uploadFile() will use with the current environment. */
export function getActiveProvider(): StorageProvider {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "vercel-blob";
  if (getS3Config()) return "s3";
  return "local";
}

async function uploadToBlob(buffer: Buffer, fileName: string, mimeType: string): Promise<UploadResult> {
  const { put } = await import("@vercel/blob");
  // NOTE (permanent design decision, not a stub): @vercel/blob objects are
  // publicly addressable, so secrecy comes from the unguessable random key
  // plus never listing keys publicly. Buckets holding sensitive material
  // should use the S3 path above with a private ACL instead.
  const key = `${randomSuffix()}-${sanitizeFileName(fileName)}`;
  const blob = await put(key, buffer, {
    access: "public",
    contentType: mimeType,
    addRandomSuffix: true,
  });
  return { key, url: blob.url };
}

async function uploadToLocal(buffer: Buffer, fileName: string): Promise<UploadResult> {
  // Permanent development fallback: when neither Blob token nor S3 config is
  // present (typical local dev), persist under the OS temp dir. Files here do
  // not survive redeploys by design — configure Blob or S3 for persistence.
  const { writeFile, mkdir } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = join(tmpdir(), "itsd-uploads");
  await mkdir(dir, { recursive: true });
  const key = `${randomSuffix()}-${sanitizeFileName(fileName)}`;
  await writeFile(join(dir, key), buffer);
  return { key };
}

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<UploadResult> {
  validateUpload(mimeType, buffer.length);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return uploadToBlob(buffer, fileName, mimeType);
  }
  const s3 = getS3Config();
  if (s3) {
    return uploadToS3(buffer, fileName, mimeType, s3);
  }
  return uploadToLocal(buffer, fileName);
}
