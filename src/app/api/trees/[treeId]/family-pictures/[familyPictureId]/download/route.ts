import { withTreeRole } from "@/lib/with-tree-role";
import { createS3Client, downloadPhotoByKey } from "@/lib/tree-domain/photo-upload";
import { resolveCurrentVersion } from "@/lib/family-picture/current-version";
import { burnAiGeneratedLabel } from "@/lib/family-picture/watermark";

function isPhotoNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const maybeError = error as { Code?: string; name?: string };
  return maybeError.Code === "NoSuchKey" || maybeError.name === "NoSuchKey";
}

/**
 * Serves an exported copy of a Family Picture with the "AI-generated" label
 * burned into the pixels (PRD provenance requirement), as an attachment
 * download. The S3-stored Version itself is left untouched so it keeps the
 * provider's own provenance metadata (ADR 0007) — only this export copy is
 * re-encoded.
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

      const watermarked = await burnAiGeneratedLabel(photo.body);

      return new Response(Buffer.from(watermarked), {
        status: 200,
        headers: {
          "Content-Type": "image/webp",
          "Content-Disposition": `attachment; filename="family-picture-v${version.versionNumber}.webp"`,
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
