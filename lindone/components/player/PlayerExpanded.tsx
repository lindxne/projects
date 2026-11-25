"use client";

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { GlassSphere } from "@/components/glass/GlassSphere";
import { ChevronDownIcon, QueueIcon } from "@/components/ui/icons";
import { useCurrentTrack, usePlayer } from "@/lib/audio/player-store";
import { paletteStyle, useCoverPalette } from "@/lib/color/palette";
import { cx, formatDuration } from "@/lib/utils/format";
import { lockScroll } from "@/lib/utils/scroll-lock";
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

function UpNext() {
  const queue = usePlayer((state) => state.queue);
  const currentId = usePlayer((state) => state.currentId);
  const playFromQueue = usePlayer((state) => state.playFromQueue);

  return (
    <ol className="flex flex-col gap-1" aria-label="Queue">
      {queue.map((item, index) => {
        const current = item.id === currentId;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => playFromQueue(item.id)}
              aria-current={current ? "true" : undefined}
              className={cx(
                "flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors",
                current ? "bg-black/[0.08]" : "hover:bg-black/[0.05]",
              )}
            >
              <span className="w-5 flex-none text-right text-sm tabular-nums text-mist-muted">{index + 1}</span>
              <CoverArt src={item.coverUrl} alt="" className="w-10 flex-none rounded-lg" sizes={80} />
              <span className="min-w-0 flex-1">
                <span className={cx("block truncate text-[15px] text-mist", current && "font-semibold")}>{item.title}</span>
                <span className="block truncate text-xs text-mist-muted">{item.releaseTitle}</span>
              </span>
              <span className="flex-none text-xs tabular-nums text-mist-muted">{formatDuration(item.duration)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Full-screen player: opens from the bar, closes on Escape, the chevron or a swipe down. */
export function PlayerExpanded() {
  const track = useCurrentTrack();
  const palette = useCoverPalette(track?.coverUrl ?? null, track?.releaseId);
  const expanded = usePlayer((state) => state.expanded);
  const error = usePlayer((state) => state.error);
  const setExpanded = usePlayer((state) => state.setExpanded);
  const setQueueOpen = usePlayer((state) => state.setQueueOpen);
  const panelRef = useRef<HTMLDivElement>(null);
  const open = expanded && track !== null;

  useEffect(() => {
    if (!open) return;
    const unlock = lockScroll();
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !usePlayer.getState().queueOpen) setExpanded(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      unlock();
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setExpanded]);

  const onDragEnd = (_event: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) setExpanded(false);
  };

  return (
    <AnimatePresence>
      {open && track ? (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Player: ${track.title}`}
          tabIndex={-1}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={onDragEnd}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 34, mass: 0.9 }}
          className="player-themed player-fullscreen fixed inset-0 z-[60] flex flex-col overflow-hidden px-6 pb-[calc(var(--safe-bottom)+24px)] pt-[calc(var(--safe-top)+10px)] outline-none md:px-10 md:pb-10 md:pt-6"
          style={paletteStyle(palette)}
        >
          {track.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track.coverUrl}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 h-full w-full scale-125 object-cover opacity-35 blur-[90px] saturate-150"
            />
          ) : null}

          <div className="mx-auto mb-2 h-1.5 w-11 flex-none rounded-full bg-black/25 md:hidden" aria-hidden="true" />
          <div className="mx-auto flex w-full max-w-6xl flex-none items-center justify-between">
            <GlassSphere label="Collapse player" size={42} onClick={() => setExpanded(false)}>
              <ChevronDownIcon size={20} />
            </GlassSphere>
            <Link
              href={`/releases/${track.releaseId}`}
              onClick={() => setExpanded(false)}
              className="min-w-0 truncate px-3 text-center text-sm font-medium text-mist-muted hover:underline"
            >
              {track.releaseTitle}
            </Link>
            <GlassSphere label="Edit queue" size={42} onClick={() => setQueueOpen(true)}>
              <QueueIcon size={18} />
            </GlassSphere>
          </div>

          <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,380px)] md:gap-14 md:pt-8">
            <div className="flex min-h-0 flex-1 flex-col md:justify-center">
              <div className="flex min-h-0 flex-1 items-center justify-center py-5 md:flex-none md:py-0">
                <motion.div
                  key={track.id}
                  initial={{ scale: 0.86, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 240, damping: 22 }}
                  className="aspect-square h-full max-h-[min(100%,calc(100vw-48px))] max-w-full md:h-[min(52vh,520px)] md:max-h-none"
                >
                  <CoverArt
                    src={track.coverUrl}
                    alt={`Cover: ${track.releaseTitle}`}
                    className="h-full w-full rounded-[32px] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.45)]"
                    priority
                    sizes={1040}
                  />
                </motion.div>
              </div>

              <div className="mx-auto w-full flex-none md:mt-8 md:max-w-[520px]">
                <h2 className="truncate font-display text-2xl font-bold text-mist md:text-3xl">{track.title}</h2>
                <p className={`mt-0.5 truncate text-base ${error ? "text-rose-600" : "text-mist-muted"}`} role={error ? "alert" : undefined}>
                  {error ?? track.releaseTitle}
                </p>

                <SeekBar className="mt-5" />

                <div className="mt-5 flex items-center justify-between md:justify-center md:gap-6">
                  <ShuffleButton size={44} />
                  <PreviousButton size={56} />
                  <PlayButton size={76} />
                  <NextButton size={56} />
                  <RepeatButton size={44} />
                </div>

                <div className="mt-5 flex items-center justify-center gap-3">
                  <MuteButton size={44} />
                  <VolumeSlider className="hidden w-40 md:block" />
                </div>
              </div>
            </div>

            <section aria-label="Up next" className="hidden min-h-0 flex-col md:flex">
              <h3 className="mb-3 px-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-mist-muted">Up next</h3>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <UpNext />
              </div>
            </section>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
