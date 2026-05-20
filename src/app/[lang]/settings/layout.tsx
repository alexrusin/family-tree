import { notFound } from "next/navigation";
import Header from "../components/Header";
import { getDictionary, hasLocale } from "../dictionaries/dictionaries";
import SettingsSectionNav from "./SettingsSectionNav";

export default async function SettingsLayout({
  children,
  params,
}: LayoutProps<"/[lang]/settings">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const t = await getDictionary(lang);

  return (
    <>
      <Header
        lang={lang}
        langToggleLabel={t.nav.langToggle}
        langToggleErrors={t.settings.language.errors}
        navFamilyTree={t.dashboard.navFamilyTree}
        navGallery={t.dashboard.navGallery}
        navSettings={t.dashboard.navSettings}
        logoutLabel={t.dashboard.logout}
      />
      <main className="pt-24 pb-12 px-4 md:px-6 bg-stone-50 min-h-screen">
        <div className="mx-auto w-full max-w-6xl">
          <header className="mb-6">
            <h1 className="text-3xl font-semibold tracking-tight text-amber-900">
              {t.settings.title}
            </h1>
            <p className="mt-2 text-sm text-stone-600">{t.settings.subtitle}</p>
          </header>

          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-200 p-4 md:hidden">
              <SettingsSectionNav
                lang={lang}
                labels={{
                  account: t.settings.sections.account,
                  language: t.settings.sections.language,
                  security: t.settings.sections.security,
                }}
              />
            </div>

            <div className="flex flex-col md:flex-row">
              <aside className="hidden w-64 shrink-0 border-r border-stone-200 p-4 md:block">
                <SettingsSectionNav
                  lang={lang}
                  labels={{
                    account: t.settings.sections.account,
                    language: t.settings.sections.language,
                    security: t.settings.sections.security,
                  }}
                />
              </aside>

              <section className="min-w-0 flex-1 p-5 md:p-8">
                {children}
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
