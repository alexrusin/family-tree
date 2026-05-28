import { NextRequest, NextResponse } from "next/server";
import type { Locale } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function toLocale(value: unknown): Locale | null {
  if (value === "en" || value === "es" || value === "ru") {
    return value;
  }

  return null;
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
      locale?: unknown;
    } | null;

    const nextLocale = toLocale(body?.locale);
    if (!nextLocale) {
      return NextResponse.json(
        { errorCode: "ERR_INVALID_LOCALE" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!existingUser) {
      return NextResponse.json(
        { errorCode: "ERR_USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { locale: nextLocale },
      select: { locale: true },
    });

    return NextResponse.json({ locale: updatedUser.locale }, { status: 200 });
  } catch (error) {
    console.error("Error updating account locale:", error);
    return NextResponse.json(
      { errorCode: "ERR_UPDATE_FAILED" },
      { status: 500 },
    );
  }
}
