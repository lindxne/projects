"use client";

import Link from "next/link";
import { useState } from "react";
import { CoverArt } from "@/components/player/CoverArt";
import { PauseIcon, PlayIcon } from "@/components/ui/icons";
import { usePlayer } from "@/lib/audio/player-store";
import { toPlayerTrack } from "@/lib/data/player";
import { createClient } from "@/lib/supabase/client";
import { RELEASE_TYPE_LABEL, TRACK_COLUMNS, type Release } from "@/lib/supabase/types";
import { describeError } from "@/lib/utils/errors";
import { yearOf } from "@/lib/utils/format";

/** A release in the feed: big cover, title, and a play button that queues the whole release. */
export function ReleaseFeedCard({ release, priority = false }: { release: Release; priority?: boolean }) {
  const playQueue = usePlayer((state) => state.playQueue);
  const toggle = usePlayer((state) => state.toggle);
  const playingHere = usePlayer((state) => state.queue.find((track) => track.id === state.currentId)?.releaseId === release.id);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const year = yearOf(release.release_date);

  const play = async () => {
    if (playingHere && isPlaying) return toggle();
    setBusy(true);
    setError(null);
    try {
      const { data, error: queryError } = await createClient()
        .from("tracks")
        .select(TRACK_COLUMNS)
        .eq("release_id", release.id)
        .order("track_number", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      if (queryError) throw new Error(queryError.message);
      if (data.length === 0) setError("No tracks yet.");
      else {
        const { queue } = usePlayer.getState();
        const queuedIds = new Set(queue.map((track) => track.id));
        if (playingHere && data.every((track) => queuedIds.has(track.id))) toggle();
        else playQueue(data.map((track) => toPlayerTrack(track, release)));
      }
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  };

  const active = playingHere && isPlaying;

  return (
    <article className="group">
      <div className="relative">
        <Link href={`/releases/${release.id}`} aria-label={`${release.title} — open release`} className="block rounded-[22px]">
          <CoverArt src={release.cover_url} alt={`Cover: ${release.title}`} className="w-full rounded-[22px]" priority={priority} sizes={1000} />
        </Link>
        <button
          type="button"
          onClick={() => void play()}
          disabled={busy}
          aria-label={`${active ? "Pause" : "Play"}: ${release.title}`}
          className="glass glass-pill absolute bottom-3 right-3 grid h-14 w-14 place-items-center text-mist transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          {active ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
        </button>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3 px-1">
        <Link href={`/releases/${release.id}`} className="min-w-0 truncate text-lg font-semibold tracking-tight text-mist hover:underline">
          {release.title}
        </Link>
        <span className="flex-none text-sm text-mist-muted">
          {RELEASE_TYPE_LABEL[release.type].toLowerCase()}
          {year ? ` · ${year}` : ""}
        </span>
      </div>
      {error ? (
        <p role="alert" className="mt-1 px-1 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </article>
  );
}
