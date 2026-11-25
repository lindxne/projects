import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { POST_COLUMNS, RELEASE_COLUMNS, TRACK_COLUMNS, toPost, toRelease, type Post, type Release, type Track } from "@/lib/supabase/types";

export const FEED_FILTERS = ["music", "photos", "videos"] as const;
export type FeedFilter = (typeof FEED_FILTERS)[number];

export function isFeedFilter(value: unknown): value is FeedFilter {
  return typeof value === "string" && (FEED_FILTERS as readonly string[]).includes(value);
}

export type FeedItem =
  | { kind: "release"; id: string; sortAt: string; release: Release; tracks: Track[] }
  | { kind: "post"; id: string; sortAt: string; post: Post };

export interface FeedCursor {
  sortAt: string;
  id: string;
}

export interface FeedPage {
  items: FeedItem[];
  nextCursor: FeedCursor | null;
}

export const UNIFIED_PAGE_SIZE = 12;

/** One page of the mixed feed: ordered ids from feed_page(), then the rows themselves. */
export async function fetchFeedPage(
  supabase: SupabaseClient<Database>,
  options: { filter?: FeedFilter | null; cursor?: FeedCursor | null; limit?: number },
): Promise<FeedPage> {
  const limit = options.limit ?? UNIFIED_PAGE_SIZE;
  const { data: rows, error } = await supabase.rpc("feed_page", {
    p_kind: options.filter ?? undefined,
    p_before_at: options.cursor?.sortAt ?? undefined,
    p_before_id: options.cursor?.id ?? undefined,
    p_limit: limit + 1,
  });
  if (error) throw new Error(error.message);

  const page = rows.slice(0, limit);
  const releaseIds = page.filter((row) => row.kind === "release").map((row) => row.id);
  const postIds = page.filter((row) => row.kind !== "release").map((row) => row.id);

  const [releases, tracks, posts] = await Promise.all([
    releaseIds.length > 0
      ? supabase.from("releases").select(RELEASE_COLUMNS).in("id", releaseIds)
      : Promise.resolve({ data: [], error: null }),
    releaseIds.length > 0
      ? supabase
          .from("tracks")
          .select(TRACK_COLUMNS)
          .in("release_id", releaseIds)
          .order("track_number", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    postIds.length > 0 ? supabase.from("posts").select(POST_COLUMNS).in("id", postIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (releases.error) throw new Error(releases.error.message);
  if (tracks.error) throw new Error(tracks.error.message);
  if (posts.error) throw new Error(posts.error.message);

  const releaseById = new Map(releases.data.map((row) => [row.id, toRelease(row)]));
  const tracksByRelease = new Map<string, Track[]>();
  for (const track of tracks.data) {
    tracksByRelease.set(track.release_id, [...(tracksByRelease.get(track.release_id) ?? []), track]);
  }
  const postById = new Map(posts.data.map((row) => [row.id, toPost(row)]));

  const items: FeedItem[] = [];
  for (const row of page) {
    if (row.kind === "release") {
      const release = releaseById.get(row.id);
      if (release) items.push({ kind: "release", id: row.id, sortAt: row.sort_at, release, tracks: tracksByRelease.get(row.id) ?? [] });
    } else {
      const post = postById.get(row.id);
      if (post) items.push({ kind: "post", id: row.id, sortAt: row.sort_at, post });
    }
  }

  const last = page[page.length - 1];
  return {
    items,
    nextCursor: rows.length > limit && last ? { sortAt: last.sort_at, id: last.id } : null,
  };
}
