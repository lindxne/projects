"use client";

import { motion, type PanInfo } from "framer-motion";
import Link from "next/link";
import { GlassSphere } from "@/components/glass/GlassSphere";
import { ChevronUpIcon, QueueIcon } from "@/components/ui/icons";
import { useCurrentTrack, usePlayer } from "@/lib/audio/player-store";
import { paletteStyle, useCoverPalette } from "@/lib/color/palette";
import { CoverArt } from "./CoverArt";
import {
  MuteButton,
  NextButton,
  PlayButton,
  PreviousButton,
  RepeatButton,
  SeekBar,
  ShuffleButton,
  VolumeSlider,
} from "./PlayerControls";
import { PlayerExpanded } from "./PlayerExpanded";
import { QueueModal } from "./QueueModal";

/** The glass player fixed to the bottom of every page. */
export function PlayerBar() {
  const track = useCurrentTrack();
  const error = usePlayer((state) => state.error);
  const queueLength = usePlayer((state) => state.queue.length);
  const setQueueOpen = usePlayer((state) => state.setQueueOpen);
  const setExpanded = usePlayer((state) => state.setExpanded);
  const palette = useCoverPalette(track?.coverUrl ?? null, track?.releaseId);

  const onDragEnd = (_event: unknown, info: PanInfo) => {
    if (track && (info.offset.y < -36 || info.velocity.y < -400)) setExpanded(true);
  };

  const title = track?.title ?? "Nothing playing";
  const subtitle = error ?? (track ? track.releaseTitle : "Pick a track to play");

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-2 pb-[calc(var(--safe-bottom)+8px)] md:px-5 md:pb-[calc(var(--safe-bottom)+14px)]">
        <motion.section
          aria-label="Player"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.35, bottom: 0.05 }}
          dragSnapToOrigin
          onDragEnd={onDragEnd}
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.1 }}
          style={paletteStyle(palette)}
          className="glass player-themed pointer-events-auto mx-auto max-w-6xl touch-pan-x md:!transform-none"
        >

          {/* Phone: compact bar. Tap or swipe up opens the full-screen player. */}
          <div className="md:hidden">
            <div className="flex h-[66px] items-center gap-3 px-2.5">
              <button
                type="button"
                onClick={() => track && setExpanded(true)}
                disabled={!track}
                aria-label={track ? `${title} ${subtitle} — open player` : "Player is empty"}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-left"
              >
                <CoverArt src={track?.coverUrl ?? null} alt="" className="w-12 flex-none rounded-2xl" sizes={96} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-mist">{title}</span>
                  <span className={`block truncate text-xs ${error ? "text-rose-600" : "text-mist-muted"}`}>{subtitle}</span>
                </span>
                {track ? <ChevronUpIcon size={16} className="flex-none text-mist-faint" /> : null}
              </button>
              <PlayButton size={46} />
              <NextButton size={40} />
            </div>
            <SeekBar compact className="absolute inset-x-5 -bottom-[9px]" />
          </div>

          {/* Desktop: three zones. */}
          <div className="hidden h-[84px] grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] items-center gap-6 px-4 md:grid">
            <div className="flex min-w-0 items-center gap-3.5">
              <CoverArt src={track?.coverUrl ?? null} alt="" className="w-[58px] flex-none rounded-2xl" sizes={116} />
              <div className="min-w-0">
                {track ? (
                  <Link href={`/releases/${track.releaseId}`} className="block truncate font-semibold text-mist hover:underline">
                    {title}
                  </Link>
                ) : (
                  <p className="truncate font-semibold text-mist">{title}</p>
                )}
                <p className={`truncate text-sm ${error ? "text-rose-600" : "text-mist-muted"}`} role={error ? "alert" : undefined}>
                  {subtitle}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 flex-col justify-center">
              <div className="flex items-center justify-center gap-3">
                <ShuffleButton size={32} />
                <PreviousButton size={36} />
                <PlayButton size={44} />
                <NextButton size={36} />
                <RepeatButton size={32} />
              </div>
              <SeekBar className="-mb-1.5" />
            </div>

            <div className="flex min-w-0 items-center justify-end gap-3">
              <MuteButton size={34} />
              <VolumeSlider className="w-28" />
              <GlassSphere label={`Queue: ${queueLength}`} size={38} onClick={() => setQueueOpen(true)}>
                <QueueIcon size={17} />
              </GlassSphere>
            </div>
          </div>
        </motion.section>
      </div>

      <PlayerExpanded />
      <QueueModal />
    </>
  );
}
