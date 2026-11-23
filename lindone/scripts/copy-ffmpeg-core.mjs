// Copies the single-thread ffmpeg.wasm core into public/ so it is served from our own origin.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@ffmpeg", "core", "dist", "umd");
const dest = join(root, "public", "ffmpeg");

if (existsSync(src)) {
  mkdirSync(dest, { recursive: true });
  for (const file of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
    cpSync(join(src, file), join(dest, file));
  }
}
