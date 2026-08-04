'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resolveLanguage } from '@/lib/i18n/language'
import { localePath } from '@/lib/i18n/routing'

/**
 * Sends an unprefixed legacy URL to its localized equivalent.
 *
 * This is the one place language *detection* still happens, and it is safe here
 * precisely because these stubs render no translated text — there is no markup
 * for the detected language to disagree with. Everything else reads the locale
 * from the URL.
 *
 * `replace`, not `push`, so the stub does not become a back-button trap.
 */
export function LocaleRedirect({ to }: { to: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Load-bearing for `/p?slug=…`: that link is the shipped pet-share feature
    // and is already out in the wild. Dropping the query would silently turn
    // every shared pet into a blank page.
    const query = searchParams?.toString()
    const target = localePath(resolveLanguage(), to)
    router.replace(query ? `${target}?${query}` : target)
  }, [router, searchParams, to])

  return null
}
