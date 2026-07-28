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
    expect(screen.getByRole('button', { name: 'ES' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'EN' })).not.toHaveAttribute('aria-current')
  })

  // WCAG 2.5.3 (Label in Name): a voice-control user says "click EN", so the
  // accessible name has to be the visible text, not a translated replacement.
  // The full language name rides along as the description instead.
  it('names each button by its visible text and describes it in full', () => {
    renderWithProviders(<LanguageSwitcher />)
    expect(screen.getByRole('button', { name: 'ES' })).toHaveAttribute('title', 'Español')
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('title', 'Inglés')
  })

  it('switches the language and persists the choice', () => {
    renderWithProviders(<LanguageSwitcher />)
    fireEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(i18n.language).toBe('en')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('en')
  })

  it('moves aria-current to the newly chosen language', () => {
    renderWithProviders(<LanguageSwitcher />)
    fireEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'ES' })).not.toHaveAttribute('aria-current')
  })

  it('labels the group for assistive tech', () => {
    renderWithProviders(<LanguageSwitcher />)
    expect(screen.getByRole('group', { name: 'Cambiar idioma' })).toBeInTheDocument()
  })
})
