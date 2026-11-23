"use client";

import { useEffect, useId, useRef, useState } from "react";

interface LiquidLensProps {
  /** Corner radius of the host surface in px (clamped to half its size). */
  radius?: number;
  /** Width of the refracting bezel in px. */
  bezel?: number;
  /** How far the bezel bends the backdrop, in px. */
  strength?: number;
}

interface LensMap {
  width: number;
  height: number;
  url: string;
}

/** A displacement filter over a backdrop is far too slow without a GPU: skip software renderers. */
function hasGpu(): boolean {
  try {
    const context = document.createElement("canvas").getContext("webgl");
    const info = context?.getExtension("WEBGL_debug_renderer_info");
    const renderer = context && info ? String(context.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return renderer !== "" && !/swiftshader|llvmpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}

/** Only Chromium applies an SVG filter to a backdrop; elsewhere the CSS glass stays as is. */
function supportsBackdropLens(): boolean {
  const agent = navigator.userAgent;
  return (
    /Chrome\/\d+/.test(agent) &&
    !/Firefox|FxiOS|CriOS|EdgiOS/.test(agent) &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    CSS.supports("backdrop-filter", "url(#lens)") &&
    hasGpu()
  );
}

/**
 * Displacement map of a rounded slab of glass: neutral in the middle, and along the bezel
 * each pixel points towards the centre, more strongly the closer it is to the edge. Red
 * carries the horizontal shift, green the vertical one (feDisplacementMap convention).
 */
function drawLensMap(width: number, height: number, radius: number, bezel: number): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const image = context.createImageData(width, height);
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const corner = Math.min(radius, halfWidth, halfHeight);
  const edge = Math.min(bezel, halfWidth, halfHeight);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const fromCentreX = x + 0.5 - halfWidth;
      const fromCentreY = y + 0.5 - halfHeight;
      const cornerX = Math.abs(fromCentreX) - (halfWidth - corner);
      const cornerY = Math.abs(fromCentreY) - (halfHeight - corner);
      const outside = Math.hypot(Math.max(cornerX, 0), Math.max(cornerY, 0));
      const depth = corner - outside - Math.min(Math.max(cornerX, cornerY), 0);

      let shiftX = 0;
      let shiftY = 0;
      if (depth >= 0 && depth < edge) {
        const bend = (1 - depth / edge) ** 2;
        let normalX = 0;
        let normalY = 0;
        if (outside > 0) {
          normalX = (Math.max(cornerX, 0) / outside) * Math.sign(fromCentreX);
          normalY = (Math.max(cornerY, 0) / outside) * Math.sign(fromCentreY);
        } else if (cornerX > cornerY) {
          normalX = Math.sign(fromCentreX);
        } else {
          normalY = Math.sign(fromCentreY);
        }
        shiftX = -normalX * bend;
        shiftY = -normalY * bend;
      }

      const offset = (y * width + x) * 4;
      image.data[offset] = Math.round(128 + shiftX * 127);
      image.data[offset + 1] = Math.round(128 + shiftY * 127);
      image.data[offset + 2] = 128;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Edge refraction for a `.glass` surface, the way Liquid Glass bends what is behind it:
 * an SVG displacement filter sized to the host is prepended to its backdrop-filter through
 * the `--glass-lens` custom property. Place it as a direct child of the surface.
 */
export function LiquidLens({ radius = 30, bezel = 22, strength = 26 }: LiquidLensProps) {
  const id = `lens-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const anchor = useRef<SVGSVGElement>(null);
  const [map, setMap] = useState<LensMap | null>(null);

  useEffect(() => {
    const host = anchor.current?.parentElement;
    if (!host || !supportsBackdropLens()) return;

    let timer = 0;
    const draw = () => {
      const width = Math.round(host.offsetWidth);
      const height = Math.round(host.offsetHeight);
      if (width < 2 || height < 2) return;
      const url = drawLensMap(width, height, radius, bezel);
      if (url) setMap({ width, height, url });
    };
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(draw, 120);
    });
    observer.observe(host);
    draw();

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      host.style.removeProperty("--glass-lens");
    };
  }, [radius, bezel]);

  useEffect(() => {
    const host = anchor.current?.parentElement;
    if (host && map) host.style.setProperty("--glass-lens", `url(#${id})`);
  }, [id, map]);

  return (
    <svg ref={anchor} aria-hidden="true" width="0" height="0" className="pointer-events-none absolute">
      {map ? (
        <filter
          id={id}
          x="0"
          y="0"
          width={map.width}
          height={map.height}
          filterUnits="userSpaceOnUse"
          primitiveUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feImage href={map.url} x="0" y="0" width={map.width} height={map.height} preserveAspectRatio="none" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={strength * 2} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      ) : null}
    </svg>
  );
}
