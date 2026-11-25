"use client";

import Link from "next/link";
import { useState } from "react";
import { CoverArt } from "@/components/player/CoverArt";
import { PauseIcon, PlayIcon } from "@/components/ui/icons";
import { usePlayer } from "@/lib/audio/player-store";
import { toPlayerTrack } from "@/lib/data/player";
import {
  RELEASE_TYPE_LABEL,
  type Release,
  type Track,
} from "@/lib/supabase/types";
import { cx, formatDuration, plural, timeAgo } from "@/lib/utils/format";

const COLLAPSED_TRACKS = 5;

/** Full-width backdrop of a release: its own background image, or the cover blurred and darkened. */
function ReleaseBackdrop({ release }: { release: Release }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-hidden border-y border-white/10 bg-neutral-900"
    >
      {release.background_url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- private media */}
          <img
            src={release.background_url}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/45" />
        </>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- private media */}
          <img
            src={release.cover_url}
            alt=""
            className="h-full w-full scale-150 object-cover blur-[60px] saturate-150"
          />
          <div className="absolute inset-0 bg-black/45" />
        </>
      )}
    </div>
  );
}

/** A release in the feed, SoundCloud-style: cover, play, title and the tracklist on glass over a full-width backdrop. */
export function ReleaseFeedCard({
  release,
  tracks,
  priority = false,
}: {
  release: Release;
  tracks: Track[];
  priority?: boolean;
}) {
  const playQueue = usePlayer((state) => state.playQueue);
  const toggle = usePlayer((state) => state.toggle);
  const currentId = usePlayer((state) => state.currentId);
  const playingHere = usePlayer(
    (state) =>
      state.queue.find((track) => track.id === state.currentId)?.releaseId ===
      release.id,
  );
  const isPlaying = usePlayer((state) => state.isPlaying);
  const [showAll, setShowAll] = useState(false);
  const active = playingHere && isPlaying;
  const when = timeAgo(release.release_date ?? release.created_at);
  const totalSeconds = tracks.reduce(
    (sum, track) => sum + (track.duration_sec ?? 0),
    0,
  );
  const visible = showAll ? tracks : tracks.slice(0, COLLAPSED_TRACKS);
  const playerTracks = () =>
    tracks.map((track) => toPlayerTrack(track, release));

  const play = () => {
    if (playingHere) {
      const queuedFromRelease = usePlayer
        .getState()
        .queue.filter((track) => track.releaseId === release.id).length;
      if (isPlaying || queuedFromRelease > 1) return toggle();
    }
    if (tracks.length > 0) playQueue(playerTracks());
  };

  const playTrack = (track: Track) => {
    if (track.id === currentId) return toggle();
    playQueue(playerTracks(), track.id);
  };

  return (
    <article className="relative isolate py-8 text-white md:py-12">
      <ReleaseBackdrop release={release} />

      <div
        className="glass glass-dark grid grid-cols-[104px_minmax(0,1fr)] gap-x-4 gap-y-3 p-3.5 md:grid-cols-[200px_minmax(0,1fr)] md:gap-x-6 md:p-5"
        style={{ ["--glass-radius" as string]: "28px" }}
      >
        <Link
          href={`/releases/${release.id}`}
          aria-label={`${release.title} — open release`}
          className="block self-start rounded-2xl md:row-span-2"
        >
          <CoverArt
            src={release.cover_url}
            alt={`Cover: ${release.title}`}
            className="w-full rounded-2xl"
            priority={priority}
            sizes={400}
          />
        </Link>

        <div className="flex min-w-0 items-start gap-3 md:gap-4">
          <button
            type="button"
            onClick={play}
            disabled={tracks.length === 0}
            aria-label={`${active ? "Pause" : "Play"}: ${release.title}`}
            className="glass-orb grid h-12 w-12 flex-none place-items-center rounded-full text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 md:h-14 md:w-14"
          >
            {active ? (
              <PauseIcon size={22} />
            ) : (
              <PlayIcon size={22} className="translate-x-px" />
            )}
          </button>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-sm font-medium text-white/70">
                {RELEASE_TYPE_LABEL[release.type]}
                {tracks.length > 1
                  ? ` · ${tracks.length} ${plural(tracks.length, "track")}`
                  : ""}
                {totalSeconds > 0 ? ` · ${formatDuration(totalSeconds)}` : ""}
              </p>
              {when ? (
                <span className="hidden flex-none text-sm text-white/70 sm:block">
                  {when}
                </span>
              ) : null}
            </div>
            <Link
              href={`/releases/${release.id}`}
              className="mt-0.5 block truncate text-lg font-bold tracking-tight hover:underline md:text-xl"
            >
              {release.title}
            </Link>
            {when ? (
              <p className="mt-0.5 text-xs text-white/60 sm:hidden">{when}</p>
            ) : null}
          </div>
        </div>

        {tracks.length > 0 ? (
          <div className="col-span-2 md:col-span-1 md:col-start-2">
            <ol
              aria-label={`${release.title} tracks`}
              className="flex flex-col"
            >
              {visible.map((track, index) => {
                const current = track.id === currentId;
                return (
                  <li key={track.id}>
                    <button
                      type="button"
                      onClick={() => playTrack(track)}
                      aria-current={current ? "true" : undefined}
                      aria-label={`${current && isPlaying ? "Pause" : "Play"}: ${track.title}`}
                      className={cx(
                        "glass-row flex w-full items-center gap-3 px-2.5 py-2 text-left",
                      )}
                    >
                      <CoverArt
                        src={release.cover_url}
                        alt=""
                        className="w-8 flex-none rounded-md"
                        sizes={64}
                      />
                      <span className="w-4 flex-none text-right text-sm tabular-nums text-white/60">
                        {index + 1}
                      </span>
                      <span
                        className={cx(
                          "min-w-0 flex-1 truncate text-[15px]",
                          current ? "font-bold" : "font-semibold",
                        )}
                      >
                        {track.title}
                      </span>
                      <span className="flex-none text-sm tabular-nums text-white/60">
                        {formatDuration(track.duration_sec)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {tracks.length > COLLAPSED_TRACKS ? (
              <button
                type="button"
                onClick={() => setShowAll((value) => !value)}
                aria-expanded={showAll}
                className="glass-row mt-1 px-2.5 py-1.5 text-sm font-semibold text-white/75 hover:text-white"
              >
                {showAll ? "Show less" : `View all ${tracks.length} tracks`}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="col-span-2 px-1 text-sm text-white/70 md:col-span-1 md:col-start-2">
            No tracks yet.
          </p>
        )}
      </div>
    </article>
  );
}
