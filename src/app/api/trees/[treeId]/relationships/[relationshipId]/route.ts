import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "@/lib/auth";
import { canEditMembers, getTreeRole } from "@/lib/tree-domain/tree-access";

function getPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ treeId: string; relationshipId: string }> },
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
