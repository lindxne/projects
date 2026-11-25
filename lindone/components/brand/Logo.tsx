import { cx } from "@/lib/utils/format";

const LETTERS = "lindone".split("");
const MID = (LETTERS.length - 1) / 2;

/** Truck-sign "lindone" wordmark: chunky letters on a gentle arch. */
export function Logo({ className, animate = false }: { className?: string; animate?: boolean }) {
  return (
    <span role="img" aria-label="lindone" className={cx("logo-mark", animate && "logo-pop", className)}>
      {LETTERS.map((letter, index) => {
        const offset = index - MID;
        return (
          <span
            key={index}
            aria-hidden="true"
            style={{ transform: `translateY(${(offset * offset * 0.022).toFixed(3)}em) rotate(${(offset * 2).toFixed(1)}deg)` }}
          >
            {letter}
          </span>
        );
      })}
    </span>
  );
}
