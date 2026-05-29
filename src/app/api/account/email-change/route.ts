import { NextRequest, NextResponse } from "next/server";
import type { Locale } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { sendPendingEmailChangeEmail } from "@/lib/pending-email-change-email";
import {
  generatePendingEmailChangeToken,
  hashPendingEmailChangeToken,
  pendingEmailChangeExpiresAt,
} from "@/lib/pending-email-change-token";
import { prisma } from "@/lib/prisma";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_MS = 5 * 60 * 1000;

function toLocale(value: unknown): Locale {
  if (value === "es") return "es";
  if (value === "ru") return "ru";
  return "en";
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
}

function getBaseUrl(): string {
  if (!process.env.BETTER_AUTH_URL) {
    throw new Error("BETTER_AUTH_URL is required");
  }

  return process.env.BETTER_AUTH_URL;
}

function pendingPayload(email: string, expiresAt: Date) {
  return {
    email,
    expiresAt: expiresAt.toISOString(),
  };
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

    const body = (await request.json().catch(() => null)) as {
      email?: unknown;
      locale?: unknown;
    } | null;

    const nextEmail = normalizeEmail(body?.email);
    if (!nextEmail) {
      return NextResponse.json(
        { errorCode: "ERR_INVALID_EMAIL" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        locale: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { errorCode: "ERR_USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (nextEmail === user.email.trim().toLowerCase()) {
      return NextResponse.json(
        { errorCode: "ERR_EMAIL_UNCHANGED" },
        { status: 409 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: nextEmail },
      select: { id: true },
    });

    if (existingUser && existingUser.id !== user.id) {
      return NextResponse.json(
        { errorCode: "ERR_EMAIL_IN_USE" },
        { status: 409 },
      );
    }

    const locale = toLocale(body?.locale ?? user.locale);
    const token = generatePendingEmailChangeToken();
    const tokenHash = hashPendingEmailChangeToken(token);
    const expiresAt = pendingEmailChangeExpiresAt();

    await prisma.pendingEmailChange.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        newEmail: nextEmail,
        tokenHash,
        locale,
        expiresAt,
      },
      update: {
        newEmail: nextEmail,
        tokenHash,
        locale,
        expiresAt,
      },
    });

    const verifyUrl = new URL(
      `/${locale}/verify-email-change/${encodeURIComponent(token)}`,
      getBaseUrl(),
    ).toString();

    await sendPendingEmailChangeEmail({
      locale,
      verifyUrl,
      nextEmail,
      to: nextEmail,
    });

    return NextResponse.json(
      {
        pendingEmailChange: pendingPayload(nextEmail, expiresAt),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error requesting account email change:", error);
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

    const pending = await prisma.pendingEmailChange.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        userId: true,
        newEmail: true,
        locale: true,
        updatedAt: true,
      },
    });

    if (!pending) {
      return NextResponse.json(
        { errorCode: "ERR_PENDING_EMAIL_CHANGE_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (
      pending.updatedAt &&
      Date.now() - pending.updatedAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      return NextResponse.json(
        { errorCode: "ERR_RESEND_COOLDOWN" },
        { status: 429 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: pending.newEmail },
      select: { id: true },
    });

    if (existingUser && existingUser.id !== pending.userId) {
      return NextResponse.json(
        { errorCode: "ERR_EMAIL_IN_USE" },
        { status: 409 },
      );
    }

    const token = generatePendingEmailChangeToken();
    const tokenHash = hashPendingEmailChangeToken(token);
    const expiresAt = pendingEmailChangeExpiresAt();

    await prisma.pendingEmailChange.update({
      where: { id: pending.id },
      data: {
        tokenHash,
        expiresAt,
      },
    });

    const verifyUrl = new URL(
      `/${pending.locale}/verify-email-change/${encodeURIComponent(token)}`,
      getBaseUrl(),
    ).toString();

    await sendPendingEmailChangeEmail({
      locale: pending.locale,
      verifyUrl,
      nextEmail: pending.newEmail,
      to: pending.newEmail,
    });

    return NextResponse.json(
      {
        pendingEmailChange: pendingPayload(pending.newEmail, expiresAt),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error resending account email change verification:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}
