import { Link, useNavigate, useParams } from 'react-router-dom'
import { getStep } from '../content/loader'
import { ProblemRenderer } from '../problem-types/ProblemRenderer'

export function LessonPage() {
  const params = useParams()
  const navigate = useNavigate()
  const lessonId = params.lessonId ?? ''
  const index = Number(params.stepIndex ?? '0')
  const location = getStep(lessonId, index)

  if (!location) {
    return (
      <main className="lesson">
        <p role="alert">This lesson step could not be found.</p>
        <Link to="/">Back to home</Link>
      </main>
    )
  }

  const goTo = (i: number) => navigate(`/lessons/${lessonId}/step/${i}`)

  return (
    <main className="lesson">
      <ProblemRenderer key={location.step.id} step={location.step} />

      <div className="lesson-nav">
        <button type="button" disabled={location.isFirst} onClick={() => goTo(index - 1)}>
          Back
        </button>
        <span className="lesson-progress-text">
          Step {index + 1} of {location.total}
        </span>
        {location.isLast ? (
          <Link to="/" className="lesson-finish">
            Finish
          </Link>
        ) : (
          <button type="button" onClick={() => goTo(index + 1)}>
            Next
          </button>
        )}
      </div>
    </main>
  )
}
