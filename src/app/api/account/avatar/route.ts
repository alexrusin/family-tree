import { withSession } from "@/lib/with-session";
import {
  createS3Client,
  deletePhotoByKey,
  processImage,
  uploadProcessedPhoto,
  validatePhotoFile,
} from "@/lib/tree-domain/photo-upload";
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

export const PATCH = withSession(async ({ prisma, user, request }) => {
  const formData = await request.formData();
  const avatarFile = formData.get("avatar");

  if (!(avatarFile instanceof Blob) || avatarFile.size === 0) {
    return Response.json(
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
    return Response.json({ errorCode: code }, { status: 400 });
  }

  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    console.error("S3_BUCKET is required for avatar uploads");
    return Response.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }

  const inputBuffer = Buffer.from(await avatarFile.arrayBuffer());
  const outputBuffer = await processImage(inputBuffer);
  const key = avatarKeyForUser(user.id);

  await uploadProcessedPhoto({
    s3Client: createS3Client(),
    bucket,
    key,
    buffer: outputBuffer,
  });

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { image: avatarApiPath(user.id) },
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

  return Response.json({ profile: toProfile(updatedUser) });
});

export const DELETE = withSession(async ({ prisma, user }) => {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    console.error("S3_BUCKET is required for avatar deletion");
    return Response.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }

  const key = avatarKeyForUser(user.id);

  try {
    await deletePhotoByKey({
      s3Client: createS3Client(),
      bucket,
      key,
    });
  } catch {
    // Best-effort: tolerate NoSuchKey or transient S3 errors
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { image: null },
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

  return Response.json({ profile: toProfile(updatedUser) });
});
