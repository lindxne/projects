import type { PlayerTrack } from "@/lib/audio/player-store";
import type { Release, Track } from "@/lib/supabase/types";

export function toPlayerTrack(track: Track, release: Pick<Release, "id" | "title" | "cover_url">): PlayerTrack {
  return {
    id: track.id,
    title: track.title,
    audioUrl: track.audio_url,
    coverUrl: release.cover_url,
    releaseId: release.id,
    releaseTitle: release.title,
    duration: track.duration_sec ?? 0,
  };
}
