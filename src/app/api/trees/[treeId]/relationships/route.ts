import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "@/lib/auth";
import {
  canonicalizeRelationship,
  type RelationshipType,
} from "../../../../../lib/tree-domain/relationship-canonical";
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

function isRelationshipType(value: unknown): value is RelationshipType {
  return (
    value === "parent" ||
    value === "child" ||
    value === "spouse" ||
    value === "sibling"
  );
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

    const relationships = await prisma.relationship.findMany({
      where: { treeId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ relationships }, { status: 200 });
  } catch (error) {
    console.error("Error listing relationships:", error);
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
      typeof body?.fromMemberId !== "string" ||
      body.fromMemberId.trim().length === 0 ||
      typeof body?.toMemberId !== "string" ||
      body.toMemberId.trim().length === 0 ||
      !isRelationshipType(body?.type)
    ) {
      return NextResponse.json(
        { errorCode: "ERR_INVALID_RELATIONSHIP" },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    const role = await getTreeRole(prisma, treeId, session.user.id);

    if (!canEditMembers(role)) {
      return NextResponse.json({ errorCode: "ERR_FORBIDDEN" }, { status: 403 });
    }

    const canonical = canonicalizeRelationship({
      fromMemberId: body.fromMemberId.trim(),
      toMemberId: body.toMemberId.trim(),
      type: body.type,
    });

    const duplicate = await prisma.relationship.findFirst({
      where: {
        treeId,
        fromMemberId: canonical.fromMemberId,
        toMemberId: canonical.toMemberId,
        type: canonical.type,
      },
      select: { id: true },
    });

    if (duplicate) {
      return NextResponse.json(
        { errorCode: "ERR_DUPLICATE_RELATIONSHIP" },
        { status: 409 },
      );
    }

    const relationship = await prisma.relationship.create({
      data: {
        treeId,
        fromMemberId: canonical.fromMemberId,
        toMemberId: canonical.toMemberId,
        type: canonical.type,
      },
    });

    return NextResponse.json({ relationship }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "ERR_SELF_RELATIONSHIP") {
      return NextResponse.json(
        { errorCode: "ERR_SELF_RELATIONSHIP" },
        { status: 400 },
      );
    }

    const errorCode = (error as { code?: string })?.code;
    if (errorCode === "P2002") {
      return NextResponse.json(
        { errorCode: "ERR_DUPLICATE_RELATIONSHIP" },
        { status: 409 },
      );
    }

    console.error("Error creating relationship:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}