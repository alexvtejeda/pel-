export const STORAGE_KEY = 'pelu_lang'

/** Legacy key written by the old navigator.language sniff. Removed on init. */
export const LEGACY_STORAGE_KEY = 'i18nextLng'

export const SUPPORTED_LANGUAGES = ['es', 'en'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return value === 'es' || value === 'en'
}

/** The user's explicit choice, or null. Never sniffs the browser. */
export function getStoredLanguage(): SupportedLanguage | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(STORAGE_KEY)
  return isSupportedLanguage(value) ? value : null
}

export function setStoredLanguage(language: SupportedLanguage): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, language)
}

/**
 * Drops the pre-2026-07 key. It held a browser-sniffed value, so migrating it
 * forward would preserve exactly the mixed-language bug we are removing.
 */
export function clearLegacyLanguage(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LEGACY_STORAGE_KEY)
}

/**
 * Resolution order: explicit stored choice → profile preference → 'es'.
 * Pelú is Spanish-first; the browser's locale is deliberately not consulted.
 */
export function resolveLanguage(preferredLang?: string | null): SupportedLanguage {
  const stored = getStoredLanguage()
  if (stored) return stored
  if (isSupportedLanguage(preferredLang)) return preferredLang
  return 'es'
}
