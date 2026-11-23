"use client";

import { Reorder, useDragControls } from "framer-motion";
import type { KeyboardEvent } from "react";
import { GlassButton } from "@/components/glass/GlassButton";
import { GlassModal } from "@/components/glass/GlassModal";
import { CloseIcon, GripIcon } from "@/components/ui/icons";
import { usePlayer, type PlayerTrack } from "@/lib/audio/player-store";
import { cx, formatDuration, pluralRu } from "@/lib/utils/format";

function QueueRow({ track, index, total }: { track: PlayerTrack; index: number; total: number }) {
  const controls = useDragControls();
  const isCurrent = usePlayer((state) => state.currentId === track.id);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const playFromQueue = usePlayer((state) => state.playFromQueue);
  const removeFromQueue = usePlayer((state) => state.removeFromQueue);
  const reorderQueue = usePlayer((state) => state.reorderQueue);

  const move = (delta: number) => {
    const ids = usePlayer.getState().queue.map((item) => item.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    ids.splice(index, 1);
    ids.splice(target, 0, track.id);
    reorderQueue(ids);
  };

  const onHandleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    }
  };

  return (
    <Reorder.Item
      value={track.id}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.03, boxShadow: "0 18px 40px -16px rgba(0,0,0,0.9)" }}
      className={cx(
        "flex items-center gap-1 rounded-2xl border px-1.5 py-1",
        isCurrent ? "border-white/40 bg-white/15" : "border-transparent bg-black/25",
      )}
    >
      <button
        type="button"
        aria-label={`Переместить «${track.title}» (позиция ${index + 1} из ${total}): тяни или стрелки вверх/вниз`}
        onPointerDown={(event) => controls.start(event)}
        onKeyDown={onHandleKeyDown}
        className="grid h-11 w-9 flex-none cursor-grab touch-none place-items-center rounded-xl text-mist-faint active:cursor-grabbing"
      >
        <GripIcon size={18} />
      </button>
      <button
        type="button"
        onClick={() => playFromQueue(track.id)}
        aria-current={isCurrent ? "true" : undefined}
        className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 rounded-xl px-1 text-left"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- private media behind a signed redirect */}
        <img src={track.coverUrl} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 flex-none rounded-lg object-cover" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{track.title}</span>
          <span className="block truncate text-xs text-mist-muted">
            {isCurrent ? (isPlaying ? "Сейчас играет" : "На паузе") : track.releaseTitle}
          </span>
        </span>
        <span className="flex-none text-xs tabular-nums text-mist-muted">{formatDuration(track.duration)}</span>
      </button>
      <button
        type="button"
        aria-label={`Убрать «${track.title}» из очереди`}
        onClick={() => removeFromQueue(track.id)}
        className="grid h-11 w-10 flex-none place-items-center rounded-xl text-mist-muted hover:bg-white/10 hover:text-white"
      >
        <CloseIcon size={16} />
      </button>
    </Reorder.Item>
  );
}

/** Glass queue sheet: reorder by dragging the handle, tap to play, remove. */
export function QueueModal() {
  const open = usePlayer((state) => state.queueOpen);
  const queue = usePlayer((state) => state.queue);
  const setQueueOpen = usePlayer((state) => state.setQueueOpen);
  const reorderQueue = usePlayer((state) => state.reorderQueue);
  const clearQueue = usePlayer((state) => state.clearQueue);

  return (
    <GlassModal open={open} onClose={() => setQueueOpen(false)} title="Очередь">
      <div className="px-3 pb-4">
        {queue.length === 0 ? (
          <p className="px-2 py-10 text-center text-mist-muted">
            Очередь пуста. Нажми play на релизе или добавь трек кнопкой «в очередь».
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between px-2 pb-2">
              <p className="text-sm text-mist-muted">
                {queue.length} {pluralRu(queue.length, "трек", "трека", "треков")}
              </p>
              <GlassButton variant="ghost" className="!min-h-[36px] !px-3.5 text-xs" onClick={clearQueue}>
                Очистить
              </GlassButton>
            </div>
            <Reorder.Group
              axis="y"
              values={queue.map((track) => track.id)}
              onReorder={reorderQueue}
              className="flex flex-col gap-1.5"
              aria-label="Треки в очереди"
            >
              {queue.map((track, index) => (
                <QueueRow key={track.id} track={track} index={index} total={queue.length} />
              ))}
            </Reorder.Group>
          </>
        )}
      </div>
    </GlassModal>
  );
}
