import type { Metadata } from "next"
import "../globals.css"
import { AuthProvider } from "@/lib/contexts/auth-context"
import { WebSocketProvider } from "@/lib/contexts/websocket-context"
import { I18nProvider } from "@/components/i18n-provider"
import { LanguagePreferenceSync } from "@/components/language-preference-sync"
import { Toaster } from "sonner"
import { RCApprovalListener } from "@/components/auth/rc-approval-listener"
import { RouteTransitionProvider } from "@/components/transitions/route-transition-context"
import { TransitionOverlay } from "@/components/transitions/transition-overlay"
import { isSupportedLanguage } from "@/lib/i18n/language"
import { DEFAULT_LANGUAGE, localeParams } from "@/lib/i18n/routing"

export const metadata: Metadata = {
  title: "Pelú - Adopción de Mascotas",
  description: "Plataforma de adopción y coordinación de transporte de mascotas",
  icons: {
    icon: '/favicon.svg',
  },
}

// One prerender per locale. The `[role]` segment under auth/onboarding returns
// only its own param and Next builds the cross product.
export function generateStaticParams() {
  return localeParams()
}

// `output: 'export'` cannot render an unknown locale on demand, so the two
// generated params are the whole universe.
export const dynamicParams = false

/**
 * The root layout for every localized route — it owns `<html>`, so this is
 * where the served markup finally declares its real language. A layout above
 * `[lang]` could not do that: it cannot read the segment's param.
 *
 * The unprefixed entry stubs under `app/(entry)/` have their own root layout.
 */
export default async function LocalizedRootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ lang: string }>
}>) {
  const { lang } = await params
  const locale = isSupportedLanguage(lang) ? lang : DEFAULT_LANGUAGE

  return (
    <html lang={locale} className="scroll-smooth">
      <body className="antialiased">
        <I18nProvider lang={locale}>
          <AuthProvider>
            <LanguagePreferenceSync />
            <WebSocketProvider>
              <RouteTransitionProvider>
                {children}
                <TransitionOverlay />
              </RouteTransitionProvider>
              <RCApprovalListener />
              <Toaster position="top-right" richColors />
            </WebSocketProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
