import { withTreeRole } from "@/lib/with-tree-role";
import { toPrismaNodePositions } from "@/lib/tree-domain/tree-arrangement-json";
import {
  isValidArrangement,
  type TreeArrangement,
} from "@/lib/tree-domain/tree-layout";

export const GET = withTreeRole("viewer", async (ctx) => {
  const { treeId } = ctx.params;

  const tree = await ctx.prisma.familyTree.findUnique({
    where: { id: treeId },
    select: { nodePositions: true },
  });

  const raw = tree?.nodePositions;
  const arrangement: TreeArrangement | null =
    raw != null && isValidArrangement(raw) ? raw : null;

  return Response.json({ arrangement }, { status: 200 });
});

export const PUT = withTreeRole("editor", async (ctx) => {
  const { treeId } = ctx.params;

  const body = (await ctx.request.json()) as { arrangement?: unknown };
  if (!isValidArrangement(body.arrangement)) {
    return Response.json(
      { errorCode: "ERR_INVALID_ARRANGEMENT" },
      { status: 400 },
    );
  }

  const arrangement: TreeArrangement = body.arrangement;
  await ctx.prisma.familyTree.update({
    where: { id: treeId },
    data: { nodePositions: toPrismaNodePositions(arrangement) },
  });

  return Response.json({ arrangement }, { status: 200 });
});
