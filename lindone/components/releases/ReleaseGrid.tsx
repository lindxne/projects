import { GlassCard } from "@/components/glass/GlassCard";
import { GlassLink } from "@/components/glass/GlassButton";
import { PlusIcon } from "@/components/ui/icons";
import type { Release } from "@/lib/supabase/types";
import { ReleaseCard } from "./ReleaseCard";

export function ReleaseGrid({ releases, filtered }: { releases: Release[]; filtered: boolean }) {
  if (releases.length === 0) {
    return (
      <GlassCard variant="panel" className="mx-auto max-w-md px-6 py-12 text-center">
        <h2 className="font-display text-xl font-bold text-white">{filtered ? "Здесь пока пусто" : "Дискография пуста"}</h2>
        <p className="mt-2 text-mist-muted">
          {filtered ? "Релизов этого типа ещё нет." : "Добавь первый релиз: обложка, название и треки."}
        </p>
        <GlassLink href="/releases/new" variant="primary" className="mt-6">
          <PlusIcon size={18} /> Добавить релиз
        </GlassLink>
      </GlassCard>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
      {releases.map((release, index) => (
        <li key={release.id}>
          <ReleaseCard release={release} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}
