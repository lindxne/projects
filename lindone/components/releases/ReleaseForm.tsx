"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { GlassButton, GlassLink } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassModal } from "@/components/glass/GlassModal";
import { PlusIcon, TrashIcon, UploadIcon } from "@/components/ui/icons";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { readAudioDuration } from "@/lib/audio/duration";
import { AUDIO_ACCEPT, audioContentType, titleFromFileName } from "@/lib/audio/formats";
import { usePlayer } from "@/lib/audio/player-store";
import { resizeToSquare, type ResizedImage } from "@/lib/image/resize";
import { createClient } from "@/lib/supabase/client";
import { MAX_UPLOAD_MB, assertUploadSize, removeMedia, uploadFile } from "@/lib/supabase/storage";
import {
  RELEASE_TYPES,
  RELEASE_TYPE_LABEL,
  STREAMING_LABEL,
  STREAMING_SERVICES,
  type Release,
  type ReleaseLinks,
  type ReleaseType,
  type StreamingService,
  type Track,
} from "@/lib/supabase/types";
import { SaveError, describeDbError, describeError } from "@/lib/utils/errors";
import { cx } from "@/lib/utils/format";
import { MUSICAL_KEYS, TrackForm, type TrackDraft } from "./TrackForm";

interface ReleaseFormProps {
  /** Edit mode when present. */
  release?: Release;
  tracks?: Track[];
}

interface Progress {
  label: string;
  fraction: number | null;
}

const LINK_PLACEHOLDER: Record<StreamingService, string> = {
  spotify: "https://open.spotify.com/album/…",
  apple: "https://music.apple.com/…",
  youtube: "https://youtu.be/…",
  bandcamp: "https://….bandcamp.com/album/…",
};

function toDraft(track: Track): TrackDraft {
  return {
    key: track.id,
    id: track.id,
    title: track.title,
    audioUrl: track.audio_url,
    duration: track.duration_sec,
    bpm: track.bpm ? String(track.bpm) : "",
    musicalKey: track.musical_key ?? "",
    reading: false,
  };
}

function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
}

