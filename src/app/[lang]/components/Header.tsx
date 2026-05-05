import Link from 'next/link'
import LanguageToggle from './LanguageToggle'

interface HeaderProps {
  lang: string
  langToggleLabel: string
  navFamilyTree: string
  navGallery: string
}

export default function Header({ lang, langToggleLabel, navFamilyTree, navGallery }: HeaderProps) {
  return (
    <header className="bg-[#FAFAF9] flex justify-between items-center w-full px-6 py-3 border-b border-stone-200 shadow-sm shadow-amber-900/5 fixed top-0 z-50">
      <div className="flex items-center gap-8">
        <Link
          href={`/${lang}`}
          className="text-xl font-bold text-amber-900 tracking-tight hover:opacity-80 transition-opacity"
        >
          Generations
        </Link>
        <nav className="hidden md:flex gap-1 items-center">
          <Link
            href="#"
            className="text-amber-900 font-semibold px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors active:scale-95 duration-200"
          >
            {navFamilyTree}
          </Link>
          <Link
            href="#"
            className="text-stone-500 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors active:scale-95 duration-200"
          >
            {navGallery}
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <LanguageToggle label={langToggleLabel} currentLang={lang} />
        {/* Placeholder avatar */}
        <div className="w-9 h-9 rounded-full bg-amber-100 border-2 border-primary-container flex items-center justify-center text-amber-900 font-semibold text-sm select-none">
          A
        </div>
      </div>
    </header>
  )
}
