import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

interface LessonSummary {
  id: string
  title: string
  totalSteps: number
}

// Placeholder catalog for Phase 1. The content loader (Phase 2) and progress
// (Phase 6) will replace this with real data.
const LESSONS: LessonSummary[] = [
  { id: 'over-and-over-again', title: 'Over and Over Again', totalSteps: 9 },
]

export function HomePage() {
  const { user } = useAuth()

  return (
    <main className="home">
      <header className="home-header">
        <h1>Learn Python interactively</h1>
        <p>Short, hands-on lessons that teach by doing.</p>
      </header>

      <section className="lessons" aria-label="Lessons">
        <div className={user ? 'lessons-grid' : 'lessons-grid is-blurred'} aria-hidden={!user}>
          {LESSONS.map((lesson) => (
            <article key={lesson.id} className="lesson-card">
              <h2>{lesson.title}</h2>
              <p>{lesson.totalSteps} steps</p>
              {user ? (
                <Link to={`/lessons/${lesson.id}/step/0`} className="lesson-start">
                  Start lesson
                </Link>
              ) : (
                <span className="lesson-start is-disabled">Start lesson</span>
              )}
            </article>
          ))}
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
