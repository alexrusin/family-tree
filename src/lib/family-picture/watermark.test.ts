import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { burnAiGeneratedLabel } from "./watermark";

async function solidColorImage(
  width: number,
  height: number,
  color: { r: number; g: number; b: number },
): Promise<Uint8Array> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: color },
  })
    .png()
    .toBuffer();
  return new Uint8Array(buffer);
}

describe("burnAiGeneratedLabel", () => {
  it("preserves the source image dimensions", async () => {
    const source = await solidColorImage(400, 300, { r: 200, g: 200, b: 200 });

    const watermarked = await burnAiGeneratedLabel(source);
    const metadata = await sharp(Buffer.from(watermarked)).metadata();

    expect(metadata.width).toBe(400);
    expect(metadata.height).toBe(300);
  });

  function meanBrightness(
    data: Buffer,
    info: { width: number; channels: number },
    box: { x0: number; y0: number; x1: number; y1: number },
  ): number {
    let total = 0;
    let count = 0;
    for (let y = box.y0; y < box.y1; y++) {
      for (let x = box.x0; x < box.x1; x++) {
        const idx = (y * info.width + x) * info.channels;
        total += data[idx] + data[idx + 1] + data[idx + 2];
        count += 3;
      }
    }
    return total / count;
  }

  it("darkens the bottom-left region where the badge is drawn", async () => {
    const source = await solidColorImage(400, 300, { r: 255, g: 255, b: 255 });

    const watermarked = await burnAiGeneratedLabel(source);
    const { data, info } = await sharp(Buffer.from(watermarked))
      .raw()
      .toBuffer({ resolveWithObject: true });

    // The badge is a translucent black pill roughly in this corner, so its
    // average brightness should read well below the pure-white source.
    const brightness = meanBrightness(data, info, {
      x0: 0,
      y0: 250,
      x1: 100,
      y1: 300,
    });
    expect(brightness).toBeLessThan(230);
  });

  it("leaves the top-right corner untouched", async () => {
    const source = await solidColorImage(400, 300, { r: 255, g: 255, b: 255 });

    const watermarked = await burnAiGeneratedLabel(source);
    const { data, info } = await sharp(Buffer.from(watermarked))
      .raw()
      .toBuffer({ resolveWithObject: true });

    const brightness = meanBrightness(data, info, {
      x0: 300,
      y0: 0,
      x1: 400,
      y1: 50,
    });
    expect(brightness).toBe(255);
  });

  it("returns a decodable webp image", async () => {
    const source = await solidColorImage(400, 300, { r: 100, g: 100, b: 100 });

    const watermarked = await burnAiGeneratedLabel(source);
    const metadata = await sharp(Buffer.from(watermarked)).metadata();

    expect(metadata.format).toBe("webp");
  });
});
