import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "./dictionaries/dictionaries";
import { LangSetter } from "./LangSetter";
import ReportIssueWidget from "./components/ReportIssueWidget";
import { SITE_URL } from "@/lib/site";

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = await getDictionary(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: t.meta.title,
    description: t.meta.description,
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    openGraph: {
      type: "website",
      siteName: "Generations",
      title: t.meta.title,
      description: t.meta.description,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: "Generations — build your family tree together",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t.meta.title,
      description: t.meta.description,
      images: ["/og-image.png"],
    },
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

  const t = await getDictionary(lang);

  return (
    <>
      <LangSetter lang={lang} />
      {children}
      <ReportIssueWidget lang={lang} t={t.reportIssue} />
    </>
  );
}
