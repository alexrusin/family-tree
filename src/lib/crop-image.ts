export interface CropAreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Match the server pipeline documented in ADR 0002
// (sharp fit:"inside" 800x800 -> WebP@82) so the client crop flows through
// unchanged instead of being re-downscaled and re-encoded server-side.
const MAX_OUTPUT_EDGE = 800;
const OUTPUT_QUALITY = 0.82;
const OUTPUT_TYPE = "image/webp";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("ERR_IMAGE_LOAD_FAILED")),
    );
    image.src = src;
  });
}

/**
 * Renders the cropped pixel rectangle of an image onto a square canvas,
 * downscaling to MAX_OUTPUT_EDGE (800px, matching the server pipeline), and
 * returns it as a WebP blob.
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
 * Wraps a cropped blob as a WebP File, reusing the source file's base name
 * so the result still passes the existing photo selection validators.
 */
export function blobToPhotoFile(blob: Blob, baseName: string): File {
  return new File([blob], `${stripExtension(baseName)}.webp`, {
    type: OUTPUT_TYPE,
  });
}
