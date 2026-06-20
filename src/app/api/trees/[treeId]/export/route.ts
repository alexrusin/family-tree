import { withTreeRole } from "@/lib/with-tree-role";
import { exportTreeAsGedcom } from "@/lib/tree-domain/export-service";
import { getTreeRole } from "@/lib/tree-domain/tree-access";

export const GET = withTreeRole("viewer", async (ctx) => {
  const { treeId } = ctx.params;

  const { content, filename } = await exportTreeAsGedcom({
    repo: {
      getRole: (id, userId) => getTreeRole(ctx.prisma, id, userId),
      getTree: async (id) => {
        return ctx.prisma.familyTree.findUnique({
          where: { id },
          select: { id: true, name: true },
        });
      },
      getMembers: async (id) => {
        return ctx.prisma.treeMember.findMany({
          where: { treeId: id },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
            bio: true,
            birthPrecision: true,
            birthYear: true,
            birthMonth: true,
            birthDay: true,
            deathPrecision: true,
            deathYear: true,
            deathMonth: true,
            deathDay: true,
          },
        });
      },
      getRelationships: async (id) => {
        return ctx.prisma.relationship.findMany({
          where: { treeId: id },
          select: { fromMemberId: true, toMemberId: true, type: true },
        });
      },
    },
    treeId,
    actorUserId: ctx.user.id,
  });

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
