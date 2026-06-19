import { withSession } from "@/lib/with-session";
import { DomainError } from "@/lib/domain-error";
import { resolveAvatarUrlForUser } from "@/lib/avatar-storage";

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
    avatarUrl: resolveAvatarUrlForUser(user.id, user.image),
    pendingEmailChange: user.pendingEmailChange
      ? {
          email: user.pendingEmailChange.newEmail,
          expiresAt: user.pendingEmailChange.expiresAt.toISOString(),
        }
      : null,
  };
}

export const GET = withSession(async ({ prisma, user }) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
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

  if (!dbUser) {
    throw new DomainError("ERR_USER_NOT_FOUND");
  }

  return Response.json({ profile: toProfile(dbUser) });
});

export const PATCH = withSession(async ({ prisma, user, request }) => {
  const body = (await request.json().catch(() => null)) as {
    displayName?: unknown;
  } | null;

  if (
    !body ||
    typeof body.displayName !== "string" ||
    body.displayName.trim().length === 0
  ) {
    return Response.json(
      { errorCode: "ERR_INVALID_DISPLAY_NAME" },
      { status: 400 },
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
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

  return Response.json({ profile: toProfile(updatedUser) });
});
