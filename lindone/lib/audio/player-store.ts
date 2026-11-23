"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface PlayerTrack {
  id: string;
  title: string;
  audioUrl: string;
  coverUrl: string;
  releaseId: string;
  releaseTitle: string;
  duration: number;
}

export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  queue: PlayerTrack[];
  currentId: string | null;
  isPlaying: boolean;
  /** True while the browser is fetching audio after a play request. */
  isLoading: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  muted: boolean;
  currentTime: number;
  duration: number;
  /** Position restored after a reload; applied when the track is first loaded. */
  savedTime: number;
  /** Ids already played in the current shuffle round (for "previous" and no repeats). */
  history: string[];
  error: string | null;
  queueOpen: boolean;
  expanded: boolean;

  playQueue: (tracks: PlayerTrack[], startId?: string) => void;
  playFromQueue: (id: string) => void;
  enqueue: (tracks: PlayerTrack[]) => void;
  playNext: (track: PlayerTrack) => void;
  toggle: () => void;
  pause: () => void;
  next: (auto?: boolean) => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  removeFromQueue: (id: string) => void;
  reorderQueue: (ids: string[]) => void;
  clearQueue: () => void;
  forgetTracks: (ids: string[]) => void;
  /** Keeps queued tracks in sync after their release was edited. */
  updateRelease: (releaseId: string, patch: Pick<PlayerTrack, "coverUrl" | "releaseTitle">) => void;
  setQueueOpen: (open: boolean) => void;
  setExpanded: (open: boolean) => void;
}

/** The one <audio> element of the app. It is rendered by the app layout and never unmounts. */
let audio: HTMLAudioElement | null = null;
let loadedId: string | null = null;
let retried = false;

function dedupe(tracks: PlayerTrack[]): PlayerTrack[] {
  const seen = new Set<string>();
  return tracks.filter((track) => (seen.has(track.id) ? false : (seen.add(track.id), true)));
}

