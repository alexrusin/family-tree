import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const FIVE_MB = 5 * 1024 * 1024;

export function validatePhotoFile(input: {
  contentType: string;
  sizeBytes: number;
}): void {
  if (!ALLOWED_TYPES.has(input.contentType)) {
    throw new Error("ERR_UNSUPPORTED_IMAGE_TYPE");
  }

  if (input.sizeBytes > FIVE_MB) {
    throw new Error("ERR_IMAGE_TOO_LARGE");
  }
}

export async function processImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize({
      width: 800,
      height: 800,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();
}

export async function uploadProcessedPhoto(params: {
  s3Client: S3Client;
  bucket: string;
  key: string;
  buffer: Buffer;
}): Promise<void> {
  await params.s3Client.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.buffer,
      ContentType: "image/webp",
    }),
  );
}

export async function deletePhotoByKey(params: {
  s3Client: S3Client;
  bucket: string;
  key: string;
}): Promise<void> {
  await params.s3Client.send(
    new DeleteObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    }),
  );
}