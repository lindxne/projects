import { createClient } from "./client";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

export const BUCKETS = ["covers", "audio", "media", "posters"] as const;
export type Bucket = (typeof BUCKETS)[number];

export function isBucket(value: string): value is Bucket {
  return (BUCKETS as readonly string[]).includes(value);
}

/**
 * Media is stored in private buckets. The database keeps a stable app-relative URL
 * (`/media/<bucket>/<path>`); the route behind it redirects the signed-in owner to a
 * short-lived signed Storage URL.
 */
export function mediaUrl(bucket: Bucket, path: string): string {
  return `/media/${bucket}/${path}`;
}

export function parseMediaUrl(url: string): { bucket: Bucket; path: string } | null {
  const match = /^\/media\/([^/]+)\/(.+)$/.exec(url);
  if (!match) return null;
  const [, bucket, path] = match;
  if (!bucket || !path || !isBucket(bucket)) return null;
  return { bucket, path };
}

export class UploadError extends Error {
  constructor(
    message: string,
    readonly kind: "size" | "format" | "network" | "auth" | "server",
  ) {
    super(message);
    this.name = "UploadError";
  }
}

export const MAX_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? "50") || 50;

export function assertUploadSize(file: Blob, label: string, maxMb: number = MAX_UPLOAD_MB): void {
  if (file.size > maxMb * 1024 * 1024) {
    const sizeMb = (file.size / 1024 / 1024).toFixed(1);
    throw new UploadError(`${label}: ${sizeMb} MB is over the ${maxMb} MB limit.`, "size");
  }
}

function extensionFor(mime: string, fallback: string): string {
  const known: Record<string, string> = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
    "video/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/aac": "aac",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/wave": "wav",
    "audio/flac": "flac",
    "audio/x-flac": "flac",
    "audio/ogg": "ogg",
    "audio/webm": "webm",
  };
  return known[mime] ?? fallback;
}

export interface UploadOptions {
  bucket: Bucket;
  file: Blob;
  contentType: string;
  /** Used when the content type has no known extension. */
  fallbackExtension?: string;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/**
 * Uploads a file straight from the browser to Supabase Storage and reports progress.
 * Returns the app-relative media URL to store in the database.
 */
export async function uploadFile({
  bucket,
  file,
  contentType,
  fallbackExtension = "bin",
  onProgress,
  signal,
}: UploadOptions): Promise<string> {
  if (signal?.aborted) throw new UploadError("Upload cancelled.", "network");
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new UploadError("Session expired — sign in again and retry the upload.", "auth");
  }

  const now = new Date();
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const path = `${folder}/${crypto.randomUUID()}.${extensionFor(contentType, fallbackExtension)}`;
  const endpoint = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;

  await new Promise<void>((resolve, reject) => {
    // The request never got an answer, yet the server may have stored the file already.
    const interrupted = (message: string) => {
      discardUpload(bucket, path);
      reject(new UploadError(message, "network"));
    };
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("Cache-Control", "max-age=31536000");
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve();
        return;
      }
      reject(toUploadError(xhr.status, xhr.responseText));
    };
    xhr.onerror = () => interrupted("The network dropped during upload. Check your connection and retry.");
    xhr.ontimeout = () => interrupted("The upload took too long. Please retry.");
    xhr.onabort = () => interrupted("Upload cancelled.");

    if (signal?.aborted) {
      reject(new UploadError("Upload cancelled.", "network"));
      return;
    }
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });

  return mediaUrl(bucket, path);
}

/** Removes whatever an unanswered upload left behind: now, and again once the server has settled. */
function discardUpload(bucket: Bucket, path: string): void {
  const remove = () => {
    void createClient()
      .storage.from(bucket)
      .remove([path])
      .then(
        () => undefined,
        () => undefined,
      );
  };
  remove();
  window.setTimeout(remove, 5000);
}

function toUploadError(status: number, body: string): UploadError {
  let detail = "";
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object" && "message" in parsed) {
      detail = String((parsed as { message: unknown }).message);
    }
  } catch {
    detail = body.slice(0, 200);
  }

  if (status === 413 || /exceeded the maximum allowed size/i.test(detail)) {
    return new UploadError("The file exceeds this project's Supabase storage limit.", "size");
  }
  if (status === 415 || /mime type .* is not supported/i.test(detail)) {
    return new UploadError("Storage does not accept this file format.", "format");
  }
  if (status === 401 || status === 403 || /row-level security|unauthorized|jwt/i.test(detail)) {
    return new UploadError("No access to storage — sign in again.", "auth");
  }
  return new UploadError(`Storage error ${status}${detail ? `: ${detail}` : ""}.`, "server");
}

/** Best-effort removal of uploaded files (used to roll back a failed save). */
export async function removeMedia(urls: Array<string | null | undefined>): Promise<void> {
  const supabase = createClient();
  const byBucket = new Map<Bucket, string[]>();
  for (const url of urls) {
    const parsed = url ? parseMediaUrl(url) : null;
    if (!parsed) continue;
    byBucket.set(parsed.bucket, [...(byBucket.get(parsed.bucket) ?? []), parsed.path]);
  }
  await Promise.all(
    [...byBucket.entries()].map(([bucket, paths]) => supabase.storage.from(bucket).remove(paths)),
  );
}
