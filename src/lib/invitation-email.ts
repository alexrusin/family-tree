import enDictionary from "@/app/[lang]/dictionaries/en.json";
import esDictionary from "@/app/[lang]/dictionaries/es.json";
import ruDictionary from "@/app/[lang]/dictionaries/ru.json";
import type { CollaboratorRole, Locale } from "@/generated/prisma/enums";
import { sendEmail } from "@/lib/email";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
  es: esDictionary.tree.collaboration.email,
  ru: ruDictionary.tree.collaboration.email,
} as const;

function getInvitationCopy(locale: Locale) {
  if (locale === "es") return COPY.es;
  if (locale === "ru") return COPY.ru;
  return COPY.en;
}

export function buildInvitationEmail(input: Omit<InvitationEmailInput, "to">) {
  const copy = getInvitationCopy(input.locale);
  const roleLabel = input.role === "editor" ? copy.roleEditor : copy.roleViewer;
  const intro = copy.intro
    .replace("{inviter}", escapeHtml(input.inviterName))
    .replace("{tree}", escapeHtml(input.treeName));
  const roleLine = copy.roleLine.replace("{role}", escapeHtml(roleLabel));
  const subject = copy.subject.replace("{tree}", escapeHtml(input.treeName));
  const safeAcceptUrl = encodeURI(input.acceptUrl);
  const messageBlock = input.message
    ? `<p>${escapeHtml(copy.messageLabel)}: ${escapeHtml(input.message)}</p>`
    : "";

  return {
    subject,
    html: `<p>${intro}</p>
<p>${roleLine}</p>
${messageBlock}
<p><a href="${safeAcceptUrl}">${copy.cta}</a></p>
<p>${copy.expiry}</p>
<p>${copy.fallback}</p>
<p>${safeAcceptUrl}</p>`,
  };
}

export async function sendInvitationEmail(input: InvitationEmailInput) {
  const rendered = buildInvitationEmail(input);
  await sendEmail(input.to, rendered.subject, rendered.html);
}
