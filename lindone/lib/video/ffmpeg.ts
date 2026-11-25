import type { FFmpeg } from "@ffmpeg/ffmpeg";

export const MAX_VIDEO_SECONDS = 60;
/** Above this the single-threaded WASM build runs out of memory on phones. */
const MAX_INPUT_MB = 700;

export class VideoError extends Error {
  constructor(
    message: string,
    readonly kind: "duration" | "size" | "format" | "memory" | "load" | "cancelled",
  ) {
    super(message);
    this.name = "VideoError";
  }
}

export interface ProcessedVideo {
  video: Blob;
  poster: Blob;
  posterType: string;
  width: number;
  height: number;
  duration: number;
  /** True when the source was already H.264 ≤1080p and was only repackaged. */
  remuxed: boolean;
}

export interface VideoProgress {
  stage: "loading" | "analysing" | "transcoding" | "poster";
  /** 0..1 for `transcoding`, null when unknown. */
  fraction: number | null;
}

interface Probe {
  duration: number | null;
  codec: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  rotated: boolean;
  hasAudio: boolean;
  tenBit: boolean;
}

let instance: Promise<FFmpeg> | null = null;

async function loadFfmpeg(): Promise<FFmpeg> {
  instance ??= (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const ffmpeg = new FFmpeg();
    // The core is served from our own origin (copied to /public/ffmpeg on install).
    await ffmpeg.load({ coreURL: "/ffmpeg/ffmpeg-core.js", wasmURL: "/ffmpeg/ffmpeg-core.wasm" });
    return ffmpeg;
  })();
  try {
    return await instance;
  } catch {
    instance = null;
    throw new VideoError(
      "Could not load the video converter (32 MB). Check your connection and try again.",
      "load",
    );
  }
}

function parseClock(text: string): number | null {
  const match = /(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(text);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function parseProbe(log: string[]): Probe {
  const probe: Probe = {
    duration: null,
    codec: null,
    width: null,
    height: null,
    fps: null,
    rotated: false,
    hasAudio: false,
    tenBit: false,
  };
  for (const line of log) {
    const duration = /Duration:\s*([\d:.]+)/.exec(line);
    if (duration?.[1] && probe.duration === null) probe.duration = parseClock(duration[1]);

    if (/Stream #.*Video:/.test(line) && probe.codec === null) {
      probe.codec = /Video:\s*([a-z0-9_]+)/i.exec(line)?.[1]?.toLowerCase() ?? null;
      const size = /,\s*(\d{2,5})x(\d{2,5})[\s,[]/.exec(line);
      if (size) {
        probe.width = Number(size[1]);
        probe.height = Number(size[2]);
      }
      const fps = /([\d.]+)\s*fps/.exec(line);
      if (fps) probe.fps = Number(fps[1]);
      probe.tenBit = /p10(le|be)?\b/.test(line);
    }
    if (/Stream #.*Audio:/.test(line)) probe.hasAudio = true;
    if (/rotation of -?(90|270)/.test(line) || /rotate\s*:\s*(90|270)/.test(line)) probe.rotated = true;
  }
  return probe;
}

/** Reads width / height / duration of an MP4 the browser can decode. */
function readVideoMeta(blob: Blob): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    const finish = (action: () => void) => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      action();
    };
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () =>
      finish(() => resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration }));
    video.onerror = () => finish(() => reject(new Error("metadata")));
    video.src = url;
  });
}

function isOutOfMemory(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return /out of memory|oom|memory access|cannot enlarge|allocation failed|array buffer allocation/i.test(text);
}

/**
 * Converts any phone video to H.264 / AAC MP4 (max 1080p, 30 fps, faststart) in the browser
 * and extracts a poster frame. iPhone HEVC never reaches Storage — Chrome cannot play it.
 * Sources that are already H.264 ≤1080p are only repackaged, which takes a second.
 */
