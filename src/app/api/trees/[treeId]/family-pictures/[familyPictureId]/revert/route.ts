import { withTreeRole } from "@/lib/with-tree-role";

export const POST = withTreeRole<{ treeId: string; familyPictureId: string }>(
  "viewer",
  async (ctx) => {
    const { treeId, familyPictureId } = ctx.params;

    const body = await ctx.request.json().catch(() => null);
    const versionNumber = body?.versionNumber;
    if (typeof versionNumber !== "number" || !Number.isInteger(versionNumber)) {
      return Response.json({ errorCode: "ERR_VERSION_REQUIRED" }, { status: 400 });
    }

    const picture = await ctx.prisma.familyPicture.findFirst({
      where: { id: familyPictureId, treeId },
      select: { userId: true },
    });

    if (!picture || picture.userId !== ctx.user.id) {
      return Response.json({ errorCode: "ERR_NOT_FOUND" }, { status: 404 });
    }

    const version = await ctx.prisma.familyPictureVersion.findUnique({
      where: { familyPictureId_versionNumber: { familyPictureId, versionNumber } },
      select: { versionNumber: true },
    });
    if (!version) {
      return Response.json({ errorCode: "ERR_VERSION_NOT_FOUND" }, { status: 404 });
    }

    // Reverting only moves the "shown by default" pointer — it never
    // deletes a Version and never touches the Generation Allowance, since
    // no model call happens.
    await ctx.prisma.familyPicture.update({
      where: { id: familyPictureId },
      data: { currentVersionNumber: version.versionNumber },
    });

    return Response.json(
      { familyPictureId, currentVersionNumber: version.versionNumber },
      { status: 200 },
    );
  },
);
