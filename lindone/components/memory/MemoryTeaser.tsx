"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClockIcon } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import type { MemoryItem } from "@/lib/supabase/types";
import { pluralRu } from "@/lib/utils/format";

/** "On this day N years ago" banner on the home page. Hidden when there is nothing to recall. */
export function MemoryTeaser() {
  const [items, setItems] = useState<MemoryItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    void createClient()
      .rpc("on_this_day", { tz })
      .then(({ data }) => {
        if (!cancelled && data) setItems(data);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const first = items[0];
  if (!first) return null;
  const years = [...new Set(items.map((item) => item.years_ago))].sort((a, b) => a - b);

  return (
    <Link href="/memory" className="glass glass-card flex items-center gap-3.5 p-2.5 pr-4 transition-transform active:scale-[0.99]">
      <span className="flex flex-none -space-x-5">
        {items.slice(0, 3).map((item) => (
          // eslint-disable-next-line @next/next/no-img-element -- private media behind a signed redirect
          <img
            key={`${item.kind}-${item.id}`}
            src={item.image_url}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            className="h-14 w-14 rounded-2xl object-cover shadow-[0_0_0_2px_rgba(11,10,20,0.9)]"
          />
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-mist-muted">
          <ClockIcon size={14} /> В этот день
        </span>
        <span className="mt-0.5 block truncate font-semibold text-white">
          {years.map((year) => `${year} ${pluralRu(year, "год", "года", "лет")}`).join(", ")} назад ·{" "}
          {items.length} {pluralRu(items.length, "воспоминание", "воспоминания", "воспоминаний")}
        </span>
      </span>
    </Link>
  );
}
