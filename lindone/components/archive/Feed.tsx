"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { GlassButton, GlassLink } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassModal } from "@/components/glass/GlassModal";
import { FeedIcon, GridIcon, UploadIcon } from "@/components/ui/icons";
import { fetchPostPage, type PostCursor, type PostPage } from "@/lib/data/posts";
import { createClient } from "@/lib/supabase/client";
import { POST_TAGS, POST_TAG_LABEL, type Post, type PostTag } from "@/lib/supabase/types";
import { describeError } from "@/lib/utils/errors";
import { PostCard } from "./PostCard";
import { PostGrid } from "./PostGrid";
import { PostView } from "./PostView";

interface FeedProps {
  initial: PostPage;
  tag: PostTag | null;
  view: "feed" | "grid";
}

/** Archive: chronological feed or square grid with cursor-based infinite scroll. */
export function Feed({ initial, tag, view }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>(initial.posts);
  const [cursor, setCursor] = useState<PostCursor | null>(initial.nextCursor);
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
      const page = await fetchPostPage(createClient(), { cursor, tag });
      setPosts((current) => {
        const known = new Set(current.map((post) => post.id));
        return [...current, ...page.posts.filter((post) => !known.has(post.id))];
      });
      setCursor(page.nextCursor);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [cursor, tag]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "900px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, error, loadMore]);

  const href = (next: { tag?: PostTag | null; view?: "feed" | "grid" }) => {
    const query = new URLSearchParams();
    const nextTag = "tag" in next ? next.tag : tag;
    const nextView = next.view ?? view;
    if (nextTag) query.set("tag", nextTag);
    if (nextView === "grid") query.set("view", "grid");
    const text = query.toString();
    return text ? `/archive?${text}` : "/archive";
  };

  return (
    <div className="grid gap-4 md:gap-5">
      <nav aria-label="Теги и вид" className="no-scrollbar -mx-3 flex items-center gap-2 overflow-x-auto px-3 md:mx-0 md:px-0">
        <Link href={href({ tag: null })} className="chip flex-none" aria-current={!tag ? "true" : undefined}>
          Всё
        </Link>
        {POST_TAGS.map((option) => (
          <Link key={option} href={href({ tag: option })} className="chip flex-none" aria-current={tag === option ? "true" : undefined}>
            #{POST_TAG_LABEL[option]}
          </Link>
        ))}
        <span className="ml-auto flex flex-none gap-1.5 pl-2">
          <Link href={href({ view: "feed" })} className="chip !px-3" aria-label="Вид: лента" aria-current={view === "feed" ? "true" : undefined}>
            <FeedIcon size={17} />
          </Link>
          <Link href={href({ view: "grid" })} className="chip !px-3" aria-label="Вид: сетка" aria-current={view === "grid" ? "true" : undefined}>
            <GridIcon size={17} />
          </Link>
        </span>
      </nav>

      {posts.length === 0 ? (
        <GlassCard variant="panel" className="mx-auto max-w-md px-6 py-12 text-center">
          <h2 className="font-display text-xl font-bold text-white">{tag ? "С этим тегом пусто" : "Архив пуст"}</h2>
          <p className="mt-2 text-mist-muted">
            {tag ? "Постов с таким тегом ещё нет." : "Загрузи первое фото или видео — студия, лайвы, демо, референсы."}
          </p>
          <GlassLink href="/upload" variant="primary" className="mt-6">
            <UploadIcon size={18} /> Загрузить
          </GlassLink>
        </GlassCard>
      ) : view === "grid" ? (
        <PostGrid posts={posts} onOpen={setOpened} />
      ) : (
        <ul className="mx-auto grid w-full max-w-xl gap-4 md:gap-6">
          {posts.map((post, index) => (
            <li key={post.id}>
              <PostCard post={post} onOpen={setOpened} priority={index === 0} />
            </li>
          ))}
        </ul>
      )}

      <div ref={sentinel} aria-hidden="true" className="h-px" />
      <div role="status" aria-live="polite" className="text-center text-sm text-mist-muted">
        {loading ? "Загружаю ещё…" : null}
        {error ? (
          <span className="flex flex-col items-center gap-3">
            <span role="alert" className="text-rose-200">
              Не получилось загрузить продолжение: {error}
            </span>
            <GlassButton onClick={() => void loadMore()}>Повторить</GlassButton>
          </span>
        ) : null}
        {!cursor && !loading && posts.length > 0 ? "Это всё — начало архива." : null}
      </div>

      <GlassModal open={opened !== null} onClose={() => setOpened(null)} title="Пост" hideTitle className="sm:!max-w-2xl">
        {opened ? (
          <PostView
            key={opened.id}
            post={opened}
            onUpdated={(updated) => {
              setPosts((current) => current.map((post) => (post.id === updated.id ? updated : post)));
              setOpened(updated);
            }}
            onDeleted={(deleted) => {
              setPosts((current) => current.filter((post) => post.id !== deleted.id));
              setOpened(null);
            }}
          />
        ) : null}
      </GlassModal>
    </div>
  );
}
