"use client";

import { useEffect, useState } from "react";

export interface Palette {
  /** "r g b" triplets for CSS rgb(var(--x)). */
  bg: string;
  bg2: string;
  fg: string;
}

export const NEUTRAL_PALETTE: Palette = { bg: "245 245 244", bg2: "231 229 228", fg: "17 17 19" };

const CACHE_KEY = "lindone-palettes";
const memory = new Map<string, Palette>();

function loadCache(): Record<string, Palette> {
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "{}") as Record<string, Palette>;
  } catch {
    return {};
  }
}

function saveCache(key: string, palette: Palette) {
  try {
    const cache = loadCache();
    cache[key] = palette;
    const keys = Object.keys(cache);
    for (const old of keys.slice(0, Math.max(0, keys.length - 200))) delete cache[old];
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage full or blocked: memory cache still works */
  }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map((v) => Math.round(v * 255)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

/** Dominant + secondary colour of an image, weighted towards vivid pixels (like Apple Music). */
export function paletteFromPixels(data: Uint8ClampedArray): Palette {
  const buckets = new Map<number, { r: number; g: number; b: number; w: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 128) continue;
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const [, s, l] = rgbToHsl(r, g, b);
    const weight = 0.15 + s * (1 - Math.abs(l - 0.5) * 1.6);
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, w: 0 };
    bucket.r += r * weight;
    bucket.g += g * weight;
    bucket.b += b * weight;
    bucket.w += weight;
    buckets.set(key, bucket);
  }
  const ranked = [...buckets.values()].filter((b) => b.w > 0).sort((a, b) => b.w - a.w);
  if (ranked.length === 0) return NEUTRAL_PALETTE;

  const toHsl = (b: { r: number; g: number; b: number; w: number }) => rgbToHsl(b.r / b.w, b.g / b.w, b.b / b.w);
  const [h1, s1, l1] = toHsl(ranked[0]!);
  const second = ranked.find((b) => Math.abs(toHsl(b)[0] - h1) > 0.06 || Math.abs(toHsl(b)[2] - l1) > 0.2) ?? ranked[0]!;
  const [h2, s2, l2] = toHsl(second);

  const tone = (h: number, s: number, l: number) => hslToRgb(h, Math.min(s, 0.75), Math.min(Math.max(l, 0.22), 0.8));
  const bg = tone(h1, s1, l1);
  const bg2 = tone(h2, s2, l2 * 0.85);
  const fg: [number, number, number] = luminance(bg) > 0.42 ? [17, 17, 19] : [255, 255, 255];
  return { bg: bg.join(" "), bg2: bg2.join(" "), fg: fg.join(" ") };
}

function extract(src: string): Promise<Palette> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      try {
        const size = 32;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(NEUTRAL_PALETTE);
        ctx.drawImage(img, 0, 0, size, size);
        resolve(paletteFromPixels(ctx.getImageData(0, 0, size, size).data));
      } catch {
        resolve(NEUTRAL_PALETTE); // tainted canvas
      }
    };
    img.onerror = () => resolve(NEUTRAL_PALETTE);
    img.src = src;
  });
}

/** Palette of a cover image; cached in memory and localStorage, keyed by `key` (stable id) or src. */
export function useCoverPalette(src: string | null, key?: string): Palette {
  const id = key ?? src ?? "";
  const [palette, setPalette] = useState<Palette>(() => memory.get(id) ?? NEUTRAL_PALETTE);

  useEffect(() => {
    if (!src) {
      setPalette(NEUTRAL_PALETTE);
      return;
    }
    const known = memory.get(id) ?? loadCache()[id];
    if (known) {
      memory.set(id, known);
      setPalette(known);
      return;
    }
    let cancelled = false;
    void extract(src).then((result) => {
      if (cancelled) return;
      if (result !== NEUTRAL_PALETTE) {
        memory.set(id, result);
        saveCache(id, result);
      }
      setPalette(result);
    });
    return () => {
      cancelled = true;
    };
  }, [src, id]);

  return palette;
}

export function paletteStyle(palette: Palette): Record<string, string> {
  return { "--player-bg": palette.bg, "--player-bg2": palette.bg2, "--player-fg": palette.fg };
}
