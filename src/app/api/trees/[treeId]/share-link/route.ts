import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "@/lib/auth";
import { getTreeRole } from "@/lib/tree-domain/tree-access";
import {
  regeneratePublicShareToken,
  setPublicShareEnabled,
} from "@/lib/tree-domain/public-share-service";

function getPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}

function getAppUrl(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
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
    if (role !== "owner") {
      return NextResponse.json({ errorCode: "ERR_FORBIDDEN" }, { status: 403 });
    }

    const tree = await prisma.familyTree.findUnique({
      where: { id: treeId },
      select: { shareEnabled: true, shareToken: true },
    });

    if (!tree) {
      return NextResponse.json({ errorCode: "ERR_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      shareEnabled: tree.shareEnabled,
      shareToken: tree.shareToken,
      publicUrl: `${getAppUrl(request)}/t/${tree.shareToken}`,
    });
  } catch (error) {
    console.error("Error loading share link settings:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}

export async function PATCH(
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
    const body = await request.json().catch(() => null);
    const prisma = getPrismaClient();

    if (body?.action === "setEnabled" && typeof body.enabled === "boolean") {
      await setPublicShareEnabled({
        repo: {
          getTreeRole: (id, actorId) => getTreeRole(prisma, id, actorId),
          updateShareEnabled: async (id, enabled) => {
            await prisma.familyTree.update({
              where: { id },
              data: { shareEnabled: enabled },
            });
          },
        },
        treeId,
        actorUserId: session.user.id,
        enabled: body.enabled,
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (body?.action === "regenerate") {
      const result = await regeneratePublicShareToken({
        repo: {
          getTreeRole: (id, actorId) => getTreeRole(prisma, id, actorId),
          getCurrentShareToken: async (id) => {
            const tree = await prisma.familyTree.findUnique({
              where: { id },
              select: { shareToken: true },
            });
            if (!tree) {
              throw new Error("ERR_NOT_FOUND");
            }
            return tree.shareToken;
          },
          atomicRegenerateToken: async (id, oldTokenHash, nextToken) => {
            return prisma.$transaction(async (tx) => {
              await tx.publicShareTokenHistory.create({
                data: {
                  treeId: id,
                  tokenHash: oldTokenHash,
                  status: "regenerated",
                },
              });
              const updated = await tx.familyTree.update({
                where: { id },
                data: { shareToken: nextToken },
                select: { id: true, shareToken: true },
              });
              return { treeId: updated.id, shareToken: updated.shareToken };
            });
          },
        },
        treeId,
        actorUserId: session.user.id,
      });

      return NextResponse.json(
        { success: true, shareToken: result.shareToken },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { errorCode: "ERR_INVALID_ACTION" },
      { status: 400 },
    );
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

    console.error("Error updating share link settings:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}
