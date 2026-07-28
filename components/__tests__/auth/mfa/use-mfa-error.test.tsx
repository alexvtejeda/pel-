import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test-utils'
import { useMfaError, isMfaErrorKey } from '@/components/auth/mfa/use-mfa-error'

// useMfaError is a hook, so it must be exercised inside a React render. renderHook
// would need its own i18n-provider wrapper, duplicating what renderWithProviders
// already sets up in test-utils.tsx — a tiny probe component keeps this test on the
// house-mandated renderWithProviders() path instead of hand-rolling a second
// provider stack.
const NULL_MARKER = '__NULL__'

function ErrorProbe({ error }: { error: string | null | undefined }) {
  const resolveError = useMfaError()
  const result = resolveError(error)
  return <div data-testid="resolved">{result === null ? NULL_MARKER : result}</div>
}

describe('useMfaError', () => {
  it('returns null for null input', () => {
    renderWithProviders(<ErrorProbe error={null} />)
    expect(screen.getByTestId('resolved')).toHaveTextContent(NULL_MARKER)
  })

  it('returns null for undefined input', () => {
    renderWithProviders(<ErrorProbe error={undefined} />)
    expect(screen.getByTestId('resolved')).toHaveTextContent(NULL_MARKER)
  })

  it('returns null for empty string input', () => {
    renderWithProviders(<ErrorProbe error="" />)
    expect(screen.getByTestId('resolved')).toHaveTextContent(NULL_MARKER)
  })

  it('translates an mfa.errors.* key using public/locales/es/auth.json', () => {
    renderWithProviders(<ErrorProbe error="mfa.errors.invalid_code" />)
    // Asserts the real translated string, not just "not the raw key" — proves
    // the key was actually resolved through i18n rather than passed through.
    expect(screen.getByTestId('resolved')).toHaveTextContent('Código inválido')
  })

  it('returns arbitrary backend-authored text verbatim', () => {
    renderWithProviders(<ErrorProbe error="La contraseña es incorrecta" />)
    expect(screen.getByTestId('resolved')).toHaveTextContent('La contraseña es incorrecta')
  })
})

describe('isMfaErrorKey', () => {
  it('is true for an mfa.errors.* key', () => {
    expect(isMfaErrorKey('mfa.errors.code_invalid_expired')).toBe(true)
  })

  it('is false for arbitrary backend-authored text', () => {
    expect(isMfaErrorKey('La contraseña es incorrecta')).toBe(false)
  })

  it('is false for null', () => {
    expect(isMfaErrorKey(null)).toBe(false)
  })

  it('is false for undefined', () => {
    expect(isMfaErrorKey(undefined)).toBe(false)
  })
})