function describeMediaError(code: number | undefined): string {
  switch (code) {
    case 2:
      return "Сеть оборвалась во время воспроизведения. Проверь соединение и нажми play ещё раз.";
    case 3:
      return "Файл повреждён или не декодируется этим браузером.";
    case 4:
      return "Аудио недоступно: файл удалён, сессия истекла или формат не поддерживается.";
    default:
      return "Не получилось воспроизвести трек.";
  }
}

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => {
      /** Loads (if needed) and starts the track. Must run inside the user's tap for iOS. */
      const start = (track: PlayerTrack, fromTime = 0) => {
        set({ currentId: track.id, error: null, isLoading: true, duration: track.duration, currentTime: fromTime });
        if (!audio) return;
        if (loadedId !== track.id) {
          loadedId = track.id;
          retried = false;
          audio.src = track.audioUrl;
          if (fromTime > 0) {
            const target = fromTime;
            audio.addEventListener(
              "loadedmetadata",
              () => {
                if (audio && loadedId === track.id) audio.currentTime = target;
              },
              { once: true },
            );
          }
        } else if (fromTime === 0) {
          audio.currentTime = 0;
        }
        audio.play().catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          if (error instanceof DOMException && error.name === "NotAllowedError") {
            set({ isPlaying: false, isLoading: false, error: "Браузер запретил автозапуск — нажми play." });
            return;
          }
          // Anything else is reported by the element's `error` event.
          set({ isPlaying: false, isLoading: false });
        });
      };

      const current = () => {
        const { queue, currentId } = get();
        return queue.find((track) => track.id === currentId) ?? null;
      };

      return {
        queue: [],
        currentId: null,
        isPlaying: false,
        isLoading: false,
        shuffle: false,
        repeat: "off",
        volume: 1,
        muted: false,
        currentTime: 0,
        duration: 0,
        savedTime: 0,
        history: [],
        error: null,
        queueOpen: false,
        expanded: false,

        playQueue: (tracks, startId) => {
          const queue = dedupe(tracks);
          const first = queue.find((track) => track.id === startId) ?? queue[0];
          if (!first) return;
          set({ queue, history: [], savedTime: 0 });
          start(first);
        },

        playFromQueue: (id) => {
          const track = get().queue.find((item) => item.id === id);
          if (!track) return;
          const { currentId, history } = get();
          set({ history: currentId ? [...history, currentId] : history, savedTime: 0 });
          start(track);
        },

        enqueue: (tracks) => {
          const { queue, currentId } = get();
          const known = new Set(queue.map((track) => track.id));
          const added = dedupe(tracks).filter((track) => !known.has(track.id));
          if (added.length === 0) return;
          set({ queue: [...queue, ...added] });
          const first = added[0];
          if (!currentId && first) set({ currentId: first.id, duration: first.duration, currentTime: 0 });
        },

        playNext: (track) => {
          const { queue, currentId } = get();
          if (track.id === currentId) return;
          const rest = queue.filter((item) => item.id !== track.id);
          const index = rest.findIndex((item) => item.id === currentId);
          const next = [...rest.slice(0, index + 1), track, ...rest.slice(index + 1)];
          set({ queue: next });
          if (!currentId) set({ currentId: track.id, duration: track.duration, currentTime: 0 });
        },

        toggle: () => {
          const track = current();
          if (!track) return;
          if (audio && !audio.paused && loadedId === track.id) {
            audio.pause();
            return;
          }
          const { savedTime } = get();
          if (loadedId === track.id && audio) {
            set({ error: null });
            void audio.play().catch(() => set({ isPlaying: false, isLoading: false }));
            return;
          }
          set({ savedTime: 0 });
          start(track, savedTime > 0 && savedTime < track.duration - 2 ? savedTime : 0);
        },

        pause: () => audio?.pause(),

        next: (auto = false) => {
          const { queue, currentId, shuffle, repeat, history } = get();
          const track = current();
          if (queue.length === 0) return;

          if (auto && repeat === "one" && track) {
            start(track);
            return;
          }

          let target: PlayerTrack | undefined;
          let nextHistory = currentId ? [...history, currentId] : history;

          if (shuffle) {
            const played = new Set(nextHistory);
            let pool = queue.filter((item) => !played.has(item.id));
            if (pool.length === 0 && (repeat === "all" || !auto)) {
              nextHistory = currentId ? [currentId] : [];
              pool = queue.filter((item) => item.id !== currentId);
              if (pool.length === 0) pool = queue;
            }
            target = pool[Math.floor(Math.random() * pool.length)];
          } else {
            const index = queue.findIndex((item) => item.id === currentId);
            target = queue[index + 1];
            if (!target && (repeat === "all" || !auto)) target = queue[0];
          }

          if (!target) {
            // End of the queue: stop on the last track, rewound.
            audio?.pause();
            if (audio) audio.currentTime = 0;
            set({ isPlaying: false, isLoading: false, currentTime: 0, history: [] });
            return;
          }
          set({ history: nextHistory.slice(-200), savedTime: 0 });
          start(target);
        },

        previous: () => {
          const { queue, currentId, shuffle, history, repeat } = get();
          const track = current();
          if (!track) return;
          if (audio && loadedId === track.id && audio.currentTime > 3) {
            audio.currentTime = 0;
            set({ currentTime: 0 });
            return;
          }
          let target: PlayerTrack | undefined;
          if (shuffle) {
            const trail = [...history];
            while (trail.length > 0 && !target) {
              const id = trail.pop();
              target = queue.find((item) => item.id === id && id !== currentId);
            }
            set({ history: trail });
          } else {
            const index = queue.findIndex((item) => item.id === currentId);
            target = queue[index - 1];
            if (!target && repeat === "all") target = queue[queue.length - 1];
          }
          set({ savedTime: 0 });
          start(target ?? track);
        },

        seek: (seconds) => {
          const track = current();
          if (!track) return;
          const limit = get().duration || track.duration;
          const time = Math.min(Math.max(seconds, 0), Math.max(limit - 0.25, 0));
          if (audio && loadedId === track.id) {
            audio.currentTime = time;
            set({ currentTime: time });
          } else {
            set({ currentTime: time, savedTime: time });
          }
        },

        setVolume: (volume) => {
          const value = Math.min(Math.max(volume, 0), 1);
          if (audio) {
            audio.volume = value;
            audio.muted = value === 0;
          }
          set({ volume: value, muted: value === 0 });
        },

        toggleMute: () => {
          const muted = !get().muted;
          if (audio) audio.muted = muted;
          set({ muted, volume: !muted && get().volume === 0 ? 0.6 : get().volume });
          if (audio && !muted) audio.volume = get().volume;
        },

        toggleShuffle: () => set({ shuffle: !get().shuffle, history: [] }),

        cycleRepeat: () => {
          const order: RepeatMode[] = ["off", "all", "one"];
          const index = order.indexOf(get().repeat);
          set({ repeat: order[(index + 1) % order.length] ?? "off" });
        },

        removeFromQueue: (id) => {
          const { queue, currentId, isPlaying } = get();
          const index = queue.findIndex((track) => track.id === id);
          if (index === -1) return;
          const rest = queue.filter((track) => track.id !== id);
          if (id !== currentId) {
            set({ queue: rest, history: get().history.filter((item) => item !== id) });
            return;
          }
          const replacement = rest[index] ?? rest[0];
          set({ queue: rest, history: get().history.filter((item) => item !== id) });
          if (!replacement) {
            get().clearQueue();
          } else if (isPlaying) {
            start(replacement);
          } else {
            audio?.pause();
            set({ currentId: replacement.id, currentTime: 0, duration: replacement.duration, savedTime: 0 });
          }
        },

        reorderQueue: (ids) => {
          const byId = new Map(get().queue.map((track) => [track.id, track]));
          const ordered = ids.flatMap((id) => {
            const track = byId.get(id);
            return track ? [track] : [];
          });
          if (ordered.length === byId.size) set({ queue: ordered });
        },

        clearQueue: () => {
          if (audio) {
            audio.pause();
            audio.removeAttribute("src");
            audio.load();
          }
          loadedId = null;
          set({
            queue: [],
            currentId: null,
            isPlaying: false,
            isLoading: false,
            currentTime: 0,
            duration: 0,
            savedTime: 0,
            history: [],
            error: null,
            expanded: false,
            queueOpen: false,
          });
        },

        forgetTracks: (ids) => {
          for (const id of ids) get().removeFromQueue(id);
        },

        updateRelease: (releaseId, patch) => {
          const { queue } = get();
          if (queue.some((track) => track.releaseId === releaseId)) {
            set({ queue: queue.map((track) => (track.releaseId === releaseId ? { ...track, ...patch } : track)) });
          }
        },

        setQueueOpen: (queueOpen) => set({ queueOpen }),
        setExpanded: (expanded) => set({ expanded }),
      };
    },
    {
      name: "lindone-player",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        queue: state.queue,
        currentId: state.currentId,
        shuffle: state.shuffle,
        repeat: state.repeat,
        volume: state.volume,
        muted: state.muted,
        savedTime: state.savedTime,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const track = state.queue.find((item) => item.id === state.currentId);
        usePlayer.setState({
          currentId: track ? state.currentId : null,
          currentTime: track ? state.savedTime : 0,
          duration: track?.duration ?? 0,
        });
      },
    },
  ),
);

