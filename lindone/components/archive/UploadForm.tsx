"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { GlassButton, GlassLink } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { CloseIcon, UploadIcon, VideoIcon } from "@/components/ui/icons";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { resizeToMax } from "@/lib/image/resize";
import { createClient } from "@/lib/supabase/client";
import { MAX_UPLOAD_MB, UploadError, assertUploadSize, removeMedia, uploadFile } from "@/lib/supabase/storage";
import type { PostInsert, PostTag } from "@/lib/supabase/types";
import { SaveError, describeDbError, describeError } from "@/lib/utils/errors";
import { cx, plural } from "@/lib/utils/format";
import { MAX_VIDEO_SECONDS, processVideo, type VideoProgress } from "@/lib/video/ffmpeg";
import { LinkPicker, type PostLink } from "./LinkPicker";
import { TagPicker } from "./TagPicker";

interface Item {
  key: string;
  file: File;
  kind: "photo" | "video";
  preview: string | null;
  status: "waiting" | "working" | "done" | "failed";
  error?: string;
}

interface Progress {
  label: string;
  fraction: number | null;
}

const VIDEO_STAGE: Record<VideoProgress["stage"], string> = {
  loading: "loading converter (once, 32 MB)…",
  analysing: "reading video…",
  transcoding: "converting to H.264…",
  poster: "making poster…",
};

function kindOf(file: File): "photo" | "video" | null {
  if (file.type.startsWith("video/") || /\.(mov|mp4|m4v|webm|mkv|avi|3gp)$/i.test(file.name)) return "video";
  if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|avif|gif)$/i.test(file.name)) return "photo";
  return null;
}

/** Picked date + the current time of day, so several posts of one day keep their order. */
function timestampFor(date: string): string | undefined {
  if (!date) return undefined;
  const now = new Date();
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
}

