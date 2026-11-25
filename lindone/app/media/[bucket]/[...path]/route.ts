import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isBucket } from "@/lib/supabase/storage";

// Signed URLs outlive the cached redirect, so a cached redirect never points to a dead link.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 2;
const REDIRECT_CACHE_SECONDS = 60 * 60;

/**
 * Stable private media URL: `/media/<bucket>/<path>` redirects the signed-in owner to a
 * signed Storage URL. Storage RLS decides access, so anyone else gets a 404.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bucket: string; path: string[] }> },
) {
  const { bucket, path } = await params;
  if (!isBucket(bucket) || path.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path.join("/"), SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: data.signedUrl,
      "Cache-Control": `private, max-age=${REDIRECT_CACHE_SECONDS}`,
    },
  });
}
