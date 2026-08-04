// components/__tests__/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { I18nextProvider } from 'react-i18next'
import { getI18n } from '@/lib/i18n'

// Mock next/navigation before any component imports
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/es',
  useSearchParams: () => new URLSearchParams(),
  // The `[lang]` segment. `useLocale()` reads this, so every component that
  // navigates or links needs it present — components render under Spanish here,
  // which means navigation assertions expect `/es/…` paths.
  useParams: () => ({ lang: 'es' }),
}))

// Mock next/image to a simple img tag
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, priority, ...rest } = props
    return <img {...rest} />
  },
}))

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={getI18n('es')}>{children}</I18nextProvider>
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: TestWrapper, ...options })
}
