'use client'

import { usePathname, useRouter } from 'next/navigation'

interface LanguageToggleProps {
  label: string
  currentLang: string
}

export default function LanguageToggle({ label, currentLang }: LanguageToggleProps) {
  const pathname = usePathname()
  const router = useRouter()

  function handleToggle() {
    const targetLang = currentLang === 'en' ? 'ru' : 'en'
    // Replace the locale prefix in the current pathname
    const newPath = pathname.replace(`/${currentLang}`, `/${targetLang}`)
    router.push(newPath)
  }

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 transition-colors text-amber-900 text-sm font-semibold tracking-wide"
      aria-label="Switch language"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20M12 2a14.5 14.5 0 0 1 0 20M2 12h20" />
      </svg>
      {label}
    </button>
  )
}
