import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
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
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const focusable = dialog?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    // Move focus into the dialog so keyboard users start inside it.
    focusable?.[0]?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      // Trap Tab focus within the dialog.
      if (e.key === 'Tab' && focusable && focusable.length > 0) {
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)

    // Lock background scroll while the dialog is open.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  const days = weekActivity(activeDays)
  const doneThisWeek = days.filter((d) => d.done).length

  return (
    <motion.div
      className="modal-overlay"
      role="presentation"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        ref={dialogRef}
        className="modal streak-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Your streak"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
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
      </motion.div>
    </motion.div>
  )
}
