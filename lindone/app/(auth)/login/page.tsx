import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { LoginForm } from "@/components/auth/LoginForm";
import { safeNext } from "@/lib/utils/safe-next";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  link: "The link expired or was already used. Request a new one.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="relative grid min-h-dvh place-items-center px-5 py-10">
      <section className="glass glass-strong relative z-10 w-full max-w-sm p-7 xs:p-8">
        <Logo className="text-[34px]" />
        <h1 className="mt-2 text-2xl font-bold text-mist">Sign in</h1>
        <p className="mb-6 mt-2 text-sm leading-relaxed text-mist-muted">
          Private space. A sign-in link will be sent to the owner&apos;s email.
        </p>
        <LoginForm next={safeNext(next)} initialError={error ? ERRORS[error] : undefined} />
      </section>
    </main>
  );
}
