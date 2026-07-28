import { describe, it, expect } from 'vitest'
import { formatAge } from '@/lib/utils/format-age'

describe('formatAge', () => {
  it('returns months below one year', () => {
    expect(formatAge(6)).toEqual({ count: 6, unit: 'months' })
    expect(formatAge(11)).toEqual({ count: 11, unit: 'months' })
  })

  it('returns whole years from twelve months up', () => {
    expect(formatAge(12)).toEqual({ count: 1, unit: 'years' })
    expect(formatAge(23)).toEqual({ count: 1, unit: 'years' })
    expect(formatAge(72)).toEqual({ count: 6, unit: 'years' })
  })

  it('floors fractional months', () => {
    expect(formatAge(6.9)).toEqual({ count: 6, unit: 'months' })
  })

  it('clamps invalid input to zero months', () => {
    expect(formatAge(-3)).toEqual({ count: 0, unit: 'months' })
    expect(formatAge(Number.NaN)).toEqual({ count: 0, unit: 'months' })
  })
})
