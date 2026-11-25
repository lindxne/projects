"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NEXT_COOKIE, safeNext } from "@/lib/utils/safe-next";

export interface LoginState {
  status: "idle" | "sent" | "error";
  email: string;
  message: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}

export async function requestMagicLink(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", email, message: "Enter a valid email." };
  }

  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (owner && email !== owner) {
    return { status: "error", email, message: "This is a private archive: only the owner can sign in." };
  }

  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    const message =
      error.status === 429
        ? "Too many emails in a row. Wait a bit and try again."
        : /single-user|sign-ups are closed|signups not allowed|database error/i.test(error.message)
          ? "This is a private archive: only the owner can sign in."
          : `Could not send the email: ${error.message}`;
    return { status: "error", email, message };
  }

  // The e-mail link carries no destination, so remember it for when the link opens in this browser.
  const cookieStore = await cookies();
  if (next === "/") cookieStore.delete(NEXT_COOKIE);
  else cookieStore.set(NEXT_COOKIE, next, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 });

  return {
    status: "sent",
    email,
    message: "Email sent. Open the link in it or enter the 6-digit code.",
  };
}

export async function verifyCode(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const token = String(formData.get("code") ?? "").replace(/\D/g, "");

  if (token.length < 6) {
    return { status: "sent", email, message: "The code from the email has 6 digits." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

  if (error) {
    return { status: "sent", email, message: "The code is wrong or expired. Request a new email." };
  }

  (await cookies()).delete(NEXT_COOKIE);
  redirect(safeNext(formData.get("next")));
}
