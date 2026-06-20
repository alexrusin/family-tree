import { NextRequest } from "next/server";
import { withSession } from "@/lib/with-session";
import { getTreeRole, type TreeRole } from "@/lib/tree-domain/tree-access";
import { DomainError } from "@/lib/domain-error";
import type { PrismaClient } from "@/generated/prisma/client";

export type Tier = "viewer" | "editor" | "owner";

export interface TreeRoleContext<
  P extends Record<string, string> = Record<string, string>,
> {
  prisma: PrismaClient;
  user: { id: string; [key: string]: unknown };
  request: NextRequest;
  role: "viewer" | "editor" | "owner";
  params: P;
}

const TIER_RANK: Record<string, number> = {
  none: 0,
  viewer: 1,
  editor: 2,
  owner: 3,
};

export function withTreeRole<
  P extends { treeId: string } & Record<string, string>,
>(tier: Tier, handler: (ctx: TreeRoleContext<P>) => Promise<Response>) {
  return async (
    request: NextRequest,
    { params: paramsPromise }: { params: Promise<P> },
  ): Promise<Response> => {
    const params = await paramsPromise;

    const wrapped = withSession(async (ctx) => {
      const role = await getTreeRole(ctx.prisma, params.treeId, ctx.user.id);

      if ((TIER_RANK[role] ?? 0) < TIER_RANK[tier]) {
        if (role === "none") {
          const tree = await ctx.prisma.familyTree.findUnique({
            where: { id: params.treeId },
            select: { ownerId: true },
          });
          if (!tree) {
            throw new DomainError("ERR_NOT_FOUND");
          }
        }
        throw new DomainError("ERR_FORBIDDEN");
      }

      return handler({
        ...ctx,
        role: role as Exclude<TreeRole, "none">,
        params,
      });
    });

    return wrapped(request);
  };
}
