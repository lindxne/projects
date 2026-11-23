"use client";

import { useEffect } from "react";
import { TIMEZONE_COOKIE } from "@/lib/utils/timezone";

/** Remembers the browser's time zone so the server can tell which day "today" is. */
export function TimezoneCookie() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || document.cookie.includes(`${TIMEZONE_COOKIE}=${encodeURIComponent(tz)}`)) return;
    document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
  }, []);
  return null;
}
