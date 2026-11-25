"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GlassButton, GlassLink } from "@/components/glass/GlassButton";
import { GlassModal } from "@/components/glass/GlassModal";
import { PostCard } from "@/components/archive/PostCard";
import { PostView } from "@/components/archive/PostView";
import { fetchFeedPage, type FeedCursor, type FeedFilter, type FeedItem, type FeedPage } from "@/lib/data/feed";
import { createClient } from "@/lib/supabase/client";
import type { Post } from "@/lib/supabase/types";
import { describeError } from "@/lib/utils/errors";
import { ReleaseFeedCard } from "./ReleaseFeedCard";

const EMPTY: Record<"all" | FeedFilter, { text: string; href: string; action: string }> = {
  all: { text: "Nothing here yet.", href: "/releases/new", action: "Add a release" },
  music: { text: "No releases yet.", href: "/releases/new", action: "Add a release" },
  photos: { text: "No photos yet.", href: "/upload", action: "Upload" },
  videos: { text: "No videos yet.", href: "/upload", action: "Upload" },
};

/** Releases, photos and videos in one chronological column, with keyset infinite scroll. */
export function UnifiedFeed({ initial, filter }: { initial: FeedPage; filter: FeedFilter | null }) {
  const [items, setItems] = useState<FeedItem[]>(initial.items);
  const [cursor, setCursor] = useState<FeedCursor | null>(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<Post | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  const loadMore = useCallback(async () => {
    if (!cursor || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const page = await fetchFeedPage(createClient(), { filter, cursor });
      setItems((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...page.items.filter((item) => !known.has(item.id))];
      });
      setCursor(page.nextCursor);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [cursor, filter]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor || error) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    }, { rootMargin: "1200px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, error, loadMore]);

  const updatePost = (updated: Post) =>
    setItems((current) => current.map((item) => (item.kind === "post" && item.id === updated.id ? { ...item, post: updated } : item)));

  if (items.length === 0) {
    const empty = EMPTY[filter ?? "all"];
    return (
      <div className="grid justify-items-center gap-4 py-24 text-center">
        <p className="text-mist-muted">{empty.text}</p>
        <GlassLink href={empty.href}>{empty.action}</GlassLink>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[820px]">
      <ul className="grid gap-12 md:gap-16">
        {items.map((item, index) => (
          <li key={item.id} className={item.kind === "release" ? undefined : "mx-auto w-full max-w-[560px]"}>
            {item.kind === "release" ? (
              <ReleaseFeedCard release={item.release} tracks={item.tracks} priority={index === 0} />
            ) : (
              <PostCard post={item.post} onOpen={setOpened} priority={index === 0} />
            )}
          </li>
        ))}
      </ul>

      <div ref={sentinel} aria-hidden="true" className="h-px" />
      <div role="status" aria-live="polite" className="py-10 text-center text-sm text-mist-faint">
        {loading ? "Loading more…" : null}
        {error ? (
          <span className="flex flex-col items-center gap-3">
            <span role="alert" className="text-rose-600">
              Could not load more: {error}
            </span>
            <GlassButton onClick={() => void loadMore()}>Retry</GlassButton>
          </span>
        ) : null}
        {!cursor && !loading ? "That's everything." : null}
      </div>

      <GlassModal open={opened !== null} onClose={() => setOpened(null)} title="Post" hideTitle className="sm:!max-w-2xl">
        {opened ? (
          <PostView
            key={opened.id}
            post={opened}
            onUpdated={(updated) => {
              updatePost(updated);
              setOpened(updated);
            }}
            onDeleted={(deleted) => {
              setItems((current) => current.filter((item) => item.id !== deleted.id));
              setOpened(null);
            }}
          />
        ) : null}
      </GlassModal>
    </div>
  );
}
