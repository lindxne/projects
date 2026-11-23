"use client";

import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cx } from "@/lib/utils/format";

interface GlassProgressBarProps {
  value: number;
  max: number;
  label: string;
  /** Human-readable value for screen readers, e.g. "1:05 из 3:20". */
  valueText?: string;
  onChange: (value: number) => void;
  /** Called continuously while dragging (for live preview). */
  onScrub?: (value: number | null) => void;
  step?: number;
  /** Shows the running glare over the filled part. */
  animated?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Glass slider with a draggable thumb and a glare running along the filled part. */
export function GlassProgressBar({
  value,
  max,
  label,
  valueText,
  onChange,
  onScrub,
  step = 5,
  animated = false,
  disabled = false,
  className,
}: GlassProgressBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragValue, setDragValue] = useState<number | null>(null);

  const safeMax = max > 0 && Number.isFinite(max) ? max : 0;
  const shown = dragValue ?? Math.min(Math.max(value, 0), safeMax);
  const fraction = safeMax > 0 ? shown / safeMax : 0;

  const valueFromPointer = useCallback(
    (clientX: number): number => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return 0;
      return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1) * safeMax;
    },
    [safeMax],
  );

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || safeMax === 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = valueFromPointer(event.clientX);
    setDragValue(next);
    onScrub?.(next);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragValue === null) return;
    const next = valueFromPointer(event.clientX);
    setDragValue(next);
    onScrub?.(next);
  };

  const finishDrag = (commit: boolean) => {
    if (dragValue === null) return;
    if (commit) onChange(dragValue);
    setDragValue(null);
    onScrub?.(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || safeMax === 0) return;
    const jumps: Record<string, number> = {
      ArrowRight: value + step,
      ArrowUp: value + step,
      ArrowLeft: value - step,
      ArrowDown: value - step,
      PageUp: value + step * 4,
      PageDown: value - step * 4,
      Home: 0,
      End: safeMax,
    };
    const next = jumps[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onChange(Math.min(Math.max(next, 0), safeMax));
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(safeMax)}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={valueText}
      aria-disabled={disabled || safeMax === 0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => finishDrag(true)}
      onPointerCancel={() => finishDrag(false)}
      onKeyDown={onKeyDown}
      className={cx(
        "group relative flex h-6 cursor-pointer touch-none select-none items-center",
        (disabled || safeMax === 0) && "cursor-default opacity-60",
        className,
      )}
    >
      <div className="relative h-[7px] w-full overflow-hidden rounded-full bg-white/[0.12] shadow-[inset_0_1px_2px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.22)]">
        <div
          className="absolute inset-y-0 left-0 overflow-hidden rounded-full bg-gradient-to-r from-white/45 via-white/75 to-white/95 shadow-[0_0_10px_rgba(255,255,255,0.7)]"
          style={{ width: `${fraction * 100}%` }}
        >
          {animated ? (
            <span className="absolute inset-y-0 left-0 w-1/3 animate-sheen bg-gradient-to-r from-transparent via-[rgba(150,120,255,0.9)] to-transparent" />
          ) : null}
        </div>
      </div>
      <span
        className={cx(
          "glass-sphere pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 transition-transform duration-150",
          dragValue !== null ? "scale-125" : "scale-100 group-hover:scale-110",
        )}
        data-active="true"
        style={{ left: `${fraction * 100}%` }}
      />
    </div>
  );
}
