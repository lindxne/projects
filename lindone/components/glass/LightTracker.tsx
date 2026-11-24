"use client";

import { useEffect } from "react";

/**
 * Soft highlight that follows the cursor inside the hovered glass surface.
 * Coordinates are local to that element, so the light sits exactly under the pointer.
 */
export function LightTracker() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let current: HTMLElement | null = null;
    let x = 0;
    let y = 0;

    const apply = () => {
      frame = 0;
      if (!current) return;
      const rect = current.getBoundingClientRect();
      current.style.setProperty("--lx", `${(x - rect.left).toFixed(1)}px`);
      current.style.setProperty("--ly", `${(y - rect.top).toFixed(1)}px`);
    };

    const leave = () => {
      current?.style.setProperty("--lo", "0");
      current = null;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(".glass") : null;
      if (target !== current) {
        leave();
        current = target;
        current?.style.setProperty("--lo", "1");
      }
      x = event.clientX;
      y = event.clientY;
      if (current && frame === 0) frame = requestAnimationFrame(apply);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", leave);
      if (frame !== 0) cancelAnimationFrame(frame);
      leave();
    };
  }, []);

  return null;
}
