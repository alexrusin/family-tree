import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "@/lib/auth";
import {
  canEditMembers,
  type TreeRole,
} from "../../../../../../lib/tree-domain/tree-access";

function getPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}

async function getTreeRole(
  prisma: PrismaClient,
  treeId: string,
  userId: string,
): Promise<TreeRole> {
  const tree = await prisma.familyTree.findUnique({
    where: { id: treeId },
    select: { ownerId: true },
  });

  if (!tree) {
    return "none";
  }

  if (tree.ownerId === userId) {
    return "owner";
  }

  const collaborator = await prisma.collaborator.findUnique({
    where: {
      treeId_userId: {
        treeId,
        userId,
      },
    },
    select: {
      role: true,
      acceptedAt: true,
    },
  });

  if (!collaborator || !collaborator.acceptedAt) {
    return "none";
  }

  return collaborator.role;
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ treeId: string; relationshipId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ errorCode: "ERR_UNAUTHORIZED" }, { status: 401 });
    }

    const { treeId, relationshipId } = await params;
    const prisma = getPrismaClient();
    const role = await getTreeRole(prisma, treeId, session.user.id);

    if (!canEditMembers(role)) {
      return NextResponse.json({ errorCode: "ERR_FORBIDDEN" }, { status: 403 });
    }

    const existingRelationship = await prisma.relationship.findFirst({
      where: {
        id: relationshipId,
        treeId,
      },
      select: { id: true },
    });

    if (!existingRelationship) {
      return NextResponse.json(
        { errorCode: "ERR_RELATIONSHIP_NOT_FOUND" },
        { status: 404 },
      );
    }

    await prisma.relationship.delete({
      where: { id: relationshipId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting relationship:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}