"use client";

import { ChevronDownIcon, ChevronUpIcon, TrashIcon } from "@/components/ui/icons";
import { formatDuration } from "@/lib/utils/format";

export interface TrackDraft {
  /** Stable React key; equals the database id for saved tracks. */
  key: string;
  /** Present when the track already exists in the database. */
  id?: string;
  title: string;
  file?: File;
  contentType?: string;
  audioUrl?: string;
  duration: number | null;
  bpm: string;
  musicalKey: string;
  /** Duration is being read from the file. */
  reading: boolean;
  error?: string;
}

interface TrackFormProps {
  draft: TrackDraft;
  index: number;
  total: number;
  disabled: boolean;
  onChange: (patch: Partial<TrackDraft>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}

export const MUSICAL_KEYS = [
  "C", "Cm", "C#", "C#m", "D", "Dm", "D#", "D#m", "E", "Em", "F", "Fm",
  "F#", "F#m", "G", "Gm", "G#", "G#m", "A", "Am", "A#", "A#m", "B", "Bm",
];

/** One track row of the release form. The track number is its position in the list. */
export function TrackForm({ draft, index, total, disabled, onChange, onMove, onRemove }: TrackFormProps) {
  const id = `track-${draft.key}`;
  const source = draft.file
    ? `${draft.file.name} · ${(draft.file.size / 1024 / 1024).toFixed(1)} МБ`
    : "Файл уже загружен";

  return (
    <li className="glass-inset rounded-3xl p-3">
      <div className="flex items-start gap-2">
        <span className="grid h-12 w-8 flex-none place-items-center text-sm font-semibold tabular-nums text-mist-muted">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-title`} className="sr-only">
            Название трека {index + 1}
          </label>
          <input
            id={`${id}-title`}
            className="glass-input"
            value={draft.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Название трека"
            maxLength={200}
            required
            disabled={disabled}
          />
          <p className="mt-1.5 truncate px-1 text-xs text-mist-muted">
            {source} · {draft.reading ? "читаю длительность…" : formatDuration(draft.duration)}
          </p>
        </div>
        <div className="flex flex-none flex-col">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={disabled || index === 0}
            aria-label={`Поднять трек ${index + 1} выше`}
            className="grid h-7 w-10 place-items-center rounded-lg text-mist-muted hover:text-white disabled:opacity-30"
          >
            <ChevronUpIcon size={16} />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={disabled || index === total - 1}
            aria-label={`Опустить трек ${index + 1} ниже`}
            className="grid h-7 w-10 place-items-center rounded-lg text-mist-muted hover:text-white disabled:opacity-30"
          >
            <ChevronDownIcon size={16} />
          </button>
        </div>
      </div>

      <div className="mt-2.5 flex items-end gap-2 pl-10">
        <div className="w-24">
          <label htmlFor={`${id}-bpm`} className="field-label !mb-1 !text-xs">
            BPM
          </label>
          <input
            id={`${id}-bpm`}
            className="glass-input !py-2.5"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft.bpm}
            onChange={(event) => onChange({ bpm: event.target.value.replace(/\D/g, "").slice(0, 3) })}
            placeholder="—"
            disabled={disabled}
          />
        </div>
        <div className="w-28">
          <label htmlFor={`${id}-key`} className="field-label !mb-1 !text-xs">
            Тональность
          </label>
          <input
            id={`${id}-key`}
            className="glass-input !py-2.5"
            list="musical-keys"
            value={draft.musicalKey}
            onChange={(event) => onChange({ musicalKey: event.target.value.slice(0, 12) })}
            placeholder="—"
            autoCapitalize="characters"
            disabled={disabled}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Удалить трек ${index + 1}${draft.title ? `: ${draft.title}` : ""}`}
          className="ml-auto grid h-11 w-11 flex-none place-items-center rounded-full text-rose-200 hover:bg-rose-500/15 disabled:opacity-40"
        >
          <TrashIcon size={18} />
        </button>
      </div>

      {draft.error ? (
        <p role="alert" className="mt-2 pl-10 text-sm text-rose-200">
          {draft.error}
        </p>
      ) : null}
    </li>
  );
}
