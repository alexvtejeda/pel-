import { describe, it, expect, beforeEach } from 'vitest'
import {
  STORAGE_KEY,
  getStoredLanguage,
  setStoredLanguage,
  resolveLanguage,
} from '@/lib/i18n/language'

describe('language resolution', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults to Spanish with no stored choice and no profile', () => {
    expect(resolveLanguage()).toBe('es')
    expect(resolveLanguage(null)).toBe('es')
  })

  it('never falls back to the browser language', () => {
    // jsdom reports en-US; the resolver must ignore it entirely.
    expect(navigator.language.startsWith('en')).toBe(true)
    expect(resolveLanguage()).toBe('es')
  })

  it('uses the profile preference when there is no explicit choice', () => {
    expect(resolveLanguage('en')).toBe('en')
  })

  it('lets an explicit stored choice win over the profile preference', () => {
    setStoredLanguage('es')
    expect(resolveLanguage('en')).toBe('es')
  })

  it('ignores unsupported stored values', () => {
    window.localStorage.setItem(STORAGE_KEY, 'fr')
    expect(getStoredLanguage()).toBeNull()
    expect(resolveLanguage()).toBe('es')
  })

  it('round-trips an explicit choice', () => {
    setStoredLanguage('en')
    expect(getStoredLanguage()).toBe('en')
  })
})
