import { cx } from "@/lib/utils/format";

interface CoverArtProps {
  src: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: number;
}

export function CoverArt({ src, alt, className, priority = false, sizes }: CoverArtProps) {
  return (
    <div className={cx("relative aspect-square overflow-hidden bg-black/5 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]", className)}>
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
          className="h-full w-full select-none object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-mist-faint" aria-hidden="true">
          <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
        </div>
      )}
    </div>
  );
}
