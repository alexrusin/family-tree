import { withTreeRole } from "@/lib/with-tree-role";

export const DELETE = withTreeRole("owner", async (ctx) => {
  await ctx.prisma.familyTree.delete({
    where: { id: ctx.params.treeId },
  });

  return Response.json(
    { success: true, message: "Tree deleted successfully" },
    { status: 200 },
  );
});
