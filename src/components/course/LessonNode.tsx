import { forwardRef } from 'react'
import { motion } from 'motion/react'
import type { CourseLessonState } from '../../lib/progress/useCourseProgress'

const RING_RADIUS = 45
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

interface LessonNodeProps {
  state: CourseLessonState
  isCurrent: boolean
  isSelected: boolean
  isFinale: boolean
  onSelect: (index: number) => void
}

export const LessonNode = forwardRef<HTMLButtonElement, LessonNodeProps>(function LessonNode(
  { state, isCurrent, isSelected, isFinale, onSelect },
  ref,
) {
  const { meta, index, done, total, complete, mastered, unlocked } = state
  // A mastered lesson shows a full gold ring even if it has no graded steps.
  const pct = mastered ? 1 : total > 0 ? done / total : 0
  const offset = RING_CIRCUMFERENCE * (1 - pct)

  const classes = [
    'node-button',
    complete ? 'is-complete' : '',
    mastered ? 'is-mastered' : '',
    isCurrent && !complete && !mastered ? 'is-current' : '',
    isSelected ? 'is-selected' : '',
    !unlocked ? 'is-locked' : '',
    isFinale ? 'is-finale' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const label = !unlocked
    ? `Lesson ${index + 1}, ${meta.shortTitle}, locked`
    : mastered
      ? `Lesson ${index + 1}, ${meta.shortTitle}, mastered`
      : `Lesson ${index + 1}, ${meta.shortTitle}, ${done} of ${total} steps done`

  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      aria-label={label}
      aria-current={isCurrent ? 'step' : undefined}
      onClick={() => onSelect(index)}
    >
      <span className="node-core">
        <svg className="node-ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle className="node-ring-track" cx="50" cy="50" r={RING_RADIUS} />
          <motion.circle
            className="node-ring-fill"
            cx="50"
            cy="50"
            r={RING_RADIUS}
            strokeDasharray={RING_CIRCUMFERENCE}
            initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </svg>
        <span className="node-face">
          {!unlocked ? (
            <span className="node-lock" aria-hidden="true">
              {'\u{1F512}'}
            </span>
          ) : mastered ? (
            <span className="node-star" aria-hidden="true">
              {'\u2726'}
            </span>
          ) : complete ? (
            <span className="node-check" aria-hidden="true">
              {'\u2713'}
            </span>
          ) : (
            <span aria-hidden="true">{meta.icon}</span>
          )}
        </span>
        {mastered && (
          <span className="node-motes" aria-hidden="true">
            <span className="node-mote" />
            <span className="node-mote" />
            <span className="node-mote" />
          </span>
        )}
      </span>
      <span className="node-label">
        <span className="node-num">Lesson {index + 1}</span>
        {meta.shortTitle}
      </span>
    </button>
  )
})
