import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { db } from '../firebase/config'
import { useAuth } from '../auth/useAuth'
import { getCustomLesson } from '../lib/aiLessons/store'
import type { CustomLesson } from '../lib/aiLessons/types'
import { ProblemRenderer } from '../problem-types/ProblemRenderer'

// Plays a custom AI lesson. Deliberately separate from LessonPage: custom
// lessons are PRACTICE-ONLY, so this page tracks step completion in local state
// and never writes progress, awards Sparks, or touches the streak.
export function AiLessonPage() {
  const { user } = useAuth()
  const { lessonId } = useParams()
  // A single result object keyed by the lesson id avoids synchronous setState in
  // the effect: "loading" is derived when no result matches the current id.
  const [result, setResult] = useState<{ id: string; lesson: CustomLesson | null } | null>(null)
  const [index, setIndex] = useState(0)
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user || !lessonId) return
    let cancelled = false
    getCustomLesson(db, user.uid, lessonId)
      .then((cl) => {
        if (cancelled) return
        setIndex(0)
        setCompleted(new Set())
        setResult({ id: lessonId, lesson: cl })
      })
      .catch(() => {
        if (!cancelled) setResult({ id: lessonId, lesson: null })
      })
    return () => {
      cancelled = true
    }
  }, [user, lessonId])

  if (!user || !lessonId) {
    return (
      <main className="lesson">
        <p role="alert">This custom lesson could not be found.</p>
        <Link to="/create">Back to your lessons</Link>
      </main>
    )
  }

  if (!result || result.id !== lessonId) {
    return (
      <main className="lesson">
        <p>Loading your lesson...</p>
      </main>
    )
  }

  const custom = result.lesson
  if (!custom) {
    return (
      <main className="lesson">
        <p role="alert">This custom lesson could not be found.</p>
        <Link to="/create">Back to your lessons</Link>
      </main>
    )
  }

  const lesson = custom.lesson
  const step = lesson.steps[index]
  const isFirst = index === 0
  const isLast = index === lesson.steps.length - 1
  const currentComplete = completed.has(step.id)

  const markComplete = () =>
    setCompleted((prev) => {
      const next = new Set(prev)
      next.add(step.id)
      return next
    })

  return (
    <main className="lesson">
      <header className="lesson-hud">
        <div className="lesson-hud-top">
          <Link to="/create" className="lesson-back-link">
            ← My lessons
          </Link>
          <span className="ai-practice-tag" title="Custom lessons are practice only">
            Practice · no Sparks
          </span>
          {custom.simplifiedWidgets && (
            <span
              className="ai-simplified-tag"
              title="This lesson uses a simplified set of interactives because the AI had trouble with richer widgets."
            >
              Simplified interactives
            </span>
          )}
        </div>
        <h1 className="lesson-title">{lesson.title}</h1>
      </header>

      <ProblemRenderer
        key={step.id}
        step={step}
        onComplete={markComplete}
        onGraded={(r) => {
          if (r.correct) markComplete()
        }}
        initiallyComplete={currentComplete}
      />

      <div className="lesson-nav">
        <button
          type="button"
          className="btn-ghost"
          disabled={isFirst}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          Back
        </button>
        <span className="lesson-progress-text">
          Step {index + 1} of {lesson.steps.length}
        </span>
        {isLast ? (
          <Link
            to="/create"
            className="btn-machine"
            aria-disabled={!currentComplete}
            onClick={(e) => {
              if (!currentComplete) e.preventDefault()
            }}
          >
            Done
          </Link>
        ) : (
          <button
            type="button"
            className="btn-machine"
            onClick={() => setIndex((i) => i + 1)}
            disabled={!currentComplete}
          >
            Next
          </button>
        )}
      </div>
    </main>
  )
}
