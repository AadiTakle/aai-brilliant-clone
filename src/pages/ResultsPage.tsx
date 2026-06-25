import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { db } from '../firebase/config'
import { useAuth } from '../auth/useAuth'
import { getLesson } from '../content/loader'
import { ProgressBar } from '../components/ProgressBar'
import { Currency } from '../components/Currency'
import { StreakBadge } from '../components/StreakBadge'
import { loadLessonProgress } from '../lib/progress/store'
import {
  completedCount,
  emptyProgress,
  isLessonComplete,
  pointsEarned,
  type LessonProgress,
} from '../lib/progress/model'

export function ResultsPage() {
  const params = useParams()
  const lessonId = params.lessonId ?? ''
  const { user, profile } = useAuth()
  const lesson = getLesson(lessonId)
  const [progress, setProgress] = useState<LessonProgress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user || !lesson) {
        setLoading(false)
        return
      }
      const stored = await loadLessonProgress(db, user.uid, lesson.id)
      if (cancelled) return
      setProgress(stored ?? emptyProgress(lesson.version))
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

  const earned = pointsEarned(progress)
  const done = completedCount(progress, lesson)
  const complete = isLessonComplete(progress, lesson)

  return (
    <main className="results">
      <header className="results-header">
        <p className="results-eyebrow">{complete ? 'Lesson complete!' : 'Progress so far'}</p>
        <h1>{lesson.title}</h1>
      </header>

      <ProgressBar completed={done} total={lesson.steps.length} label="Steps completed" />

      <div className="results-stats">
        <div className="results-stat">
          <span className="results-stat-value">
            <Currency amount={earned} />
          </span>
          <span className="results-stat-label">Sparks this lesson</span>
        </div>
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
        <Link to={`/lessons/${lesson.id}/step/0`} className="ghost">
          Review lesson
        </Link>
        <Link to="/?view=map" className="lesson-finish">
          Back to course
        </Link>
      </div>
    </main>
  )
}
