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

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/** Derives Content-Type and filename extension from the stored key so a
 * Version's download always matches whatever format it was actually stored
 * in (ADR 0009), rather than hardcoding one format for every Version. */
function fileInfoForKey(key: string): { contentType: string; extension: string } {
  const extension = key.split(".").pop()?.toLowerCase() ?? "";
  return {
    contentType: EXTENSION_CONTENT_TYPES[extension] ?? "application/octet-stream",
    extension,
  };
}

/**
 * Serves the untouched S3 original for a Family Picture Version as an
 * attachment download (ADR 0009) — no re-encode, so the served bytes and
 * the provider's native provenance metadata (C2PA, per ADR 0007) are
 * preserved exactly as stored.
 */
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

      const { contentType, extension } = fileInfoForKey(version.s3Key);

      return new Response(Buffer.from(photo.body), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="family-picture-v${version.versionNumber}.${extension}"`,
          "Cache-Control": "private, max-age=60",
        },
      });
    } catch (error) {
      if (isPhotoNotFoundError(error)) {
        return Response.json({ errorCode: "ERR_NOT_FOUND" }, { status: 404 });
      }
      console.error("Error preparing family picture download:", error);
      return Response.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
    }
  },
);
