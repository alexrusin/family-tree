import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { hasLocale } from "../../../dictionaries/dictionaries";
import AcceptInvitationClient from "./AcceptInvitationClient";

export const dynamic = "force-dynamic";

export default async function AcceptInvitationPage({
  params,
}: PageProps<"/[lang]/invitations/accept/[token]">) {
  const { lang, token } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) {
    const callbackPath = `/${lang}/invitations/accept/${encodeURIComponent(token)}`;
    redirect(`/${lang}/login?callback=${encodeURIComponent(callbackPath)}`);
  }

  return <AcceptInvitationClient lang={lang} token={token} />;
}
