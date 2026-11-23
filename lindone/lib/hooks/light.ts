/**
 * The single "light source" of the interface: the cursor on desktop, the scroll position on
 * touch devices. CSS reads it through --mx/--my/--scroll, WebGL through this object.
 */
export const light = {
  /** Viewport pixels. */
  x: 0,
  y: 0,
  /** Scroll progress of the page, 0..1. */
  scroll: 0,
  /** Seconds, shared by every shader so they stay in phase. */
  startedAt: 0,
};

export function shaderTime(): number {
  if (typeof performance === "undefined") return 0;
  if (light.startedAt === 0) light.startedAt = performance.now();
  return (performance.now() - light.startedAt) / 1000;
}
