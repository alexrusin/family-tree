import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { getDictionary, hasLocale } from "../../dictionaries/dictionaries";
import AccountSettingsClient from "./AccountSettingsClient";

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

  const t = await getDictionary(lang);

  return (
    <AccountSettingsClient
      title={t.settings.sections.account}
      lang={lang}
      initialProfile={{
        id: user.id,
        displayName: user.name,
        email: user.email,
        avatarUrl: user.image,
        pendingEmailChange: null,
      }}
      t={t.settings.account}
    />
  );
}
