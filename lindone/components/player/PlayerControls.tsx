"use client";

import { GlassProgressBar } from "@/components/glass/GlassProgressBar";
import { GlassSphere } from "@/components/glass/GlassSphere";
import {
  MuteIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
  VolumeIcon,
} from "@/components/ui/icons";
import { usePlayer } from "@/lib/audio/player-store";
import { cx, formatDuration } from "@/lib/utils/format";

export function PlayButton({ size = 52 }: { size?: number }) {
  const isPlaying = usePlayer((state) => state.isPlaying);
  const isLoading = usePlayer((state) => state.isLoading);
  const disabled = usePlayer((state) => state.currentId === null);
  const toggle = usePlayer((state) => state.toggle);
  return (
    <GlassSphere
      label={isPlaying ? "Пауза" : "Играть"}
      size={size}
      active
      disabled={disabled}
      onClick={toggle}
      className={cx(isLoading && "animate-pulse")}
    >
      {isPlaying ? <PauseIcon size={size * 0.42} /> : <PlayIcon size={size * 0.42} />}
    </GlassSphere>
  );
}

export function PreviousButton({ size = 40 }: { size?: number }) {
  const disabled = usePlayer((state) => state.currentId === null);
  const previous = usePlayer((state) => state.previous);
  return (
    <GlassSphere label="Предыдущий трек" size={size} disabled={disabled} onClick={previous}>
      <PrevIcon size={size * 0.44} />
    </GlassSphere>
  );
}

export function NextButton({ size = 40 }: { size?: number }) {
  const disabled = usePlayer((state) => state.currentId === null);
  const next = usePlayer((state) => state.next);
  return (
    <GlassSphere label="Следующий трек" size={size} disabled={disabled} onClick={() => next()}>
      <NextIcon size={size * 0.44} />
    </GlassSphere>
  );
}

export function ShuffleButton({ size = 36 }: { size?: number }) {
  const shuffle = usePlayer((state) => state.shuffle);
  const toggleShuffle = usePlayer((state) => state.toggleShuffle);
  return (
    <GlassSphere
      label={shuffle ? "Перемешивание включено" : "Перемешать"}
      aria-pressed={shuffle}
      size={size}
      active={shuffle}
      onClick={toggleShuffle}
    >
      <ShuffleIcon size={size * 0.46} />
    </GlassSphere>
  );
}

const REPEAT_LABEL = {
  off: "Повтор выключен",
  all: "Повтор всей очереди",
  one: "Повтор одного трека",
} as const;

export function RepeatButton({ size = 36 }: { size?: number }) {
  const repeat = usePlayer((state) => state.repeat);
  const cycleRepeat = usePlayer((state) => state.cycleRepeat);
  return (
    <GlassSphere
      label={REPEAT_LABEL[repeat]}
      aria-pressed={repeat !== "off"}
      size={size}
      active={repeat !== "off"}
      onClick={cycleRepeat}
    >
      {repeat === "one" ? <RepeatOneIcon size={size * 0.46} /> : <RepeatIcon size={size * 0.46} />}
    </GlassSphere>
  );
}

export function MuteButton({ size = 36 }: { size?: number }) {
  const muted = usePlayer((state) => state.muted);
  const toggleMute = usePlayer((state) => state.toggleMute);
  return (
    <GlassSphere label={muted ? "Включить звук" : "Выключить звук"} aria-pressed={muted} size={size} onClick={toggleMute}>
      {muted ? <MuteIcon size={size * 0.46} /> : <VolumeIcon size={size * 0.46} />}
    </GlassSphere>
  );
}

export function VolumeSlider({ className }: { className?: string }) {
  const volume = usePlayer((state) => state.volume);
  const muted = usePlayer((state) => state.muted);
  const setVolume = usePlayer((state) => state.setVolume);
  const shown = muted ? 0 : volume;
  return (
    <GlassProgressBar
      className={className}
      label="Громкость"
      value={Math.round(shown * 100)}
      max={100}
      step={5}
      valueText={`${Math.round(shown * 100)}%`}
      onChange={(value) => setVolume(value / 100)}
      onScrub={(value) => (value === null ? undefined : setVolume(value / 100))}
    />
  );
}

/** Seek bar with the elapsed / total time. `compact` hides the times. */
export function SeekBar({ compact = false, className }: { compact?: boolean; className?: string }) {
  const currentTime = usePlayer((state) => state.currentTime);
  const duration = usePlayer((state) => state.duration);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const disabled = usePlayer((state) => state.currentId === null);
  const seek = usePlayer((state) => state.seek);

  const bar = (
    <GlassProgressBar
      className={cx("min-w-0 flex-1", compact && className)}
      label="Позиция трека"
      value={currentTime}
      max={duration}
      valueText={`${formatDuration(currentTime)} из ${formatDuration(duration)}`}
      onChange={seek}
      animated={isPlaying}
      disabled={disabled}
    />
  );
  if (compact) return bar;

  return (
    <div className={cx("flex items-center gap-3", className)}>
      <span className="w-10 text-right text-xs tabular-nums text-mist-muted">{formatDuration(currentTime)}</span>
      {bar}
      <span className="w-10 text-xs tabular-nums text-mist-muted">{formatDuration(duration)}</span>
    </div>
  );
}
