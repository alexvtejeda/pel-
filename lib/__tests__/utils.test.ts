import { describe, it, expect } from 'vitest'
import { cn, ensureUrl, instagramUrl } from '../utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
  })

  it('deduplicates tailwind conflicts', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra')
  })

  it('returns empty string for no input', () => {
    expect(cn()).toBe('')
  })
})

describe('ensureUrl', () => {
  it('returns https URL unchanged', () => {
    expect(ensureUrl('https://example.com')).toBe('https://example.com')
  })

  it('returns http URL unchanged', () => {
    expect(ensureUrl('http://example.com')).toBe('http://example.com')
  })

  it('prepends https:// when no protocol', () => {
    expect(ensureUrl('example.com')).toBe('https://example.com')
  })

  it('prepends https:// for www URLs', () => {
    expect(ensureUrl('www.mi-refugio.com')).toBe('https://www.mi-refugio.com')
  })

  it('trims whitespace', () => {
    expect(ensureUrl('  example.com  ')).toBe('https://example.com')
  })

  it('returns empty string for empty input', () => {
    expect(ensureUrl('')).toBe('')
    expect(ensureUrl('   ')).toBe('')
  })

  it('is case-insensitive for protocol check', () => {
    expect(ensureUrl('HTTP://example.com')).toBe('HTTP://example.com')
    expect(ensureUrl('HTTPS://example.com')).toBe('HTTPS://example.com')
  })
})

describe('instagramUrl', () => {
  it('returns full URL unchanged', () => {
    expect(instagramUrl('https://instagram.com/pelu')).toBe('https://instagram.com/pelu')
  })

  it('converts handle to URL', () => {
    expect(instagramUrl('pelu')).toBe('https://instagram.com/pelu')
  })

  it('strips @ prefix', () => {
    expect(instagramUrl('@pelu')).toBe('https://instagram.com/pelu')
  })

  it('trims whitespace', () => {
    expect(instagramUrl('  pelu  ')).toBe('https://instagram.com/pelu')
  })

  it('handles http URLs too', () => {
    expect(instagramUrl('http://instagram.com/pelu')).toBe('http://instagram.com/pelu')
  })
})
