import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json(
        { errorCode: "ERR_UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      console.error("S3_BUCKET is required for avatar downloads");
      return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
    }

    const { userId } = await params;
    const key = avatarKeyForUser(userId);

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
      return NextResponse.json({ errorCode: "ERR_AVATAR_NOT_FOUND" }, { status: 404 });
    }

    console.error("Error reading avatar image:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}
