// This page is never rendered — proxy.ts redirects / to /en or /ru.
// It exists only to satisfy Next.js App Router's root segment requirement.
export default function RootPage() {
  return null
}
