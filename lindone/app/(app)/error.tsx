"use client";

import { GlassButton, GlassLink } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <GlassCard variant="panel" className="mx-auto mt-10 max-w-md px-6 py-10 text-center" role="alert">
      <h1 className="font-display text-2xl font-bold text-mist">Could not load</h1>
      <p className="mt-2 text-mist-muted">
        {error.message && !error.digest
          ? error.message
          : "The server or database did not respond. Check your connection and retry — your data is safe."}
      </p>
      {error.digest ? <p className="mt-2 text-xs text-mist-faint">Error code: {error.digest}</p> : null}
      <div className="mt-6 flex justify-center gap-2.5">
        <GlassButton variant="primary" onClick={reset}>Retry
        </GlassButton>
        <GlassLink href="/" variant="ghost">Home
        </GlassLink>
      </div>
    </GlassCard>
  );
}
