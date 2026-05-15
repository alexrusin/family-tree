import enDictionary from "@/app/[lang]/dictionaries/en.json";
import ruDictionary from "@/app/[lang]/dictionaries/ru.json";
import type { CollaboratorRole, Locale } from "@/generated/prisma/enums";
import { sendEmail } from "@/lib/email";

type InvitationEmailInput = {
  locale: Locale;
  inviterName: string;
  treeName: string;
  acceptUrl: string;
  role: CollaboratorRole;
  message: string | null;
  to: string;
};

const COPY = {
  en: enDictionary.tree.collaboration.email,
  ru: ruDictionary.tree.collaboration.email,
} as const;

function getInvitationCopy(locale: Locale) {
  return locale === "ru" ? COPY.ru : COPY.en;
}

export function buildInvitationEmail(input: Omit<InvitationEmailInput, "to">) {
  const copy = getInvitationCopy(input.locale);
  const roleLabel = input.role === "editor" ? copy.roleEditor : copy.roleViewer;
  const intro = copy.intro
    .replace("{inviter}", input.inviterName)
    .replace("{tree}", input.treeName);
  const roleLine = copy.roleLine.replace("{role}", roleLabel);
  const subject = copy.subject.replace("{tree}", input.treeName);
  const messageBlock = input.message
    ? `<p>${copy.messageLabel}: ${input.message}</p>`
    : "";

  return {
    subject,
    html: `<p>${intro}</p>
<p>${roleLine}</p>
${messageBlock}
<p><a href="${input.acceptUrl}">${copy.cta}</a></p>
<p>${copy.expiry}</p>
<p>${copy.fallback}</p>
<p>${input.acceptUrl}</p>`,
  };
}

export async function sendInvitationEmail(input: InvitationEmailInput) {
  const rendered = buildInvitationEmail(input);
  await sendEmail(input.to, rendered.subject, rendered.html);
}
