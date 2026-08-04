'use client'

import { useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { isSupportedLanguage, type SupportedLanguage } from './language'
import { DEFAULT_LANGUAGE, localePath } from './routing'

/**
 * The active locale, straight from the `[lang]` route segment.
 *
 * Route params are identical on the server and the client, which is exactly why
 * the locale lives in the URL: there is nothing to detect, so there is nothing
 * to disagree about at hydration time.
 */
export function useLocale(): SupportedLanguage {
  const params = useParams()
  const raw = params?.lang
  const value = Array.isArray(raw) ? raw[0] : raw
  return isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE
}

/** Everything after the first parameter of a router method. */
type Rest<T extends unknown[]> = T extends [unknown, ...infer R] ? R : never

/** `(path) => '/{lang}{path}'`, bound to the active locale. */
export function useLocalePath(): (path: string) => string {
  const lang = useLocale()
  return useCallback((path: string) => localePath(lang, path), [lang])
}

/**
 * `useRouter` with `push`/`replace` prefixed for the active locale, so callers
 * keep passing locale-free paths (`router.push('/pets')`).
 *
 * `back`, `forward`, `refresh` and `prefetch` are passed through untouched.
 */
export function useLocaleRouter() {
  const router = useRouter()
  const lang = useLocale()

  return useMemo(
    () => ({
      ...router,
      // Rest args rather than a named `options?` parameter, so the call is
      // forwarded *exactly* as it came in. Naming it would append an explicit
      // `undefined` to every one-argument call — invisible at runtime, but it
      // changes the recorded call shape and breaks `toHaveBeenCalledWith`.
      // Options like `{ scroll: false }` still ride along untouched.
      push: (path: string, ...rest: Rest<Parameters<typeof router.push>>) =>
        router.push(localePath(lang, path), ...rest),
      replace: (path: string, ...rest: Rest<Parameters<typeof router.replace>>) =>
        router.replace(localePath(lang, path), ...rest),
      prefetch: (path: string, ...rest: Rest<Parameters<typeof router.prefetch>>) =>
        router.prefetch(localePath(lang, path), ...rest),
    }),
    [router, lang]
  )
}
