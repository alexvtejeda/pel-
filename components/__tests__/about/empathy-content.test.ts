import { describe, it, expect } from 'vitest'
import { QUADRANT_ORDER, EMPATHY_SEGMENTS } from '@/lib/about/empathy-content'

describe('QUADRANT_ORDER', () => {
  it('lists all 6 quadrant keys in narrative order', () => {
    expect(QUADRANT_ORDER).toEqual(['piensa', 've', 'oye', 'dice', 'duele', 'aspira'])
  })

  it('every segment has a quadrant for each key in QUADRANT_ORDER', () => {
    for (const segment of EMPATHY_SEGMENTS) {
      for (const key of QUADRANT_ORDER) {
        expect(segment.quadrants[key]).toBeDefined()
        expect(segment.quadrants[key].label).toBeTruthy()
        expect(segment.quadrants[key].body).toBeTruthy()
      }
    }
  })
})
