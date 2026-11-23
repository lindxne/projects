import Link from "next/link";
import { CoverArt } from "@/components/player/CoverArt";
import { RELEASE_TYPE_LABEL, type Release } from "@/lib/supabase/types";
import { yearOf } from "@/lib/utils/format";

/** Square glass tile of the discography grid. */
export function ReleaseCard({ release, priority = false }: { release: Release; priority?: boolean }) {
  const year = yearOf(release.release_date);
  return (
    <Link
      href={`/releases/${release.id}`}
      className="glass glass-card group block p-2 transition-transform duration-300 ease-out hover:-translate-y-1 active:scale-[0.98] md:p-2.5"
    >
      <CoverArt
        src={release.cover_url}
        alt={`Обложка: ${release.title}`}
        className="w-full rounded-[18px]"
        depth={8}
        priority={priority}
        sizes={500}
      />
      <div className="px-1.5 pb-1 pt-2.5">
        <h3 className="truncate text-[15px] font-semibold text-white md:text-base">{release.title}</h3>
        <p className="mt-0.5 truncate text-xs text-mist-muted md:text-sm">
          {RELEASE_TYPE_LABEL[release.type]}
          {year ? ` · ${year}` : ""}
        </p>
      </div>
    </Link>
  );
}
