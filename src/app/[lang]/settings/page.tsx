import { redirect } from "next/navigation";

export default async function SettingsIndexPage({
  params,
}: PageProps<"/[lang]/settings">) {
  const { lang } = await params;
  redirect(`/${lang}/settings/account`);
}
