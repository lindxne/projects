import { cx } from "@/lib/utils/format";

const LETTERS = "lindone".split("");

/** Truck-sign "lindone" wordmark: chunky outlined letters with a drop shadow. */
export function Logo({ className, animate = false }: { className?: string; animate?: boolean }) {
  return (
    <span role="img" aria-label="lindone" className={cx("logo-mark", animate && "logo-pop", className)}>
      {LETTERS.map((letter, index) => (
        <span key={index} aria-hidden="true">
          {letter}
        </span>
      ))}
    </span>
  );
}
