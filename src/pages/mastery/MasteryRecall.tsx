import { useRef, useState } from 'react'
import { Checkpoint } from '../../problem-types/article/Checkpoint'
import type { MasteryChallengeSpec, MasteryConcept } from '../../content/mastery'
import { buildRecallForChallenge } from '../../lib/mastery/recall'

// The recall stage: MCQs one at a time, retry-until-correct. The questions are
// drawn from the central bank for this lesson's concept(s) at the spec's exact
// count (L9 keeps its authored FizzBuzz recall), with answer order randomized.
// The FIRST answer per question is what counts for concept-weighting — a wrong
// first try records that question's concept as "missed", which the Apply targets.
export function MasteryRecall({
  spec,
  onComplete,
}: {
  spec: MasteryChallengeSpec
  onComplete: (missedConcepts: MasteryConcept[]) => void
}) {
  const [index, setIndex] = useState(0)
  const [solved, setSolved] = useState(false)
  // Drawn once per mount so the set is stable across re-renders within an attempt.
  const [questions] = useState(() => buildRecallForChallenge(spec))
  const firstTry = useRef<Record<number, boolean>>({})
  const missed = useRef<MasteryConcept[]>([])

  const q = questions[index]
  const isLast = index + 1 >= questions.length

  function handleResult(correct: boolean) {
    if (firstTry.current[index] !== undefined) return
    firstTry.current[index] = correct
    if (!correct && !missed.current.includes(q.concept)) {
      missed.current.push(q.concept)
    }
  }

  function next() {
    if (isLast) {
      onComplete([...missed.current])
      return
    }
    setIndex((i) => i + 1)
    setSolved(false)
  }

  return (
    <div className="mastery-recall">
      <p className="mastery-stage-count">
        Recall — question {index + 1} of {questions.length}
      </p>
      <Checkpoint
        key={index}
        block={{
          kind: 'checkpoint',
          prompt: q.prompt,
          choices: q.choices,
          answerIndex: q.answerIndex,
          feedback: q.feedback,
        }}
        onResult={handleResult}
        onComplete={() => setSolved(true)}
      />
      <div className="mastery-stage-nav">
        <button
          type="button"
          className="btn-machine"
          onClick={next}
          disabled={!solved}
          title={solved ? undefined : 'Answer correctly to continue'}
        >
          {isLast ? 'Continue to Apply' : 'Next question'}
        </button>
      </div>
    </div>
  )
}
