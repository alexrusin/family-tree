import { NextRequest } from "next/server";
import { withTreeRole } from "@/lib/with-tree-role";
import { DomainError } from "@/lib/domain-error";
import {
  regeneratePublicShareToken,
  setPublicShareEnabled,
} from "@/lib/tree-domain/public-share-service";
import { getTreeRole } from "@/lib/tree-domain/tree-access";

function getAppUrl(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
}

export const GET = withTreeRole("owner", async (ctx) => {
  const { treeId } = ctx.params;

  const tree = await ctx.prisma.familyTree.findUnique({
    where: { id: treeId },
    select: { shareEnabled: true, shareToken: true },
  });

  if (!tree) {
    throw new DomainError("ERR_NOT_FOUND");
  }

  return Response.json({
    shareEnabled: tree.shareEnabled,
    shareToken: tree.shareToken,
    publicUrl: `${getAppUrl(ctx.request)}/t/${tree.shareToken}`,
  });
});

export const PATCH = withTreeRole("owner", async (ctx) => {
  const { treeId } = ctx.params;
  const body = await ctx.request.json().catch(() => null);

  if (body?.action === "setEnabled" && typeof body.enabled === "boolean") {
    await setPublicShareEnabled({
      repo: {
        getTreeRole: (id, actorId) => getTreeRole(ctx.prisma, id, actorId),
        updateShareEnabled: async (id, enabled) => {
          await ctx.prisma.familyTree.update({
            where: { id },
            data: { shareEnabled: enabled },
          });
        },
      },
      treeId,
      actorUserId: ctx.user.id,
      enabled: body.enabled,
    });

    return Response.json({ success: true }, { status: 200 });
  }

  if (body?.action === "regenerate") {
    const result = await regeneratePublicShareToken({
      repo: {
        getTreeRole: (id, actorId) => getTreeRole(ctx.prisma, id, actorId),
        getCurrentShareToken: async (id) => {
          const tree = await ctx.prisma.familyTree.findUnique({
            where: { id },
            select: { shareToken: true },
          });
          if (!tree) {
            throw new DomainError("ERR_NOT_FOUND");
          }
          return tree.shareToken;
        },
        atomicRegenerateToken: async (id, oldTokenHash, nextToken) => {
          return ctx.prisma.$transaction(async (tx) => {
            await tx.publicShareTokenHistory.create({
              data: {
                treeId: id,
                tokenHash: oldTokenHash,
                status: "regenerated",
              },
            });
            const updated = await tx.familyTree.update({
              where: { id },
              data: { shareToken: nextToken },
              select: { id: true, shareToken: true },
            });
            return { treeId: updated.id, shareToken: updated.shareToken };
          });
        },
      },
      treeId,
      actorUserId: ctx.user.id,
    });

    return Response.json(
      { success: true, shareToken: result.shareToken },
      { status: 200 },
    );
  }

  return Response.json(
    { errorCode: "ERR_INVALID_ACTION" },
    { status: 400 },
  );
});
