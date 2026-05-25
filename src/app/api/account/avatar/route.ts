import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createS3Client,
  processImage,
  uploadProcessedPhoto,
  validatePhotoFile,
} from "@/lib/tree-domain/photo-upload";
import { prisma } from "@/lib/prisma";
import {
  avatarApiPath,
  avatarKeyForUser,
  resolveAvatarUrlForUser,
} from "@/lib/avatar-storage";

function toProfile(user: {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  pendingEmailChange?: {
    newEmail: string;
    expiresAt: Date;
  } | null;
}) {
  return {
    id: user.id,
    displayName: user.name,
    email: user.email,
    avatarUrl: resolveAvatarUrlForUser(user.id, user.image),
    pendingEmailChange: user.pendingEmailChange
      ? {
          email: user.pendingEmailChange.newEmail,
          expiresAt: user.pendingEmailChange.expiresAt.toISOString(),
        }
      : null,
  };
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { errorCode: "ERR_UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const avatarFile = formData.get("avatar");

    if (!(avatarFile instanceof Blob) || avatarFile.size === 0) {
      return NextResponse.json(
        { errorCode: "ERR_AVATAR_REQUIRED" },
        { status: 400 },
      );
    }

    try {
      validatePhotoFile({
        contentType: avatarFile.type,
        sizeBytes: avatarFile.size,
      });
    } catch (validationError) {
      const code =
        validationError instanceof Error
          ? validationError.message
          : "ERR_UNSUPPORTED_IMAGE_TYPE";
      return NextResponse.json({ errorCode: code }, { status: 400 });
    }

    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      console.error("S3_BUCKET is required for avatar uploads");
      return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
    }

    const inputBuffer = Buffer.from(await avatarFile.arrayBuffer());
    const outputBuffer = await processImage(inputBuffer);
    const key = avatarKeyForUser(session.user.id);

    await uploadProcessedPhoto({
      s3Client: createS3Client(),
      bucket,
      key,
      buffer: outputBuffer,
    });

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: avatarApiPath(session.user.id) },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        pendingEmailChange: {
          select: {
            newEmail: true,
            expiresAt: true,
          },
        },
      },
    });

    return NextResponse.json({ profile: toProfile(user) }, { status: 200 });
  } catch (error) {
    console.error("Error updating account avatar:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}
