import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../../dictionaries/dictionaries";
import VerifyEmailChangeClient from "./VerifyEmailChangeClient";

export const dynamic = "force-dynamic";

export default async function VerifyEmailChangePage({
  params,
}: PageProps<"/[lang]/verify-email-change/[token]">) {
  const { lang, token } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const t = await getDictionary(lang);

  return (
    <VerifyEmailChangeClient
      lang={lang}
      token={token}
      t={t.settings.account.emailChangeVerify}
    />
  );
}
