import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "@/lib/auth";
import { getTreeRole } from "@/lib/tree-domain/tree-access";
import { exportTreeAsGedcom } from "@/lib/tree-domain/export-service";

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

    const { content, filename } = await exportTreeAsGedcom({
      repo: {
        getRole: (id, userId) => getTreeRole(prisma, id, userId),
        getTree: async (id) => {
          const tree = await prisma.familyTree.findUnique({
            where: { id },
            select: { id: true, name: true },
          });
          return tree;
        },
        getMembers: async (id) => {
          return prisma.treeMember.findMany({
            where: { treeId: id },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              gender: true,
              bio: true,
              birthPrecision: true,
              birthYear: true,
              birthMonth: true,
              birthDay: true,
              deathPrecision: true,
              deathYear: true,
              deathMonth: true,
              deathDay: true,
            },
          });
        },
        getRelationships: async (id) => {
          const relationships = await prisma.relationship.findMany({
            where: { treeId: id },
            select: { fromMemberId: true, toMemberId: true, type: true },
          });
          return relationships.filter(
            (r): r is (typeof relationships)[number] & {
              type: "parent" | "spouse" | "sibling";
            } => r.type !== "divorced",
          );
        },
      },
      treeId,
      actorUserId: session.user.id,
    });

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ERR_FORBIDDEN") {
        return NextResponse.json(
          { errorCode: "ERR_FORBIDDEN" },
          { status: 403 },
        );
      }
      if (error.message === "ERR_NOT_FOUND") {
        return NextResponse.json(
          { errorCode: "ERR_NOT_FOUND" },
          { status: 404 },
        );
      }
    }

    console.error("Error exporting tree as GEDCOM:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}
