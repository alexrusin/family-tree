import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "@/lib/auth";
import {
  canEditMembers,
  type TreeRole,
} from "../../../../../lib/tree-domain/tree-access";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ errorCode: "ERR_UNAUTHORIZED" }, { status: 401 });
    }

    const { treeId } = await params;
    const prisma = getPrismaClient();
    const role = await getTreeRole(prisma, treeId, session.user.id);

    if (role === "none") {
      return NextResponse.json({ errorCode: "ERR_FORBIDDEN" }, { status: 403 });
    }

    const members = await prisma.treeMember.findMany({
      where: { treeId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ members }, { status: 200 });
  } catch (error) {
    console.error("Error listing tree members:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ errorCode: "ERR_UNAUTHORIZED" }, { status: 401 });
    }

    const { treeId } = await params;
    const body = await request.json();

    if (
      typeof body?.firstName !== "string" ||
      body.firstName.trim().length === 0
    ) {
      return NextResponse.json(
        { errorCode: "ERR_FIRST_NAME_REQUIRED" },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    const role = await getTreeRole(prisma, treeId, session.user.id);

    if (!canEditMembers(role)) {
      return NextResponse.json({ errorCode: "ERR_FORBIDDEN" }, { status: 403 });
    }

    const member = await prisma.treeMember.create({
      data: {
        treeId,
        firstName: body.firstName.trim(),
        isLiving: typeof body?.isLiving === "boolean" ? body.isLiving : false,
      },
    });

    await prisma.familyTree.update({
      where: { id: treeId },
      data: { memberCount: { increment: 1 } },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error("Error creating tree member:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}