import { NextRequest } from "next/server";
import { withSession } from "@/lib/with-session";
import { DomainError } from "@/lib/domain-error";
import { avatarKeyForUser } from "@/lib/avatar-storage";
import { createS3Client, downloadPhotoByKey } from "@/lib/tree-domain/photo-upload";

function isPhotoNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { Code?: string; name?: string };
  return maybeError.Code === "NoSuchKey" || maybeError.name === "NoSuchKey";
}

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await paramsPromise;

  const handler = withSession(async () => {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      console.error("S3_BUCKET is required for avatar downloads");
      return Response.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
    }

    const key = avatarKeyForUser(userId);

    try {
      const photo = await downloadPhotoByKey({
        s3Client: createS3Client(),
        bucket,
        key,
      });

      const body = Uint8Array.from(photo.body);

      return new Response(body.buffer, {
        status: 200,
        headers: {
          "Content-Type": photo.contentType ?? "image/webp",
          "Cache-Control": "private, max-age=60",
        },
      });
    } catch (error) {
      if (isPhotoNotFoundError(error)) {
        throw new DomainError("ERR_AVATAR_NOT_FOUND");
      }
      throw error;
    }
  });

  return handler(request);
}
