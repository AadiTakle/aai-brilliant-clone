import { describe, it, expect } from 'vitest'
import { computeAwardedPoints, computeDecrement } from '../../src/lib/progress/points'

describe('[Phase 6] points decay', () => {
  it('sizes the decrement so 5 wrong attempts reach the floor', () => {
    expect(computeDecrement(100, 20)).toBe(16)
  })

  it('awards full points on a first-try correct answer', () => {
    expect(computeAwardedPoints(100, 20, 0)).toBe(100)
  })

  it('decays linearly with each wrong attempt', () => {
    expect(computeAwardedPoints(100, 20, 1)).toBe(84)
    expect(computeAwardedPoints(100, 20, 2)).toBe(68)
    expect(computeAwardedPoints(100, 20, 5)).toBe(20)
  })

  it('never drops below the minimum', () => {
    expect(computeAwardedPoints(100, 20, 6)).toBe(20)
    expect(computeAwardedPoints(100, 20, 99)).toBe(20)
  })

  it('works for other base/min pairs', () => {
    expect(computeDecrement(50, 10)).toBe(8)
    expect(computeAwardedPoints(50, 10, 2)).toBe(34)
  })
})
