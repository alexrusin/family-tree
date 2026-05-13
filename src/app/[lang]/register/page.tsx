import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from '../dictionaries/dictionaries'
import RegisterClient from './RegisterClient'

export default async function RegisterPage({ params }: PageProps<'/[lang]/register'>) {
  const { lang } = await params

  if (!hasLocale(lang)) {
    notFound()
  }

  const t = await getDictionary(lang)

  return <RegisterClient lang={lang} t={t.auth.register} />
}
