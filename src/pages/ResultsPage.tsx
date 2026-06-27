import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { db } from '../firebase/config'
import { useAuth } from '../auth/useAuth'
import { getLesson, listLessons } from '../content/loader'
import { ProgressBar } from '../components/ProgressBar'
import { Currency, CURRENCY_GLYPH, CURRENCY_NAME } from '../components/Currency'
import { StreakBadge } from '../components/StreakBadge'
import { useCountUp } from '../components/useCountUp'
import { useReducedMotion } from '../lib/ui/motion'
import { getLessonMeta } from '../content/course'
import { checkpointGating } from '../content/checkpoints'
import { loadLessonProgress } from '../lib/progress/store'
import {
  completedCount,
  emptyProgress,
  isLessonComplete,
  pointsEarned,
  type LessonProgress,
} from '../lib/progress/model'

const SHOWER_COUNT = 16

/** A short, bounded rain of sparks for the "machine complete" moment. */
function SparkShower() {
  const reduced = useReducedMotion()
  if (reduced) return null
  return (
    <div className="spark-shower" aria-hidden="true">
      {Array.from({ length: SHOWER_COUNT }).map((_, i) => (
        <motion.span
          key={i}
          className="spark-shower-bit"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: [0, 1, 1, 0], y: [-20, 120, 220, 320] }}
          transition={{
            duration: 1.8 + (i % 5) * 0.25,
            delay: (i % 8) * 0.12,
            ease: 'easeIn',
          }}
          style={{ left: `${(i / SHOWER_COUNT) * 100}%` }}
        >
          {CURRENCY_GLYPH}
        </motion.span>
      ))}
    </div>
  )
}

export function ResultsPage() {
  const params = useParams()
  const [search] = useSearchParams()
  const lessonId = params.lessonId ?? ''
  const { user, profile } = useAuth()
  const mastered =
    search.get('mastered') === '1' || Boolean(profile?.masteredLessons?.includes(lessonId))
  const lesson = getLesson(lessonId)
  const [progress, setProgress] = useState<LessonProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [sparkTarget, setSparkTarget] = useState(0)
  const sparks = useCountUp(sparkTarget)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user || !lesson) {
        setLoading(false)
        return
      }
      const stored = await loadLessonProgress(db, user.uid, lesson.id)
      if (cancelled) return
      const loaded = stored ?? emptyProgress(lesson.version)
      setProgress(loaded)
      setSparkTarget(pointsEarned(loaded))
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user, lesson])

  if (!lesson) {
    return (
      <main className="results">
        <p role="alert">That lesson could not be found.</p>
        <Link to="/">Back to home</Link>
      </main>
    )
  }

  if (loading || !progress) {
    return (
      <main className="results">
        <p role="status" aria-live="polite">
          Loading your results…
        </p>
      </main>
    )
  }

  const done = completedCount(progress, lesson)
  const complete = isLessonComplete(progress, lesson)
  const meta = getLessonMeta(lesson.id, lesson.title)
  const lessons = listLessons()
  const idx = lessons.findIndex((l) => l.id === lesson.id)
  const nextLesson =
    (complete || mastered) && idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1] : null

  // A Mastery Checkpoint may gate the next lesson (cp-foundations before L4,
  // cp-control-flow before L7). If the learner hasn't passed it yet — and hasn't
  // already cleared that lesson (grandfathered) — the forward CTA must lead to the
  // checkpoint rather than a lesson that is still locked behind it.
  const passedCheckpoints = new Set(profile?.passedCheckpoints ?? [])
  const nextAlreadyCleared = nextLesson
    ? Boolean(
        profile?.masteredLessons?.includes(nextLesson.id) ||
          profile?.completedLessons?.includes(nextLesson.id),
      )
    : false
  const nextGate = nextLesson ? checkpointGating(nextLesson.id) : null
  const pendingGate =
    nextGate && !passedCheckpoints.has(nextGate.id) && !nextAlreadyCleared ? nextGate : null

  const celebrate = complete || mastered

  return (
    <main className={`results${complete ? ' is-complete' : ''}${mastered ? ' is-mastered' : ''}`}>
      {celebrate && <SparkShower />}

      <header className="results-hero">
        <span
          className={`results-hero-icon${celebrate ? ' is-energized' : ''}`}
          aria-hidden="true"
        >
          {meta.icon}
        </span>
        <p className="results-eyebrow">
          {mastered ? 'Mastered! ✦' : complete ? 'Machine complete!' : 'Progress so far'}
        </p>
        <h1>{meta.shortTitle}</h1>
      </header>

      <div className="results-spark-hero" title={`${CURRENCY_NAME} earned this lesson`}>
        <span className="results-spark-glyph" aria-hidden="true">
          {CURRENCY_GLYPH}
        </span>
        <span className="results-spark-count">{sparks}</span>
        <span className="results-spark-label">Sparks earned this lesson</span>
      </div>

      <ProgressBar completed={done} total={lesson.steps.length} label="Steps completed" />

      <div className="results-stats">
        <div className="results-stat">
          <span className="results-stat-value">
            <Currency amount={profile?.totalPoints ?? 0} />
          </span>
          <span className="results-stat-label">Total Sparks</span>
        </div>
        <div className="results-stat">
          <span className="results-stat-value">
            <StreakBadge streak={profile?.currentStreak ?? 0} />
          </span>
          <span className="results-stat-label">Day streak</span>
        </div>
      </div>

      <div className="results-actions">
        <Link to={`/lessons/${lesson.id}/step/0`} className="btn-ghost results-review">
          Review lesson
        </Link>
        {pendingGate ? (
          <Link to={`/checkpoint/${pendingGate.id}`} className="lesson-finish btn-machine">
            Start checkpoint ▸
          </Link>
        ) : nextLesson ? (
          <Link to={`/lessons/${nextLesson.id}/step/0`} className="lesson-finish btn-machine">
            Next lesson ▸
          </Link>
        ) : (
          <Link to="/?view=map" className="lesson-finish btn-machine">
            Back to course
          </Link>
        )}
      </div>
    </main>
  )
}
