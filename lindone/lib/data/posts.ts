import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { POST_COLUMNS, toPost, type Post, type PostTag } from "@/lib/supabase/types";

export const FEED_PAGE_SIZE = 12;

export interface PostCursor {
  createdAt: string;
  id: string;
}

export interface PostPage {
  posts: Post[];
  nextCursor: PostCursor | null;
}

/**
 * One page of the feed, newest first, with keyset (cursor) pagination on (created_at, id):
 * stable while new posts are added and equally fast on page 1 and page 500 — no OFFSET.
 */
export async function fetchPostPage(
  supabase: SupabaseClient<Database>,
  options: { cursor?: PostCursor | null; tag?: PostTag | null; limit?: number },
): Promise<PostPage> {
  const limit = options.limit ?? FEED_PAGE_SIZE;
  let query = supabase.from("posts").select(POST_COLUMNS);
  if (options.tag) query = query.contains("tags", [options.tag]);
  if (options.cursor) {
    const { createdAt, id } = options.cursor;
    query = query.or(`created_at.lt."${createdAt}",and(created_at.eq."${createdAt}",id.lt.${id})`);
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (error) throw new Error(error.message);

  const posts = data.slice(0, limit).map(toPost);
  const last = posts[posts.length - 1];
  return {
    posts,
    nextCursor: data.length > limit && last ? { createdAt: last.created_at, id: last.id } : null,
  };
}
