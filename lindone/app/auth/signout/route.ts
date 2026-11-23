import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const response = NextResponse.redirect(url, { status: 303 });
  // Drop cached /media redirects (and everything else cached for this origin) with the session.
  response.headers.set("Clear-Site-Data", '"cache"');
  return response;
}
