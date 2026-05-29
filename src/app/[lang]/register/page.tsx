import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getDictionary, hasLocale } from '../dictionaries/dictionaries'
import RegisterClient from './RegisterClient'

export default async function RegisterPage({ params }: PageProps<'/[lang]/register'>) {
  const { lang } = await params

  if (!hasLocale(lang)) {
    notFound()
  }

  const t = await getDictionary(lang)

  return (
    <Suspense fallback={null}>
      <RegisterClient lang={lang} t={t.auth.register} />
    </Suspense>
  )
}
