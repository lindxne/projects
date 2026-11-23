"use client";

import { useEffect } from "react";
import { light } from "@/lib/hooks/light";

/** Feeds the cursor / scroll position into CSS variables and the shared light object. */
export function LightTracker() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    let hasPointer = false;

    const apply = () => {
      frame = 0;
      root.style.setProperty("--mx", `${light.x.toFixed(1)}px`);
      root.style.setProperty("--my", `${light.y.toFixed(1)}px`);
      root.style.setProperty("--scroll", light.scroll.toFixed(4));
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(apply);
    };

    const readScroll = () => {
      const range = root.scrollHeight - window.innerHeight;
      light.scroll = range > 0 ? Math.min(Math.max(window.scrollY / range, 0), 1) : 0;
      if (!hasPointer) {
        // Touch: the highlight glides across the screen as the page scrolls.
        light.x = window.innerWidth * (0.2 + 0.6 * (0.5 + 0.5 * Math.sin(window.scrollY / 260)));
        light.y = window.innerHeight * (0.15 + 0.7 * light.scroll);
      }
      schedule();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      hasPointer = true;
      light.x = event.clientX;
      light.y = event.clientY;
      schedule();
    };

    light.x = window.innerWidth * 0.5;
    light.y = window.innerHeight * 0.2;
    readScroll();

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", readScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", readScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
