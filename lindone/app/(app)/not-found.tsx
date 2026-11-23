import { GlassLink } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";

export default function NotFound() {
  return (
    <GlassCard variant="panel" className="mx-auto mt-10 max-w-md px-6 py-10 text-center">
      <h1 className="font-display text-2xl font-bold text-white">Такой страницы нет</h1>
      <p className="mt-2 text-mist-muted">Возможно, релиз или пост был удалён.</p>
      <GlassLink href="/" variant="primary" className="mt-6">
        К дискографии
      </GlassLink>
    </GlassCard>
  );
}
