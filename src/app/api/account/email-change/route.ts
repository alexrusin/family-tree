import type { Locale } from "@/generated/prisma/enums";
import { withSession } from "@/lib/with-session";
import { DomainError } from "@/lib/domain-error";
import { sendPendingEmailChangeEmail } from "@/lib/pending-email-change-email";
import {
  generatePendingEmailChangeToken,
  hashPendingEmailChangeToken,
  pendingEmailChangeExpiresAt,
} from "@/lib/pending-email-change-token";

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

export const POST = withSession(async ({ prisma, user, request }) => {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    locale?: unknown;
  } | null;

  const nextEmail = normalizeEmail(body?.email);
  if (!nextEmail) {
    return Response.json(
      { errorCode: "ERR_INVALID_EMAIL" },
      { status: 400 },
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      locale: true,
    },
  });

  if (!dbUser) {
    throw new DomainError("ERR_USER_NOT_FOUND");
  }

  if (nextEmail === dbUser.email.trim().toLowerCase()) {
    throw new DomainError("ERR_EMAIL_UNCHANGED");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: nextEmail },
    select: { id: true },
  });

  if (existingUser && existingUser.id !== dbUser.id) {
    throw new DomainError("ERR_EMAIL_IN_USE");
  }

  const locale = toLocale(body?.locale ?? dbUser.locale);
  const token = generatePendingEmailChangeToken();
  const tokenHash = hashPendingEmailChangeToken(token);
  const expiresAt = pendingEmailChangeExpiresAt();

  await prisma.pendingEmailChange.upsert({
    where: { userId: dbUser.id },
    create: {
      userId: dbUser.id,
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

  return Response.json({
    pendingEmailChange: pendingPayload(nextEmail, expiresAt),
  });
});

export const PATCH = withSession(async ({ prisma, user }) => {
  const pending = await prisma.pendingEmailChange.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      userId: true,
      newEmail: true,
      locale: true,
      updatedAt: true,
    },
  });

  if (!pending) {
    throw new DomainError("ERR_PENDING_EMAIL_CHANGE_NOT_FOUND");
  }

  if (
    pending.updatedAt &&
    Date.now() - pending.updatedAt.getTime() < RESEND_COOLDOWN_MS
  ) {
    throw new DomainError("ERR_RESEND_COOLDOWN");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: pending.newEmail },
    select: { id: true },
  });

  if (existingUser && existingUser.id !== pending.userId) {
    throw new DomainError("ERR_EMAIL_IN_USE");
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

  return Response.json({
    pendingEmailChange: pendingPayload(pending.newEmail, expiresAt),
  });
});
