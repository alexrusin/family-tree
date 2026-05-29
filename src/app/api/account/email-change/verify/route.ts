import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import {
  hashPendingEmailChangeToken,
  isPendingEmailChangeExpired,
} from "@/lib/pending-email-change-token";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      token?: unknown;
    } | null;

    if (
      !body ||
      typeof body.token !== "string" ||
      body.token.trim().length < 8
    ) {
      return NextResponse.json(
        { errorCode: "ERR_EMAIL_CHANGE_TOKEN_INVALID" },
        { status: 400 },
      );
    }

    const tokenHash = hashPendingEmailChangeToken(body.token);

    const pending = await prisma.pendingEmailChange.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        newEmail: true,
        expiresAt: true,
      },
    });

    if (!pending) {
      return NextResponse.json(
        { errorCode: "ERR_EMAIL_CHANGE_TOKEN_INVALID" },
        { status: 404 },
      );
    }

    if (isPendingEmailChangeExpired(pending.expiresAt)) {
      await prisma.pendingEmailChange
        .delete({ where: { id: pending.id } })
        .catch(() => undefined);

      return NextResponse.json(
        { errorCode: "ERR_EMAIL_CHANGE_TOKEN_EXPIRED" },
        { status: 410 },
      );
    }

    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.user.findUnique({
          where: { email: pending.newEmail },
          select: { id: true },
        });

        if (existing && existing.id !== pending.userId) {
          throw new Error("ERR_EMAIL_IN_USE");
        }

        await tx.user.update({
          where: { id: pending.userId },
          data: {
            email: pending.newEmail,
            emailVerified: true,
          },
        });

        await tx.pendingEmailChange.delete({
          where: { id: pending.id },
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === "ERR_EMAIL_IN_USE") {
        return NextResponse.json(
          { errorCode: "ERR_EMAIL_IN_USE" },
          { status: 409 },
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json(
          { errorCode: "ERR_EMAIL_IN_USE" },
          { status: 409 },
        );
      }

      throw error;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error verifying account email change:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}
