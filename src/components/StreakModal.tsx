import { useEffect } from 'react'
import { weekActivity } from '../lib/progress/week'
import { StreakBadge } from './StreakBadge'

export function StreakModal({
  streak,
  activeDays,
  onClose,
}: {
  streak: number
  activeDays: string[]
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const days = weekActivity(activeDays)
  const doneThisWeek = days.filter((d) => d.done).length

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal streak-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Your streak"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="streak-modal-head">
          <StreakBadge streak={streak} className="streak-badge-lg" />
          <div>
            <p className="streak-modal-title">
              {streak > 0 ? `${streak}-day streak` : 'No streak yet'}
            </p>
            <p className="streak-modal-sub">
              {doneThisWeek > 0
                ? `${doneThisWeek} ${doneThisWeek === 1 ? 'day' : 'days'} this week`
                : 'Finish a lesson to light it up'}
            </p>
          </div>
        </div>

        <ul className="week-strip" aria-label="This week's activity">
          {days.map((d) => (
            <li
              key={d.iso}
              className={`week-day${d.done ? ' is-done' : ''}${d.isToday ? ' is-today' : ''}`}
            >
              <span className="week-day-label" aria-hidden="true">
                {d.label}
              </span>
              <span className="week-day-dot" title={d.name}>
                {d.done ? '✦' : ''}
              </span>
              <span className="sr-only">
                {d.name}: {d.done ? 'completed a lesson' : 'no lesson'}
              </span>
            </li>
          ))}
        </ul>

        <button type="button" className="modal-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
