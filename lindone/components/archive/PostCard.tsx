"use client";

import type { Post } from "@/lib/supabase/types";
import { formatTimestamp } from "@/lib/utils/format";
import { LazyVideo } from "./LazyVideo";

/** Feed card: the media stays clean, the caption sits on glass below it. */
export function PostCard({ post, onOpen, priority = false }: { post: Post; onOpen: (post: Post) => void; priority?: boolean }) {
  return (
    <article>
      <div className="overflow-hidden rounded-[22px] bg-black/5">
        {post.media_type === "video" ? (
          <LazyVideo post={post} />
        ) : (
          <button type="button" onClick={() => onOpen(post)} aria-label="Open photo" className="block w-full">
            {/* eslint-disable-next-line @next/next/no-img-element -- private media behind a signed redirect */}
            <img
              src={post.media_url}
              alt={post.caption ?? "Photo"}
              width={post.width ?? undefined}
              height={post.height ?? undefined}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              decoding="async"
              className="block h-auto max-h-[80dvh] w-full object-contain"
              style={{ aspectRatio: post.width && post.height ? `${post.width} / ${post.height}` : undefined }}
            />
          </button>
        )}
      </div>
      <div className="glass glass-card mt-2.5 grid gap-1.5 px-4 py-3">
        {post.caption ? <p className="line-clamp-4 whitespace-pre-line break-words text-[15px] leading-relaxed text-mist">{post.caption}</p> : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-mist-muted">
          <button type="button" onClick={() => onOpen(post)} className="rounded-md underline-offset-4 hover:underline">
            <time dateTime={post.created_at}>{formatTimestamp(post.created_at)}</time>
          </button>
        </div>
      </div>
    </article>
  );
}
