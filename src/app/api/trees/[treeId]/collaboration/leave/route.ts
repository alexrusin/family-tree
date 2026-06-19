import { NextResponse } from "next/server";
import { leaveTree } from "@/lib/tree-domain/collaboration-service";
import { getTreeRole } from "@/lib/tree-domain/tree-access";
import { withTreeRole } from "@/lib/with-tree-role";

export const POST = withTreeRole<{ treeId: string }>(
  "viewer",
  async (ctx) => {
    const { treeId } = ctx.params;

    await leaveTree({
      repo: {
        getActorRole: (tId, uId) => getTreeRole(ctx.prisma, tId, uId),
        deleteCollaboratorByUser: (tId, uId) =>
          ctx.prisma.collaborator
            .delete({
              where: {
                treeId_userId: {
                  treeId: tId,
                  userId: uId,
                },
              },
            })
            .then(() => undefined),
      },
      actorUserId: ctx.user.id,
      treeId,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  },
);
