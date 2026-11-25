import type { HTMLAttributes } from "react";
import { cx } from "@/lib/utils/format";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /** `card` is the cheap variant for grids and feeds; `panel` is for standalone surfaces. */
  variant?: "card" | "panel" | "strong";
}

/** CSS liquid glass surface (backdrop-filter + inner shadows + chromatic rim). */
export function GlassCard({ variant = "card", className, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cx(
        "glass",
        variant === "card" && "glass-card",
        variant === "strong" && "glass-strong",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
