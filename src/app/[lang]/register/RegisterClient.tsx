'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useMemo, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { resolvePostAuthRedirect } from '@/lib/auth-callback'

interface RegisterTranslations {
  title: string
  subtitle: string
  nameLabel: string
  namePlaceholder: string
  emailLabel: string
  emailPlaceholder: string
  passwordLabel: string
  passwordPlaceholder: string
  confirmPasswordLabel: string
  confirmPasswordPlaceholder: string
  passwordHint: string
  submit: string
  submitting: string
  alreadyHaveAccount: string
  loginLink: string
  errors: {
    requiredName: string
    requiredEmail: string
    invalidEmail: string
    requiredPassword: string
    requiredConfirmPassword: string
    passwordStrength: string
    passwordMismatch: string
    generic: string
  }
}

interface RegisterClientProps {
  lang: string
  t: RegisterTranslations
}

interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
  form?: string
}

function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[0-9\W_]/.test(password)
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function RegisterClient({ lang, t }: RegisterClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const rawCallback = searchParams.get('callback')

  const callbackTarget = useMemo(
    () =>
      rawCallback
        ? resolvePostAuthRedirect(lang, rawCallback)
        : null,
    [lang, rawCallback],
  )
  const callbackQuery = useMemo(
    () =>
      callbackTarget
        ? `?callback=${encodeURIComponent(callbackTarget)}`
        : '',
    [callbackTarget],
  )

  const loginHref = useMemo(() => `/${lang}/login${callbackQuery}`, [lang, callbackQuery])

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {}

    if (!name.trim()) {
      nextErrors.name = t.errors.requiredName
    }
    if (!email.trim()) {
      nextErrors.email = t.errors.requiredEmail
    } else if (!isValidEmail(email)) {
      nextErrors.email = t.errors.invalidEmail
    }
    if (!password) {
      nextErrors.password = t.errors.requiredPassword
    } else if (!isStrongPassword(password)) {
      nextErrors.password = t.errors.passwordStrength
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = t.errors.requiredConfirmPassword
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = t.errors.passwordMismatch
    }

    return nextErrors
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validate()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = (await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      })) as { error?: { message?: string } }

      if (response.error) {
        setErrors({ form: response.error.message ?? t.errors.generic })
        return
      }

      if (rawCallback) {
        router.push(resolvePostAuthRedirect(lang, rawCallback))
        return
      }

      router.push(`/${lang}/verify-email?email=${encodeURIComponent(email.trim())}`)
    } catch {
      setErrors({ form: t.errors.generic })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-background text-on-background">
      <section className="hidden md:flex md:w-1/2 bg-surface-container-high relative items-center justify-center p-12">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #92400e15 1px, transparent 0)', backgroundSize: '36px 36px' }} />
        <div className="relative max-w-md text-center">
          <h1 className="text-display-md font-semibold text-primary mb-4">{t.title}</h1>
          <p className="text-body-lg text-on-surface-variant">{t.subtitle}</p>
        </div>
      </section>

      <section className="w-full md:w-1/2 flex items-center justify-center px-6 py-10 md:p-16">
        <div className="w-full max-w-md">
          <div className="mb-8 md:hidden">
            <h1 className="text-[34px] font-semibold tracking-tight text-primary mb-2">{t.title}</h1>
            <p className="text-on-surface-variant">{t.subtitle}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <label htmlFor="name" className="font-label-md text-label-md text-on-surface block ml-1">
                {t.nameLabel}
              </label>
              <input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePlaceholder}
                className="w-full px-4 py-4 rounded-lg bg-surface-bright border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-primary outline-none transition-all"
                autoComplete="name"
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name ? <p className="text-sm text-error mt-1">{errors.name}</p> : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="font-label-md text-label-md text-on-surface block ml-1">
                {t.emailLabel}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="w-full px-4 py-4 rounded-lg bg-surface-bright border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-primary outline-none transition-all"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email ? <p className="text-sm text-error mt-1">{errors.email}</p> : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="font-label-md text-label-md text-on-surface block ml-1">
                {t.passwordLabel}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                className="w-full px-4 py-4 rounded-lg bg-surface-bright border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-primary outline-none transition-all"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
              />
              <p className="text-xs text-on-surface-variant">{t.passwordHint}</p>
              {errors.password ? <p className="text-sm text-error mt-1">{errors.password}</p> : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="font-label-md text-label-md text-on-surface block ml-1">
                {t.confirmPasswordLabel}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.confirmPasswordPlaceholder}
                className="w-full px-4 py-4 rounded-lg bg-surface-bright border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-primary outline-none transition-all"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmPassword)}
              />
              {errors.confirmPassword ? <p className="text-sm text-error mt-1">{errors.confirmPassword}</p> : null}
            </div>

            {errors.form ? <p className="text-sm text-error">{errors.form}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-primary-container text-on-primary font-label-md text-label-md rounded-lg shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? t.submitting : t.submit}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-stone-200 text-sm text-on-surface-variant">
            {t.alreadyHaveAccount} <Link href={loginHref} className="text-primary font-semibold hover:underline">{t.loginLink}</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
