import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { getDictionary, hasLocale } from "../../dictionaries/dictionaries";
import { prisma } from "@/lib/prisma";
import AccountSettingsClient from "./AccountSettingsClient";
import { resolveAvatarUrlForUser } from "@/lib/avatar-storage";

export default async function AccountSettingsPage({
  params,
}: PageProps<"/[lang]/settings/account">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${lang}/login`);
  }

  const [t, pendingEmailChange] = await Promise.all([
    getDictionary(lang),
    prisma.pendingEmailChange.findUnique({
      where: { userId: user.id },
      select: { newEmail: true, expiresAt: true },
    }),
  ]);

  return (
    <AccountSettingsClient
      title={t.settings.sections.account}
      lang={lang}
      initialProfile={{
        id: user.id,
        displayName: user.name,
        email: user.email,
        avatarUrl: resolveAvatarUrlForUser(user.id, user.image ?? null),
        pendingEmailChange: pendingEmailChange
          ? {
              email: pendingEmailChange.newEmail,
              expiresAt: pendingEmailChange.expiresAt.toISOString(),
            }
          : null,
      }}
      t={t.settings.account}
      cropEditor={t.tree.photoCropEditor}
    />
  );
}
