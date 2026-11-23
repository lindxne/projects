"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PostLink {
  releaseId: string | null;
  trackId: string | null;
}

interface Option {
  id: string;
  title: string;
  tracks: Array<{ id: string; title: string }>;
}

interface LinkPickerProps {
  value: PostLink;
  onChange: (value: PostLink) => void;
  disabled?: boolean;
}

/** Optional link from a post to a release and, more precisely, to one of its tracks. */
export function LinkPicker({ value, onChange, disabled }: LinkPickerProps) {
  const [options, setOptions] = useState<Option[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void createClient()
      .from("releases")
      .select("id,title,tracks(id,title,track_number)")
      .order("release_date", { ascending: false, nullsFirst: false })
      .order("track_number", { referencedTable: "tracks", ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setFailed(true);
        else setOptions(data.map((release) => ({ id: release.id, title: release.title, tracks: release.tracks })));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const release = options.find((option) => option.id === value.releaseId);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor="link-release" className="field-label">
          Релиз <span className="text-mist-faint">· необязательно</span>
        </label>
        <select
          id="link-release"
          className="glass-input [color-scheme:dark]"
          value={value.releaseId ?? ""}
          onChange={(event) => onChange({ releaseId: event.target.value || null, trackId: null })}
          disabled={disabled || options.length === 0}
        >
          <option value="">{failed ? "Не удалось загрузить релизы" : options.length === 0 ? "Релизов пока нет" : "Без привязки"}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="link-track" className="field-label">
          Трек <span className="text-mist-faint">· необязательно</span>
        </label>
        <select
          id="link-track"
          className="glass-input [color-scheme:dark]"
          value={value.trackId ?? ""}
          onChange={(event) => onChange({ releaseId: value.releaseId, trackId: event.target.value || null })}
          disabled={disabled || !release || release.tracks.length === 0}
        >
          <option value="">{release ? "Весь релиз" : "Сначала выбери релиз"}</option>
          {release?.tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
