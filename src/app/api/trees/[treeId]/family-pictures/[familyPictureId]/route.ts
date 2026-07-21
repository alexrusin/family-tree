import { NextRequest } from "next/server";
import { withTreeRole } from "@/lib/with-tree-role";
import { withSession } from "@/lib/with-session";
import { sweepStrandedGenerations } from "@/lib/family-picture/stranded-sweep";
import { refundGenerationAllowance } from "@/lib/family-picture/allowance-ledger";
import { resolveCurrentVersion } from "@/lib/family-picture/current-version";
import { deleteFamilyPicture } from "@/lib/family-picture/deletion";
import { createS3Client, deletePhotoByKey } from "@/lib/tree-domain/photo-upload";
import type { FamilyPictureMemberSnapshot } from "../route";

export const GET = withTreeRole<{ treeId: string; familyPictureId: string }>(
  "viewer",
  async (ctx) => {
    const { treeId, familyPictureId } = ctx.params;

    await sweepStrandedGenerations(ctx.prisma, (id) =>
      refundGenerationAllowance(ctx.prisma, id),
    );

    const picture = await ctx.prisma.familyPicture.findFirst({
      where: { id: familyPictureId, treeId },
      include: {
        generations: { orderBy: { createdAt: "desc" }, take: 1 },
        versions: { orderBy: { versionNumber: "desc" } },
      },
    });

    if (!picture || picture.userId !== ctx.user.id) {
      return Response.json({ errorCode: "ERR_NOT_FOUND" }, { status: 404 });
    }

    const latestGeneration = picture.generations[0] ?? null;
    const currentVersion = resolveCurrentVersion(picture.versions, picture.currentVersionNumber);

    return Response.json(
      {
        id: picture.id,
        memberSnapshot: picture.memberSnapshot as unknown as FamilyPictureMemberSnapshot[],
        stylePreset: picture.stylePreset,
        settingPreset: picture.settingPreset,
        customPlace: picture.customPlace,
        personalTouch: picture.personalTouch,
        createdAt: picture.createdAt.toISOString(),
        status: latestGeneration?.status ?? "pending",
        errorMessage: latestGeneration?.errorMessage ?? null,
        // `?v=` both cache-busts and selects which Version to serve, so a
        // revert's earlier Version shows up here too.
        imageUrl: currentVersion
          ? `/api/trees/${treeId}/family-pictures/${picture.id}/image?v=${currentVersion.versionNumber}`
          : null,
      },
      { status: 200 },
    );
  },
);

// Unlike its sibling handlers this one is gated on `withSession`, not
// `withTreeRole`: a Family Picture outlives its source tree, so requiring a
// tree role here would make an orphaned picture permanently undeletable.
// `deleteFamilyPicture` authorizes on ownership instead — see the rationale
// on that function.
export async function DELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ treeId: string; familyPictureId: string }> },
) {
  const { treeId, familyPictureId } = await paramsPromise;

  const handler = withSession(async (ctx) => {
    await sweepStrandedGenerations(ctx.prisma, (id) =>
      refundGenerationAllowance(ctx.prisma, id),
    );

    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      console.error("S3_BUCKET is required for family picture deletion");
      return Response.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
    }

    const s3Client = createS3Client();
    const outcome = await deleteFamilyPicture(
      {
        prisma: ctx.prisma,
        deletePhoto: (key) => deletePhotoByKey({ s3Client, bucket, key }),
      },
      { familyPictureId, treeId, userId: ctx.user.id },
    );

    if (!outcome.ok) {
      return Response.json(
        { errorCode: outcome.errorCode },
        { status: outcome.errorCode === "ERR_NOT_FOUND" ? 404 : 409 },
      );
    }

    return Response.json({ success: true }, { status: 200 });
  });

  return handler(request);
}
