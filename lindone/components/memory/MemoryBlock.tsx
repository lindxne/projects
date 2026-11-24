"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { VideoIcon } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import type { MemoryItem } from "@/lib/supabase/types";
import { describeDbError } from "@/lib/utils/errors";
import { plural } from "@/lib/utils/format";

/** "On this day N years ago": posts and releases from today's date in past years. */
export function MemoryBlock() {
  const [items, setItems] = useState<MemoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    void createClient()
      .rpc("on_this_day", { tz })
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) setError(describeDbError(rpcError));
        else setItems(data);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p role="alert" className="rounded-2xl border border-rose-300/40 bg-rose-950/60 px-4 py-3 text-sm text-rose-600">
        Could not load memories: {error}
      </p>
    );
  }
  if (items === null) {
    return <div role="status" aria-label="Loading" className="h-40 animate-pulse rounded-3xl bg-black/[0.07]" />;
  }
  if (items.length === 0) {
    return (
      <GlassCard variant="panel" className="mx-auto max-w-md px-6 py-12 text-center">
        <h2 className="font-display text-xl font-bold text-mist">No memories today</h2>
        <p className="mt-2 text-mist-muted">
          Nothing was released or shot on this day in past years. Come back tomorrow.
        </p>
      </GlassCard>
    );
  }

  const years = [...new Set(items.map((item) => item.years_ago))].sort((a, b) => a - b);

  return (
    <div className="grid gap-6">
      {years.map((year) => (
        <section key={year} aria-labelledby={`memory-${year}`}>
          <h2 id={`memory-${year}`} className="mb-3 px-1 font-display text-xl font-bold text-mist">
            {year} {plural(year, "year")} ago
          </h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {items
              .filter((item) => item.years_ago === year)
              .map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={item.kind === "release" ? `/releases/${item.id}` : `/archive/${item.id}`}
                    className="glass glass-card block p-2"
                  >
                    <span className="relative block aspect-square overflow-hidden rounded-[16px] bg-black/40">
                      {/* eslint-disable-next-line @next/next/no-img-element -- private media behind a signed redirect */}
                      <img src={item.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      {item.media_type === "video" ? (
                        <span className="scrim absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full text-white">
                          <VideoIcon size={13} />
                        </span>
                      ) : null}
                    </span>
                    <span className="block px-1 pb-0.5 pt-2">
                      <span className="block truncate text-sm font-semibold text-mist">
                        {item.title || (item.media_type === "video" ? "Video" : "Photo")}
                      </span>
                      <span className="block text-xs text-mist-muted">
                        {item.kind === "release" ? "Release" : "Post"} ·{" "}
                        {new Date(item.happened_at).getFullYear()}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
