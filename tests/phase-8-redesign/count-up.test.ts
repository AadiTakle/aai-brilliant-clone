import { describe, it, expect } from 'vitest'
import { countUpValue, easeOutCubic } from '../../src/lib/ui/countUp'

// [Phase 8] currency count-up helper
describe('[Phase 8] countUp', () => {
  it('eases from 0 to 1 and clamps out of range', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
    expect(easeOutCubic(-1)).toBe(0)
    expect(easeOutCubic(2)).toBe(1)
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5) // ease-out front-loads
  })

  it('starts at `from` and ends at `to`', () => {
    expect(countUpValue(40, 100, 0)).toBe(40)
    expect(countUpValue(40, 100, 1)).toBe(100)
  })

  it('is monotonically non-decreasing while counting up', () => {
    let prev = countUpValue(0, 50, 0)
    for (let p = 0.1; p <= 1; p += 0.1) {
      const v = countUpValue(0, 50, p)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })
})
