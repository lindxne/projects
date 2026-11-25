export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || !Number.isFinite(totalSeconds)) {
    return "–:––";
  }
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Formats a calendar date (YYYY-MM-DD) without shifting it across time zones. */
export function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? "" : dateFormatter.format(parsed);
}

/** Formats a timestamp in the viewer's time zone. */
export function formatTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? "" : dateTimeFormatter.format(parsed);
}

const relativeFormatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

/** "3 years ago", "yesterday", "in 2 months" for a calendar date or timestamp. */
export function timeAgo(value: string | null | undefined, now = Date.now()): string {
  if (!value) return "";
  const time = Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(time)) return "";
  const days = Math.round((time - now) / 86_400_000);
  if (Math.abs(days) >= 365) return relativeFormatter.format(Math.trunc(days / 365), "year");
  if (Math.abs(days) >= 30) return relativeFormatter.format(Math.trunc(days / 30), "month");
  if (Math.abs(days) >= 7) return relativeFormatter.format(Math.trunc(days / 7), "week");
  return relativeFormatter.format(days, "day");
}

export function yearOf(date: string | null | undefined): string {
  return date ? date.slice(0, 4) : "";
}

/** "1 track", "2 tracks"; returns only the word. */
export function plural(count: number, one: string, many = `${one}s`): string {
  return count === 1 ? one : many;
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
