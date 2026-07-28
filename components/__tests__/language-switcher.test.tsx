import { describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './test-utils'
import { LanguageSwitcher } from '@/components/language-switcher'
import i18n from '@/lib/i18n/index'
import { STORAGE_KEY } from '@/lib/i18n/language'

describe('LanguageSwitcher', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    await i18n.changeLanguage('es')
  })

  it('marks the current language with aria-current', () => {
    renderWithProviders(<LanguageSwitcher />)
    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'Inglés' })).not.toHaveAttribute('aria-current')
  })

  it('switches the language and persists the choice', () => {
    renderWithProviders(<LanguageSwitcher />)
    fireEvent.click(screen.getByRole('button', { name: 'Inglés' }))
    expect(i18n.language).toBe('en')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('en')
  })

  it('labels the group for assistive tech', () => {
    renderWithProviders(<LanguageSwitcher />)
    expect(screen.getByRole('group', { name: 'Cambiar idioma' })).toBeInTheDocument()
  })
})
