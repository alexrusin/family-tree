import { describe, expect, it } from 'vitest'
import en from './en.json'
import es from './es.json'
import ru from './ru.json'

describe('informational page dictionary keys', () => {
  it('contains privacy page keys in English', () => {
    expect(en.informationalPages.backToHome).toBeTruthy()
    expect(en.informationalPages.pages.privacy.title).toBeTruthy()
    expect(en.informationalPages.pages.privacy.sectionOneTitle).toBeTruthy()
    expect(en.informationalPages.pages.privacy.sectionTwoTitle).toBeTruthy()
    expect(en.informationalPages.pages.privacy.sectionThreeTitle).toBeTruthy()
  })

  it('contains support page keys in Russian', () => {
    expect(ru.informationalPages.backToHome).toBeTruthy()
    expect(ru.informationalPages.pages.support.title).toBeTruthy()
    expect(ru.informationalPages.pages.support.sectionOneTitle).toBeTruthy()
    expect(ru.informationalPages.pages.support.sectionTwoTitle).toBeTruthy()
    expect(ru.informationalPages.pages.support.sectionThreeTitle).toBeTruthy()
  })

  it('contains privacy page keys in Spanish', () => {
    expect(es.informationalPages.backToHome).toBeTruthy()
    expect(es.informationalPages.pages.privacy.title).toBeTruthy()
    expect(es.informationalPages.pages.privacy.sectionOneTitle).toBeTruthy()
    expect(es.informationalPages.pages.privacy.sectionTwoTitle).toBeTruthy()
    expect(es.informationalPages.pages.privacy.sectionThreeTitle).toBeTruthy()
  })

  it('contains support page keys in Spanish', () => {
    expect(es.informationalPages.pages.support.title).toBeTruthy()
    expect(es.informationalPages.pages.support.sectionOneTitle).toBeTruthy()
    expect(es.informationalPages.pages.support.sectionTwoTitle).toBeTruthy()
    expect(es.informationalPages.pages.support.sectionThreeTitle).toBeTruthy()
  })
})
