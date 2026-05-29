import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "@/lib/auth";
import { type RelationshipType } from "@/lib/tree-domain/relationship-canonical";
import { getTreeRole } from "@/lib/tree-domain/tree-access";
import { createRelationship } from "@/lib/tree-domain/relationship-service";

function getPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
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
      return NextResponse.json(
        { errorCode: "ERR_UNAUTHORIZED" },
        { status: 401 },
      );
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
      return NextResponse.json(
        { errorCode: "ERR_UNAUTHORIZED" },
        { status: 401 },
      );
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
        createRelationshipRecord: (args) =>
          prisma.relationship.create({
            data: {
              treeId: args.treeId,
              fromMemberId: args.fromMemberId,
              toMemberId: args.toMemberId,
              type: args.type,
            },
          }),
      },
      actorUserId: session.user.id,
      treeId,
      input: {
        fromMemberId: body.fromMemberId.trim(),
        toMemberId: body.toMemberId.trim(),
        type: body.type,
      },
    });

    return NextResponse.json({ relationship }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ERR_FORBIDDEN") {
        return NextResponse.json(
          { errorCode: "ERR_FORBIDDEN" },
          { status: 403 },
        );
      }
      if (error.message === "ERR_DUPLICATE_RELATIONSHIP") {
        return NextResponse.json(
          { errorCode: "ERR_DUPLICATE_RELATIONSHIP" },
          { status: 409 },
        );
      }
      if (error.message === "ERR_SELF_RELATIONSHIP") {
        return NextResponse.json(
          { errorCode: "ERR_SELF_RELATIONSHIP" },
          { status: 400 },
        );
      }
    }

    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json(
        { errorCode: "ERR_DUPLICATE_RELATIONSHIP" },
        { status: 409 },
      );
    }

    console.error("Error creating relationship:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}
