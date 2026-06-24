import { Link, useNavigate, useParams } from 'react-router-dom'
import { getStep } from '../content/loader'
import { ProblemRenderer } from '../problem-types/ProblemRenderer'
import { ProgressBar } from '../components/ProgressBar'
import { useLessonProgress } from '../lib/progress/useLessonProgress'
import { completedCount, isLessonComplete } from '../lib/progress/model'

export function LessonPage() {
  const params = useParams()
  const navigate = useNavigate()
  const lessonId = params.lessonId ?? ''
  const index = Number(params.stepIndex ?? '0')
  const location = getStep(lessonId, index)

  const { progress, recordStep, setCurrentStep } = useLessonProgress(location?.lesson ?? null)

  if (!location) {
    return (
      <main className="lesson">
        <p role="alert">This lesson step could not be found.</p>
        <Link to="/">Back to home</Link>
      </main>
    )
  }

  const { lesson, step, isFirst, isLast, total } = location
  const done = completedCount(progress, lesson)
  const lessonComplete = isLessonComplete(progress, lesson)

  const handleGraded = (result: { correct: boolean }) => {
    void recordStep(step, result.correct)
  }
  const handleComplete = () => {
    void recordStep(step, true)
  }

  const goTo = (i: number) => {
    setCurrentStep(i)
    navigate(`/lessons/${lessonId}/step/${i}`)
  }

  return (
    <main className="lesson">
      <header className="lesson-header">
        <Link to="/" className="lesson-back-link">
          ← All lessons
        </Link>
        <h1 className="lesson-title">{lesson.title}</h1>
        <ProgressBar completed={done} total={total} />
      </header>

      <ProblemRenderer
        key={step.id}
        step={step}
        onComplete={handleComplete}
        onGraded={handleGraded}
      />

      <div className="lesson-nav">
        <button type="button" disabled={isFirst} onClick={() => goTo(index - 1)}>
          Back
        </button>
        <span className="lesson-progress-text">
          Step {index + 1} of {total}
        </span>
        {isLast ? (
          <Link
            to={`/lessons/${lessonId}/results`}
            className="lesson-finish"
            aria-disabled={!lessonComplete}
            onClick={(e) => {
              if (!lessonComplete) e.preventDefault()
            }}
          >
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
