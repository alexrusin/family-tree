import { NextResponse } from "next/server";
import type { CollaboratorRole } from "@/generated/prisma/enums";
import { DomainError } from "@/lib/domain-error";
import {
  changeCollaboratorRole,
  removeCollaborator,
} from "@/lib/tree-domain/collaboration-service";
import { getTreeRole } from "@/lib/tree-domain/tree-access";
import { withTreeRole } from "@/lib/with-tree-role";

function parseRole(value: unknown): CollaboratorRole | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const body = value as {
    role?: unknown;
  };

  if (body.role !== "editor" && body.role !== "viewer") {
    return null;
  }

  return body.role;
}

export const PATCH = withTreeRole<{ treeId: string; collaboratorId: string }>(
  "owner",
  async (ctx) => {
    const body = await ctx.request.json().catch(() => null);
    const nextRole = parseRole(body);

    if (!nextRole) {
      return NextResponse.json(
        { errorCode: "ERR_INVALID_ROLE" },
        { status: 400 },
      );
    }

    const { treeId, collaboratorId } = ctx.params;

    await changeCollaboratorRole({
      repo: {
        getActorRole: (tId, uId) => getTreeRole(ctx.prisma, tId, uId),
        updateCollaboratorRole: async (tId, cId, role) => {
          const collaborator = await ctx.prisma.collaborator.findFirst({
            where: {
              id: cId,
              treeId: tId,
              acceptedAt: {
                not: null,
              },
            },
            select: {
              id: true,
            },
          });

          if (!collaborator) {
            throw new DomainError("ERR_COLLABORATOR_NOT_FOUND");
          }

          await ctx.prisma.collaborator.update({
            where: { id: collaborator.id },
            data: {
              role,
            },
          });
        },
      },
      actorUserId: ctx.user.id,
      treeId,
      collaboratorId,
      role: nextRole,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  },
);

export const DELETE = withTreeRole<{ treeId: string; collaboratorId: string }>(
  "owner",
  async (ctx) => {
    const { treeId, collaboratorId } = ctx.params;

    await removeCollaborator({
      repo: {
        getActorRole: (tId, uId) => getTreeRole(ctx.prisma, tId, uId),
        deleteCollaborator: async (tId, cId) => {
          const collaborator = await ctx.prisma.collaborator.findFirst({
            where: {
              id: cId,
              treeId: tId,
              acceptedAt: {
                not: null,
              },
            },
            select: {
              id: true,
            },
          });

          if (!collaborator) {
            throw new DomainError("ERR_COLLABORATOR_NOT_FOUND");
          }

          await ctx.prisma.collaborator.delete({
            where: {
              id: collaborator.id,
            },
          });
        },
      },
      actorUserId: ctx.user.id,
      treeId,
      collaboratorId,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  },
);
