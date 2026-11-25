export const TIMEZONE_COOKIE = "lindone-tz";

/** IANA zone names only ("Europe/Minsk"); anything else falls back to UTC. */
export function safeTimezone(value: string | undefined): string {
  if (!value) return "UTC";
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return "UTC";
  }
  return /^[A-Za-z0-9_+\-/]{1,64}$/.test(decoded) ? decoded : "UTC";
}
