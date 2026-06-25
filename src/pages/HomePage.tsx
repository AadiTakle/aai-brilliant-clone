import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { db } from '../firebase/config'
import { listLessons } from '../content/loader'
import { loadLessonProgress } from '../lib/progress/store'
import { completedCount, isLessonComplete, type LessonProgress } from '../lib/progress/model'
import { lessonCtaLabel } from '../lib/ui/lessonCta'
import { ProgressBar } from '../components/ProgressBar'

export function HomePage() {
  const { user } = useAuth()
  const lessons = listLessons()
  const [progressByLesson, setProgressByLesson] = useState<Record<string, LessonProgress>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) {
        setProgressByLesson({})
        return
      }
      const entries = await Promise.all(
        lessons.map(async (l) => [l.id, await loadLessonProgress(db, user.uid, l.id)] as const),
      )
      if (cancelled) return
      const map: Record<string, LessonProgress> = {}
      for (const [id, p] of entries) if (p) map[id] = p
      setProgressByLesson(map)
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <main className="home">
      <header className="home-header">
        <h1>Learn Python Interactively</h1>
        <p>Short, hands-on lessons that teach by doing.</p>
      </header>

      <section className="lessons" aria-label="Lessons">
        <div className={user ? 'lessons-grid' : 'lessons-grid is-blurred'} aria-hidden={!user}>
          {lessons.map((lesson) => {
            const progress = progressByLesson[lesson.id]
            const done = progress ? completedCount(progress, lesson) : 0
            const total = lesson.steps.length
            const resumeIndex = progress?.currentStepIndex ?? 0
            const complete = progress ? isLessonComplete(progress, lesson) : false
            const started = done > 0 || resumeIndex > 0
            const label = lessonCtaLabel(complete, started)
            // Completed lessons restart from the beginning for review.
            const targetIndex = complete ? 0 : started ? resumeIndex : 0
            return (
              <article key={lesson.id} className="lesson-card">
                <h2>{lesson.title}</h2>
                <p>{total}&nbsp;steps</p>
                {user && <ProgressBar completed={done} total={total} />}
                {user ? (
                  <Link to={`/lessons/${lesson.id}/step/${targetIndex}`} className="lesson-start">
                    {label}
                  </Link>
                ) : (
                  <span className="lesson-start is-disabled">Start lesson</span>
                )}
              </article>
            )
          })}
        </div>

        {!user && (
          <div className="login-gate" role="region" aria-label="Login required">
            <p>Log in to start learning.</p>
            <Link to="/sign-in" className="login-gate-cta">
              Sign in
            </Link>
            <Link to="/sign-up" className="login-gate-cta secondary">
              Create an account
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}
