import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/lib/contexts/auth-context"

export const metadata: Metadata = {
  title: "Pelú - Adopción de Mascotas",
  description: "Plataforma de adopción y coordinación de transporte de mascotas",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
