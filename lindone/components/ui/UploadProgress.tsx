/** Labelled progress bar for long client-side jobs (resize, transcode, upload). */
export function UploadProgress({ label, fraction }: { label: string; fraction: number | null }) {
  const percent = fraction === null ? null : Math.round(Math.min(Math.max(fraction, 0), 1) * 100);
  return (
    <div role="status" aria-live="polite" className="glass-inset rounded-2xl p-3.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-mist">{label}</span>
        {percent !== null ? <span className="flex-none tabular-nums text-mist-muted">{percent}%</span> : null}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-black/10"
      >
        {percent === null ? (
          <span className="absolute inset-y-0 w-1/3 animate-sheen rounded-full bg-black/80" />
        ) : (
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-neutral-700 to-neutral-900 transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
    </div>
  );
}
