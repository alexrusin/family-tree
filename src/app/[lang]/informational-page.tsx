import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from './dictionaries/dictionaries'

type Dictionary = Awaited<ReturnType<typeof getDictionary>>
type InformationalPageKey = keyof Dictionary['informationalPages']['pages']
type InformationalPageContent = Dictionary['informationalPages']['pages'][InformationalPageKey]

function getInformationalSections(page: InformationalPageContent) {
  return [
    {
      title: page.sectionOneTitle,
      body: page.sectionOneBody,
    },
    {
      title: page.sectionTwoTitle,
      body: page.sectionTwoBody,
    },
    {
      title: page.sectionThreeTitle,
      body: page.sectionThreeBody,
    },
  ]
}

async function getInformationalPageData(
  params: Promise<{ lang: string }>,
  pageKey: InformationalPageKey,
) {
  const { lang } = await params

  if (!hasLocale(lang)) {
    notFound()
  }

  const t = await getDictionary(lang)

  return {
    lang,
    t,
    page: t.informationalPages.pages[pageKey],
  }
}

export async function generateInformationalPageMetadata(
  params: Promise<{ lang: string }>,
  pageKey: InformationalPageKey,
): Promise<Metadata> {
  const { lang } = await params

  if (!hasLocale(lang)) {
    return {}
  }

  const t = await getDictionary(lang)
  const page = t.informationalPages.pages[pageKey]

  return {
    title: page.title,
    description: page.description,
  }
}

export async function renderInformationalPage(
  params: Promise<{ lang: string }>,
  pageKey: InformationalPageKey,
) {
  const { lang, t, page } = await getInformationalPageData(params, pageKey)
  const sections = getInformationalSections(page)

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: '#fbf9f8',
        color: '#1b1c1b',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <header
        className="border-b border-stone-200 bg-[#fbf9f8]"
        style={{ boxShadow: '0 1px 8px rgba(146,64,14,0.06)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link
            href={`/${lang}`}
            className="text-xl font-bold tracking-tight"
            style={{ color: '#712c00' }}
          >
            {t.nav.logo}
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href={`/${lang}/login`}
              className="text-sm font-semibold transition-colors hover:opacity-75"
              style={{ color: '#712c00' }}
            >
              {t.nav.login}
            </Link>
            <Link
              href={`/${lang}/register`}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: '#92400e' }}
            >
              {t.nav.signup}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 py-20 space-y-10">
          <div className="max-w-3xl space-y-5">
            <Link
              href={`/${lang}`}
              className="inline-flex items-center gap-2 text-sm font-semibold hover:opacity-75"
              style={{ color: '#712c00' }}
            >
              <span aria-hidden="true">←</span>
              {t.informationalPages.backToHome}
            </Link>

            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide"
              style={{ backgroundColor: '#ffdbcb', color: '#7a3000' }}
            >
              {page.eyebrow}
            </div>

            <h1
              className="font-semibold leading-tight"
              style={{
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                letterSpacing: '-0.02em',
                color: '#712c00',
              }}
            >
              {page.title}
            </h1>

            <p
              className="text-lg leading-relaxed"
              style={{ color: '#55433a' }}
            >
              {page.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sections.map((section) => (
              <article
                key={section.title}
                className="rounded-3xl border p-8 bg-white"
                style={{ borderColor: '#e7e5e4' }}
              >
                <h2
                  className="text-lg font-semibold mb-4"
                  style={{ color: '#712c00' }}
                >
                  {section.title}
                </h2>
                <p className="text-sm leading-7" style={{ color: '#55433a' }}>
                  {section.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer style={{ backgroundColor: '#303030', color: '#d6d3d1' }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link
            href={`/${lang}`}
            className="text-sm font-semibold hover:text-white transition-colors"
          >
            {t.informationalPages.backToHome}
          </Link>
          <div className="flex items-center gap-6 text-sm">
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
      </footer>
    </div>
  )
}
