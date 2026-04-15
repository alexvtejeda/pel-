import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/lib/contexts/auth-context"
import { WebSocketProvider } from "@/lib/contexts/websocket-context"
import { I18nProvider } from "@/components/i18n-provider"
import { Toaster } from "sonner"
import { RCApprovalListener } from "@/components/auth/rc-approval-listener"
import { RouteTransitionProvider } from "@/components/transitions/route-transition-context"
import { TransitionOverlay } from "@/components/transitions/transition-overlay"

export const metadata: Metadata = {
  title: "Pelú - Adopción de Mascotas",
  description: "Plataforma de adopción y coordinación de transporte de mascotas",
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className="antialiased">
        <I18nProvider>
          <AuthProvider>
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
