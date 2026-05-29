import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { getDictionary, hasLocale } from "../../dictionaries/dictionaries";
import SecuritySettingsClient from "./SecuritySettingsClient";

export default async function SecuritySettingsPage({
  params,
}: PageProps<"/[lang]/settings/security">) {
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
    <SecuritySettingsClient
      title={t.settings.sections.security}
      lang={lang}
      t={t.settings.security}
    />
  );
}
