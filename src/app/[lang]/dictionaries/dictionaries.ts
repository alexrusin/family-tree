import 'server-only'

const dictionaries = {
  en: () => import('./en.json').then((m) => m.default),
  ru: () => import('./ru.json').then((m) => m.default),
}

export type Locale = keyof typeof dictionaries

export const hasLocale = (locale: string): locale is Locale =>
  locale in dictionaries

export const getDictionary = async (locale: Locale) => dictionaries[locale]()
