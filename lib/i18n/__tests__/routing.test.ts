import { describe, it, expect } from 'vitest'
import {
  DEFAULT_LANGUAGE,
  localeFromPathname,
  localePath,
  localeParams,
  splitLocale,
  switchLocalePath,
} from '../routing'

describe('localePath', () => {
  it('prefixes an app path', () => {
    expect(localePath('es', '/pets')).toBe('/es/pets')
    expect(localePath('en', '/dashboard/admin')).toBe('/en/dashboard/admin')
  })

  it('maps the root to the bare locale, not a trailing slash', () => {
    expect(localePath('es', '/')).toBe('/es')
  })

  it('carries query strings and hashes through untouched', () => {
    expect(localePath('es', '/p?slug=abc123')).toBe('/es/p?slug=abc123')
    expect(localePath('en', '/chat?conversation_id=c1')).toBe('/en/chat?conversation_id=c1')
    expect(localePath('es', '/pets#grid')).toBe('/es/pets#grid')
  })

  // Rewriting these would send users to /es/https://… — worth pinning down,
  // since Link and TransitionLink both run every href through here.
  it('leaves absolute and non-app URLs alone', () => {
    expect(localePath('es', 'https://pelurd.com/pets')).toBe('https://pelurd.com/pets')
    expect(localePath('es', 'mailto:hola@pelurd.com')).toBe('mailto:hola@pelurd.com')
    expect(localePath('es', '//cdn.example.com/x.png')).toBe('//cdn.example.com/x.png')
    expect(localePath('es', 'relative/path')).toBe('relative/path')
  })
})

describe('splitLocale', () => {
  it('separates a known locale from the rest', () => {
    expect(splitLocale('/es/pets')).toEqual({ lang: 'es', rest: '/pets' })
    expect(splitLocale('/en/dashboard/admin')).toEqual({ lang: 'en', rest: '/dashboard/admin' })
  })

  it('reports no locale when the first segment is a route', () => {
    expect(splitLocale('/pets')).toEqual({ lang: null, rest: '/pets' })
  })

  it('handles the bare locale root', () => {
    expect(splitLocale('/es')).toEqual({ lang: 'es', rest: '/' })
  })
})

describe('localeFromPathname', () => {
  it('reads the locale out of the path', () => {
    expect(localeFromPathname('/en/pets')).toBe('en')
  })

  it('falls back to Spanish — Pelú is Spanish-first', () => {
    expect(localeFromPathname('/pets')).toBe('es')
    expect(DEFAULT_LANGUAGE).toBe('es')
  })
})

describe('switchLocalePath', () => {
  it('swaps the locale and keeps the page', () => {
    expect(switchLocalePath('/es/pets', 'en')).toBe('/en/pets')
    expect(switchLocalePath('/en/dashboard/business', 'es')).toBe('/es/dashboard/business')
  })

  it('maps a bare locale root to the other root', () => {
    expect(switchLocalePath('/es', 'en')).toBe('/en')
  })

  // The shipped pet-share link is `/p?slug=…`. `usePathname()` drops the query,
  // so it is passed in separately — losing it here would turn every shared pet
  // into a blank page.
  it('preserves the query string', () => {
    expect(switchLocalePath('/es/p', 'en', '?slug=abc123')).toBe('/en/p?slug=abc123')
    expect(switchLocalePath('/es/p', 'en', 'slug=abc123')).toBe('/en/p?slug=abc123')
  })

  it('prefixes a path that has no locale yet', () => {
    expect(switchLocalePath('/pets', 'en')).toBe('/en/pets')
  })
})

describe('localeParams', () => {
  it('covers exactly the supported locales for generateStaticParams', () => {
    expect(localeParams()).toEqual([{ lang: 'es' }, { lang: 'en' }])
  })
})
