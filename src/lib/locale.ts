export const LOCALES = ['en', 'es', 'ru'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

export function getPreferredLocale(acceptLanguage: string): Locale {
  const preferred = acceptLanguage
    .split(',')
    .map((part) => part.split(';')[0].trim().toLowerCase().slice(0, 2))
  for (const lang of preferred) {
    if (isLocale(lang)) return lang
  }
  return DEFAULT_LOCALE
}