/** Connects the layout's <audio> element to the store. Returns the cleanup function. */
export function attachAudio(element: HTMLAudioElement): () => void {
  audio = element;
  loadedId = null;
  const { volume, muted } = usePlayer.getState();
  element.volume = volume;
  element.muted = muted;

  let lastSaved = 0;
  const set = usePlayer.setState;

  const handlers: Array<[keyof HTMLMediaElementEventMap, () => void]> = [
    ["play", () => set({ isPlaying: true })],
    ["playing", () => set({ isPlaying: true, isLoading: false, error: null })],
    ["waiting", () => set({ isLoading: true })],
    ["canplay", () => set({ isLoading: false })],
    ["pause", () => set({ isPlaying: false, isLoading: false, savedTime: element.currentTime })],
    [
      "timeupdate",
      () => {
        const time = element.currentTime;
        if (Math.abs(time - lastSaved) >= 5) {
          lastSaved = time;
          set({ currentTime: time, savedTime: time });
        } else {
          set({ currentTime: time });
        }
      },
    ],
    [
      "durationchange",
      () => {
        if (Number.isFinite(element.duration) && element.duration > 0) set({ duration: element.duration });
      },
    ],
    ["ended", () => usePlayer.getState().next(true)],
    [
      "error",
      () => {
        if (!element.getAttribute("src")) return;
        const state = usePlayer.getState();
        const track = state.queue.find((item) => item.id === state.currentId);
        // The signed URL behind /media may have expired: ask for a fresh one once.
        if (track && !retried && element.error?.code !== 3) {
          retried = true;
          const resumeAt = state.currentTime;
          element.src = `${track.audioUrl}?retry=${Date.now()}`;
          element.addEventListener(
            "loadedmetadata",
            () => {
              if (resumeAt > 0) element.currentTime = resumeAt;
            },
            { once: true },
          );
          void element.play().catch(() => undefined);
          return;
        }
        loadedId = null;
        set({ isPlaying: false, isLoading: false, error: describeMediaError(element.error?.code) });
      },
    ],
  ];

  for (const [name, handler] of handlers) element.addEventListener(name, handler);
  return () => {
    for (const [name, handler] of handlers) element.removeEventListener(name, handler);
    if (audio === element) audio = null;
  };
}

export function useCurrentTrack(): PlayerTrack | null {
  return usePlayer((state) => state.queue.find((track) => track.id === state.currentId) ?? null);
}
