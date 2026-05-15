import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { CollaboratorRole } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import {
  changeCollaboratorRole,
  removeCollaborator,
} from "@/lib/tree-domain/collaboration-service";
import { getTreeRole } from "@/lib/tree-domain/tree-access";

function getPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}

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

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ treeId: string; collaboratorId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { errorCode: "ERR_UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const nextRole = parseRole(body);

    if (!nextRole) {
      return NextResponse.json({ errorCode: "ERR_INVALID_ROLE" }, { status: 400 });
    }

    const { treeId, collaboratorId } = await params;
    const prisma = getPrismaClient();

    await changeCollaboratorRole({
      repo: {
        getActorRole: (tId, uId) => getTreeRole(prisma, tId, uId),
        updateCollaboratorRole: async (tId, cId, role) => {
          const collaborator = await prisma.collaborator.findFirst({
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
            throw new Error("ERR_COLLABORATOR_NOT_FOUND");
          }

          await prisma.collaborator.update({
            where: { id: collaborator.id },
            data: {
              role,
            },
          });
        },
      },
      actorUserId: session.user.id,
      treeId,
      collaboratorId,
      role: nextRole,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ERR_FORBIDDEN") {
        return NextResponse.json(
          { errorCode: "ERR_FORBIDDEN" },
          { status: 403 },
        );
      }
      if (error.message === "ERR_COLLABORATOR_NOT_FOUND") {
        return NextResponse.json(
          { errorCode: "ERR_COLLABORATOR_NOT_FOUND" },
          { status: 404 },
        );
      }
    }

    console.error("Error updating collaborator role:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ treeId: string; collaboratorId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { errorCode: "ERR_UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { treeId, collaboratorId } = await params;
    const prisma = getPrismaClient();

    await removeCollaborator({
      repo: {
        getActorRole: (tId, uId) => getTreeRole(prisma, tId, uId),
        deleteCollaborator: async (tId, cId) => {
          const collaborator = await prisma.collaborator.findFirst({
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
            throw new Error("ERR_COLLABORATOR_NOT_FOUND");
          }

          await prisma.collaborator.delete({
            where: {
              id: collaborator.id,
            },
          });
        },
      },
      actorUserId: session.user.id,
      treeId,
      collaboratorId,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ERR_FORBIDDEN") {
        return NextResponse.json(
          { errorCode: "ERR_FORBIDDEN" },
          { status: 403 },
        );
      }
      if (error.message === "ERR_COLLABORATOR_NOT_FOUND") {
        return NextResponse.json(
          { errorCode: "ERR_COLLABORATOR_NOT_FOUND" },
          { status: 404 },
        );
      }
    }

    console.error("Error removing collaborator:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}