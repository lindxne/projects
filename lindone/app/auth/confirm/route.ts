import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NEXT_COOKIE, safeNext } from "@/lib/utils/safe-next";

const OTP_TYPES: readonly EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

function isOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (OTP_TYPES as readonly string[]).includes(value);
}

/**
 * Lands the magic link. Supports both the token_hash link from our e-mail template
 * (works on any device) and the PKCE `?code=` link of the default Supabase template.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next") ?? request.cookies.get(NEXT_COOKIE)?.value);

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && isOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  const url = request.nextUrl.clone();
  url.search = "";
  if (ok) {
    const [pathname, query] = next.split("?");
    url.pathname = pathname ?? "/";
    url.search = query ? `?${query}` : "";
  } else {
    url.pathname = "/login";
    url.searchParams.set("error", "link");
  }
  const response = NextResponse.redirect(url);
  if (ok) response.cookies.delete(NEXT_COOKIE);
  return response;
}