export async function processVideo(
  file: File,
  onProgress: (progress: VideoProgress) => void,
  signal?: AbortSignal,
): Promise<ProcessedVideo> {
  if (file.size > MAX_INPUT_MB * 1024 * 1024) {
    throw new VideoError(
      `Video is ${(file.size / 1024 / 1024).toFixed(0)} MB — too large to process in the browser (max ${MAX_INPUT_MB} MB).`,
      "size",
    );
  }

  onProgress({ stage: "loading", fraction: null });
  const ffmpeg = await loadFfmpeg();
  if (signal?.aborted) throw new VideoError("Processing cancelled.", "cancelled");

  const extension = /\.([a-z0-9]{2,5})$/i.exec(file.name)?.[1]?.toLowerCase() ?? "mp4";
  const input = `input.${extension}`;
  const output = "output.mp4";
  const poster = "poster.jpg";

  let log: string[] = [];
  let duration: number | null = null;
  const onLog = ({ message }: { message: string }) => {
    log.push(message);
    if (log.length > 400) log = log.slice(-200);
    if (duration && duration > 0) {
      const time = /time=\s*([\d:.]+)/.exec(message)?.[1];
      const seconds = time ? parseClock(time) : null;
      if (seconds !== null) onProgress({ stage: "transcoding", fraction: Math.min(seconds / duration, 0.99) });
    }
  };
  const onAbort = () => {
    ffmpeg.terminate();
    instance = null;
  };

  ffmpeg.on("log", onLog);
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    onProgress({ stage: "analysing", fraction: null });
    await ffmpeg.writeFile(input, new Uint8Array(await file.arrayBuffer()));

    // `ffmpeg -i` without an output prints the stream info and exits with an error code.
    await ffmpeg.exec(["-hide_banner", "-i", input]);
    const probe = parseProbe(log);
    if (!probe.codec) {
      throw new VideoError("This does not look like a video, or the file is corrupted. Try MP4 or MOV.", "format");
    }
    if (probe.duration !== null && probe.duration > MAX_VIDEO_SECONDS + 0.5) {
      throw new VideoError(
        `Video is ${Math.round(probe.duration)} s long; the limit is ${MAX_VIDEO_SECONDS} s. Trim it and upload again.`,
        "duration",
      );
    }
    duration = probe.duration;

    const longSide = Math.max(probe.width ?? 0, probe.height ?? 0);
    const shortSide = Math.min(probe.width ?? 0, probe.height ?? 0);
    const canRemux =
      probe.codec === "h264" &&
      !probe.tenBit &&
      longSide > 0 &&
      longSide <= 1920 &&
      shortSide <= 1080 &&
      (probe.fps ?? 30) <= 60;

    log = [];
    onProgress({ stage: "transcoding", fraction: 0 });
    let remuxed = false;
    if (canRemux) {
      const audio = probe.hasAudio ? ["-c:a", "aac", "-b:a", "128k", "-ac", "2"] : ["-an"];
      const code = await ffmpeg.exec(["-i", input, "-map", "0:v:0", "-map", "0:a:0?", "-c:v", "copy", ...audio, "-movflags", "+faststart", output]);
      remuxed = code === 0;
    }
    if (!remuxed) {
      const code = await ffmpeg.exec([
        "-i", input,
        "-map", "0:v:0", "-map", "0:a:0?",
        "-t", String(MAX_VIDEO_SECONDS),
        // Fit inside 1920×1080 (or 1080×1920 for portrait), never upscale, even dimensions.
        "-vf", "scale=w='if(gte(iw,ih),min(1920,iw),min(1080,iw))':h='if(gte(iw,ih),min(1080,ih),min(1920,ih))':force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p",
        "-fpsmax", "30",
        "-c:v", "libx264", "-preset", "superfast", "-crf", "25",
        "-maxrate", "5M", "-bufsize", "10M",
        "-profile:v", "high", "-level", "4.1", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-ac", "2",
        "-movflags", "+faststart",
        output,
      ]);
      if (signal?.aborted) throw new VideoError("Processing cancelled.", "cancelled");
      if (code !== 0) {
        if (log.some((line) => isOutOfMemory(line))) {
          throw new VideoError("The browser ran out of memory while converting. Close other tabs or upload a shorter video.", "memory");
        }
        throw new VideoError("Could not convert the video: unsupported codec or corrupted file.", "format");
      }
    }

    onProgress({ stage: "poster", fraction: null });
    const posterAt = Math.min(0.5, (duration ?? 1) / 3).toFixed(2);
    let posterCode = await ffmpeg.exec(["-ss", posterAt, "-i", output, "-frames:v", "1", "-vf", "scale='min(1280,iw)':-2", "-q:v", "4", poster]);
    if (posterCode !== 0) {
      posterCode = await ffmpeg.exec(["-i", output, "-frames:v", "1", "-vf", "scale='min(1280,iw)':-2", "-q:v", "4", poster]);
    }
    if (posterCode !== 0) throw new VideoError("Could not create a poster frame from the video.", "format");

    const videoData = await ffmpeg.readFile(output);
    const posterData = await ffmpeg.readFile(poster);
    if (typeof videoData === "string" || typeof posterData === "string") {
      throw new VideoError("The converter returned an unexpected result.", "format");
    }
    const video = new Blob([new Uint8Array(videoData)], { type: "video/mp4" });
    const posterBlob = new Blob([new Uint8Array(posterData)], { type: "image/jpeg" });

    let meta: { width: number; height: number; duration: number };
    try {
      meta = await readVideoMeta(video);
    } catch {
      const swap = probe.rotated;
      meta = {
        width: (swap ? probe.height : probe.width) ?? 0,
        height: (swap ? probe.width : probe.height) ?? 0,
        duration: duration ?? 0,
      };
    }

    return {
      video,
      poster: posterBlob,
      posterType: "image/jpeg",
      width: meta.width,
      height: meta.height,
      duration: Math.min(Number.isFinite(meta.duration) ? meta.duration : (duration ?? 0), MAX_VIDEO_SECONDS),
      remuxed,
    };
  } catch (error) {
    if (error instanceof VideoError) throw error;
    if (signal?.aborted) throw new VideoError("Processing cancelled.", "cancelled");
    if (isOutOfMemory(error)) {
      instance = null;
      throw new VideoError("The browser ran out of memory while converting. Close other tabs or upload a shorter video.", "memory");
    }
    throw new VideoError("Video conversion failed. Try again or use another file.", "format");
  } finally {
    ffmpeg.off("log", onLog);
    signal?.removeEventListener("abort", onAbort);
    for (const name of [input, output, poster]) {
      await ffmpeg.deleteFile(name).catch(() => undefined);
    }
  }
}
