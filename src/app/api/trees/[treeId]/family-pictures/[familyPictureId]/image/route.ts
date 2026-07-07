import { withTreeRole } from "@/lib/with-tree-role";
import { createS3Client, downloadPhotoByKey } from "@/lib/tree-domain/photo-upload";
import { resolveCurrentVersion } from "@/lib/family-picture/current-version";

function isPhotoNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const maybeError = error as { Code?: string; name?: string };
  return maybeError.Code === "NoSuchKey" || maybeError.name === "NoSuchKey";
}

export const GET = withTreeRole<{ treeId: string; familyPictureId: string }>(
  "viewer",
  async (ctx) => {
    const { treeId, familyPictureId } = ctx.params;

    const picture = await ctx.prisma.familyPicture.findFirst({
      where: { id: familyPictureId, treeId },
      select: {
        userId: true,
        currentVersionNumber: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          select: { s3Key: true, versionNumber: true },
        },
      },
    });

    if (!picture || picture.userId !== ctx.user.id) {
      return Response.json({ errorCode: "ERR_NOT_FOUND" }, { status: 404 });
    }

    // `?v=` lets the version gallery fetch any specific Version's thumbnail;
    // without it, this serves whichever Version is current (the most recent
    // one, or an earlier one the user reverted to).
    const requestedVersionParam = new URL(ctx.request.url).searchParams.get("v");
    const requestedVersionNumber = requestedVersionParam
      ? Number.parseInt(requestedVersionParam, 10)
      : null;

    const version =
      requestedVersionNumber !== null && Number.isInteger(requestedVersionNumber)
        ? (picture.versions.find((v) => v.versionNumber === requestedVersionNumber) ?? null)
        : resolveCurrentVersion(picture.versions, picture.currentVersionNumber);

    if (!version) {
      return Response.json({ errorCode: "ERR_NOT_FOUND" }, { status: 404 });
    }

    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      console.error("S3_BUCKET is required for family picture downloads");
      return Response.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
    }

    try {
      const photo = await downloadPhotoByKey({
        s3Client: createS3Client(),
        bucket,
        key: version.s3Key,
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
        return Response.json({ errorCode: "ERR_NOT_FOUND" }, { status: 404 });
      }
      console.error("Error reading family picture image:", error);
      return Response.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
    }
  },
);
