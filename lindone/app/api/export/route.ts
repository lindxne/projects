import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseMediaUrl } from "@/lib/supabase/storage";
import { POST_COLUMNS, RELEASE_COLUMNS, TRACK_COLUMNS } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const SIGNED_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * Full archive as one JSON file: every release, track and post with its metadata, the
 * permanent app link of each media file and a direct download link valid for 7 days.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Нужно войти." }, { status: 401 });

  const [releases, tracks, posts] = await Promise.all([
    supabase.from("releases").select(RELEASE_COLUMNS).order("release_date", { ascending: true, nullsFirst: false }),
    supabase.from("tracks").select(TRACK_COLUMNS).order("track_number", { ascending: true }),
    supabase.from("posts").select(POST_COLUMNS).order("created_at", { ascending: true }),
  ]);
  const failed = releases.error ?? tracks.error ?? posts.error;
  if (failed || !releases.data || !tracks.data || !posts.data) {
    return NextResponse.json({ error: `Не удалось прочитать архив: ${failed?.message ?? "нет данных"}` }, { status: 500 });
  }

  // Sign every file in batches, bucket by bucket.
  const origin = new URL(request.url).origin;
  const urls = [
    ...releases.data.map((release) => release.cover_url),
    ...tracks.data.map((track) => track.audio_url),
    ...posts.data.flatMap((post) => [post.media_url, post.poster_url]),
  ];
  const byBucket = new Map<string, string[]>();
  for (const url of urls) {
    const parsed = url ? parseMediaUrl(url) : null;
    if (parsed) byBucket.set(parsed.bucket, [...(byBucket.get(parsed.bucket) ?? []), parsed.path]);
  }
  const signed = new Map<string, string>();
  await Promise.all(
    [...byBucket.entries()].map(async ([bucket, paths]) => {
      for (let start = 0; start < paths.length; start += 500) {
        const { data } = await supabase.storage.from(bucket).createSignedUrls(paths.slice(start, start + 500), SIGNED_TTL_SECONDS);
        for (const item of data ?? []) {
          if (item.path && item.signedUrl) signed.set(`/media/${bucket}/${item.path}`, item.signedUrl);
        }
      }
    }),
  );
  const file = (url: string | null) =>
    url ? { path: url, url: `${origin}${url}`, download_url: signed.get(url) ?? null } : null;

  const body = {
    app: "Lindone",
    version: 1,
    exported_at: new Date().toISOString(),
    download_urls_expire_at: new Date(Date.now() + SIGNED_TTL_SECONDS * 1000).toISOString(),
    counts: { releases: releases.data.length, tracks: tracks.data.length, posts: posts.data.length },
    releases: releases.data.map((release) => ({
      ...release,
      cover: file(release.cover_url),
      tracks: tracks.data
        .filter((track) => track.release_id === release.id)
        .map((track) => ({ ...track, audio: file(track.audio_url) })),
    })),
    posts: posts.data.map((post) => ({ ...post, media: file(post.media_url), poster: file(post.poster_url) })),
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="lindone-archive-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
