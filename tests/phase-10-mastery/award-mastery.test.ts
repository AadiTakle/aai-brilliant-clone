import { describe, it, expect } from 'vitest'
import { awardMastery, MASTERY_SPARKS_PER_QUESTION } from '../../functions/src/rewards'
import type { BuiltinMasteryMeta } from '../../functions/src/builtinLessonMeta'

const meta: BuiltinMasteryMeta = { recallCount: 3, maxQuestions: 5 }

// [Mastery] Server-trusted award math: 200 Sparks per correct question, clamped
// to the lesson's authoritative max so a client can't forge more.
describe('[Mastery] awardMastery', () => {
  it('pays the per-question rate for each correct answer', () => {
    expect(awardMastery(meta, 0)).toBe(0)
    expect(awardMastery(meta, 3)).toBe(3 * MASTERY_SPARKS_PER_QUESTION)
    expect(awardMastery(meta, 5)).toBe(5 * MASTERY_SPARKS_PER_QUESTION)
  })

  it('clamps to the lesson max (anti-forge ceiling)', () => {
    expect(awardMastery(meta, 99)).toBe(meta.maxQuestions * MASTERY_SPARKS_PER_QUESTION)
  })

  it('never goes negative or fractional', () => {
    expect(awardMastery(meta, -10)).toBe(0)
    expect(awardMastery(meta, 2.9)).toBe(2 * MASTERY_SPARKS_PER_QUESTION)
    expect(awardMastery(meta, Number.NaN)).toBe(0)
  })
})
