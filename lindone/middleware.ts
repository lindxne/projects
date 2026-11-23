import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, PWA files and the media redirect (it checks auth itself).
    "/((?!_next/static|_next/image|media/|ffmpeg/|icons/|favicon.ico|manifest.json|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
