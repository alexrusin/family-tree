import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCALE,
  LOCALES,
  getPreferredLocale,
  isLocale,
} from './locale'

describe('locale catalog', () => {
  describe('LOCALES', () => {
    it('contains en, es, and ru', () => {
      expect(LOCALES).toContain('en')
      expect(LOCALES).toContain('es')
      expect(LOCALES).toContain('ru')
    })

    it('contains exactly three locales', () => {
      expect(LOCALES).toHaveLength(3)
    })
  })

  describe('DEFAULT_LOCALE', () => {
    it('is English', () => {
      expect(DEFAULT_LOCALE).toBe('en')
    })
  })

  describe('isLocale', () => {
    it('accepts en', () => {
      expect(isLocale('en')).toBe(true)
    })

    it('accepts es', () => {
      expect(isLocale('es')).toBe(true)
    })

    it('accepts ru', () => {
      expect(isLocale('ru')).toBe(true)
    })

    it('rejects unsupported locale codes', () => {
      expect(isLocale('de')).toBe(false)
      expect(isLocale('fr')).toBe(false)
      expect(isLocale('zh')).toBe(false)
      expect(isLocale('')).toBe(false)
    })
  })

  describe('getPreferredLocale', () => {
    it('matches Spanish from a plain es header', () => {
      expect(getPreferredLocale('es')).toBe('es')
    })

    it('matches Spanish from a region-qualified header', () => {
      expect(getPreferredLocale('es-MX,es;q=0.9,en;q=0.8')).toBe('es')
    })

    it('matches Russian from an ru header', () => {
      expect(getPreferredLocale('ru-RU,ru;q=0.9,en;q=0.8')).toBe('ru')
    })

    it('matches English from an en header', () => {
      expect(getPreferredLocale('en-US,en;q=0.9')).toBe('en')
    })

    it('falls back to English when no supported locale matches', () => {
      expect(getPreferredLocale('de-DE,de;q=0.9')).toBe('en')
      expect(getPreferredLocale('fr,fr-FR;q=0.9')).toBe('en')
    })

    it('falls back to English for an empty header', () => {
      expect(getPreferredLocale('')).toBe('en')
    })

    it('picks the highest-priority supported locale when multiple are listed', () => {
      expect(getPreferredLocale('de,es;q=0.9,ru;q=0.8')).toBe('es')
    })
  })
})
