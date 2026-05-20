import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { getDictionary, hasLocale } from "../../dictionaries/dictionaries";
import LanguageSettingsClient from "./LanguageSettingsClient";

export default async function LanguageSettingsPage({
  params,
}: PageProps<"/[lang]/settings/language">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${lang}/login`);
  }

  const t = await getDictionary(lang);
  const initialLocale =
    (user as { locale?: string }).locale === "ru" ? "ru" : "en";

  return (
    <LanguageSettingsClient
      title={t.settings.sections.language}
      lang={lang}
      initialLocale={initialLocale}
      t={t.settings.language}
    />
  );
}
