import { withTreeRole } from "@/lib/with-tree-role";
import { type RelationshipType } from "@/lib/tree-domain/relationship-canonical";
import { getTreeRole } from "@/lib/tree-domain/tree-access";
import { createRelationship } from "@/lib/tree-domain/relationship-service";
import { DomainError } from "@/lib/domain-error";

function isRelationshipType(value: unknown): value is RelationshipType {
  return (
    value === "parent" ||
    value === "child" ||
    value === "spouse" ||
    value === "divorced" ||
    value === "sibling"
  );
}

export const GET = withTreeRole("viewer", async (ctx) => {
  const { treeId } = ctx.params;

  const relationships = await ctx.prisma.relationship.findMany({
    where: { treeId },
    orderBy: { createdAt: "asc" },
  });

  return Response.json({ relationships }, { status: 200 });
});

export const POST = withTreeRole("editor", async (ctx) => {
  const { treeId } = ctx.params;
  const body = await ctx.request.json();

  if (
    typeof body?.fromMemberId !== "string" ||
    body.fromMemberId.trim().length === 0 ||
    typeof body?.toMemberId !== "string" ||
    body.toMemberId.trim().length === 0 ||
    !isRelationshipType(body?.type)
  ) {
    return Response.json(
      { errorCode: "ERR_INVALID_RELATIONSHIP" },
      { status: 400 },
    );
  }

  const prisma = ctx.prisma;

  const relationship = await createRelationship({
    repo: {
      getRole: (tId, uId) => getTreeRole(prisma, tId, uId),
      hasRelationship: async (args) =>
        !!(await prisma.relationship.findFirst({
          where: {
            treeId: args.treeId,
            fromMemberId: args.fromMemberId,
            toMemberId: args.toMemberId,
            type: args.type,
          },
          select: { id: true },
        })),
      findRelationship: (args) =>
        prisma.relationship.findFirst({
          where: {
            treeId: args.treeId,
            fromMemberId: args.fromMemberId,
            toMemberId: args.toMemberId,
            type: args.type,
          },
          select: { id: true },
        }),
      createRelationshipRecord: async (args) => {
        try {
          const create = prisma.relationship.create({
            data: {
              treeId: args.treeId,
              fromMemberId: args.fromMemberId,
              toMemberId: args.toMemberId,
              type: args.type,
            },
          });

          if (!args.deleteOppositeId) {
            return await create;
          }

          // Atomic swap: delete the opposite-status relationship and create the
          // new one in a single transaction so a failure can never leave the
          // pair with neither relationship (ADR-0002).
          const [, created] = await prisma.$transaction([
            prisma.relationship.delete({
              where: { id: args.deleteOppositeId },
            }),
            create,
          ]);
          return created;
        } catch (error) {
          if ((error as { code?: string })?.code === "P2002") {
            throw new DomainError("ERR_DUPLICATE_RELATIONSHIP");
          }
          throw error;
        }
      },
    },
    actorUserId: ctx.user.id,
    treeId,
    input: {
      fromMemberId: body.fromMemberId.trim(),
      toMemberId: body.toMemberId.trim(),
      type: body.type,
    },
  });

  return Response.json({ relationship }, { status: 201 });
});
