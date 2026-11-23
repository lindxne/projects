"use client";

import { useEffect, useRef, useState } from "react";
import { MuteIcon, VolumeIcon } from "@/components/ui/icons";
import { usePlayer } from "@/lib/audio/player-store";
import type { Post } from "@/lib/supabase/types";

/**
 * Feed video: nothing is downloaded until the card is on screen (poster only), then it
 * plays inline, muted and looped, and pauses again when scrolled away.
 */
export function LazyVideo({ post }: { post: Post }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          setActive(true);
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { threshold: [0, 0.6] },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    // The video's sound and the music player should not overlap.
    if (!next) usePlayer.getState().pause();
  };

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={active ? post.media_url : undefined}
        poster={post.poster_url ?? undefined}
        muted={muted}
        loop
        playsInline
        preload="none"
        onError={() => active && setFailed(true)}
        aria-label={post.caption ? `Видео: ${post.caption.slice(0, 80)}` : "Видео"}
        className="block h-auto max-h-[80dvh] w-full bg-black object-contain"
        style={{ aspectRatio: post.width && post.height ? `${post.width} / ${post.height}` : "9 / 16" }}
      />
      {failed ? (
        <p role="alert" className="scrim absolute inset-x-3 bottom-3 rounded-2xl px-3 py-2 text-sm text-rose-100">
          Видео не загрузилось. Проверь соединение и обнови страницу.
        </p>
      ) : (
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? "Включить звук видео" : "Выключить звук видео"}
          aria-pressed={!muted}
          className="scrim absolute bottom-2.5 right-2.5 grid h-11 w-11 place-items-center rounded-full text-white"
        >
          {muted ? <MuteIcon size={18} /> : <VolumeIcon size={18} />}
        </button>
      )}
    </div>
  );
}
