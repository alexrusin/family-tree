// Root layout is intentionally minimal.
// The [lang] segment provides the real <html> shell with locale and fonts.
// proxy.ts redirects all bare paths to the appropriate locale prefix.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
