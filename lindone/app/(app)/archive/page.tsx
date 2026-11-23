import type { Metadata } from "next";
import { Feed } from "@/components/archive/Feed";
import { GlassLink } from "@/components/glass/GlassButton";
import { UploadIcon } from "@/components/ui/icons";
import { fetchPostPage } from "@/lib/data/posts";
import { DataError } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";
import { isPostTag } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Архив" };

interface ArchivePageProps {
  searchParams: Promise<{ tag?: string; view?: string }>;
}

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const params = await searchParams;
  const tag = isPostTag(params.tag) ? params.tag : null;
  const view = params.view === "grid" ? "grid" : "feed";
  const supabase = await createClient();
  const initial = await fetchPostPage(supabase, { tag, limit: view === "grid" ? 30 : undefined }).catch(
    (error: Error) => {
      throw new DataError("Не удалось загрузить архив", error);
    },
  );

  return (
    <div className="grid gap-5 md:gap-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-5xl">Архив</h1>
          <p className="mt-1.5 text-sm text-mist-muted md:text-base">Студия, лайвы, демо, референсы — визуальный дневник.</p>
        </div>
        <GlassLink href="/upload" variant="primary">
          <UploadIcon size={18} /> Загрузить
        </GlassLink>
      </header>
      <Feed key={`${tag ?? "all"}-${view}`} initial={initial} tag={tag} view={view} />
    </div>
  );
}
