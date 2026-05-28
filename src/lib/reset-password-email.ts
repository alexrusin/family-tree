import enDictionary from "@/app/[lang]/dictionaries/en.json";
import esDictionary from "@/app/[lang]/dictionaries/es.json";
import ruDictionary from "@/app/[lang]/dictionaries/ru.json";
import type { Locale } from "@/generated/prisma/enums";

type ResetPasswordEmailInput = {
  locale: Locale;
  resetLink: string;
};

const SUBJECTS = {
  en: enDictionary.auth.emailSubjects.reset,
  es: esDictionary.auth.emailSubjects.reset,
  ru: ruDictionary.auth.emailSubjects.reset,
} as const;

const CONTENT = {
  en: enDictionary.auth.resetPassword.email,
  es: esDictionary.auth.resetPassword.email,
  ru: ruDictionary.auth.resetPassword.email,
} as const;

export function buildResetPasswordEmail(input: ResetPasswordEmailInput): {
  subject: string;
  html: string;
} {
  const copy = CONTENT[input.locale];
  const subject = SUBJECTS[input.locale];
  const safeResetLink = encodeURI(input.resetLink);

  return {
    subject,
    html: `<p>${copy.intro}</p><p><a href="${safeResetLink}">${copy.cta}</a></p><p>${copy.expiry}</p><p>${copy.fallback}</p><p>${safeResetLink}</p>`,
  };
}
