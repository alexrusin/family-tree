// Public base URL of the app, used for SEO metadata (canonical URLs, Open Graph,
// robots.txt, and sitemap.xml). Configured via NEXT_PUBLIC_APP_URL, with a
// localhost fallback for local development.
export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
