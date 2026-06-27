import { useState } from 'react'
import { PythonSandboxBody } from '../../problem-types/python_sandbox/PythonSandboxStep'
import type { MasteryApplyQuestion } from '../../content/mastery'

// The apply stage: 1-2 graded coding questions (AI-targeted or authored static),
// one at a time, retry-until-pass. Reuses the exact python_sandbox grading path
// (Pyodide + construct checks + per-test feedback hints).
export function MasteryApply({
  questions,
  onPass,
  onComplete,
}: {
  questions: MasteryApplyQuestion[]
  onPass: (index: number) => void
  onComplete: () => void
}) {
  const [index, setIndex] = useState(0)
  const [passed, setPassed] = useState<Record<number, boolean>>({})

  const q = questions[index]
  const isLast = index + 1 >= questions.length
  const isPassed = Boolean(passed[index])

  function handleComplete() {
    setPassed((p) => ({ ...p, [index]: true }))
    onPass(index)
  }

  function next() {
    if (isLast) {
      onComplete()
      return
    }
    setIndex((i) => i + 1)
  }

  return (
    <div className="mastery-apply">
      <p className="mastery-stage-count">
        Apply — question {index + 1} of {questions.length}
      </p>
      <PythonSandboxBody key={index} config={q} onComplete={handleComplete} />
      <div className="mastery-stage-nav">
        <button
          type="button"
          className="btn-machine"
          onClick={next}
          disabled={!isPassed}
          title={isPassed ? undefined : 'Pass this question to continue'}
        >
          {isLast ? 'Finish the challenge' : 'Next question'}
        </button>
      </div>
    </div>
  )
}
