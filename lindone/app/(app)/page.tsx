import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { GlassLink } from "@/components/glass/GlassButton";
import { MemoryTeaser } from "@/components/memory/MemoryTeaser";
import { ReleaseGrid } from "@/components/releases/ReleaseGrid";
import { PlusIcon } from "@/components/ui/icons";
import { listReleases } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";
import { RELEASE_TYPES, RELEASE_TYPE_LABEL_PLURAL, isReleaseType } from "@/lib/supabase/types";
import { pluralRu } from "@/lib/utils/format";
import { TIMEZONE_COOKIE, safeTimezone } from "@/lib/utils/timezone";

export const metadata: Metadata = { title: "Дискография" };

interface HomeProps {
  searchParams: Promise<{ type?: string; sort?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const type = isReleaseType(params.type) ? params.type : undefined;
  const ascending = params.sort === "asc";
  const tz = safeTimezone((await cookies()).get(TIMEZONE_COOKIE)?.value);
  const supabase = await createClient();
  // The memory banner is a bonus: if it fails, the discography still renders.
  const [releases, memories] = await Promise.all([
    listReleases({ type, ascending }),
    supabase.rpc("on_this_day", { tz }).then(({ data }) => data ?? []),
  ]);

  const href = (next: { type?: string; sort?: string }) => {
    const query = new URLSearchParams();
    const nextType = "type" in next ? next.type : type;
    const nextSort = "sort" in next ? next.sort : ascending ? "asc" : undefined;
    if (nextType) query.set("type", nextType);
    if (nextSort) query.set("sort", nextSort);
    const text = query.toString();
    return text ? `/?${text}` : "/";
  };

  return (
    <div className="grid gap-5 md:gap-7">
      <MemoryTeaser items={memories} />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-5xl">Дискография</h1>
          <p className="mt-1.5 text-sm text-mist-muted md:text-base">
            {releases.length} {pluralRu(releases.length, "релиз", "релиза", "релизов")}
            {type ? ` · ${RELEASE_TYPE_LABEL_PLURAL[type].toLowerCase()}` : ""}
          </p>
        </div>
        <GlassLink href="/releases/new" variant="primary">
          <PlusIcon size={18} /> Релиз
        </GlassLink>
      </header>

      <nav aria-label="Фильтр и сортировка" className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 md:mx-0 md:px-0">
        <Link href={href({ type: undefined })} className="chip flex-none" aria-current={!type ? "true" : undefined}>
          Все
        </Link>
        {RELEASE_TYPES.map((option) => (
          <Link
            key={option}
            href={href({ type: option })}
            className="chip flex-none"
            aria-current={type === option ? "true" : undefined}
          >
            {RELEASE_TYPE_LABEL_PLURAL[option]}
          </Link>
        ))}
        <Link
          href={href({ sort: ascending ? undefined : "asc" })}
          className="chip ml-auto flex-none"
          aria-label={ascending ? "Сортировка: сначала старые. Переключить на новые" : "Сортировка: сначала новые. Переключить на старые"}
        >
          {ascending ? "Сначала старые ↑" : "Сначала новые ↓"}
        </Link>
      </nav>

      <ReleaseGrid releases={releases} filtered={type !== undefined} />
    </div>
  );
}
