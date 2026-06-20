import type { Locale } from "@/generated/prisma/enums";
import { withSession } from "@/lib/with-session";
import { DomainError } from "@/lib/domain-error";

function toLocale(value: unknown): Locale | null {
  if (value === "en" || value === "es" || value === "ru") {
    return value;
  }

  return null;
}

export const PATCH = withSession(async ({ prisma, user, request }) => {
  const body = (await request.json().catch(() => null)) as {
    locale?: unknown;
  } | null;

  const nextLocale = toLocale(body?.locale);
  if (!nextLocale) {
    return Response.json(
      { errorCode: "ERR_INVALID_LOCALE" },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  });

  if (!existingUser) {
    throw new DomainError("ERR_USER_NOT_FOUND");
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { locale: nextLocale },
    select: { locale: true },
  });

  return Response.json({ locale: updatedUser.locale });
});
