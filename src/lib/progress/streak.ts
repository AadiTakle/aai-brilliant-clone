// Daily activity streak (Phase 6).
//
// Streak counts consecutive local days with at least one completed step. A
// single missed day is forgiven (1-day grace) so the streak survives one gap.

export interface StreakState {
  currentStreak: number
  lastActiveDate: string | null
}

/** Local calendar day as YYYY-MM-DD. */
export function isoDay(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Whole-day difference between two YYYY-MM-DD strings (toISO − fromISO). */
export function dayDiff(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number)
  const [ty, tm, td] = toISO.split('-').map(Number)
  const from = Date.UTC(fy, fm - 1, fd)
  const to = Date.UTC(ty, tm - 1, td)
  return Math.round((to - from) / 86_400_000)
}

/**
 * Returns the new streak state after activity on `today`.
 * - same day → unchanged
 * - next day (gap 1) or one missed day (gap 2, grace) → +1
 * - longer gap → reset to 1
 */
export function updateStreak(state: StreakState, today: string): StreakState {
  if (!state.lastActiveDate) {
    return { currentStreak: 1, lastActiveDate: today }
  }
  const diff = dayDiff(state.lastActiveDate, today)
  if (diff <= 0) return state
  if (diff <= 2) {
    return { currentStreak: state.currentStreak + 1, lastActiveDate: today }
  }
  return { currentStreak: 1, lastActiveDate: today }
}
