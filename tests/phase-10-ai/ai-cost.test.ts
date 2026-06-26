import { describe, expect, it } from 'vitest'
import { applySpend, canAfford, CUSTOM_LESSON_COST } from '../../src/lib/ai/cost'

describe('custom lesson cost', () => {
  it('treats an exact balance as affordable', () => {
    expect(canAfford(CUSTOM_LESSON_COST)).toBe(true)
    expect(canAfford(CUSTOM_LESSON_COST - 1)).toBe(false)
  })

  it('deducts the cost from the balance', () => {
    expect(applySpend(1000)).toBe(1000 - CUSTOM_LESSON_COST)
  })

  it('fails closed when the learner cannot afford it', () => {
    expect(() => applySpend(CUSTOM_LESSON_COST - 1)).toThrow('NOT_ENOUGH_SPARKS')
  })
})
