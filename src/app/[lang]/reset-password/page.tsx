import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getDictionary, hasLocale } from '../dictionaries/dictionaries'
import ResetPasswordClient from './ResetPasswordClient'

export default async function ResetPasswordPage({ params }: PageProps<'/[lang]/reset-password'>) {
  const { lang } = await params

  if (!hasLocale(lang)) {
    notFound()
  }

  const t = await getDictionary(lang)

  return (
    <Suspense fallback={null}>
      <ResetPasswordClient lang={lang} t={t.auth.resetPassword} />
    </Suspense>
  )
}
