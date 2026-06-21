import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getDictionary, hasLocale } from "./dictionaries/dictionaries";
import LanguagePicker from "./components/LanguagePicker";
import { getCurrentUser } from "@/lib/auth-utils";

// SVG tree demo component — no external images
function TreeDemo({ t }: { t: Record<string, string> }) {
  return (
    <div
      className="relative w-full max-w-sm mx-auto"
      aria-hidden="true"
      style={{ height: 300 }}
    >
      <svg
        viewBox="0 0 320 300"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Generation 1 — grandparents */}
        {/* Horizontal connector between grandparents */}
        <line
          x1="80"
          y1="50"
          x2="240"
          y2="50"
          stroke="#dcc1b6"
          strokeWidth="2"
        />
        {/* Vertical from grandparents down to parents row */}
        <line
          x1="160"
          y1="50"
          x2="160"
          y2="110"
          stroke="#dcc1b6"
          strokeWidth="2"
        />
        {/* Horizontal connector between parents */}
        <line
          x1="100"
          y1="165"
          x2="220"
          y2="165"
          stroke="#dcc1b6"
          strokeWidth="2"
        />
        {/* Vertical from parents midpoint down to you */}
        <line
          x1="160"
          y1="165"
          x2="160"
          y2="220"
          stroke="#dcc1b6"
          strokeWidth="2"
        />

        {/* Grandparent 1 node */}
        <circle
          cx="80"
          cy="50"
          r="28"
          fill="#ffffff"
          stroke="#dcc1b6"
          strokeWidth="2"
        />
        <text x="80" y="44" textAnchor="middle" fontSize="18" fill="#887269">
          👴
        </text>
        <text
          x="80"
          y="90"
          textAnchor="middle"
          fontSize="10"
          fill="#55433a"
          fontFamily="Inter, sans-serif"
        >
          {t.grandparent1}
        </text>

        {/* Grandparent 2 node */}
        <circle
          cx="240"
          cy="50"
          r="28"
          fill="#ffffff"
          stroke="#dcc1b6"
          strokeWidth="2"
        />
        <text x="240" y="44" textAnchor="middle" fontSize="18" fill="#887269">
          👵
        </text>
        <text
          x="240"
          y="90"
          textAnchor="middle"
          fontSize="10"
          fill="#55433a"
          fontFamily="Inter, sans-serif"
        >
          {t.grandparent2}
        </text>

        {/* Parent 1 node */}
        <circle
          cx="100"
          cy="165"
          r="28"
          fill="#ffffff"
          stroke="#dcc1b6"
          strokeWidth="2"
        />
        <text x="100" y="159" textAnchor="middle" fontSize="18" fill="#887269">
          👨
        </text>
        <text
          x="100"
          y="205"
          textAnchor="middle"
          fontSize="10"
          fill="#55433a"
          fontFamily="Inter, sans-serif"
        >
          {t.parent1}
        </text>

        {/* Parent 2 node */}
        <circle
          cx="220"
          cy="165"
          r="28"
          fill="#ffffff"
          stroke="#dcc1b6"
          strokeWidth="2"
        />
        <text x="220" y="159" textAnchor="middle" fontSize="18" fill="#887269">
          👩
        </text>
        <text
          x="220"
          y="205"
          textAnchor="middle"
          fontSize="10"
          fill="#55433a"
          fontFamily="Inter, sans-serif"
        >
          {t.parent2}
        </text>

        {/* You node — highlighted */}
        <circle
          cx="160"
          cy="248"
          r="32"
          fill="#fff7f3"
          stroke="#92400e"
          strokeWidth="3"
        />
        <text x="160" y="242" textAnchor="middle" fontSize="20" fill="#92400e">
          🧑
        </text>
        <text
          x="160"
          y="292"
          textAnchor="middle"
          fontSize="11"
          fill="#712c00"
          fontWeight="600"
          fontFamily="Inter, sans-serif"
        >
          {t.you}
        </text>
      </svg>
    </div>
  );
}

