"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

/** Set in an effect, so it is only ever true in the browser after the first page has mounted. */
let hasMounted = false;

/**
 * Page transition: a sheet of glass sweeps up off the new page while its content settles.
 * Skipped on the very first paint (nothing to transition from) and with reduced motion.
 */
export default function Template({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [navigated] = useState(() => hasMounted);
  const animate = navigated && !reduced;

  useEffect(() => {
    hasMounted = true;
  }, []);

  if (!animate) return <>{children}</>;

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="glass pointer-events-none fixed inset-x-0 top-0 z-30 h-[100dvh]"
        style={{ ["--glass-radius" as string]: "0 0 44px 44px", ["--glass-blur" as string]: "16px" }}
        initial={{ y: "0%", opacity: 1 }}
        animate={{ y: "-104%", opacity: 0.85 }}
        transition={{ duration: 0.62, ease: [0.65, 0, 0.2, 1] }}
      />
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 210, damping: 26, delay: 0.1 }}
      >
        {children}
      </motion.div>
    </>
  );
}
