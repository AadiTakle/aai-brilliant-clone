import { describe, it, expect } from 'vitest'
import {
  awardDailySparks,
  dailyAward,
  DAILY_SPARKS_PER_CORRECT,
  type DailyResult,
} from '../../functions/src/dailySchedule'

// [Phase 12] Server-authoritative daily reward math. Sparks are ACCURACY-ONLY
// (speed must never change them) and the day's award is idempotent.

describe('[Phase 12] commitDailyChallenge reward', () => {
  it('is accuracy-only: identical correctness yields identical Sparks regardless of speed', () => {
    const fastRun: DailyResult[] = [
      { concept: 'print', correct: true, fast: true },
      { concept: 'loop', correct: true, fast: true },
      { concept: 'range', correct: false, fast: false },
    ]
    const slowRun: DailyResult[] = [
      { concept: 'print', correct: true, fast: false },
      { concept: 'loop', correct: true, fast: false },
      { concept: 'range', correct: false, fast: true },
    ]
    expect(awardDailySparks(fastRun)).toBe(awardDailySparks(slowRun))
    expect(awardDailySparks(fastRun)).toBe(2 * DAILY_SPARKS_PER_CORRECT)
  })

  it('pays the per-correct rate and nothing for wrong answers', () => {
    expect(awardDailySparks([])).toBe(0)
    expect(awardDailySparks([{ concept: 'print', correct: false, fast: false }])).toBe(0)
    expect(
      awardDailySparks([
        { concept: 'print', correct: true, fast: false },
        { concept: 'loop', correct: true, fast: false },
        { concept: 'range', correct: true, fast: false },
      ]),
    ).toBe(3 * DAILY_SPARKS_PER_CORRECT)
  })

  it('caps a forged oversized payload (anti-farm ceiling of 20)', () => {
    const many: DailyResult[] = Array.from({ length: 100 }, () => ({
      concept: 'print',
      correct: true,
      fast: false,
    }))
    expect(awardDailySparks(many)).toBe(20 * DAILY_SPARKS_PER_CORRECT)
  })

  it('is idempotent per day: an already-done day awards nothing', () => {
    const results: DailyResult[] = [{ concept: 'print', correct: true, fast: false }]
    expect(dailyAward(false, results)).toEqual({ awarded: true, sparks: DAILY_SPARKS_PER_CORRECT })
    expect(dailyAward(true, results)).toEqual({ awarded: false, sparks: 0 })
  })
})
