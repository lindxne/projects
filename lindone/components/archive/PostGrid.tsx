"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { VideoIcon } from "@/components/ui/icons";
import type { Post } from "@/lib/supabase/types";
import { formatDate, formatDuration } from "@/lib/utils/format";

interface PostGridProps {
  posts: Post[];
  /** When set, a plain click opens the post in place instead of navigating. */
  onOpen?: (post: Post) => void;
}

/** Square tiles, three in a row — like a profile grid. Media is shown clean, without glass. */
export function PostGrid({ posts, onOpen }: PostGridProps) {
  const onClick = (post: Post) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onOpen || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onOpen(post);
  };

  return (
    <ul className="grid grid-cols-3 gap-1 md:gap-2">
      {posts.map((post) => {
        const label = `${post.media_type === "video" ? "Видео" : "Фото"} от ${formatDate(post.created_at)}${post.caption ? `: ${post.caption.slice(0, 80)}` : ""}`;
        return (
          <li key={post.id}>
            <Link
              href={`/archive/${post.id}`}
              scroll={false}
              onClick={onClick(post)}
              aria-label={label}
              className="group relative block aspect-square overflow-hidden rounded-xl bg-white/[0.06] md:rounded-2xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- private media behind a signed redirect */}
              <img
                src={post.media_type === "video" ? (post.poster_url ?? "") : post.media_url}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
              {post.media_type === "video" ? (
                <span className="scrim absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-white">
                  <VideoIcon size={12} />
                  {post.duration_sec ? formatDuration(post.duration_sec) : null}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
