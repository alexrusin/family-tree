import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from './dictionaries/dictionaries'
import '../globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params
  if (!hasLocale(lang)) return {}
  const t = await getDictionary(lang)
  return {
    title: t.meta.title,
    description: t.meta.description,
  }
}

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ru' }]
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[lang]'>) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  return (
    <html lang={lang} className={inter.variable}>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  )
}
