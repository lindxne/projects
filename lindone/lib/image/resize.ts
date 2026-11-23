export class ImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageError";
  }
}

export interface ResizedImage {
  blob: Blob;
  /** `image/webp`, or `image/jpeg` when the browser cannot encode WebP (older Safari). */
  contentType: string;
  width: number;
  height: number;
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Fall through to <img>, which supports a few more formats in some browsers.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => undefined };
  } catch {
    throw new ImageError("Не получилось прочитать изображение. Попробуй JPEG, PNG или WebP.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function render(
  file: Blob,
  layout: (width: number, height: number) => { sx: number; sy: number; sw: number; sh: number; dw: number; dh: number },
  quality: number,
): Promise<ResizedImage> {
  const image = await decode(file);
  try {
    if (image.width === 0 || image.height === 0) throw new ImageError("Изображение пустое.");
    const { sx, sy, sw, sh, dw, dh } = layout(image.width, image.height);
    const canvas = document.createElement("canvas");
    canvas.width = dw;
    canvas.height = dh;
    const context = canvas.getContext("2d");
    if (!context) throw new ImageError("Браузер не дал обработать изображение.");
    context.imageSmoothingQuality = "high";
    context.drawImage(image.source, sx, sy, sw, sh, 0, 0, dw, dh);

    const webp = await encode(canvas, "image/webp", quality);
    if (webp && webp.type === "image/webp") {
      return { blob: webp, contentType: "image/webp", width: dw, height: dh };
    }
    const jpeg = await encode(canvas, "image/jpeg", quality);
    if (!jpeg) throw new ImageError("Браузер не смог сжать изображение.");
    return { blob: jpeg, contentType: "image/jpeg", width: dw, height: dh };
  } finally {
    image.close();
  }
}

/** Centre-crops to a square and scales to `size`×`size` (covers: 1000×1000 WebP). */
export function resizeToSquare(file: Blob, size = 1000, quality = 0.86): Promise<ResizedImage> {
  return render(
    file,
    (width, height) => {
      const side = Math.min(width, height);
      return { sx: (width - side) / 2, sy: (height - side) / 2, sw: side, sh: side, dw: size, dh: size };
    },
    quality,
  );
}

/** Scales down so the longest side is at most `maxSide` (photos: 2048 px WebP). Never upscales. */
export function resizeToMax(file: Blob, maxSide = 2048, quality = 0.84): Promise<ResizedImage> {
  return render(
    file,
    (width, height) => {
      const scale = Math.min(1, maxSide / Math.max(width, height));
      return {
        sx: 0,
        sy: 0,
        sw: width,
        sh: height,
        dw: Math.max(1, Math.round(width * scale)),
        dh: Math.max(1, Math.round(height * scale)),
      };
    },
    quality,
  );
}
