import sharp from "sharp";

const LABEL_TEXT = "AI-generated";

/**
 * Burns a visible "AI-generated" badge into the bottom-left corner of an
 * exported/downloaded Family Picture, matching the on-screen label's
 * placement (approved mockup, step 4). Re-encoding to draw the badge means
 * this copy's pixel data changes; `withMetadata()` best-efforts carrying the
 * provider's provenance metadata (C2PA, per ADR 0007) into the export too,
 * though the source of truth for that requirement is the untouched S3 copy.
 */
export async function burnAiGeneratedLabel(
  imageBytes: Uint8Array,
): Promise<Uint8Array> {
  const source = sharp(Buffer.from(imageBytes));
  const metadata = await source.metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;

  const badgeHeight = Math.round(height * 0.055);
  const fontSize = Math.round(badgeHeight * 0.48);
  const paddingX = Math.round(badgeHeight * 0.55);
  const badgeWidth = Math.round(fontSize * LABEL_TEXT.length * 0.6) + paddingX * 2;
  const margin = Math.round(height * 0.025);
  const badgeTop = height - margin - badgeHeight;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${margin}" y="${badgeTop}" width="${badgeWidth}" height="${badgeHeight}" rx="${badgeHeight / 2}" fill="black" fill-opacity="0.6" />
    <text x="${margin + paddingX}" y="${badgeTop + badgeHeight / 2}" fill="white" font-family="sans-serif" font-size="${fontSize}" font-weight="600" dominant-baseline="middle">${LABEL_TEXT}</text>
  </svg>`;

  const watermarked = await source
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .withMetadata()
    .webp({ quality: 92 })
    .toBuffer();

  return new Uint8Array(watermarked);
}