export function ReleaseForm({ release, tracks = [] }: ReleaseFormProps) {
  const router = useRouter();
  const editing = release !== undefined;

  const [type, setType] = useState<ReleaseType>(release?.type ?? "single");
  const [title, setTitle] = useState(release?.title ?? "");
  const [releaseDate, setReleaseDate] = useState(release?.release_date ?? "");
  const [description, setDescription] = useState(release?.description ?? "");
  const [links, setLinks] = useState<Record<StreamingService, string>>({
    spotify: release?.links.spotify ?? "",
    apple: release?.links.apple ?? "",
    youtube: release?.links.youtube ?? "",
    bandcamp: release?.links.bandcamp ?? "",
  });
  const [cover, setCover] = useState<ResizedImage | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(release?.cover_url ?? null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<TrackDraft[]>(() => tracks.map(toDraft));
  const [dragOver, setDragOver] = useState<"cover" | "audio" | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const coverInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);
  /** What the database references right now; diverges from the props after a partly failed save. */
  const savedCover = useRef(release?.cover_url ?? null);
  const savedTracks = useRef(tracks.map((track) => ({ id: track.id, audio_url: track.audio_url })));
  const busy = progress !== null || deleting;

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  const pickCover = async (file: File | undefined) => {
    if (!file) return;
    setCoverError(null);
    if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif|avif)$/i.test(file.name)) {
      setCoverError("Это не изображение. Нужен JPEG, PNG или WebP.");
      return;
    }
    setCoverBusy(true);
    try {
      const resized = await resizeToSquare(file, 1000);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(resized.blob);
      setCover(resized);
      setCoverPreview(objectUrl.current);
    } catch (caught) {
      setCoverError(describeError(caught));
    } finally {
      setCoverBusy(false);
    }
  };

  const patchDraft = (key: string, patch: Partial<TrackDraft>) =>
    setDrafts((current) => current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)));

  const addAudio = (files: FileList | File[] | null) => {
    if (!files) return;
    setError(null);
    const added: TrackDraft[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      const contentType = audioContentType(file);
      if (!contentType) {
        rejected.push(`«${file.name}» — формат не поддерживается (нужен MP3, M4A, WAV, FLAC или OGG)`);
        continue;
      }
      if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        rejected.push(`«${file.name}» — ${(file.size / 1024 / 1024).toFixed(1)} МБ, лимит ${MAX_UPLOAD_MB} МБ`);
        continue;
      }
      added.push({
        key: crypto.randomUUID(),
        title: titleFromFileName(file.name),
        file,
        contentType,
        duration: null,
        bpm: "",
        musicalKey: "",
        reading: true,
      });
    }
    if (rejected.length > 0) setError(`Не добавлено: ${rejected.join("; ")}.`);
    if (added.length === 0) return;
    setDrafts((current) => [...current, ...added]);
    // A single track dropped into an empty form names the release.
    if (!title.trim() && added.length === 1 && added[0]) setTitle(added[0].title);

    for (const draft of added) {
      if (!draft.file) continue;
      readAudioDuration(draft.file)
        .then((duration) => patchDraft(draft.key, { duration, reading: false }))
        .catch(() =>
          patchDraft(draft.key, {
            reading: false,
            error: "Не удалось прочитать файл: он повреждён или браузер не знает этот кодек.",
          }),
        );
    }
  };

  const moveDraft = (index: number, delta: number) =>
    setDrafts((current) => {
      const target = index + delta;
      const item = current[index];
      if (!item || target < 0 || target >= current.length) return current;
      const next = [...current];
      next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });

  const onDrop = (zone: "cover" | "audio") => (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragOver(null);
    if (busy) return;
    if (zone === "cover") void pickCover(event.dataTransfer.files[0]);
    else addAudio(event.dataTransfer.files);
  };

  const validate = (): { cleanLinks: ReleaseLinks } | string => {
    if (!title.trim()) return "Укажи название релиза.";
    if (!cover && !release?.cover_url) return "Добавь обложку — она обязательна.";
    if (coverBusy) return "Обложка ещё обрабатывается — подожди секунду.";
    const cleanLinks: ReleaseLinks = {};
    for (const service of STREAMING_SERVICES) {
      const url = normalizeUrl(links[service]);
      if (url === null) return `Ссылка ${STREAMING_LABEL[service]} не похожа на адрес сайта.`;
      if (url) cleanLinks[service] = url;
    }
    for (const [index, draft] of drafts.entries()) {
      if (!draft.title.trim()) return `Трек ${index + 1}: укажи название.`;
      if (draft.reading) return `Трек ${index + 1}: ещё читаю длительность — подожди секунду.`;
      if (draft.error) return `Трек ${index + 1}: ${draft.error} Удали его или выбери другой файл.`;
      if (draft.bpm && (Number(draft.bpm) < 20 || Number(draft.bpm) > 400)) {
        return `Трек ${index + 1}: BPM должен быть от 20 до 400.`;
      }
    }
    return { cleanLinks };
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const checked = validate();
    if (typeof checked === "string") {
      setError(checked);
      return;
    }
    setError(null);

    const supabase = createClient();
    // Files uploaded in this attempt that no saved row references yet (removed if the save fails).
    let uploaded: string[] = [];
    let createdReleaseId: string | null = null;
    const newDrafts = drafts.filter((draft) => draft.file);
    const totalBytes = (cover?.blob.size ?? 0) + newDrafts.reduce((sum, draft) => sum + (draft.file?.size ?? 0), 0);
    let doneBytes = 0;
    const report = (label: string, size: number) => (fraction: number) =>
      setProgress({ label, fraction: totalBytes > 0 ? (doneBytes + size * fraction) / totalBytes : null });

    try {
      let coverUrl = savedCover.current ?? "";
      if (cover) {
        assertUploadSize(cover.blob, "Обложка", 5);
        setProgress({ label: "Загружаю обложку…", fraction: 0 });
        coverUrl = await uploadFile({
          bucket: "covers",
          file: cover.blob,
          contentType: cover.contentType,
          onProgress: report("Загружаю обложку…", cover.blob.size),
        });
        uploaded.push(coverUrl);
        doneBytes += cover.blob.size;
      }

      const audioUrls = new Map<string, string>();
      for (const [index, draft] of newDrafts.entries()) {
        if (!draft.file || !draft.contentType) continue;
        const label = `Загружаю трек ${index + 1} из ${newDrafts.length}: ${draft.title}`;
        setProgress({ label, fraction: totalBytes > 0 ? doneBytes / totalBytes : null });
        assertUploadSize(draft.file, `Трек «${draft.title}»`);
        const url = await uploadFile({
          bucket: "audio",
          file: draft.file,
          contentType: draft.contentType,
          fallbackExtension: draft.file.name.split(".").pop()?.toLowerCase() ?? "bin",
          onProgress: report(label, draft.file.size),
        });
        uploaded.push(url);
        audioUrls.set(draft.key, url);
        doneBytes += draft.file.size;
      }

      setProgress({ label: "Сохраняю…", fraction: null });
      const fields = {
        type,
        title: title.trim(),
        cover_url: coverUrl,
        description: description.trim() || null,
        release_date: releaseDate || null,
        links: checked.cleanLinks,
      };

      let releaseId: string;
      if (release) {
        const { error: updateError } = await supabase.from("releases").update(fields).eq("id", release.id);
        if (updateError) throw new SaveError(describeDbError(updateError));
        releaseId = release.id;
        if (cover) {
          // The release now points at the new cover: it is no longer ours to roll back.
          uploaded = uploaded.filter((url) => url !== coverUrl);
          const previousCover = savedCover.current;
          savedCover.current = coverUrl;
          setCover(null);
          if (previousCover && previousCover !== coverUrl) void removeMedia([previousCover]).catch(() => undefined);
        }
        usePlayer.getState().updateRelease(release.id, { coverUrl, releaseTitle: fields.title });
      } else {
        const { data, error: insertError } = await supabase.from("releases").insert(fields).select("id").single();
        if (insertError) throw new SaveError(describeDbError(insertError));
        releaseId = data.id;
        createdReleaseId = data.id;
      }

      const rows = drafts.map((draft, index) => ({
        id: draft.id ?? crypto.randomUUID(),
        release_id: releaseId,
        title: draft.title.trim(),
        audio_url: audioUrls.get(draft.key) ?? draft.audioUrl ?? "",
        duration_sec: draft.duration,
        track_number: index + 1,
        bpm: draft.bpm ? Number(draft.bpm) : null,
        musical_key: draft.musicalKey.trim() || null,
      }));
      if (rows.length > 0) {
        const { error: tracksError } = await supabase.from("tracks").upsert(rows);
        if (tracksError) throw new SaveError(describeDbError(tracksError));
      }
      if (editing) {
        // Tracks are saved: a retry must reuse these rows instead of uploading the files again.
        uploaded = [];
        setDrafts((current) =>
          current.map((draft) => {
            const row = rows.find((_, index) => drafts[index]?.key === draft.key);
            return row ? { ...draft, id: row.id, audioUrl: row.audio_url, file: undefined } : draft;
          }),
        );
      }

      // Everything is saved: now drop what is no longer referenced.
      const keptIds = new Set(rows.map((row) => row.id));
      const removed = savedTracks.current.filter((track) => !keptIds.has(track.id));
      if (removed.length > 0) {
        const { error: deleteError } = await supabase
          .from("tracks")
          .delete()
          .in(
            "id",
            removed.map((track) => track.id),
          );
        if (deleteError) throw new SaveError(describeDbError(deleteError));
        usePlayer.getState().forgetTracks(removed.map((track) => track.id));
      }
      savedTracks.current = rows.map((row) => ({ id: row.id, audio_url: row.audio_url }));
      void removeMedia(removed.map((track) => track.audio_url)).catch(() => undefined);

      router.push(`/releases/${releaseId}`);
      router.refresh();
    } catch (caught) {
      // Roll back so a failed save leaves no orphaned files or half-created release.
      void removeMedia(uploaded).catch(() => undefined);
      if (createdReleaseId) await supabase.from("releases").delete().eq("id", createdReleaseId);
      setError(describeError(caught));
      setProgress(null);
    }
  };

  const onDelete = async () => {
    if (!release) return;
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("releases").delete().eq("id", release.id);
    if (deleteError) {
      setError(describeDbError(deleteError));
      setDeleting(false);
      setConfirmDelete(false);
      return;
    }
    usePlayer.getState().forgetTracks(tracks.map((track) => track.id));
    await removeMedia([release.cover_url, ...tracks.map((track) => track.audio_url)]).catch(() => undefined);
    router.push("/");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto grid max-w-4xl gap-4 md:grid-cols-[300px_minmax(0,1fr)] md:gap-5">
      <GlassCard variant="panel" className="h-fit p-4 md:sticky md:top-24">
        <span className="field-label" id="cover-label">
          Обложка <span className="text-mist-faint">· квадрат, сожмётся до 1000×1000</span>
        </span>
        <button
          type="button"
          aria-labelledby="cover-label"
          aria-describedby={coverError ? "cover-error" : undefined}
          onClick={() => coverInput.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver("cover");
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={onDrop("cover")}
          disabled={busy}
          className={cx(
            "relative grid aspect-square w-full place-items-center overflow-hidden rounded-3xl border-2 border-dashed bg-black/35 transition-colors",
            dragOver === "cover" ? "border-white bg-white/10" : coverPreview ? "border-transparent" : "border-white/25",
          )}
        >
          {coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview / private media
            <img src={coverPreview} alt="Предпросмотр обложки" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2 px-4 text-center text-mist-muted">
              <UploadIcon size={28} />
              <span className="text-sm">{coverBusy ? "Обрабатываю…" : "Нажми или перетащи картинку"}</span>
            </span>
          )}
          {coverPreview ? (
            <span className="scrim absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white">
              {coverBusy ? "Обрабатываю…" : "Заменить"}
            </span>
          ) : null}
        </button>
        <input
          ref={coverInput}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            void pickCover(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        {coverError ? (
          <p id="cover-error" role="alert" className="mt-2 text-sm text-rose-200">
            {coverError}
          </p>
        ) : null}
      </GlassCard>

      <div className="grid gap-4">
        <GlassCard variant="panel" className="grid gap-4 p-4 md:p-5">
          <fieldset>
            <legend className="field-label">Тип релиза</legend>
            <div className="flex flex-wrap gap-2">
              {RELEASE_TYPES.map((option) => (
                <label key={option} className="chip cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-white" data-active={type === option}>
                  <input
                    type="radio"
                    name="type"
                    value={option}
                    checked={type === option}
                    onChange={() => setType(option)}
                    disabled={busy}
                    className="sr-only"
                  />
                  {RELEASE_TYPE_LABEL[option]}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="release-title" className="field-label">
              Название
            </label>
            <input
              id="release-title"
              className="glass-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
              disabled={busy}
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="release-date" className="field-label">
              Дата выхода
            </label>
            <input
              id="release-date"
              type="date"
              className="glass-input [color-scheme:dark]"
              value={releaseDate}
              onChange={(event) => setReleaseDate(event.target.value)}
              disabled={busy}
            />
          </div>

          <div>
            <label htmlFor="release-description" className="field-label">
              Описание <span className="text-mist-faint">· необязательно</span>
            </label>
            <textarea
              id="release-description"
              className="glass-input min-h-[96px] resize-y"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={4000}
              disabled={busy}
            />
          </div>
        </GlassCard>

        <GlassCard variant="panel" className="p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">Треки</h2>
            <GlassButton onClick={() => audioInput.current?.click()} disabled={busy} className="!min-h-[40px] !px-4">
              <PlusIcon size={16} /> Аудио
            </GlassButton>
          </div>
          <input
            ref={audioInput}
            type="file"
            accept={AUDIO_ACCEPT}
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              addAudio(event.target.files);
              event.target.value = "";
            }}
          />
          <datalist id="musical-keys">
            {MUSICAL_KEYS.map((key) => (
              <option key={key} value={key} />
            ))}
          </datalist>

          {drafts.length > 0 ? (
            <ol className="mt-3 grid gap-2.5">
              {drafts.map((draft, index) => (
                <TrackForm
                  key={draft.key}
                  draft={draft}
                  index={index}
                  total={drafts.length}
                  disabled={busy}
                  onChange={(patch) => patchDraft(draft.key, patch)}
                  onMove={(delta) => moveDraft(index, delta)}
                  onRemove={() => setDrafts((current) => current.filter((item) => item.key !== draft.key))}
                />
              ))}
            </ol>
          ) : null}

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver("audio");
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={onDrop("audio")}
            className={cx(
              "mt-3 rounded-3xl border-2 border-dashed px-4 py-6 text-center text-sm text-mist-muted transition-colors",
              dragOver === "audio" ? "border-white bg-white/10" : "border-white/20",
            )}
          >
            Перетащи сюда аудио или нажми «Аудио». MP3, M4A, WAV, FLAC, OGG — до {MAX_UPLOAD_MB} МБ на файл.
            Длительность прочитается сама.
          </div>
        </GlassCard>

        <GlassCard variant="panel" className="grid gap-3.5 p-4 md:p-5">
          <h2 className="text-lg font-bold text-white">
            Ссылки <span className="text-sm font-medium text-mist-faint">· необязательно</span>
          </h2>
          {STREAMING_SERVICES.map((service) => (
            <div key={service}>
              <label htmlFor={`link-${service}`} className="field-label">
                {STREAMING_LABEL[service]}
              </label>
              <input
                id={`link-${service}`}
                type="url"
                inputMode="url"
                className="glass-input"
                value={links[service]}
                onChange={(event) => setLinks((current) => ({ ...current, [service]: event.target.value }))}
                placeholder={LINK_PLACEHOLDER[service]}
                disabled={busy}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
          ))}
        </GlassCard>

        {error ? (
          <p role="alert" className="rounded-2xl border border-rose-300/40 bg-rose-950/60 px-4 py-3 text-sm text-rose-100">
            {error}
          </p>
        ) : null}
        {progress ? <UploadProgress label={progress.label} fraction={progress.fraction} /> : null}

        <div className="flex flex-wrap items-center gap-2.5">
          <GlassButton type="submit" variant="primary" disabled={busy} className="!min-h-[50px] !px-7 text-base">
            {progress ? "Сохраняю…" : editing ? "Сохранить" : "Добавить релиз"}
          </GlassButton>
          <GlassLink href={release ? `/releases/${release.id}` : "/"} variant="ghost" className="!min-h-[50px]">
            Отмена
          </GlassLink>
          {editing ? (
            <GlassButton variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)} className="!min-h-[50px] sm:ml-auto">
              <TrashIcon size={17} /> Удалить релиз
            </GlassButton>
          ) : null}
        </div>
      </div>

      <GlassModal open={confirmDelete} onClose={() => (deleting ? undefined : setConfirmDelete(false))} title="Удалить релиз?" placement="center">
        <div className="px-5 pb-5">
          <p className="text-mist-muted">
            «{release?.title}», его обложка и все аудиофайлы будут удалены навсегда. Посты из архива останутся, но
            потеряют привязку.
          </p>
          <div className="mt-5 flex gap-2.5">
            <GlassButton variant="danger" disabled={deleting} onClick={() => void onDelete()}>
              {deleting ? "Удаляю…" : "Удалить навсегда"}
            </GlassButton>
            <GlassButton variant="ghost" disabled={deleting} onClick={() => setConfirmDelete(false)}>
              Оставить
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </form>
  );
}
