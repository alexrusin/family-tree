import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from '../dictionaries/dictionaries'
import VerifyEmailClient from './VerifyEmailClient'

export default async function VerifyEmailPage({ params }: PageProps<'/[lang]/verify-email'>) {
  const { lang } = await params

  if (!hasLocale(lang)) {
    notFound()
  }

  const t = await getDictionary(lang)

  return <VerifyEmailClient lang={lang} t={t.auth.verifyEmail} />
}
