import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})

vi.mock('next/navigation', () => ({
  notFound,
}))

vi.mock('server-only', () => ({}))

const { default: PrivacyPage } = await import('./privacy/page')
const { default: SupportPage } = await import('./support/page')

async function renderPage(
  page: typeof PrivacyPage | typeof SupportPage,
  lang: string,
) {
  return renderToStaticMarkup(
    await page({
      params: Promise.resolve({ lang }),
    }),
  )
}

describe('localized informational pages', () => {
  afterEach(() => {
    notFound.mockClear()
  })

  it('renders the privacy page for both supported locales', async () => {
    const englishMarkup = await renderPage(PrivacyPage, 'en')
    const russianMarkup = await renderPage(PrivacyPage, 'ru')

    expect(englishMarkup).toContain('A calm, private place for family history')
    expect(englishMarkup).toContain('href="/en/privacy"')
    expect(englishMarkup).toContain('href="/en/support"')

    expect(russianMarkup).toContain('Спокойное и приватное пространство для истории семьи')
    expect(russianMarkup).toContain('href="/ru/privacy"')
    expect(russianMarkup).toContain('href="/ru/support"')
  })

  it('renders the support page for both supported locales', async () => {
    const englishMarkup = await renderPage(SupportPage, 'en')
    const russianMarkup = await renderPage(SupportPage, 'ru')

    expect(englishMarkup).toContain('Support for using Generations')
    expect(englishMarkup).toContain('href="/en/privacy"')
    expect(englishMarkup).toContain('href="/en/support"')

    expect(russianMarkup).toContain('Поддержка по использованию Generations')
    expect(russianMarkup).toContain('href="/ru/privacy"')
    expect(russianMarkup).toContain('href="/ru/support"')
  })

  it('keeps unsupported locales on the existing not-found path', async () => {
    await expect(
      PrivacyPage({
        params: Promise.resolve({ lang: 'de' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND')

    await expect(
      SupportPage({
        params: Promise.resolve({ lang: 'de' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(notFound).toHaveBeenCalledTimes(2)
  })
})
