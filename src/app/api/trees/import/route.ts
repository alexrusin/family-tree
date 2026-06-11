import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "@/lib/auth";
import { generateShareToken } from "@/lib/tree-utils";
import { importGedcomTree } from "@/lib/gedcom/import-service";

function getPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}

export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof Blob)) {
      return NextResponse.json({ errorCode: "ERR_NO_FILE" }, { status: 400 });
    }

    const fileContent = await file.text();
    const fileName = file instanceof File ? file.name : null;
    const prisma = getPrismaClient();

    const { treeId, report } = await importGedcomTree({
      repo: {
        createTreeWithMembers: ({ ownerId, name, members }) =>
          prisma.$transaction(async (tx) => {
            const tree = await tx.familyTree.create({
              data: {
                name,
                ownerId,
                shareToken: generateShareToken(),
                shareEnabled: false,
                memberCount: members.length,
              },
            });

            if (members.length > 0) {
              await tx.treeMember.createMany({
                data: members.map((member) => ({
                  treeId: tree.id,
                  firstName: member.firstName,
                  lastName: member.lastName ?? null,
                })),
              });
            }

            return { treeId: tree.id };
          }),
      },
      actorUserId: session.user.id,
      fileName,
      fileContent,
    });

    return NextResponse.json({ treeId, report }, { status: 201 });
  } catch (error) {
    console.error("Error importing GEDCOM file:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}
