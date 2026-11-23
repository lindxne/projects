"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

function safeNext(value: FormDataEntryValue | null): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function requestMagicLink(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", email, message: "Введи корректный e-mail." };
  }

  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (owner && email !== owner) {
    return { status: "error", email, message: "Это личный архив: вход только для владельца." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=${encodeURIComponent(safeNext(formData.get("next")))}`,
    },
  });

  if (error) {
    const message =
      error.status === 429
        ? "Слишком много писем подряд. Подожди немного и попробуй снова."
        : /single-user|sign-ups are closed|signups not allowed|database error/i.test(error.message)
          ? "Это личный архив: вход только для владельца."
          : `Не получилось отправить письмо: ${error.message}`;
    return { status: "error", email, message };
  }

  return {
    status: "sent",
    email,
    message: "Письмо отправлено. Открой ссылку из него или введи 6-значный код.",
  };
}

export async function verifyCode(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const token = String(formData.get("code") ?? "").replace(/\D/g, "");

  if (token.length < 6) {
    return { status: "sent", email, message: "Код из письма — 6 цифр." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

  if (error) {
    return { status: "sent", email, message: "Код не подошёл или истёк. Запроси новое письмо." };
  }

  redirect(safeNext(formData.get("next")));
}
