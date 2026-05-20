import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "@/lib/auth";

function getPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}

function toProfile(user: {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  pendingEmailChange?: {
    newEmail: string;
    expiresAt: Date;
  } | null;
}) {
  return {
    id: user.id,
    displayName: user.name,
    email: user.email,
    avatarUrl: user.image,
    pendingEmailChange: user.pendingEmailChange
      ? {
          email: user.pendingEmailChange.newEmail,
          expiresAt: user.pendingEmailChange.expiresAt.toISOString(),
        }
      : null,
  };
}

export async function GET(request: NextRequest) {
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

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        pendingEmailChange: {
          select: {
            newEmail: true,
            expiresAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { errorCode: "ERR_USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({ profile: toProfile(user) }, { status: 200 });
  } catch (error) {
    console.error("Error reading account profile:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = (await request.json().catch(() => null)) as {
      displayName?: unknown;
    } | null;

    if (
      !body ||
      typeof body.displayName !== "string" ||
      body.displayName.trim().length === 0
    ) {
      return NextResponse.json(
        { errorCode: "ERR_INVALID_DISPLAY_NAME" },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: body.displayName.trim() },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        pendingEmailChange: {
          select: {
            newEmail: true,
            expiresAt: true,
          },
        },
      },
    });

    return NextResponse.json({ profile: toProfile(user) }, { status: 200 });
  } catch (error) {
    console.error("Error updating account display name:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}
