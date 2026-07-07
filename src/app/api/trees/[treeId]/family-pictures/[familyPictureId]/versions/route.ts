import { withTreeRole } from "@/lib/with-tree-role";
import { resolveCurrentVersion } from "@/lib/family-picture/current-version";

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
          select: { versionNumber: true, createdAt: true },
        },
      },
    });

    if (!picture || picture.userId !== ctx.user.id) {
      return Response.json({ errorCode: "ERR_NOT_FOUND" }, { status: 404 });
    }

    const currentVersion = resolveCurrentVersion(picture.versions, picture.currentVersionNumber);

    return Response.json(
      {
        versions: picture.versions.map((v) => ({
          versionNumber: v.versionNumber,
          createdAt: v.createdAt.toISOString(),
          isCurrent: v.versionNumber === currentVersion?.versionNumber,
          imageUrl: `/api/trees/${treeId}/family-pictures/${familyPictureId}/image?v=${v.versionNumber}`,
        })),
      },
      { status: 200 },
    );
  },
);
