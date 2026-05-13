'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useMemo, useState } from 'react'
import { authClient } from '@/lib/auth-client'

interface ResetPasswordTranslations {
  title: string
  body: string
  newPasswordLabel: string
  newPasswordPlaceholder: string
  confirmPasswordLabel: string
  confirmPasswordPlaceholder: string
  passwordHint: string
  submit: string
  submitting: string
  invalidToken: string
  success: string
  errors: {
    requiredPassword: string
    requiredConfirmPassword: string
    passwordStrength: string
    passwordMismatch: string
    generic: string
  }
}

interface ResetPasswordClientProps {
  lang: string
  t: ResetPasswordTranslations
}

interface FormErrors {
  password?: string
  confirmPassword?: string
  form?: string
}

function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[0-9\W_]/.test(password)
}

function isTokenError(message?: string): boolean {
  if (!message) {
    return false
  }
  const normalized = message.toLowerCase()
  return normalized.includes('token') || normalized.includes('expired') || normalized.includes('invalid')
}

export default function ResetPasswordClient({ lang, t }: ResetPasswordClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {}

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

    if (Object.keys(nextErrors).length > 0 || !token) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = (await authClient.resetPassword({
        token,
        newPassword: password,
      })) as { error?: { message?: string } }

      if (response.error) {
        setErrors({ form: isTokenError(response.error.message) ? t.invalidToken : t.errors.generic })
        return
      }

      setIsSuccess(true)
      setTimeout(() => {
        router.push(`/${lang}/login`)
      }, 700)
    } catch {
      setErrors({ form: t.errors.generic })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-background text-on-background">
        <div className="w-full max-w-md bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-xl p-8 text-center">
          <span className="material-symbols-outlined text-error text-4xl" aria-hidden="true">
            error
          </span>
          <h1 className="text-headline-lg text-primary mt-4">{t.title}</h1>
          <p className="mt-3 text-error">{t.invalidToken}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-background text-on-background">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-xl p-8">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-fixed mb-4 text-primary">
            <span className="material-symbols-outlined" aria-hidden="true">
              lock
            </span>
          </div>
          <h1 className="text-headline-lg text-primary mb-2">{t.title}</h1>
          <p className="text-on-surface-variant">{t.body}</p>
        </div>

        {isSuccess ? (
          <div className="rounded-lg border border-primary/20 bg-primary-fixed/20 text-on-background p-4 text-sm">
            {t.success}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <label htmlFor="password" className="text-label-md text-on-surface-variant block">
                {t.newPasswordLabel}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.newPasswordPlaceholder}
                className="w-full px-4 py-4 rounded-lg bg-surface-bright border border-outline-variant focus:ring-2 focus:ring-primary-container focus:border-primary outline-none transition-all"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
              />
              <p className="text-xs text-on-surface-variant">{t.passwordHint}</p>
              {errors.password ? <p className="text-sm text-error">{errors.password}</p> : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-label-md text-on-surface-variant block">
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
              {errors.confirmPassword ? <p className="text-sm text-error">{errors.confirmPassword}</p> : null}
            </div>

            {errors.form ? <p className="text-sm text-error">{errors.form}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-primary-container text-on-primary rounded-lg shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? t.submitting : t.submit}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
