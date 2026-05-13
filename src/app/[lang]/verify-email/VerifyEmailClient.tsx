'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'

interface VerifyEmailTranslations {
  title: string
  body: string
  resend: string
  resending: string
  resendSuccess: string
  resendError: string
  missingEmail: string
  changeEmail: string
  wrongAddressPrompt: string
  checkSpam: string
}

interface VerifyEmailClientProps {
  lang: string
  t: VerifyEmailTranslations
}

export default function VerifyEmailClient({ lang, t }: VerifyEmailClientProps) {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')?.trim() ?? ''
  const otherLang = lang === 'en' ? 'ru' : 'en'
  const languageHref = `/${otherLang}/verify-email${email ? `?email=${encodeURIComponent(email)}` : ''}`

  const [isResending, setIsResending] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const registerHref = `/${lang}/register`

  const onResend = async () => {
    if (!email) {
      setStatus('error')
      return
    }

    setIsResending(true)
    setStatus('idle')

    try {
      const callbackBase =
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
        (typeof window !== 'undefined' ? window.location.origin : '')

      const callbackURL = callbackBase
        ? new URL(`/${lang}/dashboard`, callbackBase).toString()
        : `/${lang}/dashboard`

      const response = (await authClient.sendVerificationEmail({
        email,
        callbackURL,
      })) as { error?: { message?: string } }

      if (response.error) {
        setStatus('error')
        return
      }

      setStatus('success')
    } catch {
      setStatus('error')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      <header className="bg-stone-50/90 backdrop-blur-md sticky top-0 z-50 border-b border-stone-200 shadow-sm">
        <div className="flex justify-between items-center w-full px-6 py-4 mx-auto max-w-7xl">
          <div className="text-2xl font-bold italic text-amber-900">Generations</div>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex gap-4">
              <Link href={languageHref} className="text-amber-900 font-bold hover:text-amber-700 transition-colors">
                English / Русский
              </Link>
            </nav>
            <button
              type="button"
              className="text-stone-500 hover:text-amber-700 transition-colors active:opacity-80 active:scale-95"
              aria-label="Help"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                help_outline
              </span>
            </button>
          </div>
        </div>
      </header>

      <main
        className="flex-grow flex items-center justify-center px-gutter py-xxl"
        style={{
          background: 'radial-gradient(circle at top left, #fbf9f8 0%, #f5f3f2 100%)',
        }}
      >
        <div className="w-full max-w-lg">
          <div className="bg-surface-container-lowest rounded-xl p-xl border border-stone-100 shadow-[0_10px_25px_-5px_rgba(146,64,14,0.08),0_8px_10px_-6px_rgba(146,64,14,0.05)] flex flex-col items-center text-center">
            <div className="relative mb-lg">
              <div className="w-24 h-24 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[48px]" aria-hidden="true">
                  mail
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-primary-container border-4 border-surface-container-lowest flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-on-tertiary text-[18px]"
                  aria-hidden="true"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  favorite
                </span>
              </div>
            </div>

            <h1 className="font-headline-lg text-headline-lg text-primary mb-md">{t.title}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mb-xl max-w-[320px]">{t.body}</p>

            <div className="w-full space-y-md">
              <button
                type="button"
                onClick={onResend}
                disabled={isResending || !email}
                className="w-full py-md px-lg bg-primary-container text-on-tertiary rounded-lg font-label-md hover:bg-primary transition-all active:scale-[0.98] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isResending ? t.resending : t.resend}
              </button>

              {status === 'success' ? (
                <p className="text-sm text-primary" aria-live="polite">
                  {t.resendSuccess}
                </p>
              ) : null}

              {status === 'error' ? (
                <p className="text-sm text-error" aria-live="polite">
                  {email ? t.resendError : t.missingEmail}
                </p>
              ) : null}

              <div className="pt-md border-t border-stone-100 w-full">
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {t.wrongAddressPrompt}{' '}
                  <Link href={registerHref} className="text-primary font-label-md hover:underline transition-all">
                    {t.changeEmail}
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-lg text-center">
            <div className="inline-flex items-center gap-xs bg-surface-container-low px-md py-xs rounded-full border border-stone-200">
              <span className="material-symbols-outlined text-primary text-[16px]" aria-hidden="true">
                info
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">{t.checkSpam}</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-[#FAFAF9] text-xs tracking-wide uppercase py-8 mt-auto border-t border-stone-200">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-8 gap-4 max-w-7xl mx-auto">
          <div className="text-stone-500">© 2024 Generations Family History. All rights reserved.</div>
          <nav className="flex gap-6">
            <Link href={`/${lang}`} className="text-stone-500 hover:underline hover:text-amber-800 transition-all">Privacy Policy</Link>
            <Link href={`/${lang}`} className="text-stone-500 hover:underline hover:text-amber-800 transition-all">Terms of Service</Link>
            <Link href={`/${lang}`} className="text-stone-500 hover:underline hover:text-amber-800 transition-all">Help Center</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
