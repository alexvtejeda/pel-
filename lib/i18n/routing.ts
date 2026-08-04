import { SUPPORTED_LANGUAGES, isSupportedLanguage, type SupportedLanguage } from './language'

/** Pelú is Spanish-first: `es` is what a bare URL resolves to. */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'es'

/**
 * Prefixes an app-relative path with a locale.
 *
 * Call sites keep writing paths locale-free (`/pets`, not `/es/pets`) — that is
 * the whole point, and it is what stops the prefix from rotting across ~100
 * navigation sites. Query strings and hashes ride along untouched.
 */
export function localePath(lang: SupportedLanguage, path: string): string {
  // Absolute URLs and non-app schemes are not ours to rewrite.
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//')) return path
  if (path === '/') return `/${lang}`
  if (!path.startsWith('/')) return path
  return `/${lang}${path}`
}

/** Splits a pathname into its locale prefix (if any) and the rest. */
export function splitLocale(pathname: string): {
  lang: SupportedLanguage | null
  rest: string
} {
  const [, first = '', ...others] = pathname.split('/')
  if (!isSupportedLanguage(first)) return { lang: null, rest: pathname }
  return { lang: first, rest: `/${others.join('/')}` }
}

/** Reads the locale out of a pathname, falling back to the default. */
export function localeFromPathname(pathname: string): SupportedLanguage {
  return splitLocale(pathname).lang ?? DEFAULT_LANGUAGE
}

/**
 * The current path, rendered in another locale — what the language switcher
 * navigates to. `search` is passed in because `usePathname()` drops it and
 * losing it would silently break `/p?slug=…`.
 */
export function switchLocalePath(
  pathname: string,
  target: SupportedLanguage,
  search = ''
): string {
  const { rest } = splitLocale(pathname)
  const suffix = search && !search.startsWith('?') ? `?${search}` : search
  return `${localePath(target, rest === '' ? '/' : rest)}${suffix}`
}

/** For `generateStaticParams` on the `[lang]` segment. */
export function localeParams(): { lang: SupportedLanguage }[] {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang }))
}
