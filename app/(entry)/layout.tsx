import "../globals.css"

/**
 * Root layout for the unprefixed entry stubs (`/`, `/p`, `/pets`, …).
 *
 * A second root layout, separate from `app/[lang]/layout.tsx`, because these
 * routes sit *above* the `[lang]` segment and so cannot know a locale. It loads
 * the stylesheet and nothing else — no providers, no i18n, no translated text.
 *
 * `lang="es"` is honest here: Pelú is Spanish-first, and these pages redirect
 * before anything is read aloud or indexed.
 */
export default function EntryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className="antialiased">{children}</body>
    </html>
  )
}
