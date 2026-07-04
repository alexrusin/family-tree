import { withTreeRole } from "@/lib/with-tree-role";
import { sweepStrandedGenerations } from "@/lib/family-picture/stranded-sweep";
import type { FamilyPictureMemberSnapshot } from "../route";

export const GET = withTreeRole<{ treeId: string; familyPictureId: string }>(
  "viewer",
  async (ctx) => {
    const { treeId, familyPictureId } = ctx.params;

    await sweepStrandedGenerations(ctx.prisma);

    const picture = await ctx.prisma.familyPicture.findFirst({
      where: { id: familyPictureId, treeId },
      include: {
        generations: { orderBy: { createdAt: "desc" }, take: 1 },
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      },
    });

    if (!picture || picture.userId !== ctx.user.id) {
      return Response.json({ errorCode: "ERR_NOT_FOUND" }, { status: 404 });
    }

    const latestGeneration = picture.generations[0] ?? null;
    const hasImage = picture.versions.length > 0;

    return Response.json(
      {
        id: picture.id,
        memberSnapshot: picture.memberSnapshot as FamilyPictureMemberSnapshot[],
        stylePreset: picture.stylePreset,
        settingPreset: picture.settingPreset,
        customPlace: picture.customPlace,
        personalTouch: picture.personalTouch,
        createdAt: picture.createdAt.toISOString(),
        status: latestGeneration?.status ?? "pending",
        errorMessage: latestGeneration?.errorMessage ?? null,
        imageUrl: hasImage
          ? `/api/trees/${treeId}/family-pictures/${picture.id}/image`
          : null,
      },
      { status: 200 },
    );
  },
);
