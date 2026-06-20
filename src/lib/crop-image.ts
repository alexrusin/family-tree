export interface CropAreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

// The server always re-encodes to WebP@82 via sharp (see ADR 0002 / processImage),
// so the client only needs to hand off a cropped, downscaled (800px) image in a
// format every browser can encode reliably. We output JPEG rather than WebP because
// iOS Safari's canvas.toBlob WebP encoding is unreliable across versions (it can
// produce output sharp fails to decode), which broke photo uploads on iPhone/iPad.
const MAX_OUTPUT_EDGE = 800;
const OUTPUT_QUALITY = 0.9;
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_EXTENSION = "jpg";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("error", () =>
      reject(new Error("ERR_IMAGE_LOAD_FAILED")),
    );
    image.addEventListener("load", () => {
      // The "load" event fires once the bytes are downloaded, but mobile Chrome
      // may not have decoded the bitmap yet. Drawing an undecoded image to a
      // canvas paints a blank (black) frame, which is why uploads intermittently
      // came out black on mobile Chrome (Firefox decodes before firing "load",
      // so it never reproduced there). decode() resolves only once the bitmap is
      // ready to paint. Fall back to the loaded image if decode() is unsupported
      // (e.g. jsdom) or rejects spuriously — the bytes are already in hand.
      if (typeof image.decode === "function") {
        image.decode().then(
          () => resolve(image),
          () => resolve(image),
        );
      } else {
        resolve(image);
      }
    });
    image.src = src;
  });
}

/**
 * Renders the cropped pixel rectangle of an image onto a square canvas,
 * downscaling to MAX_OUTPUT_EDGE (800px, matching the server pipeline), and
 * returns it as a JPEG blob.
 */
export async function getCroppedBlob(
  imageSrc: string,
  croppedAreaPixels: CropAreaPixels,
): Promise<Blob> {
  const image = await loadImage(imageSrc);

  const outputSize = Math.round(
    Math.min(croppedAreaPixels.width, croppedAreaPixels.height, MAX_OUTPUT_EDGE),
  );

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("ERR_CANVAS_UNAVAILABLE");
  }

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("ERR_CROP_FAILED"));
        }
      },
      OUTPUT_TYPE,
      OUTPUT_QUALITY,
    );
  });
}

function stripExtension(name: string): string {
  const dotIndex = name.lastIndexOf(".");
  return dotIndex > 0 ? name.slice(0, dotIndex) : name;
}

/**
 * Wraps a cropped blob as a JPEG File, reusing the source file's base name
 * so the result still passes the existing photo selection validators.
 */
export function blobToPhotoFile(blob: Blob, baseName: string): File {
  return new File([blob], `${stripExtension(baseName)}.${OUTPUT_EXTENSION}`, {
    type: OUTPUT_TYPE,
  });
}
