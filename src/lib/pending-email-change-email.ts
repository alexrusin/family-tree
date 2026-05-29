import enDictionary from "@/app/[lang]/dictionaries/en.json";
import esDictionary from "@/app/[lang]/dictionaries/es.json";
import ruDictionary from "@/app/[lang]/dictionaries/ru.json";
import type { Locale } from "@/generated/prisma/enums";
import { sendEmail } from "@/lib/email";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

type PendingEmailChangeEmailInput = {
  locale: Locale;
  verifyUrl: string;
  nextEmail: string;
  to: string;
};

const COPY = {
  en: enDictionary.settings.account.emailChangeEmail,
  es: esDictionary.settings.account.emailChangeEmail,
  ru: ruDictionary.settings.account.emailChangeEmail,
} as const;

function getCopy(locale: Locale) {
  return COPY[locale] ?? COPY.en;
}

export function buildPendingEmailChangeEmail(
  input: Omit<PendingEmailChangeEmailInput, "to">,
) {
  const copy = getCopy(input.locale);
  const safeVerifyUrl = encodeURI(input.verifyUrl);
  const intro = copy.intro.replace("{email}", escapeHtml(input.nextEmail));

  return {
    subject: copy.subject,
    html: `<p>${intro}</p>
<p><a href="${safeVerifyUrl}">${copy.cta}</a></p>
<p>${copy.expiry}</p>
<p>${copy.fallback}</p>
<p>${safeVerifyUrl}</p>`,
  };
}

export async function sendPendingEmailChangeEmail(
  input: PendingEmailChangeEmailInput,
): Promise<void> {
  const rendered = buildPendingEmailChangeEmail(input);
  await sendEmail(input.to, rendered.subject, rendered.html);
}
