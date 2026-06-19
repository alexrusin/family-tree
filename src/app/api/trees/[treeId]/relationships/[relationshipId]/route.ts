import { withTreeRole } from "@/lib/with-tree-role";

export const DELETE = withTreeRole<{ treeId: string; relationshipId: string }>(
  "editor",
  async (ctx) => {
    const { treeId, relationshipId } = ctx.params;

    const existingRelationship = await ctx.prisma.relationship.findFirst({
      where: {
        id: relationshipId,
        treeId,
      },
      select: { id: true },
    });

    if (!existingRelationship) {
      return Response.json(
        { errorCode: "ERR_RELATIONSHIP_NOT_FOUND" },
        { status: 404 },
      );
    }

    await ctx.prisma.relationship.delete({
      where: { id: relationshipId },
    });

    return Response.json({ success: true }, { status: 200 });
  },
);
