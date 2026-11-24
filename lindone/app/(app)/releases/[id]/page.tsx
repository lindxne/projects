import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostGrid } from "@/components/archive/PostGrid";
import { GlassLink } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { CoverArt } from "@/components/player/CoverArt";
import { ReleaseActions, TrackList } from "@/components/releases/TrackList";
import { ArrowLeftIcon, EditIcon, ExternalIcon } from "@/components/ui/icons";
import { getRelease, listPostsFor } from "@/lib/data/queries";
import { RELEASE_TYPE_LABEL, STREAMING_LABEL, STREAMING_SERVICES } from "@/lib/supabase/types";
import { formatDate, formatDuration, plural } from "@/lib/utils/format";

interface ReleasePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ReleasePageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getRelease(id);
  return { title: data?.release.title ?? "Release not found" };
}

export default async function ReleasePage({ params }: ReleasePageProps) {
  const { id } = await params;
  const data = await getRelease(id);
  if (!data) notFound();
  const { release, tracks } = data;

  const posts = await listPostsFor({ releaseId: release.id, trackIds: tracks.map((track) => track.id) });
  const totalSeconds = tracks.reduce((sum, track) => sum + (track.duration_sec ?? 0), 0);
  const links = STREAMING_SERVICES.flatMap((service) => {
    const url = release.links[service];
    return url ? [{ service, url }] : [];
  });
  const facts = [
    release.release_date ? formatDate(release.release_date) : null,
    tracks.length > 0 ? `${tracks.length} ${plural(tracks.length, "track")}` : null,
    totalSeconds > 0 ? formatDuration(totalSeconds) : null,
  ].filter(Boolean);

  return (
    <article className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-start md:gap-8">
      <div className="md:sticky md:top-24">
        <GlassLink href="/" variant="ghost" className="mb-3 !min-h-[40px] !px-3.5 md:mb-4" aria-label="Back to feed">
          <ArrowLeftIcon size={17} /> Feed
        </GlassLink>
        <GlassCard variant="panel" className="p-2.5 md:p-3.5">
          <CoverArt
            src={release.cover_url}
            alt={`Cover: ${release.title}`}
            className="w-full rounded-[20px]"
           
            priority
            sizes={1000}
          />
        </GlassCard>
      </div>

      <div className="grid gap-4 md:gap-5 md:pt-14">
        <GlassCard variant="panel" className="p-5 md:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-mist-muted">{RELEASE_TYPE_LABEL[release.type]}</p>
          <h1 className="text-balance mt-2 break-words font-display text-3xl font-bold leading-tight tracking-tight text-mist md:text-5xl">
            {release.title}
          </h1>
          <p className="mt-2 text-mist-muted">Lindone{facts.length > 0 ? ` · ${facts.join(" ·")}` : ""}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <ReleaseActions release={release} tracks={tracks} />
            <GlassLink href={`/releases/${release.id}/edit`} variant="ghost" className="!min-h-[50px]">
              <EditIcon size={16} /> Edit
            </GlassLink>
          </div>

          {release.description ? (
            <p className="mt-5 whitespace-pre-line break-words text-[15px] leading-relaxed text-mist">{release.description}</p>
          ) : null}

          {links.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Listen on">
              {links.map(({ service, url }) => (
                <li key={service}>
                  <GlassLink href={url} external className="!min-h-[40px] !px-4">
                    {STREAMING_LABEL[service]} <ExternalIcon size={14} />
                  </GlassLink>
                </li>
              ))}
            </ul>
          ) : null}
        </GlassCard>

        <GlassCard variant="panel" className="p-2.5 md:p-3.5">
          <h2 className="sr-only">Tracks</h2>
          <TrackList release={release} tracks={tracks} />
        </GlassCard>

        {posts.length > 0 ? (
          <section aria-labelledby="release-archive">
            <h2 id="release-archive" className="mb-3 px-1 text-lg font-bold text-mist">Photos & videos
            </h2>
            <PostGrid posts={posts} />
          </section>
        ) : null}
      </div>
    </article>
  );
}
