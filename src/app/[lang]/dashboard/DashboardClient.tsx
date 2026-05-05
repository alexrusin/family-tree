'use client'

import { useState, useRef, useEffect } from 'react'
import { Users, MoreVertical, GitFork, TreePine } from 'lucide-react'

interface Tree {
  id: number
  name: string
  memberCount: number
  ownerName: string
  lastEdit: string
  icon: 'fork' | 'pine'
}

interface DashboardClientProps {
  t: {
    createTree: string
    myTrees: string
    sharedWithMe: string
    members: string
    owner: string
    lastEdit: string
    emptyTitle: string
    emptyBody: string
    cardMenuRename: string
    cardMenuDelete: string
  }
  myTrees: Tree[]
  sharedTrees: Tree[]
}

function TreeCardIcon({ icon }: { icon: Tree['icon'] }) {
  if (icon === 'pine') {
    return <TreePine className="w-8 h-8" />
  }
  return <GitFork className="w-8 h-8" />
}

function TreeCard({ tree, t }: { tree: Tree; t: DashboardClientProps['t'] }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <div className="group bg-white rounded-2xl p-6 shadow-sm border border-stone-100 hover:shadow-xl hover:shadow-amber-900/5 transition-all duration-300 relative flex flex-col h-full">
      {/* ⋮ menu */}
      <div className="absolute top-4 right-4" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="p-1 text-stone-400 hover:text-amber-900 transition-colors rounded-lg hover:bg-stone-100"
          aria-label="Card options"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-stone-100 py-1 z-10">
            <button className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors">
              {t.cardMenuRename}
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
              {t.cardMenuDelete}
            </button>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="mb-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-900 mb-4 group-hover:scale-110 transition-transform">
          <TreeCardIcon icon={tree.icon} />
        </div>
        <h3 className="text-[22px] font-medium leading-snug text-stone-900 mb-2">{tree.name}</h3>
        <div className="flex items-center gap-1.5 text-stone-500 text-sm">
          <Users className="w-4 h-4" />
          <span>{tree.memberCount} {t.members}</span>
        </div>
      </div>

      {/* Card footer */}
      <div className="mt-auto pt-5 border-t border-stone-100 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">{t.owner}</span>
          <span className="text-sm font-medium text-stone-700">{tree.ownerName}</span>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-stone-400 block uppercase tracking-wider font-semibold">{t.lastEdit}</span>
          <span className="text-sm text-stone-600">{tree.lastEdit}</span>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ t }: { t: Pick<DashboardClientProps['t'], 'emptyTitle' | 'emptyBody'> }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-900 mb-6">
        <TreePine className="w-10 h-10" />
      </div>
      <h3 className="text-xl font-semibold text-stone-700 mb-2">{t.emptyTitle}</h3>
      <p className="text-stone-500 text-base max-w-xs">{t.emptyBody}</p>
    </div>
  )
}

export default function DashboardClient({ t, myTrees, sharedTrees }: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'mine' | 'shared'>('mine')
  const activeTrees = activeTab === 'mine' ? myTrees : sharedTrees

  return (
    <>
      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex p-1 bg-stone-100 rounded-xl">
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-8 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all ${
              activeTab === 'mine'
                ? 'bg-amber-900 text-white shadow-sm'
                : 'text-stone-600 hover:bg-stone-200/50'
            }`}
          >
            {t.myTrees}
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`px-8 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all ${
              activeTab === 'shared'
                ? 'bg-amber-900 text-white shadow-sm'
                : 'text-stone-600 hover:bg-stone-200/50'
            }`}
          >
            {t.sharedWithMe}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTrees.length === 0 ? (
          <EmptyState t={t} />
        ) : (
          activeTrees.map((tree) => <TreeCard key={tree.id} tree={tree} t={t} />)
        )}
      </div>
    </>
  )
}