/** Upload of photos and videos: resize / transcode in the browser, then store. */
export function UploadForm() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState<PostTag[]>([]);
  const [link, setLink] = useState<PostLink>({ releaseId: null, trackId: null });
  const [date, setDate] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const previews = useRef(new Set<string>());
  const busy = progress !== null;

  useEffect(() => {
    const urls = previews.current;
    return () => {
      abort.current?.abort();
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  const patch = (key: string, change: Partial<Item>) =>
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...change } : item)));

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    setError(null);
    const added: Item[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      const kind = kindOf(file);
      if (!kind) {
        rejected.push(`“${file.name}” — not a photo or video`);
        continue;
      }
      let preview: string | null = null;
      if (kind === "photo") {
        preview = URL.createObjectURL(file);
        previews.current.add(preview);
      }
      added.push({ key: crypto.randomUUID(), file, kind, preview, status: "waiting" });
    }
    if (rejected.length > 0) setError(`Not added: ${rejected.join(";")}.`);
    setItems((current) => [...current, ...added]);
  };

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragOver(false);
    if (!busy) addFiles(event.dataTransfer.files);
  };

  const saveOne = async (item: Item, prefix: string, signal: AbortSignal): Promise<void> => {
    const uploaded: string[] = [];
    try {
      const row: PostInsert = {
        media_url: "",
        media_type: item.kind,
        caption: caption.trim() || null,
        tags,
        release_id: link.releaseId,
        track_id: link.trackId,
        created_at: timestampFor(date),
      };

      if (item.kind === "photo") {
        setProgress({ label: `${prefix}: compressing photo…`, fraction: null });
        const photo = await resizeToMax(item.file, 2048);
        assertUploadSize(photo.blob, "Photo");
        row.media_url = await uploadFile({
          bucket: "media",
          file: photo.blob,
          contentType: photo.contentType,
          signal,
          onProgress: (fraction) => setProgress({ label: `${prefix}: uploading photo…`, fraction }),
        });
        uploaded.push(row.media_url);
        row.width = photo.width;
        row.height = photo.height;
      } else {
        const video = await processVideo(
          item.file,
          ({ stage, fraction }) => setProgress({ label: `${prefix}: ${VIDEO_STAGE[stage]}`, fraction }),
          signal,
        );
        assertUploadSize(video.video, "Converted video");
        row.poster_url = await uploadFile({ bucket: "posters", file: video.poster, contentType: video.posterType, signal });
        uploaded.push(row.poster_url);
        row.media_url = await uploadFile({
          bucket: "media",
          file: video.video,
          contentType: "video/mp4",
          signal,
          onProgress: (fraction) => setProgress({ label: `${prefix}: uploading video…`, fraction }),
        });
        uploaded.push(row.media_url);
        row.width = video.width || null;
        row.height = video.height || null;
        row.duration_sec = Math.max(1, Math.round(video.duration));
      }

      if (signal.aborted) throw new UploadError("Upload cancelled.", "network");
      setProgress({ label: `${prefix}: saving…`, fraction: null });
      const { error: insertError } = await createClient().from("posts").insert(row);
      if (insertError) throw new SaveError(describeDbError(insertError));
    } catch (caught) {
      // No post row was created: remove the files so nothing is orphaned in Storage.
      void removeMedia(uploaded).catch(() => undefined);
      throw caught;
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const pending = items.filter((item) => item.status !== "done");
    if (pending.length === 0) {
      setError("Choose a photo or video first.");
      return;
    }
    setError(null);
    const controller = new AbortController();
    abort.current = controller;

    let failures = 0;
    for (const [index, item] of pending.entries()) {
      if (controller.signal.aborted) break;
      patch(item.key, { status: "working", error: undefined });
      try {
        await saveOne(item, `File ${index + 1} of ${pending.length}`, controller.signal);
        patch(item.key, { status: "done" });
      } catch (caught) {
        failures += 1;
        patch(item.key, { status: controller.signal.aborted ? "waiting" : "failed", error: describeError(caught) });
      }
    }

    abort.current = null;
    setProgress(null);
    if (controller.signal.aborted) {
      setError("Upload stopped. Posts already saved stay in the feed.");
    } else if (failures > 0) {
      setError(
        `${failures} ${plural(failures, "file")} could not be saved — see the reason next to each. The rest were saved.`,
      );
      router.refresh();
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const remaining = items.filter((item) => item.status !== "done").length;

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto grid w-full max-w-2xl gap-4">
      <GlassCard variant="panel" className="p-4 md:p-5">
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          disabled={busy}
          className={cx(
            "flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed px-4 py-9 text-center transition-colors",
            dragOver ? "border-white bg-black/10" : "border-black/25 bg-black/25",
          )}
        >
          <UploadIcon size={30} className="text-mist" />
          <span className="font-semibold text-mist">Choose or drop photos and videos</span>
          <span className="text-sm text-mist-muted">
            Photos are resized to 2048 px (WebP). Videos up to {MAX_VIDEO_SECONDS} seconds are converted to H.264 1080p right in the browser. Final file up to {MAX_UPLOAD_MB} MB.
          </span>
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*,video/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />

        {items.length > 0 ? (
          <ul className="mt-3 grid gap-2" aria-label="Selected files">
            {items.map((item) => (
              <li key={item.key} className="flex items-center gap-3 glass-inset rounded-2xl p-2">
                <span className="grid h-14 w-14 flex-none place-items-center overflow-hidden rounded-xl bg-black/10 text-mist-muted">
                  {item.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local preview
                    <img src={item.preview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <VideoIcon size={22} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-mist">{item.file.name}</span>
                  <span className={cx("block text-xs", item.status === "failed" ? "text-rose-600" : "text-mist-muted")} role={item.status === "failed" ? "alert" : undefined}>
                    {item.status === "failed"
                      ? item.error
                      : item.status === "done"
                        ? "Saved"
                        : item.status === "working"
                          ? "Processing…"
                          : `${item.kind === "video" ? "Video" : "Photo"} · ${(item.file.size / 1024 / 1024).toFixed(1)} MB`}
                  </span>
                </span>
                {item.status !== "done" && !busy ? (
                  <button
                    type="button"
                    onClick={() => setItems((current) => current.filter((other) => other.key !== item.key))}
                    aria-label={`Remove ${item.file.name}`}
                    className="grid h-11 w-11 flex-none place-items-center rounded-full text-mist-muted hover:bg-black/10 hover:text-mist"
                  >
                    <CloseIcon size={16} />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </GlassCard>

      <GlassCard variant="panel" className="grid gap-4 p-4 md:p-5">
        <div>
          <label htmlFor="upload-caption" className="field-label">
            Caption <span className="text-mist-faint">· optional{items.length > 1 ? ", one for all files" : ""}</span>
          </label>
          <textarea
            id="upload-caption"
            className="glass-input min-h-[88px] resize-y"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={2200}
            disabled={busy}
          />
        </div>
        <div>
          <span className="field-label">Tags</span>
          <TagPicker value={tags} onChange={setTags} disabled={busy} />
        </div>
        <LinkPicker value={link} onChange={setLink} disabled={busy} />
        <div>
          <label htmlFor="upload-date" className="field-label">
            Date <span className="text-mist-faint">· empty means today; set an older date to place the post in the timeline</span>
          </label>
          <input
            id="upload-date"
            type="date"
            className="glass-input [color-scheme:dark]"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setDate(event.target.value)}
            disabled={busy}
          />
        </div>
      </GlassCard>

      {error ? (
        <p role="alert" className="rounded-2xl border border-rose-300/40 bg-rose-950/60 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
      {progress ? <UploadProgress label={progress.label} fraction={progress.fraction} /> : null}

      <div className="flex flex-wrap gap-2.5">
        <GlassButton type="submit" variant="primary" disabled={busy || remaining === 0} className="!min-h-[50px] !px-7 text-base">
          {busy ? "Uploading…" : remaining > 1 ? `Upload ${remaining}` : "Upload"}
        </GlassButton>
        {busy ? (
          <GlassButton variant="ghost" className="!min-h-[50px]" onClick={() => abort.current?.abort()}>Stop</GlassButton>
        ) : (
          <GlassLink href="/" variant="ghost" className="!min-h-[50px]">Cancel</GlassLink>
        )}
      </div>
    </form>
  );
}
