import { isoDay } from './streak'

export interface WeekDay {
  iso: string
  /** Single-letter weekday label (S M T W T F S). */
  label: string
  /** Full weekday name for accessibility. */
  name: string
  done: boolean
  isToday: boolean
}

const LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function weekDayFromDate(d: Date, done: boolean, todayIso: string): WeekDay {
  const iso = isoDay(d)
  const dow = d.getDay()
  return {
    iso,
    label: LABELS[dow],
    name: NAMES[dow],
    done,
    isToday: iso === todayIso,
  }
}

/**
 * The seven days of the current (Sunday-start) week with a `done` flag for any
 * day on which the learner completed a lesson.
 */
export function weekActivity(activeDays: string[], today: Date = new Date()): WeekDay[] {
  const done = new Set(activeDays)
  const todayIso = isoDay(today)
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay())

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return weekDayFromDate(d, done.has(isoDay(d)), todayIso)
  })
}

/**
 * The last seven calendar days ending today — used by the streak modal so recent
 * streak days are always visible even when they span a week boundary.
 */
export function rollingWeekActivity(displayDays: string[], today: Date = new Date()): WeekDay[] {
  const done = new Set(displayDays)
  const todayIso = isoDay(today)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return weekDayFromDate(d, done.has(isoDay(d)), todayIso)
  })
}
