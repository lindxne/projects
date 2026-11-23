"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/lib/utils/format";

type Variant = "primary" | "glass" | "ghost" | "danger";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-white text-ink shadow-[0_10px_30px_-12px_rgba(255,255,255,0.7)]",
  glass: "glass glass-pill text-white",
  ghost: "border border-white/25 text-white hover:bg-white/10",
  danger: "border border-rose-300/50 bg-rose-950/50 text-rose-100",
};

const BASE =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const SPRING = { type: "spring", stiffness: 520, damping: 18, mass: 0.7 } as const;

interface GlassButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  children: ReactNode;
}

export function GlassButton({ variant = "glass", className, children, type = "button", ...props }: GlassButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.94 }}
      transition={SPRING}
      className={cx(BASE, VARIANT_CLASS[variant], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}

interface GlassLinkProps {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
  external?: boolean;
  "aria-label"?: string;
}

export function GlassLink({ href, variant = "glass", className, children, external, ...props }: GlassLinkProps) {
  const classes = cx(BASE, VARIANT_CLASS[variant], "active:scale-95", className);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}
