import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/lib/contexts/auth-context"
import { I18nProvider } from "@/components/i18n-provider"

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
    <html lang="es">
      <body className="antialiased">
        <I18nProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
