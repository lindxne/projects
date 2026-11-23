"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GlassButton } from "@/components/glass/GlassButton";
import { DiscIcon, EditIcon, TrashIcon } from "@/components/ui/icons";
import { usePlayer } from "@/lib/audio/player-store";
import { createClient } from "@/lib/supabase/client";
import { removeMedia } from "@/lib/supabase/storage";
import { POST_COLUMNS, POST_TAG_LABEL, toPost, type Post, type PostTag } from "@/lib/supabase/types";
import { describeDbError } from "@/lib/utils/errors";
import { formatTimestamp } from "@/lib/utils/format";
import { LinkPicker, type PostLink } from "./LinkPicker";
import { TagPicker } from "./TagPicker";

interface PostViewProps {
  post: Post;
  onUpdated?: (post: Post) => void;
  onDeleted?: (post: Post) => void;
}

interface Linked {
  releaseId: string;
  releaseTitle: string;
  trackTitle: string | null;
}

/** Full post: clean media, then caption, tags, the linked release / track and actions. */
export function PostView({ post, onUpdated, onDeleted }: PostViewProps) {
  const [linked, setLinked] = useState<Linked | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [caption, setCaption] = useState(post.caption ?? "");
  const [tags, setTags] = useState<PostTag[]>(post.tags);
  const [link, setLink] = useState<PostLink>({ releaseId: post.release_id, trackId: post.track_id });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLinked(null);
    const supabase = createClient();
    const load = async () => {
      if (post.track_id) {
        const { data } = await supabase.from("tracks").select("title,releases(id,title)").eq("id", post.track_id).maybeSingle();
        if (!cancelled && data?.releases) {
          setLinked({ releaseId: data.releases.id, releaseTitle: data.releases.title, trackTitle: data.title });
        }
      } else if (post.release_id) {
        const { data } = await supabase.from("releases").select("id,title").eq("id", post.release_id).maybeSingle();
        if (!cancelled && data) setLinked({ releaseId: data.id, releaseTitle: data.title, trackTitle: null });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [post.track_id, post.release_id]);

  const cancel = () => {
    setCaption(post.caption ?? "");
    setTags(post.tags);
    setLink({ releaseId: post.release_id, trackId: post.track_id });
    setError(null);
    setMode("view");
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    const { data, error: updateError } = await createClient()
      .from("posts")
      .update({ caption: caption.trim() || null, tags, release_id: link.releaseId, track_id: link.trackId })
      .eq("id", post.id)
      .select(POST_COLUMNS)
      .single();
    setBusy(false);
    if (updateError) {
      setError(describeDbError(updateError));
      return;
    }
    setMode("view");
    onUpdated?.(toPost(data));
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    const { error: deleteError } = await createClient().from("posts").delete().eq("id", post.id);
    if (deleteError) {
      setBusy(false);
      setError(describeDbError(deleteError));
      return;
    }
    await removeMedia([post.media_url, post.poster_url]).catch(() => undefined);
    onDeleted?.(post);
  };

  return (
    <div>
      {post.media_type === "video" ? (
        <video
          src={post.media_url}
          poster={post.poster_url ?? undefined}
          controls
          playsInline
          preload="metadata"
          onPlay={() => usePlayer.getState().pause()}
          className="block max-h-[70dvh] w-full bg-black object-contain"
          style={{ aspectRatio: post.width && post.height ? `${post.width} / ${post.height}` : undefined }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- private media behind a signed redirect
        <img
          src={post.media_url}
          alt={post.caption ?? "Фото из архива"}
          width={post.width ?? undefined}
          height={post.height ?? undefined}
          className="block h-auto max-h-[70dvh] w-full bg-black object-contain"
        />
      )}

      <div className="grid gap-3.5 p-4 md:p-5">
        {mode === "edit" ? (
          <>
            <div>
              <label htmlFor="post-caption" className="field-label">
                Подпись
              </label>
              <textarea
                id="post-caption"
                className="glass-input min-h-[88px] resize-y"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                maxLength={2200}
                disabled={busy}
              />
            </div>
            <TagPicker value={tags} onChange={setTags} disabled={busy} />
            <LinkPicker value={link} onChange={setLink} disabled={busy} />
          </>
        ) : (
          <>
            <p className="text-sm text-mist-muted">
              <time dateTime={post.created_at}>{formatTimestamp(post.created_at)}</time>
            </p>
            {post.caption ? <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-mist">{post.caption}</p> : null}
            {post.tags.length > 0 ? (
              <ul className="flex flex-wrap gap-2" aria-label="Теги">
                {post.tags.map((tag) => (
                  <li key={tag}>
                    <Link href={`/archive?tag=${tag}`} className="chip !min-h-[32px] !px-3 text-xs">
                      #{POST_TAG_LABEL[tag]}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            {linked ? (
              <Link
                href={`/releases/${linked.releaseId}`}
                className="flex min-h-[48px] items-center gap-3 rounded-2xl border border-white/15 bg-black/30 px-3.5 text-sm text-white hover:bg-white/10"
              >
                <DiscIcon size={18} className="flex-none text-mist-muted" />
                <span className="min-w-0 truncate">
                  {linked.trackTitle ? `${linked.trackTitle} · ` : ""}
                  {linked.releaseTitle}
                </span>
              </Link>
            ) : null}
          </>
        )}

        {error ? (
          <p role="alert" className="rounded-2xl border border-rose-300/40 bg-rose-950/60 px-4 py-3 text-sm text-rose-100">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {mode === "view" ? (
            <>
              <GlassButton variant="ghost" className="!min-h-[40px] !px-4" onClick={() => setMode("edit")}>
                <EditIcon size={15} /> Изменить
              </GlassButton>
              <GlassButton variant="ghost" className="!min-h-[40px] !px-4" onClick={() => setMode("delete")}>
                <TrashIcon size={15} /> Удалить
              </GlassButton>
            </>
          ) : mode === "edit" ? (
            <>
              <GlassButton variant="primary" disabled={busy} onClick={() => void save()}>
                {busy ? "Сохраняю…" : "Сохранить"}
              </GlassButton>
              <GlassButton variant="ghost" disabled={busy} onClick={cancel}>
                Отмена
              </GlassButton>
            </>
          ) : (
            <>
              <GlassButton variant="danger" disabled={busy} onClick={() => void remove()}>
                {busy ? "Удаляю…" : "Удалить навсегда"}
              </GlassButton>
              <GlassButton variant="ghost" disabled={busy} onClick={cancel}>
                Оставить
              </GlassButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
