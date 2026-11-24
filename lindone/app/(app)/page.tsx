import type { Metadata } from "next";
import { cookies } from "next/headers";
import { UnifiedFeed } from "@/components/feed/UnifiedFeed";
import { MemoryTeaser } from "@/components/memory/MemoryTeaser";
import { fetchFeedPage, isFeedFilter } from "@/lib/data/feed";
import { DataError } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";
import { TIMEZONE_COOKIE, safeTimezone } from "@/lib/utils/timezone";

export const metadata: Metadata = { title: "lindone" };

interface HomeProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const filter = isFeedFilter(params.filter) ? params.filter : null;
  const tz = safeTimezone((await cookies()).get(TIMEZONE_COOKIE)?.value);
  const supabase = await createClient();
  const [initial, memories] = await Promise.all([
    fetchFeedPage(supabase, { filter }).catch((error: Error) => {
      throw new DataError("Could not load the feed", error);
    }),
    filter ? Promise.resolve([]) : supabase.rpc("on_this_day", { tz }).then(({ data }) => data ?? []),
  ]);

  return (
    <div className="grid gap-10">
      {memories.length > 0 ? (
        <div className="mx-auto w-full max-w-[560px]">
          <MemoryTeaser items={memories} />
        </div>
      ) : null}
      <h1 className="sr-only">{filter ?? "all"}</h1>
      <UnifiedFeed key={filter ?? "all"} initial={initial} filter={filter} />
    </div>
  );
}
