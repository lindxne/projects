"use client";

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { GlassSphere } from "@/components/glass/GlassSphere";
import { ChevronDownIcon, QueueIcon } from "@/components/ui/icons";
import { useCurrentTrack, usePlayer } from "@/lib/audio/player-store";
import { CoverArt } from "./CoverArt";
import {
  MuteButton,
  NextButton,
  PlayButton,
  PreviousButton,
  RepeatButton,
  SeekBar,
  ShuffleButton,
} from "./PlayerControls";

/** Full-screen player for phones: opens on tap / swipe up, closes on swipe down. */
export function PlayerExpanded() {
  const track = useCurrentTrack();
  const expanded = usePlayer((state) => state.expanded);
  const error = usePlayer((state) => state.error);
  const setExpanded = usePlayer((state) => state.setExpanded);
  const setQueueOpen = usePlayer((state) => state.setQueueOpen);
  const panelRef = useRef<HTMLDivElement>(null);
  const open = expanded && track !== null;

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !usePlayer.getState().queueOpen) setExpanded(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
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
          aria-label={`Плеер: ${track.title}`}
          tabIndex={-1}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={onDragEnd}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 34, mass: 0.9 }}
          className="glass glass-strong fixed inset-0 z-[60] flex flex-col rounded-none px-6 pb-[calc(var(--safe-bottom)+24px)] pt-[calc(var(--safe-top)+10px)] outline-none"
          style={{ ["--glass-blur" as string]: "26px", ["--glass-radius" as string]: "0px" }}
        >
          <div className="mx-auto mb-2 h-1.5 w-11 flex-none rounded-full bg-white/35" aria-hidden="true" />
          <div className="flex flex-none items-center justify-between">
            <GlassSphere label="Свернуть плеер" size={42} onClick={() => setExpanded(false)}>
              <ChevronDownIcon size={20} />
            </GlassSphere>
            <Link
              href={`/releases/${track.releaseId}`}
              onClick={() => setExpanded(false)}
              className="min-w-0 truncate px-3 text-center text-sm font-medium text-mist-muted"
            >
              {track.releaseTitle}
            </Link>
            <GlassSphere label="Очередь" size={42} onClick={() => setQueueOpen(true)}>
              <QueueIcon size={18} />
            </GlassSphere>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center py-5">
            <motion.div
              key={track.id}
              initial={{ scale: 0.86, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              className="aspect-square h-full max-h-[min(100%,calc(100vw-48px))] max-w-full"
            >
              <CoverArt src={track.coverUrl} alt={`Обложка: ${track.releaseTitle}`} className="h-full w-full rounded-[32px]" depth={14} priority />
            </motion.div>
          </div>

          <div className="flex-none">
            <h2 className="truncate font-display text-2xl font-bold text-white">{track.title}</h2>
            <p className={`mt-0.5 truncate text-base ${error ? "text-rose-200" : "text-mist-muted"}`} role={error ? "alert" : undefined}>
              {error ?? "Lindone"}
            </p>

            <SeekBar className="mt-5" />

            <div className="mt-5 flex items-center justify-between">
              <ShuffleButton size={44} />
              <PreviousButton size={56} />
              <PlayButton size={76} />
              <NextButton size={56} />
              <RepeatButton size={44} />
            </div>

            <div className="mt-5 flex justify-center">
              <MuteButton size={44} />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
