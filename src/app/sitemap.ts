import type { MetadataRoute } from "next";
import { LOCALES, DEFAULT_LOCALE } from "@/lib/locale";
import { SITE_URL } from "@/lib/site";

// Public, indexable routes (relative to the locale prefix).
const ROUTES = ["", "/privacy", "/support"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return ROUTES.map((route) => ({
    url: `${SITE_URL}/${DEFAULT_LOCALE}${route}`,
    lastModified,
    changeFrequency: "monthly",
    priority: route === "" ? 1 : 0.6,
    alternates: {
      languages: Object.fromEntries(
        LOCALES.map((locale) => [locale, `${SITE_URL}/${locale}${route}`]),
      ),
    },
  }));
}
