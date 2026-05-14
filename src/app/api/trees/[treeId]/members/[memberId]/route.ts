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

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ treeId: string; memberId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ errorCode: "ERR_UNAUTHORIZED" }, { status: 401 });
    }

    const { treeId, memberId } = await params;
    const body = await request.json();

    if (
      body?.firstName !== undefined &&
      (typeof body.firstName !== "string" || body.firstName.trim().length === 0)
    ) {
      return NextResponse.json(
        { errorCode: "ERR_FIRST_NAME_REQUIRED" },
        { status: 400 },
      );
    }

    const updateData: {
      firstName?: string;
      lastName?: string | null;
      isLiving?: boolean;
    } = {};

    if (typeof body?.firstName === "string") {
      updateData.firstName = body.firstName.trim();
    }

    if (body?.lastName !== undefined) {
      if (body.lastName === null) {
        updateData.lastName = null;
      } else if (typeof body.lastName === "string") {
        updateData.lastName = body.lastName.trim() || null;
      }
    }

    if (body?.isLiving !== undefined && typeof body.isLiving === "boolean") {
      updateData.isLiving = body.isLiving;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { errorCode: "ERR_INVALID_MEMBER_UPDATE" },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    const role = await getTreeRole(prisma, treeId, session.user.id);

    if (!canEditMembers(role)) {
      return NextResponse.json({ errorCode: "ERR_FORBIDDEN" }, { status: 403 });
    }

    const existingMember = await prisma.treeMember.findFirst({
      where: {
        id: memberId,
        treeId,
      },
      select: { id: true },
    });

    if (!existingMember) {
      return NextResponse.json(
        { errorCode: "ERR_MEMBER_NOT_FOUND" },
        { status: 404 },
      );
    }

    const member = await prisma.treeMember.update({
      where: { id: memberId },
      data: updateData,
    });

    return NextResponse.json({ member }, { status: 200 });
  } catch (error) {
    console.error("Error updating tree member:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ treeId: string; memberId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ errorCode: "ERR_UNAUTHORIZED" }, { status: 401 });
    }

    const { treeId, memberId } = await params;
    const prisma = getPrismaClient();
    const role = await getTreeRole(prisma, treeId, session.user.id);

    if (role !== "owner") {
      return NextResponse.json({ errorCode: "ERR_FORBIDDEN" }, { status: 403 });
    }

    const existingMember = await prisma.treeMember.findFirst({
      where: {
        id: memberId,
        treeId,
      },
      select: { id: true },
    });

    if (!existingMember) {
      return NextResponse.json(
        { errorCode: "ERR_MEMBER_NOT_FOUND" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.treeMember.delete({
        where: { id: memberId },
      });

      await tx.familyTree.update({
        where: { id: treeId },
        data: { memberCount: { decrement: 1 } },
      });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting tree member:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}