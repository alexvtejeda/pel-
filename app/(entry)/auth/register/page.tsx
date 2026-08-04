import { Suspense } from 'react'
import { LocaleRedirect } from '@/components/locale-redirect'

// Legacy unprefixed URL, kept working so nothing that already points here
// breaks: shared pet links, bookmarks, and the OAuth callback the API
// redirects to (`{FRONTEND_URL}/auth/google/callback`).
export default function Page() {
  return (
    <Suspense fallback={null}>
      <LocaleRedirect to="/auth/register" />
    </Suspense>
  )
}
