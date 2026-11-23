"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { cx } from "@/lib/utils/format";

interface GlassSphereProps extends Omit<HTMLMotionProps<"button">, "children"> {
  /** Accessible name: sphere buttons only show an icon. */
  label: string;
  size?: number;
  active?: boolean;
  children: ReactNode;
}

/** Round glass button that squashes and springs back when pressed. */
export function GlassSphere({ label, size = 44, active = false, className, children, style, ...props }: GlassSphereProps) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      data-active={active}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.82, scaleY: 0.78 }}
      transition={{ type: "spring", stiffness: 600, damping: 12, mass: 0.6 }}
      className={cx("glass-sphere", className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
