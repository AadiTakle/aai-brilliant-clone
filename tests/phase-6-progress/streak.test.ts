import { describe, it, expect } from 'vitest'
import {
  dayDiff,
  getStreakCompletionDays,
  getStreakDisplayDays,
  isoDay,
  normalizeIsoDay,
  updateStreak,
} from '../../src/lib/progress/streak'

describe('[Phase 6] streak', () => {
  it('formats a local day as YYYY-MM-DD', () => {
    expect(isoDay(new Date(2026, 5, 23))).toBe('2026-06-23')
  })

  it('computes whole-day differences', () => {
    expect(dayDiff('2026-06-23', '2026-06-24')).toBe(1)
    expect(dayDiff('2026-06-23', '2026-06-26')).toBe(3)
    expect(dayDiff('2026-06-23', '2026-06-23')).toBe(0)
  })

  it('starts a streak on first activity', () => {
    expect(updateStreak({ currentStreak: 0, lastActiveDate: null }, '2026-06-23')).toEqual({
      currentStreak: 1,
      lastActiveDate: '2026-06-23',
    })
  })

  it('does not change on the same day', () => {
    const state = { currentStreak: 3, lastActiveDate: '2026-06-23' }
    expect(updateStreak(state, '2026-06-23')).toEqual(state)
  })

  it('increments on the next day', () => {
    expect(updateStreak({ currentStreak: 3, lastActiveDate: '2026-06-23' }, '2026-06-24')).toEqual({
      currentStreak: 4,
      lastActiveDate: '2026-06-24',
    })
  })

  it('forgives a single missed day (1-day grace)', () => {
    expect(updateStreak({ currentStreak: 3, lastActiveDate: '2026-06-23' }, '2026-06-25')).toEqual({
      currentStreak: 4,
      lastActiveDate: '2026-06-25',
    })
  })

  it('resets after a longer gap', () => {
    expect(updateStreak({ currentStreak: 9, lastActiveDate: '2026-06-23' }, '2026-06-27')).toEqual({
      currentStreak: 1,
      lastActiveDate: '2026-06-27',
    })
  })

  it('normalizes ISO dates to zero-padded form', () => {
    expect(normalizeIsoDay('2026-6-3')).toBe('2026-06-03')
  })

  it('reconstructs streak completion days walking back with grace', () => {
    expect(
      getStreakCompletionDays(['2026-06-22', '2026-06-24', '2026-06-26'], 3, '2026-06-26'),
    ).toEqual(['2026-06-22', '2026-06-24', '2026-06-26'])
  })

  it('includes grace days in the streak display (Wed + Fri streak of 3 shows Thu too)', () => {
    expect(
      getStreakDisplayDays(['2026-06-24', '2026-06-26'], 3, '2026-06-26'),
    ).toEqual(['2026-06-24', '2026-06-25', '2026-06-26'])
  })
})
