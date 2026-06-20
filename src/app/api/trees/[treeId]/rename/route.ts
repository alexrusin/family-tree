import { withTreeRole } from "@/lib/with-tree-role";

export const POST = withTreeRole("owner", async (ctx) => {
  const body = await ctx.request.json();
  const { name } = body;

  if (!name || typeof name !== "string") {
    return Response.json({ errorCode: "ERR_TREE_NAME_REQUIRED" }, { status: 400 });
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0 || trimmedName.length > 255) {
    return Response.json({ errorCode: "ERR_TREE_NAME_LENGTH" }, { status: 400 });
  }

  const updatedTree = await ctx.prisma.familyTree.update({
    where: { id: ctx.params.treeId },
    data: { name: trimmedName },
  });

  return Response.json({ success: true, tree: updatedTree }, { status: 200 });
});
