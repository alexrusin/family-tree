import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "@/lib/auth";
import { leaveTree } from "@/lib/tree-domain/collaboration-service";
import { getTreeRole } from "@/lib/tree-domain/tree-access";

function getPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
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
    const prisma = getPrismaClient();

    await leaveTree({
      repo: {
        getActorRole: (tId, uId) => getTreeRole(prisma, tId, uId),
        deleteCollaboratorByUser: (tId, uId) =>
          prisma.collaborator
            .delete({
              where: {
                treeId_userId: {
                  treeId: tId,
                  userId: uId,
                },
              },
            })
            .then(() => undefined),
      },
      actorUserId: session.user.id,
      treeId,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ERR_OWNER_CANNOT_LEAVE") {
        return NextResponse.json(
          { errorCode: "ERR_OWNER_CANNOT_LEAVE" },
          { status: 400 },
        );
      }
      if (error.message === "ERR_FORBIDDEN") {
        return NextResponse.json(
          { errorCode: "ERR_FORBIDDEN" },
          { status: 403 },
        );
      }
    }

    console.error("Error leaving tree:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}
