import { describe, it, expect } from 'vitest'
import { INTERVALS, nextInterval, updateConcept, priority } from '../../src/lib/daily/schedule'
import { emptyConcept, type ConceptMastery } from '../../src/lib/daily/types'

// [Phase 12] The pure spaced-repetition model. The key invariant under test is
// that SPEED never lowers a concept's strength (it only ever raises it on an
// already-strong concept), and the expanding interval ladder.

describe('[Phase 12] interval ladder', () => {
  it('climbs INTERVALS on a correct answer and caps at the longest gap', () => {
    expect(INTERVALS).toEqual([1, 3, 7, 16, 35])
    expect(nextInterval(0, true)).toBe(1)
    expect(nextInterval(1, true)).toBe(3)
    expect(nextInterval(3, true)).toBe(7)
    expect(nextInterval(7, true)).toBe(16)
    expect(nextInterval(16, true)).toBe(35)
    expect(nextInterval(35, true)).toBe(35)
    expect(nextInterval(999, true)).toBe(35)
  })

  it('resets to 1 on a wrong answer at any gap', () => {
    expect(nextInterval(1, false)).toBe(1)
    expect(nextInterval(7, false)).toBe(1)
    expect(nextInterval(35, false)).toBe(1)
  })
})

describe('[Phase 12] updateConcept rating', () => {
  const today = '2026-06-27'

  it('raises strength toward 1 (20% of the remaining gap) on a correct answer', () => {
    const next = updateConcept(emptyConcept('2026-06-20'), { correct: true, fast: false }, today)
    expect(next.strength).toBeCloseTo(0.2, 10) // 0 + (1-0)*0.2
    expect(next.seen).toBe(1)
    expect(next.correct).toBe(1)
    expect(next.wrong).toBe(0)
    expect(next.lastSeenAt).toBe(today)
    expect(next.intervalDays).toBe(1) // 0 -> first rung
    expect(next.dueAt).toBe('2026-06-28')
  })

  it('halves strength on a wrong answer and resurfaces it tomorrow', () => {
    const prev: ConceptMastery = { ...emptyConcept('2026-06-20'), strength: 0.8, intervalDays: 16 }
    const next = updateConcept(prev, { correct: false, fast: false }, today)
    expect(next.strength).toBeCloseTo(0.4, 10) // 0.8 * 0.5
    expect(next.wrong).toBe(1)
    expect(next.intervalDays).toBe(1) // reset on miss
  })

  it('NEVER lowers strength for a slow (but correct) answer', () => {
    const prev: ConceptMastery = { ...emptyConcept('2026-06-20'), strength: 0.9, fastCorrectStreak: 3 }
    const slow = updateConcept(prev, { correct: true, fast: false }, today)
    expect(slow.strength).toBeGreaterThanOrEqual(prev.strength)
    expect(slow.strength).toBeCloseTo(0.92, 10) // 0.9 + 0.1*0.2, no speed penalty
    expect(slow.fastCorrectStreak).toBe(0) // a slow review is not a fast one
  })

  it('applies the fluency bonus ONLY when correct AND fast AND already strong (>=0.8)', () => {
    const strong: ConceptMastery = { ...emptyConcept('2026-06-20'), strength: 0.8, fastCorrectStreak: 2 }
    const bonus = updateConcept(strong, { correct: true, fast: true }, today)
    // base 0.8 + 0.2*0.2 = 0.84, then the +0.05 fluency nudge
    expect(bonus.strength).toBeCloseTo(0.89, 10)
    expect(bonus.fastCorrectStreak).toBe(3)

    // Fast + correct but not-yet-strong: NO bonus, just the base correct bump.
    const weak: ConceptMastery = { ...emptyConcept('2026-06-20'), strength: 0.5 }
    const noBonus = updateConcept(weak, { correct: true, fast: true }, today)
    expect(noBonus.strength).toBeCloseTo(0.6, 10) // 0.5 + 0.5*0.2, no +0.05
    expect(noBonus.fastCorrectStreak).toBe(0)
  })

  it('never pushes strength above 1, even with the fluency bonus', () => {
    const prev: ConceptMastery = { ...emptyConcept('2026-06-20'), strength: 0.98 }
    const next = updateConcept(prev, { correct: true, fast: true }, today)
    expect(next.strength).toBe(1)
  })
})

describe('[Phase 12] priority', () => {
  const today = '2026-06-27'

  it('treats a brand-new (unseen) concept as highly due', () => {
    expect(priority(undefined, today)).toBe(2)
  })

  it('ranks an overdue + weak concept above a just-reviewed one', () => {
    const justReviewed: ConceptMastery = {
      ...emptyConcept(today),
      strength: 0.9,
      intervalDays: 7,
      lastSeenAt: today,
    }
    const overdueWeak: ConceptMastery = {
      ...emptyConcept('2026-06-06'),
      strength: 0.2,
      intervalDays: 7,
      lastSeenAt: '2026-06-06',
    }
    expect(priority(justReviewed, today)).toBeCloseTo(0, 10)
    expect(priority(overdueWeak, today)).toBeGreaterThan(priority(justReviewed, today))
  })
})
