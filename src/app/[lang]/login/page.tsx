import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getDictionary, hasLocale } from '../dictionaries/dictionaries'
import LoginClient from './LoginClient'

export default async function LoginPage({ params }: PageProps<'/[lang]/login'>) {
  const { lang } = await params

  if (!hasLocale(lang)) {
    notFound()
  }

  const t = await getDictionary(lang)

  return (
    <Suspense fallback={null}>
      <LoginClient lang={lang} t={t.auth.login} />
    </Suspense>
  )
}
