import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolvePublicShareToken } from "@/lib/tree-domain/public-share-service";
import { resolveTreeMemberPhotoUrl } from "@/lib/tree-domain/member-photo";
import { isLocale, DEFAULT_LOCALE } from "@/lib/locale";
import {
  isValidArrangement,
  type TreeArrangement,
} from "@/lib/tree-domain/tree-layout";

function getPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}

function withPublicHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> },
) {
  try {
    const { shareToken } = await params;
    const prisma = getPrismaClient();

    const state = await resolvePublicShareToken(
      {
        findTreeByActiveToken: async (token) => {
          const tree = await prisma.familyTree.findUnique({
            where: { shareToken: token },
            select: {
              id: true,
              ownerId: true,
              shareEnabled: true,
              owner: { select: { locale: true } },
            },
          });

          if (!tree) {
            return null;
          }

          const rawLocale = tree.owner?.locale ?? "";
          return {
            id: tree.id,
            ownerId: tree.ownerId,
            ownerLocale: isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE,
            shareEnabled: tree.shareEnabled,
          };
        },
        findHistoricalToken: async (tokenHash) => {
          return prisma.publicShareTokenHistory.findUnique({
            where: { tokenHash },
            select: { treeId: true },
          });
        },
      },
      shareToken,
    );

    if (state.status === "unknown") {
      return withPublicHeaders(
        NextResponse.json({ errorCode: "ERR_LINK_NOT_FOUND" }, { status: 404 }),
      );
    }

    if (state.status === "disabled" || state.status === "regenerated") {
      return withPublicHeaders(
        NextResponse.json({ errorCode: "ERR_LINK_DISABLED" }, { status: 410 }),
      );
    }

    const treeId = state.treeId!;
    const ownerLocale = state.ownerLocale!;

    const [tree, members, relationships] = await Promise.all([
      prisma.familyTree.findUnique({
        where: { id: treeId },
        select: { id: true, name: true, nodePositions: true },
      }),
      prisma.treeMember.findMany({
        where: { treeId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.relationship.findMany({
        where: { treeId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const publicMembers = members.map((member) => {
      const baseMember = {
        ...member,
        photoUrl: resolveTreeMemberPhotoUrl({
          treeId,
          memberId: member.id,
          photoKey: member.photoKey,
          storedPhotoUrl: member.photoUrl,
        }),
      };

      if (!member.isLiving) {
        return baseMember;
      }

      return {
        ...baseMember,
        birthYear: null,
      };
    });

    const rawPositions = tree?.nodePositions;
    const arrangement: TreeArrangement | null =
      rawPositions != null && isValidArrangement(rawPositions)
        ? rawPositions
        : null;

    return withPublicHeaders(
      NextResponse.json(
        {
          tree: {
            id: tree?.id ?? treeId,
            name: tree?.name ?? "Family Tree",
          },
          ownerLocale,
          members: publicMembers,
          relationships,
          arrangement,
        },
        { status: 200 },
      ),
    );
  } catch (error) {
    if (error instanceof Error && error.message === "ERR_FORBIDDEN") {
      return withPublicHeaders(
        NextResponse.json({ errorCode: "ERR_FORBIDDEN" }, { status: 403 }),
      );
    }

    console.error("Error loading public tree:", error);
    return withPublicHeaders(
      NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 }),
    );
  }
}
