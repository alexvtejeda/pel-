import { resolveTransitionType, isPublicGridRoute } from '@/components/transitions/transition-types'

describe('resolveTransitionType', () => {
  it('returns null when from and to are equal', () => {
    expect(resolveTransitionType('/pets', '/pets')).toBe(null)
  })

  it('returns "about-in" when crossing from a grid route to /about', () => {
    expect(resolveTransitionType('/', '/about')).toBe('about-in')
    expect(resolveTransitionType('/pets', '/about')).toBe('about-in')
    expect(resolveTransitionType('/aliados', '/about')).toBe('about-in')
    expect(resolveTransitionType('/eventos', '/about')).toBe('about-in')
  })

  it('returns "about-out" when leaving /about to a grid route', () => {
    expect(resolveTransitionType('/about', '/')).toBe('about-out')
    expect(resolveTransitionType('/about', '/pets')).toBe('about-out')
    expect(resolveTransitionType('/about', '/aliados')).toBe('about-out')
    expect(resolveTransitionType('/about', '/eventos')).toBe('about-out')
  })

  it('returns "skeleton" between distinct grid routes', () => {
    expect(resolveTransitionType('/pets', '/aliados')).toBe('skeleton')
    expect(resolveTransitionType('/aliados', '/eventos')).toBe('skeleton')
    expect(resolveTransitionType('/', '/pets')).toBe('skeleton')
  })

  it('returns null for non-public routes', () => {
    expect(resolveTransitionType('/pets', '/dashboard/rescue-center')).toBe(null)
    expect(resolveTransitionType('/auth/login', '/pets')).toBe(null)
  })
})

describe('isPublicGridRoute', () => {
  it('recognises all four grid routes', () => {
    expect(isPublicGridRoute('/')).toBe(true)
    expect(isPublicGridRoute('/pets')).toBe(true)
    expect(isPublicGridRoute('/aliados')).toBe(true)
    expect(isPublicGridRoute('/eventos')).toBe(true)
  })

  it('rejects other paths', () => {
    expect(isPublicGridRoute('/about')).toBe(false)
    expect(isPublicGridRoute('/p/abc123')).toBe(false)
  })
})
