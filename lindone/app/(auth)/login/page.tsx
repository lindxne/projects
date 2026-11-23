import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { safeNext } from "@/lib/utils/safe-next";

export const metadata: Metadata = { title: "Вход" };

const ERRORS: Record<string, string> = {
  link: "Ссылка устарела или уже использована. Запроси новую.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="relative grid min-h-dvh place-items-center px-5 py-10">
      <div className="bg-fallback" aria-hidden="true" />
      <section className="glass glass-strong relative z-10 w-full max-w-sm p-7 xs:p-8">
        <p className="font-display text-xs uppercase tracking-[0.35em] text-mist-muted">Lindone</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Вход в архив</h1>
        <p className="mb-6 mt-2 text-sm leading-relaxed text-mist-muted">
          Личное пространство. Ссылка для входа придёт на почту владельца.
        </p>
        <LoginForm next={safeNext(next)} initialError={error ? ERRORS[error] : undefined} />
      </section>
    </main>
  );
}
