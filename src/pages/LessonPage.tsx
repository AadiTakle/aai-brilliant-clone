import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getStep, listLessons } from '../content/loader'
import { ProblemRenderer } from '../problem-types/ProblemRenderer'
import { StepGauge } from '../components/StepGauge'
import { SparkBurst } from '../components/SparkBurst'
import { useCountUp } from '../components/useCountUp'
import { getLessonMeta } from '../content/course'
import { hasMasteryChallenge } from '../content/mastery'
import { CURRENCY_GLYPH, CURRENCY_NAME } from '../components/Currency'
import { useLessonProgress } from '../lib/progress/useLessonProgress'
import { getStepProgress, pointsEarned } from '../lib/progress/model'

export function LessonPage() {
  const params = useParams()
  const navigate = useNavigate()
  const lessonId = params.lessonId ?? ''
  const index = Number(params.stepIndex ?? '0')
  const location = getStep(lessonId, index)

  const { progress, recordStep, setCurrentStep } = useLessonProgress(location?.lesson ?? null)
  const [burst, setBurst] = useState<{ amount: number; key: number }>({ amount: 0, key: 0 })

  const earned = pointsEarned(progress)
  const sparksDisplay = useCountUp(earned)

  if (!location) {
    return (
      <main className="lesson">
        <p role="alert">This lesson step could not be found.</p>
        <Link to="/">Back to home</Link>
      </main>
    )
  }

  const { lesson, step, isFirst, isLast, total } = location
  const currentComplete = getStepProgress(progress, step.id).status === 'completed'
  // Lessons with no graded steps (e.g. the L9 finale) can still finish once every
  // step has been completed, so the mastery handoff isn't blocked.
  const allStepsDone = lesson.steps.every(
    (s) => getStepProgress(progress, s.id).status === 'completed',
  )
  // Finishing requires EVERY step done (including a non-graded final step), so a
  // graded-only "complete" can't skip the last step into the Mastery handoff.
  const canFinish = allStepsDone
  // The finale is a Mastery Challenge: when this lesson has a mastery spec, Finish
  // hands off to the challenge instead of going straight to results.
  const masteryNext = hasMasteryChallenge(lesson.id)
  const finishHref = masteryNext
    ? `/lessons/${lessonId}/mastery`
    : `/lessons/${lessonId}/results`

  const meta = getLessonMeta(lesson.id, lesson.title)
  const lessonNumber = listLessons().findIndex((l) => l.id === lesson.id) + 1
  const stepStatuses = lesson.steps.map(
    (s) => getStepProgress(progress, s.id).status === 'completed',
  )

  const fireReward = (pointsDelta: number) => {
    if (pointsDelta > 0) {
      setBurst((b) => ({ amount: pointsDelta, key: b.key + 1 }))
    }
  }

  const handleGraded = async (result: { correct: boolean }) => {
    const out = await recordStep(step, result.correct)
    fireReward(out.pointsDelta)
  }
  const handleComplete = async () => {
    const out = await recordStep(step, true)
    fireReward(out.pointsDelta)
  }

  const goTo = (i: number) => {
    setCurrentStep(i)
    navigate(`/lessons/${lessonId}/step/${i}`)
  }

  return (
    <main className="lesson">
      <header className="lesson-hud">
        <div className="lesson-hud-top">
          <Link to="/?view=map" className="lesson-back-link">
            ← Course
          </Link>
          <span className="lesson-hud-id">
            <span className="lesson-hud-icon" aria-hidden="true">
              {meta.icon}
            </span>
            <span className="lesson-hud-num">Lesson {lessonNumber}</span>
          </span>
          <span className="lesson-hud-sparks" title={`${CURRENCY_NAME} earned this lesson`}>
            <span className="lesson-hud-sparks-icon" aria-hidden="true">
              {CURRENCY_GLYPH}
            </span>
            <span className="lesson-hud-sparks-amount">{sparksDisplay}</span>
            <SparkBurst amount={burst.amount} triggerKey={burst.key} size="lg" />
          </span>
        </div>
        <h1 className="lesson-title">{meta.shortTitle}</h1>
        <StepGauge steps={stepStatuses} currentIndex={index} />
      </header>

      <ProblemRenderer
        key={step.id}
        step={step}
        onComplete={handleComplete}
        onGraded={handleGraded}
        initiallyComplete={currentComplete}
      />

      <div className="lesson-nav">
        <button type="button" className="btn-ghost" disabled={isFirst} onClick={() => goTo(index - 1)}>
          Back
        </button>
        <span className="lesson-progress-text">
          Step {index + 1} of {total}
        </span>
        {isLast ? (
          <Link
            to={finishHref}
            className="lesson-finish btn-machine"
            aria-disabled={!canFinish}
            onClick={(e) => {
              if (!canFinish) e.preventDefault()
            }}
          >
            {masteryNext ? 'Begin Mastery ▸' : 'Finish'}
          </Link>
        ) : (
          <button
            type="button"
            className="btn-machine lesson-next"
            onClick={() => goTo(index + 1)}
            disabled={!currentComplete}
            title={currentComplete ? undefined : 'Finish this step to continue'}
          >
            {currentComplete ? (
              'Next'
            ) : (
              <>
                <span aria-hidden="true">🔒</span> Next
              </>
            )}
          </button>
        )}
      </div>
      {!currentComplete && !isLast && (
        <p className="lesson-gate-hint">Complete this step to unlock the next one.</p>
      )}
    </main>
  )
}
