"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useGraphicsTier } from "@/lib/hooks/useGraphicsTier";

const GlassLensCanvas = dynamic(() => import("./GlassLensCanvas"), { ssr: false });

interface GlassLensProps {
  /** `all`: every WebGL-capable device (the player). `desktop`: desktop only (navbar, modals). */
  tier?: "all" | "desktop";
  /** Corner radius of the host surface in px (clamped to half its height). */
  radius?: number;
  /** Blend strength of the refraction layer over the CSS glass. */
  opacity?: number;
}

/**
 * Real refraction for a glass surface: a small WebGL canvas (React Three Fiber +
 * MeshTransmissionMaterial) laid inside a `.glass` element, under its content. It refracts
 * the animated backdrop behind the surface and adds specular highlights from the light.
 * Renders nothing — leaving the CSS glass — when WebGL is unavailable.
 */
export function GlassLens({ tier = "all", radius = 28, opacity = 0.7 }: GlassLensProps) {
  const graphics = useGraphicsTier();
  const [ready, setReady] = useState(false);
  const enabled = graphics === "desktop" || (graphics === "mobile" && tier === "all");

  // Start after the page is interactive so three.js never competes with first paint.
  useEffect(() => {
    if (!enabled) return;
    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 600));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => setReady(true), { timeout: 2500 });
    return () => cancel(handle);
  }, [enabled]);

  if (!enabled || !ready) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-[1] overflow-hidden rounded-[inherit]"
      style={{ mixBlendMode: "screen", opacity }}
    >
      <GlassLensCanvas radius={radius} lowPower={graphics === "mobile"} />
    </div>
  );
}
