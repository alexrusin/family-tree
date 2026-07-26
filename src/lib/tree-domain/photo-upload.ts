import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const FIVE_MB = 5 * 1024 * 1024;
const DEFAULT_S3_REGION = "us-east-1";

function resolveS3Region(): string {
  return (
    process.env.S3_REGION ??
    process.env.AWS_REGION ??
    process.env.AWS_DEFAULT_REGION ??
    DEFAULT_S3_REGION
  );
}

function resolveS3Credentials():
  | {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    }
  | undefined {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;

  if (!accessKeyId || !secretAccessKey) {
    return undefined;
  }

  return { accessKeyId, secretAccessKey, sessionToken };
}

function endpointToHost(endpoint: string): string {
  return endpoint.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
}

function parseRegionFromEndpoint(endpoint: string): string | undefined {
  const host = endpointToHost(endpoint);
  const match = host.match(/s3[.-]([a-z0-9-]+)\.amazonaws\.com$/i);
  return match?.[1];
}

function normalizeRedirectEndpointHost(host: string, bucket: string): string {
  const bucketPrefix = `${bucket}.`;
  if (host.toLowerCase().startsWith(bucketPrefix.toLowerCase())) {
    return host.slice(bucketPrefix.length);
  }

  return host;
}

function getRedirectClient(error: unknown, bucket: string): S3Client | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const maybeRedirect = error as { Code?: string; Endpoint?: string };
  if (
    maybeRedirect.Code !== "PermanentRedirect" ||
    typeof maybeRedirect.Endpoint !== "string"
  ) {
    return null;
  }

  const endpointHost = normalizeRedirectEndpointHost(
    endpointToHost(maybeRedirect.Endpoint),
    bucket,
  );
  const region = parseRegionFromEndpoint(endpointHost) ?? resolveS3Region();

  return createS3Client({
    endpoint: `https://${endpointHost}`,
    region,
  });
}

function hasTransformToByteArray(
  body: unknown,
): body is { transformToByteArray: () => Promise<Uint8Array> } {
  return (
    !!body &&
    typeof body === "object" &&
    "transformToByteArray" in body &&
    typeof body.transformToByteArray === "function"
  );
}

export function createS3Client(options?: {
  endpoint?: string;
  region?: string;
}): S3Client {
  return new S3Client({
    region: options?.region ?? resolveS3Region(),
    credentials: resolveS3Credentials(),
    endpoint: options?.endpoint,
  });
}

export function generatePhotoKey(treeId: string, memberId: string): string {
  return `trees/${treeId}/members/${memberId}.webp`;
}

export function photoPublicUrl(key: string): string {
  const bucket = process.env.S3_BUCKET ?? "";
  const region = resolveS3Region();
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

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
  contentType?: string;
}): Promise<void> {
  const contentType = params.contentType ?? "image/webp";

  try {
    await params.s3Client.send(
      new PutObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
        Body: params.buffer,
        ContentType: contentType,
      }),
    );
  } catch (error) {
    const redirectClient = getRedirectClient(error, params.bucket);
    if (!redirectClient) {
      throw error;
    }

    await redirectClient.send(
      new PutObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
        Body: params.buffer,
        ContentType: contentType,
      }),
    );
  }
}

export async function deletePhotoByKey(params: {
  s3Client: S3Client;
  bucket: string;
  key: string;
}): Promise<void> {
  try {
    await params.s3Client.send(
      new DeleteObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
      }),
    );
  } catch (error) {
    const redirectClient = getRedirectClient(error, params.bucket);
    if (!redirectClient) {
      throw error;
    }

    await redirectClient.send(
      new DeleteObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
      }),
    );
  }
}

export async function downloadPhotoByKey(params: {
  s3Client: S3Client;
  bucket: string;
  key: string;
}): Promise<{
  body: Uint8Array;
  contentType: string | undefined;
}> {
  const sendGetObject = async (client: S3Client) =>
    client.send(
      new GetObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
      }),
    );

  let response;

  try {
    response = await sendGetObject(params.s3Client);
  } catch (error) {
    const redirectClient = getRedirectClient(error, params.bucket);
    if (!redirectClient) {
      throw error;
    }

    response = await sendGetObject(redirectClient);
  }

  if (!hasTransformToByteArray(response.Body)) {
    throw new Error("ERR_INVALID_PHOTO_BODY");
  }

  return {
    body: await response.Body.transformToByteArray(),
    contentType: response.ContentType,
  };
}
