import { withTreeRole } from "@/lib/with-tree-role";
import { createS3Client, downloadPhotoByKey } from "@/lib/tree-domain/photo-upload";

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
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: { s3Key: true },
        },
      },
    });

    if (!picture || picture.userId !== ctx.user.id) {
      return Response.json({ errorCode: "ERR_NOT_FOUND" }, { status: 404 });
    }

    const latestVersion = picture.versions[0];
    if (!latestVersion) {
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
        key: latestVersion.s3Key,
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
