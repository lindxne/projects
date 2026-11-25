import { GlassLink } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";

export default function NotFound() {
  return (
    <GlassCard variant="panel" className="mx-auto mt-10 max-w-md px-6 py-10 text-center">
      <h1 className="font-display text-2xl font-bold text-mist">Page not found</h1>
      <p className="mt-2 text-mist-muted">The release or post may have been deleted.</p>
      <GlassLink href="/" variant="primary" className="mt-6">
        Back to feed
      </GlassLink>
    </GlassCard>
  );
}
