import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "@/lib/auth";
import { getTreeRole } from "@/lib/tree-domain/tree-access";
import {
  isValidArrangement,
  type TreeArrangement,
} from "@/lib/tree-domain/tree-layout";

function getPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
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

    const tree = await prisma.familyTree.findUnique({
      where: { id: treeId },
      select: { nodePositions: true },
    });

    const raw = tree?.nodePositions;
    const arrangement: TreeArrangement | null =
      raw != null && isValidArrangement(raw) ? raw : null;

    return NextResponse.json({ arrangement }, { status: 200 });
  } catch (error) {
    console.error("Error loading tree arrangement:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json(
        { errorCode: "ERR_UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { treeId } = await params;
    const prisma = getPrismaClient();
    const role = await getTreeRole(prisma, treeId, session.user.id);

    if (role === "none" || role === "viewer") {
      return NextResponse.json({ errorCode: "ERR_FORBIDDEN" }, { status: 403 });
    }

    const body = (await request.json()) as { arrangement?: unknown };
    if (!isValidArrangement(body.arrangement)) {
      return NextResponse.json(
        { errorCode: "ERR_INVALID_ARRANGEMENT" },
        { status: 400 },
      );
    }

    const arrangement: TreeArrangement = body.arrangement;
    await prisma.familyTree.update({
      where: { id: treeId },
      data: { nodePositions: arrangement },
    });

    return NextResponse.json({ arrangement }, { status: 200 });
  } catch (error) {
    console.error("Error saving tree arrangement:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}