export default async function LandingPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;

  if (!hasLocale(lang)) notFound();

  const user = await getCurrentUser();
  if (user) {
    redirect(`/${lang}/dashboard`);
  }

  const t = await getDictionary(lang);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: "#fbf9f8",
        color: "#1b1c1b",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-50 border-b border-stone-200 bg-[#fbf9f8]/95 backdrop-blur-sm shadow-sm"
        style={{ boxShadow: "0 1px 8px rgba(146,64,14,0.06)" }}
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <span
            className="text-xl font-bold tracking-tight"
            style={{ color: "#712c00" }}
          >
            {t.nav.logo}
          </span>
          <div className="flex items-center gap-3">
            <LanguagePicker
              currentLang={lang}
              persistLocalePreference={Boolean(user)}
              errorMessages={t.settings.language.errors}
            />
            <Link
              href={`/${lang}/login`}
              className="text-sm font-semibold transition-colors hover:opacity-75"
              style={{ color: "#712c00" }}
            >
              {t.nav.login}
            </Link>
            <Link
              href={`/${lang}/register`}
              className="hidden md:block px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "#92400e" }}
            >
              {t.nav.signup}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div className="space-y-7">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide"
              style={{ backgroundColor: "#ffdbcb", color: "#7a3000" }}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              {t.hero.badge}
            </div>

            <h1
              className="font-semibold leading-tight"
              style={{
                fontSize: "clamp(2rem, 5vw, 3rem)",
                letterSpacing: "-0.02em",
                color: "#712c00",
              }}
            >
              {t.hero.headline}
              <br />
              <span
                style={{ color: "#92400e", opacity: 0.75, fontStyle: "italic" }}
              >
                {t.hero.headlineSub}
              </span>
            </h1>

            <p
              className="text-lg leading-relaxed max-w-lg"
              style={{ color: "#55433a" }}
            >
              {t.hero.body}
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href={`/${lang}/register`}
                className="px-8 py-4 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 shadow-lg"
                style={{
                  backgroundColor: "#92400e",
                  boxShadow: "0 8px 24px rgba(146,64,14,0.25)",
                }}
              >
                {t.hero.ctaPrimary}
              </Link>
              <Link
                href={`/${lang}/login`}
                className="px-8 py-4 rounded-xl text-sm font-semibold transition-all hover:bg-stone-100 active:scale-95 border"
                style={{ color: "#712c00", borderColor: "#dcc1b6" }}
              >
                {t.hero.ctaSecondary}
              </Link>
            </div>
          </div>

          {/* Right: SVG tree diagram */}
          <div
            className="rounded-3xl p-8 border flex items-center justify-center"
            style={{ backgroundColor: "#f5f3f2", borderColor: "#e4e2e1" }}
          >
            <TreeDemo t={t.treeDemo} />
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-24" style={{ backgroundColor: "#efedec" }}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14 space-y-3">
              <h2
                className="text-2xl font-semibold"
                style={{ color: "#712c00" }}
              >
                {t.features.sectionHeadline}
              </h2>
              <p
                className="text-base max-w-xl mx-auto"
                style={{ color: "#55433a" }}
              >
                {t.features.sectionBody}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Security */}
              <div
                className="bg-white rounded-2xl p-8 border flex flex-col gap-5 transition-shadow hover:shadow-md"
                style={{ borderColor: "#e7e5e4" }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: "#fff7f3" }}
                >
                  <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#92400e"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ color: "#712c00" }}
                  >
                    {t.features.security.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#55433a" }}
                  >
                    {t.features.security.body}
                  </p>
                </div>
              </div>

              {/* Collaboration */}
              <div
                className="rounded-2xl p-8 flex flex-col gap-5 transition-shadow hover:shadow-md"
                style={{ backgroundColor: "#92400e" }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                >
                  <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-white">
                    {t.features.collaboration.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "rgba(255,219,203,0.9)" }}
                  >
                    {t.features.collaboration.body}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div
              className="rounded-[2.5rem] p-12 lg:p-20 text-center relative overflow-hidden"
              style={{ backgroundColor: "#eae8e7" }}
            >
              {/* decorative blobs */}
              <div
                className="absolute -top-20 -right-20 w-56 h-56 rounded-full blur-3xl pointer-events-none"
                style={{ backgroundColor: "rgba(255,219,203,0.35)" }}
              />
              <div
                className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full blur-3xl pointer-events-none"
                style={{ backgroundColor: "rgba(220,198,110,0.2)" }}
              />

              <div className="relative z-10 max-w-xl mx-auto space-y-7">
                <h2
                  className="font-semibold"
                  style={{
                    fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
                    letterSpacing: "-0.01em",
                    color: "#712c00",
                  }}
                >
                  {t.cta.headline}
                </h2>
                <p className="text-lg" style={{ color: "#55433a" }}>
                  {t.cta.body}
                </p>
                <Link
                  href={`/${lang}/register`}
                  className="inline-block px-10 py-5 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 shadow-lg"
                  style={{
                    backgroundColor: "#712c00",
                    boxShadow: "0 8px 24px rgba(113,44,0,0.25)",
                  }}
                >
                  {t.cta.button}
                </Link>
                <div
                  className="pt-4 flex flex-wrap justify-center gap-6 text-xs"
                  style={{ color: "#887269" }}
                >
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    {t.cta.badgeNoCard}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    {t.cta.badgeGdpr}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer style={{ backgroundColor: "#303030", color: "#d6d3d1" }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-10">
            <span
              className="text-xl font-bold tracking-tight"
              style={{ color: "#ffb693" }}
            >
              {t.nav.logo}
            </span>
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-white">
                  {t.footer.exploreTitle}
                </span>
                <Link
                  href={`/${lang}/login`}
                  className="hover:text-white transition-colors"
                >
                  {t.footer.links.login}
                </Link>
                <Link
                  href={`/${lang}/register`}
                  className="hover:text-white transition-colors"
                >
                  {t.footer.links.signup}
                </Link>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-white">
                  {t.footer.legalTitle}
                </span>
                <Link
                  href={`/${lang}/privacy`}
                  className="hover:text-white transition-colors"
                >
                  {t.footer.legalLinks.privacy}
                </Link>
                <Link
                  href={`/${lang}/support`}
                  className="hover:text-white transition-colors"
                >
                  {t.footer.legalLinks.support}
                </Link>
              </div>
            </div>
          </div>
          <div
            className="pt-8 border-t flex justify-between items-center text-xs"
            style={{ borderColor: "#44403c", color: "#78716c" }}
          >
            <span>{t.footer.copyright}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
