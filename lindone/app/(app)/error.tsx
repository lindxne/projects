"use client";

import { GlassButton, GlassLink } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <GlassCard variant="panel" className="mx-auto mt-10 max-w-md px-6 py-10 text-center" role="alert">
      <h1 className="font-display text-2xl font-bold text-white">Не получилось загрузить</h1>
      <p className="mt-2 text-mist-muted">
        {error.message && !error.digest
          ? error.message
          : "Сервер или база данных не ответили. Проверь соединение и повтори — данные никуда не делись."}
      </p>
      {error.digest ? <p className="mt-2 text-xs text-mist-faint">Код ошибки: {error.digest}</p> : null}
      <div className="mt-6 flex justify-center gap-2.5">
        <GlassButton variant="primary" onClick={reset}>
          Повторить
        </GlassButton>
        <GlassLink href="/" variant="ghost">
          На главную
        </GlassLink>
      </div>
    </GlassCard>
  );
}
