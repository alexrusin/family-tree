import { withTreeRole } from "@/lib/with-tree-role";
import { DomainError } from "@/lib/domain-error";

export const POST = withTreeRole("owner", async (ctx) => {
  const body = await ctx.request.json();
  const { name } = body;

  if (!name || typeof name !== "string") {
    throw new DomainError("ERR_TREE_NAME_REQUIRED");
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0 || trimmedName.length > 255) {
    throw new DomainError("ERR_TREE_NAME_LENGTH");
  }

  const updatedTree = await ctx.prisma.familyTree.update({
    where: { id: ctx.params.treeId },
    data: { name: trimmedName },
  });

  return Response.json({ success: true, tree: updatedTree }, { status: 200 });
});
