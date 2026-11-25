import { ImageError } from "@/lib/image/resize";
import { UploadError } from "@/lib/supabase/storage";
import { VideoError } from "@/lib/video/ffmpeg";

interface DbErrorLike {
  message: string;
  code?: string;
}

/** Thrown for a failed database write so the form can show a clear reason. */
export class SaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveError";
  }
}

export function describeDbError(error: DbErrorLike): string {
  const { code, message } = error;
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "No connection to the server. Check your internet and retry.";
  }
  if (code === "42501" || /row-level security/i.test(message)) {
    return "No write permission. Your session may have expired — sign in again.";
  }
  if (code === "PGRST301" || /jwt/i.test(message)) {
    return "Session expired. Sign in again and retry.";
  }
  if (code === "23503") return "The linked item was already deleted. Refresh the page.";
  if (code === "23514") return "The database rejected the data: value out of range.";
  return `Database error: ${message}`;
}

/** A user-facing message for anything thrown during an upload / save flow. */
export function describeError(error: unknown): string {
  if (
    error instanceof UploadError ||
    error instanceof ImageError ||
    error instanceof SaveError ||
    error instanceof VideoError
  ) {
    return error.message;
  }
  if (error instanceof Error) {
    if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
      return "No connection to the server. Check your internet and retry.";
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
