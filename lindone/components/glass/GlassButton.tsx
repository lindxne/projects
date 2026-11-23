"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/lib/utils/format";

type Variant = "primary" | "glass" | "ghost" | "danger";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "glass glass-pill glass-lit text-white",
  glass: "glass glass-pill text-white",
  ghost: "chip text-white hover:brightness-125",
  danger: "glass glass-pill text-rose-100 [--glass-tint:rgba(120,16,48,0.42)]",
};

const BASE =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

/** Glass lettering; icons keep their own stroke and get a glow. */
const LABEL = "glass-text inline-flex items-center gap-2 [&_svg]:glass-icon";

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
      <span className={LABEL}>{children}</span>
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
        <span className={LABEL}>{children}</span>
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...props}>
      <span className={LABEL}>{children}</span>
    </Link>
  );
}
