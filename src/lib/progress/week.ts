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
    const iso = isoDay(d)
    return {
      iso,
      label: LABELS[i],
      name: NAMES[i],
      done: done.has(iso),
      isToday: iso === todayIso,
    }
  })
}
