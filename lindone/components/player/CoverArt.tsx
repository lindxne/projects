import { cx } from "@/lib/utils/format";

interface CoverArtProps {
  src: string | null;
  alt: string;
  className?: string;
  /** Parallax strength: how far the picture drifts behind its glass frame, in px. */
  depth?: number;
  priority?: boolean;
  sizes?: number;
}

/**
 * Cover behind a glass frame with parallax: the picture is slightly larger than the frame
 * and drifts against the global light (cursor on desktop, scroll on touch) — CSS only.
 */
export function CoverArt({ src, alt, className, depth = 6, priority = false, sizes }: CoverArtProps) {
  return (
    <div
      className={cx(
        "relative aspect-square overflow-hidden bg-black/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_12px_30px_-14px_rgba(0,0,0,0.9)]",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- private media behind a signed redirect
        <img
          src={src}
          alt={alt}
          width={sizes}
          height={sizes}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          draggable={false}
          className="h-full w-full select-none object-cover will-change-transform"
          style={{
            transform: `scale(${1 + depth / 50}) translate3d(calc((var(--mx) - 50vw) * ${-depth / 900}), calc((var(--my) - 50vh) * ${-depth / 900}), 0)`,
          }}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-white/10 to-transparent text-mist-faint" aria-hidden="true">
          <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
        </div>
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.28)_0%,transparent_32%,transparent_70%,rgba(255,255,255,0.1)_100%)]"
      />
    </div>
  );
}
