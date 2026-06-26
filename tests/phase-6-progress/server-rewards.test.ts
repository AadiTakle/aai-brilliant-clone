import { describe, it, expect } from 'vitest'
import {
  awardStep,
  computeAwardedPoints,
  emptyLedger,
  isLessonComplete,
  updateStreak,
} from '../../functions/src/rewards'
import type { BuiltinLessonMeta } from '../../functions/src/builtinLessonMeta'

// Authoritative server reward math. These mirror the client scoring rules but are
// the values that actually move a learner's balance, so they are covered directly.

const meta: BuiltinLessonMeta = {
  version: 1,
  steps: [
    { id: 'intro', graded: false, points: 100, minPoints: 20 },
    { id: 'q1', graded: true, points: 100, minPoints: 20 },
    { id: 'q2', graded: true, points: 100, minPoints: 20 },
  ],
}

describe('[Phase 6] server reward math', () => {
  it('awards full base points on a clean solve and decays with wrong attempts', () => {
    expect(computeAwardedPoints(100, 20, 0)).toBe(100)
    expect(computeAwardedPoints(100, 20, 1)).toBe(84)
    expect(computeAwardedPoints(100, 20, 5)).toBe(20)
    // Never below the floor, even with absurd attempts.
    expect(computeAwardedPoints(100, 20, 99)).toBe(20)
  })

  it('advances the streak with the same grace rules as the client', () => {
    expect(updateStreak({ currentStreak: 0, lastActiveDate: null }, '2026-06-26')).toEqual({
      currentStreak: 1,
      lastActiveDate: '2026-06-26',
    })
    // Same day → unchanged.
    expect(updateStreak({ currentStreak: 3, lastActiveDate: '2026-06-26' }, '2026-06-26')).toEqual({
      currentStreak: 3,
      lastActiveDate: '2026-06-26',
    })
    // One forgiven gap still counts.
    expect(updateStreak({ currentStreak: 3, lastActiveDate: '2026-06-24' }, '2026-06-26')).toEqual({
      currentStreak: 4,
      lastActiveDate: '2026-06-26',
    })
    // Longer gap resets.
    expect(updateStreak({ currentStreak: 3, lastActiveDate: '2026-06-20' }, '2026-06-26')).toEqual({
      currentStreak: 1,
      lastActiveDate: '2026-06-26',
    })
  })
})

describe('[Phase 6] awardStep reducer', () => {
  it('awards a graded step once and is idempotent on replay', () => {
    const first = awardStep(meta, emptyLedger(), 'q1', 0)
    expect(first.pointsDelta).toBe(100)
    expect(first.awarded).toEqual({ q1: 100 })

    const replay = awardStep(meta, { awarded: first.awarded, completed: false }, 'q1', 0)
    expect(replay.pointsDelta).toBe(0)
    expect(replay.awarded).toEqual({ q1: 100 })
  })

  it('applies decay from the reported wrong attempts', () => {
    const out = awardStep(meta, emptyLedger(), 'q1', 2)
    expect(out.pointsDelta).toBe(computeAwardedPoints(100, 20, 2))
  })

  it('ignores unknown step ids (anti-farm: no fake steps mint points)', () => {
    const out = awardStep(meta, emptyLedger(), 'does-not-exist', 0)
    expect(out.pointsDelta).toBe(0)
    expect(out.awarded).toEqual({})
  })

  it('marks the lesson complete only once every graded step is awarded', () => {
    let ledger = emptyLedger()
    const a = awardStep(meta, ledger, 'q1', 0)
    expect(a.newlyCompleted).toBe(false)
    ledger = { awarded: a.awarded, completed: false }

    const b = awardStep(meta, ledger, 'q2', 0)
    expect(b.newlyCompleted).toBe(true)
    expect(isLessonComplete(meta, b.awarded)).toBe(true)

    // Completing the bonus does not re-fire once already completed.
    const c = awardStep(meta, { awarded: b.awarded, completed: true }, 'q2', 0)
    expect(c.newlyCompleted).toBe(false)
  })

  it('an ungraded step grants its full base and does not gate completion', () => {
    const out = awardStep(meta, emptyLedger(), 'intro', 0)
    expect(out.pointsDelta).toBe(100)
    // Lesson is not complete because graded steps remain.
    expect(out.newlyCompleted).toBe(false)
  })
})
