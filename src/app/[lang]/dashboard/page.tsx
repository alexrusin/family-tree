import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from '../dictionaries/dictionaries'
import Header from '../components/Header'
import DashboardClient from './DashboardClient'
import CreateTreeButton from './CreateTreeButton'

const MY_TREES = [
  {
    id: 1,
    name: 'The Rusin Family',
    memberCount: 47,
    ownerName: 'Alex Rusin',
    lastEdit: '2 hours ago',
    icon: 'pine' as const,
  },
  {
    id: 2,
    name: 'Smith Ancestry',
    memberCount: 124,
    ownerName: 'Alex Rusin',
    lastEdit: 'Yesterday',
    icon: 'fork' as const,
  },
  {
    id: 3,
    name: 'Müller Heritage',
    memberCount: 82,
    ownerName: 'Alex Rusin',
    lastEdit: 'Jan 12, 2026',
    icon: 'pine' as const,
  },
]

const SHARED_TREES: typeof MY_TREES = []

export default async function DashboardPage({ params }: PageProps<'/[lang]/dashboard'>) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const t = await getDictionary(lang)

  return (
    <>
      <Header
        lang={lang}
        langToggleLabel={t.nav.langToggle}
        navFamilyTree={t.dashboard.navFamilyTree}
        navGallery={t.dashboard.navGallery}
        logoutLabel={t.dashboard.logout}
      />
      <main className="pt-24 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Page heading — server-rendered for SEO */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
            <div>
              <h1 className="text-[36px] font-semibold leading-tight tracking-tight text-amber-900 mb-2">
                {t.dashboard.title}
              </h1>
              <p className="text-stone-600 text-base">{t.dashboard.subtitle}</p>
            </div>
            <CreateTreeButton label={t.dashboard.createTree} />
          </div>

          <DashboardClient
            t={{
              createTree: t.dashboard.createTree,
              myTrees: t.dashboard.myTrees,
              sharedWithMe: t.dashboard.sharedWithMe,
              members: t.dashboard.members,
              owner: t.dashboard.owner,
              lastEdit: t.dashboard.lastEdit,
              emptyTitle: t.dashboard.emptyTitle,
              emptyBody: t.dashboard.emptyBody,
              cardMenuRename: t.dashboard.cardMenuRename,
              cardMenuDelete: t.dashboard.cardMenuDelete,
            }}
            myTrees={MY_TREES}
            sharedTrees={SHARED_TREES}
          />
        </div>
      </main>
    </>
  )
}
