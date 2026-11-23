import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  POST_COLUMNS,
  RELEASE_COLUMNS,
  TRACK_COLUMNS,
  toPost,
  toRelease,
  type Post,
  type Release,
  type ReleaseType,
  type Track,
} from "@/lib/supabase/types";

/** A database failure that pages surface through the error boundary. */
export class DataError extends Error {
  constructor(what: string, cause: { message: string }) {
    super(`${what}: ${cause.message}`);
    this.name = "DataError";
  }
}

export async function listReleases(options: { type?: ReleaseType; ascending?: boolean } = {}): Promise<Release[]> {
  const supabase = await createClient();
  let query = supabase.from("releases").select(RELEASE_COLUMNS);
  if (options.type) query = query.eq("type", options.type);
  const ascending = options.ascending ?? false;
  const { data, error } = await query
    .order("release_date", { ascending, nullsFirst: false })
    .order("created_at", { ascending });
  if (error) throw new DataError("Не удалось загрузить релизы", error);
  return data.map(toRelease);
}

export async function getRelease(id: string): Promise<{ release: Release; tracks: Track[] } | null> {
  const supabase = await createClient();
  const [releaseResult, tracksResult] = await Promise.all([
    supabase.from("releases").select(RELEASE_COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("tracks")
      .select(TRACK_COLUMNS)
      .eq("release_id", id)
      .order("track_number", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
  ]);
  if (releaseResult.error) {
    // An id that is not a UUID is simply "not found".
    if (releaseResult.error.code === "22P02") return null;
    throw new DataError("Не удалось загрузить релиз", releaseResult.error);
  }
  if (!releaseResult.data) return null;
  if (tracksResult.error) throw new DataError("Не удалось загрузить треки", tracksResult.error);
  return { release: toRelease(releaseResult.data), tracks: tracksResult.data };
}

export async function getPost(id: string): Promise<Post | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").select(POST_COLUMNS).eq("id", id).maybeSingle();
  if (error) {
    if (error.code === "22P02") return null;
    throw new DataError("Не удалось загрузить пост", error);
  }
  return data ? toPost(data) : null;
}

export async function listPostsFor(filter: { releaseId?: string; trackIds?: string[] }): Promise<Post[]> {
  const supabase = await createClient();
  const conditions: string[] = [];
  if (filter.releaseId) conditions.push(`release_id.eq.${filter.releaseId}`);
  if (filter.trackIds && filter.trackIds.length > 0) conditions.push(`track_id.in.(${filter.trackIds.join(",")})`);
  if (conditions.length === 0) return [];
  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .or(conditions.join(","))
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw new DataError("Не удалось загрузить связанные посты", error);
  return data.map(toPost);
}
