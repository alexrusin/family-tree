'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

interface LogoutButtonProps {
  lang: string
  label: string
}

export default function LogoutButton({ lang, label }: LogoutButtonProps) {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const onLogout = async () => {
    if (isSigningOut) {
      return
    }

    setIsSigningOut(true)

    try {
      await authClient.signOut()
    } finally {
      router.replace(`/${lang}/login`)
      router.refresh()
      setIsSigningOut(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={isSigningOut}
      className="text-stone-600 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  )
}
