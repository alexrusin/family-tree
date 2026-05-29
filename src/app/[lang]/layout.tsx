import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "./dictionaries/dictionaries";
import { LangSetter } from "./LangSetter";

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = await getDictionary(lang);
  return {
    title: t.meta.title,
    description: t.meta.description,
  };
}

export async function generateStaticParams() {
  return [{ lang: "en" }, { lang: "es" }, { lang: "ru" }];
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return (
    <>
      <LangSetter lang={lang} />
      {children}
    </>
  );
}
