"use client";

import { motion } from "framer-motion";
import { GlassButton } from "@/components/glass/GlassButton";
import { ListAddIcon, PauseIcon, PlayIcon, ShuffleIcon } from "@/components/ui/icons";
import { usePlayer } from "@/lib/audio/player-store";
import { toPlayerTrack } from "@/lib/data/player";
import type { Release, Track } from "@/lib/supabase/types";
import { cx, formatDuration } from "@/lib/utils/format";

interface TrackListProps {
  release: Pick<Release, "id" | "title" | "cover_url">;
  tracks: Track[];
}

/** "Play" / "Shuffle" buttons of a release. */
export function ReleaseActions({ release, tracks }: TrackListProps) {
  const playQueue = usePlayer((state) => state.playQueue);
  const toggle = usePlayer((state) => state.toggle);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const playingHere = usePlayer((state) => tracks.some((track) => track.id === state.currentId));
  const active = playingHere && isPlaying;

  if (tracks.length === 0) return null;
  const playerTracks = tracks.map((track) => toPlayerTrack(track, release));

  return (
    <div className="flex flex-wrap gap-2.5">
      <GlassButton
        variant="primary"
        className="!min-h-[50px] !px-7 text-base"
        onClick={() => (playingHere ? toggle() : playQueue(playerTracks))}
      >
        {active ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
        {active ? "Пауза" : "Слушать"}
      </GlassButton>
      {tracks.length > 1 ? (
        <GlassButton
          className="!min-h-[50px]"
          onClick={() => {
            const first = playerTracks[Math.floor(Math.random() * playerTracks.length)];
            if (!usePlayer.getState().shuffle) usePlayer.getState().toggleShuffle();
            playQueue(playerTracks, first?.id);
          }}
        >
          <ShuffleIcon size={17} /> Вперемешку
        </GlassButton>
      ) : null}
    </div>
  );
}

export function TrackList({ release, tracks }: TrackListProps) {
  const currentId = usePlayer((state) => state.currentId);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const playQueue = usePlayer((state) => state.playQueue);
  const toggle = usePlayer((state) => state.toggle);
  const enqueue = usePlayer((state) => state.enqueue);

  if (tracks.length === 0) {
    return <p className="px-2 py-6 text-center text-mist-muted">В этом релизе пока нет треков.</p>;
  }

  const playerTracks = tracks.map((track) => toPlayerTrack(track, release));

  return (
    <ol className="flex flex-col gap-1">
      {tracks.map((track, index) => {
        const isCurrent = track.id === currentId;
        const playerTrack = playerTracks[index];
        const details = [track.bpm ? `${track.bpm} BPM` : null, track.musical_key].filter(Boolean).join(" · ");
        return (
          <li
            key={track.id}
            className={cx(
              "flex items-center gap-1 rounded-2xl border pr-1 transition-colors",
              isCurrent ? "border-white/35 bg-white/[0.13]" : "border-transparent hover:bg-white/[0.07]",
            )}
          >
            <button
              type="button"
              onClick={() => (isCurrent ? toggle() : playQueue(playerTracks, track.id))}
              aria-label={`${isCurrent && isPlaying ? "Пауза" : "Играть"}: ${track.title}`}
              className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 text-left"
            >
              <span className="grid h-9 w-9 flex-none place-items-center text-sm tabular-nums text-mist-muted">
                {isCurrent ? (
                  <motion.span
                    key={isPlaying ? "pause" : "play"}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 14 }}
                    className="glass-sphere h-9 w-9"
                    data-active="true"
                  >
                    {isPlaying ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                  </motion.span>
                ) : (
                  (track.track_number ?? index + 1)
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-white">{track.title}</span>
                {details ? <span className="block truncate text-xs text-mist-muted">{details}</span> : null}
              </span>
              <span className="flex-none text-sm tabular-nums text-mist-muted">{formatDuration(track.duration_sec)}</span>
            </button>
            <button
              type="button"
              onClick={() => playerTrack && enqueue([playerTrack])}
              aria-label={`Добавить в очередь: ${track.title}`}
              title="В очередь"
              className="grid h-11 w-11 flex-none place-items-center rounded-full text-mist-muted hover:bg-white/10 hover:text-white"
            >
              <ListAddIcon size={18} />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
