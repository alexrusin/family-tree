import 'server-only'

import { type Locale, isLocale } from '@/lib/locale'

const dictionaries: Record<Locale, () => Promise<typeof import('./en.json')>> =
  {
    en: () => import('./en.json').then((m) => m.default),
    es: () => import('./es.json').then((m) => m.default),
    ru: () => import('./ru.json').then((m) => m.default),
  }

export type { Locale }

export const hasLocale = isLocale

export const getDictionary = async (locale: Locale) => dictionaries[locale]()
