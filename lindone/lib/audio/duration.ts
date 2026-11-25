const DECODE_LIMIT_BYTES = 30 * 1024 * 1024;

/** Reads the duration from the file's metadata through a detached <audio> element. */
function durationFromElement(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (result: number | Error) => {
      URL.revokeObjectURL(url);
      audio.removeAttribute("src");
      if (result instanceof Error) reject(result);
      else resolve(result);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) done(audio.duration);
      else done(new Error("unknown duration"));
    };
    audio.onerror = () => done(new Error("unreadable audio"));
    audio.src = url;
  });
}

/** Decodes the file with the Web Audio API: exact even for VBR files without a length header. */
async function durationFromWebAudio(file: Blob): Promise<number> {
  const AudioContextClass =
    window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) throw new Error("Web Audio API is unavailable");
  const context = new AudioContextClass();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    return buffer.duration;
  } finally {
    void context.close();
  }
}

/**
 * Track duration in whole seconds, read in the browser before upload.
 * Web Audio decoding is used for regular files; very large files (decoding would need
 * hundreds of MB of RAM on a phone) and decode failures fall back to container metadata.
 */
export async function readAudioDuration(file: Blob): Promise<number> {
  let seconds: number;
  if (file.size <= DECODE_LIMIT_BYTES) {
    try {
      seconds = await durationFromWebAudio(file);
    } catch {
      seconds = await durationFromElement(file);
    }
  } else {
    seconds = await durationFromElement(file);
  }
  return Math.max(1, Math.round(seconds));
}
