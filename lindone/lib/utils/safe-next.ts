const BASE = "http://lindone.invalid";

/** Returns a same-site path for a post-login redirect, or "/" for anything a browser could resolve off-site. */
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  try {
    const url = new URL(value, BASE);
    const path = `${url.pathname}${url.search}`;
    return url.origin === BASE && !path.startsWith("//") ? path : "/";
  } catch {
    return "/";
  }
}

export const NEXT_COOKIE = "lindone-next";
