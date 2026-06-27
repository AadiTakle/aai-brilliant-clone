import { ProgressBar } from '../ProgressBar'
import type { CourseLessonState } from '../../lib/progress/useCourseProgress'

interface LessonDetailProps {
  state: CourseLessonState
  /** Short title of the lesson that must be finished to unlock this one. */
  prevTitle?: string
  onStart: (state: CourseLessonState) => void
}

export function LessonDetail({ state, prevTitle, onStart }: LessonDetailProps) {
  const { meta, index, done, total, unlocked, mastered, cta } = state
  return (
    <div className={`detail-body${mastered ? ' is-mastered' : ''}`}>
      <span className={`detail-icon${mastered ? ' is-mastered' : ''}`} aria-hidden="true">
        {meta.icon}
      </span>
      <p className="detail-eyebrow">Lesson {index + 1}</p>
      <h2 className="detail-title">{meta.shortTitle}</h2>
      {mastered && <p className="detail-mastered-pill">{'\u2726'} Mastered</p>}
      <p className="detail-blurb">{meta.blurb}</p>

      <div className="detail-progress">
        <ProgressBar completed={done} total={total} label={`${meta.shortTitle} progress`} />
      </div>

      {unlocked ? (
        <button type="button" className="detail-cta" onClick={() => onStart(state)}>
          {cta}
        </button>
      ) : (
        <p className="detail-locked">
          <span aria-hidden="true">{'\u{1F512}'}</span>
          <span>
            Finish <strong>{prevTitle ?? 'the previous lesson'}</strong> to unlock this one.
          </span>
        </p>
      )}
    </div>
  )
}
