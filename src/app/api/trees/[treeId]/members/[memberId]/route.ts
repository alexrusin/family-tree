import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "@/lib/auth";
import {
  canEditMembers,
  canDeleteMembers,
  getTreeRole,
} from "@/lib/tree-domain/tree-access";
import {
  compareLifeSpan,
  type PartialDate,
} from "@/lib/tree-domain/date-precision";

function getPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ treeId: string; memberId: string }> },
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

    const { treeId, memberId } = await params;
    const body = await request.json();

    if (
      body?.firstName !== undefined &&
      (typeof body.firstName !== "string" || body.firstName.trim().length === 0)
    ) {
      return NextResponse.json(
        { errorCode: "ERR_FIRST_NAME_REQUIRED" },
        { status: 400 },
      );
    }

    const updateData: {
      firstName?: string;
      lastName?: string | null;
      isLiving?: boolean;
      gender?: string;
      bio?: string | null;
      birthPrecision?: string | null;
      birthYear?: number | null;
      birthMonth?: number | null;
      birthDay?: number | null;
      deathPrecision?: string | null;
      deathYear?: number | null;
      deathMonth?: number | null;
      deathDay?: number | null;
    } = {};

    if (typeof body?.firstName === "string") {
      updateData.firstName = body.firstName.trim();
    }

    if (body?.lastName !== undefined) {
      if (body.lastName === null) {
        updateData.lastName = null;
      } else if (typeof body.lastName === "string") {
        updateData.lastName = body.lastName.trim() || null;
      }
    }

    if (body?.isLiving !== undefined && typeof body.isLiving === "boolean") {
      updateData.isLiving = body.isLiving;
    }

    const VALID_GENDERS = new Set(["male", "female", "other", "undisclosed"]);
    if (typeof body?.gender === "string" && VALID_GENDERS.has(body.gender)) {
      updateData.gender = body.gender;
    }

    if (body?.bio !== undefined) {
      updateData.bio =
        typeof body.bio === "string"
          ? body.bio.trim().slice(0, 1000) || null
          : null;
    }

    const VALID_PRECISIONS = new Set(["year", "month", "day"]);
    if (body?.birthPrecision !== undefined) {
      updateData.birthPrecision =
        typeof body.birthPrecision === "string" &&
        VALID_PRECISIONS.has(body.birthPrecision)
          ? body.birthPrecision
          : null;
    }
    if (body?.birthYear !== undefined) {
      updateData.birthYear =
        typeof body.birthYear === "number" ? body.birthYear : null;
    }
    if (body?.birthMonth !== undefined) {
      updateData.birthMonth =
        typeof body.birthMonth === "number" ? body.birthMonth : null;
    }
    if (body?.birthDay !== undefined) {
      updateData.birthDay =
        typeof body.birthDay === "number" ? body.birthDay : null;
    }

    if (body?.deathPrecision !== undefined) {
      updateData.deathPrecision =
        typeof body.deathPrecision === "string" &&
        VALID_PRECISIONS.has(body.deathPrecision)
          ? body.deathPrecision
          : null;
    }
    if (body?.deathYear !== undefined) {
      updateData.deathYear =
        typeof body.deathYear === "number" ? body.deathYear : null;
    }
    if (body?.deathMonth !== undefined) {
      updateData.deathMonth =
        typeof body.deathMonth === "number" ? body.deathMonth : null;
    }
    if (body?.deathDay !== undefined) {
      updateData.deathDay =
        typeof body.deathDay === "number" ? body.deathDay : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { errorCode: "ERR_INVALID_MEMBER_UPDATE" },
        { status: 400 },
      );
    }

    // Validate chronology when both birth and death year are in this request
    if (
      typeof body?.birthYear === "number" &&
      typeof body?.deathYear === "number"
    ) {
      const birth: PartialDate = {
        precision: (updateData.birthPrecision ??
          "year") as PartialDate["precision"],
        year: body.birthYear,
        month: updateData.birthMonth ?? null,
        day: updateData.birthDay ?? null,
      };
      const death: PartialDate = {
        precision: (updateData.deathPrecision ??
          "year") as PartialDate["precision"],
        year: body.deathYear,
        month: updateData.deathMonth ?? null,
        day: updateData.deathDay ?? null,
      };
      const chronologyError = compareLifeSpan(birth, death);
      if (chronologyError) {
        return NextResponse.json(
          { errorCode: chronologyError },
          { status: 400 },
        );
      }
    }

    const prisma = getPrismaClient();
    const role = await getTreeRole(prisma, treeId, session.user.id);

    if (!canEditMembers(role)) {
      return NextResponse.json({ errorCode: "ERR_FORBIDDEN" }, { status: 403 });
    }

    const existingMember = await prisma.treeMember.findFirst({
      where: {
        id: memberId,
        treeId,
      },
      select: { id: true },
    });

    if (!existingMember) {
      return NextResponse.json(
        { errorCode: "ERR_MEMBER_NOT_FOUND" },
        { status: 404 },
      );
    }

    const member = await prisma.treeMember.update({
      where: { id: memberId },
      data: updateData,
    });

    return NextResponse.json({ member }, { status: 200 });
  } catch (error) {
    console.error("Error updating tree member:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ treeId: string; memberId: string }> },
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

    const { treeId, memberId } = await params;
    const prisma = getPrismaClient();
    const role = await getTreeRole(prisma, treeId, session.user.id);

    if (!canDeleteMembers(role)) {
      return NextResponse.json({ errorCode: "ERR_FORBIDDEN" }, { status: 403 });
    }

    const existingMember = await prisma.treeMember.findFirst({
      where: {
        id: memberId,
        treeId,
      },
      select: { id: true },
    });

    if (!existingMember) {
      return NextResponse.json(
        { errorCode: "ERR_MEMBER_NOT_FOUND" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.treeMember.delete({
        where: { id: memberId },
      });

      await tx.familyTree.update({
        where: { id: treeId },
        data: { memberCount: { decrement: 1 } },
      });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting tree member:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}
