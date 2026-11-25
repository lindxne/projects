"use client";

import { useEffect, useRef } from "react";
import { attachAudio, useCurrentTrack, usePlayer } from "@/lib/audio/player-store";

/**
 * Owns the single <audio> element. It is mounted by the app layout, which Next.js keeps
 * alive across navigations — so the music never stops when the page changes.
 */
export function PlayerProvider() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const track = useCurrentTrack();
  const isPlaying = usePlayer((state) => state.isPlaying);

  useEffect(() => {
    void usePlayer.persist.rehydrate();
    const element = audioRef.current;
    if (!element) return;
    return attachAudio(element);
  }, []);

  // Lock screen / headset / keyboard media keys.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (!track) {
      navigator.mediaSession.metadata = null;
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: "Lindone",
      album: track.releaseTitle,
      artwork: [{ src: track.coverUrl, sizes: "1000x1000", type: "image/webp" }],
    });
  }, [track]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const player = () => usePlayer.getState();
    const actions: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ["play", () => player().toggle()],
      ["pause", () => player().pause()],
      ["nexttrack", () => player().next()],
      ["previoustrack", () => player().previous()],
      ["seekto", (details) => (details.seekTime !== undefined ? player().seek(details.seekTime) : undefined)],
    ];
    for (const [action, handler] of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // The browser does not support this action.
      }
    }
    return () => {
      for (const [action] of actions) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Nothing to clean up.
        }
      }
    };
  }, []);

  // Space toggles playback when focus is not in a control.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input,textarea,select,button,a,[role='slider'],[contenteditable='true']")) {
        return;
      }
      if (!usePlayer.getState().currentId) return;
      event.preventDefault();
      usePlayer.getState().toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return <audio ref={audioRef} preload="metadata" playsInline className="hidden" />;
}
