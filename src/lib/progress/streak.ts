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

/** Normalize YYYY-M-D to YYYY-MM-DD for consistent Set lookups. */
export function normalizeIsoDay(value: string): string {
  const m = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!m) return value
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

/** Add `delta` calendar days to an ISO date string. */
export function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + delta)
  return isoDay(date)
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

/**
 * The lesson-completion dates that form the current streak (most recent last).
 * Walks back from `lastActiveDate` through `activeDays`, allowing up to a
 * 1-day grace gap between completions — matching `updateStreak`.
 */
export function getStreakCompletionDays(
  activeDays: string[],
  currentStreak: number,
  lastActiveDate: string | null,
): string[] {
  if (!lastActiveDate || currentStreak <= 0) return []
  const sorted = [...new Set(activeDays.map(normalizeIsoDay))].sort()
  const last = normalizeIsoDay(lastActiveDate)
  if (!sorted.includes(last)) return sorted.slice(-currentStreak)

  const result: string[] = [last]
  let cursor = last
  while (result.length < currentStreak) {
    const prev = sorted.filter((d) => d < cursor && dayDiff(d, cursor) <= 2).pop()
    if (!prev) break
    result.unshift(prev)
    cursor = prev
  }
  return result
}

/**
 * Calendar days to highlight in the streak strip: every completion day plus
 * grace days (a skipped day between two completions that did not break the
 * streak). Ensures a 3-day streak shows 3 lit days even when one day was
 * forgiven rather than a lesson completion.
 */
export function getStreakDisplayDays(
  activeDays: string[],
  currentStreak: number,
  lastActiveDate: string | null,
): string[] {
  if (!lastActiveDate || currentStreak <= 0) return []
  const completions = getStreakCompletionDays(activeDays, currentStreak, lastActiveDate)
  const display = new Set(completions)

  // Enough completion days already — no need to add grace-day fillers.
  if (display.size >= currentStreak) return [...display].sort()

  for (let i = 1; i < completions.length && display.size < currentStreak; i++) {
    const gap = dayDiff(completions[i - 1], completions[i])
    if (gap === 2) display.add(addDays(completions[i - 1], 1))
  }

  if (display.size < currentStreak && completions.length > 0) {
    let cursor = completions[0]
    while (display.size < currentStreak) {
      cursor = addDays(cursor, -1)
      display.add(cursor)
    }
  }

  return [...display].sort()
}
