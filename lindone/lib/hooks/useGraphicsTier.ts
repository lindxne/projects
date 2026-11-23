"use client";

import { useSyncExternalStore } from "react";

/**
 * `none`    — no WebGL (or data saver): pure CSS glass and CSS background.
 * `mobile`  — WebGL background + refraction on the player only, 30 fps.
 * `desktop` — WebGL background + refraction on the player, navbar and modals.
 */
export type GraphicsTier = "none" | "mobile" | "desktop";

let cached: GraphicsTier | undefined;

function detect(): GraphicsTier {
  if (cached) return cached;
  let supported = false;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    supported = context !== null;
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    supported = false;
  }
  const saveData =
    "connection" in navigator &&
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

  if (!supported || saveData) {
    cached = "none";
  } else if (window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)").matches) {
    cached = "desktop";
  } else {
    cached = "mobile";
  }
  return cached;
}

const subscribe = () => () => {};

export function useGraphicsTier(): GraphicsTier {
  return useSyncExternalStore(subscribe, detect, () => "none");
}

/** Called when a WebGL canvas fails at runtime: everything falls back to CSS. */
export function disableWebGL(): void {
  cached = "none";
}
