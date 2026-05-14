import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getDictionary, hasLocale } from '../dictionaries/dictionaries'
import VerifyEmailClient from './VerifyEmailClient'

export default async function VerifyEmailPage({ params }: PageProps<'/[lang]/verify-email'>) {
  const { lang } = await params

  if (!hasLocale(lang)) {
    notFound()
  }

  const t = await getDictionary(lang)

  return (
    <Suspense fallback={null}>
      <VerifyEmailClient lang={lang} t={t.auth.verifyEmail} />
    </Suspense>
  )
}
