import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCheckpoint, type CheckpointSpec } from '../content/checkpoints'
import { buildCheckpointItems } from '../lib/checkpoints/itemBank'
import { scoreCheckpoint, type CheckpointAnswer, type CheckpointResult } from '../lib/checkpoints/scoring'
import { Checkpoint } from '../problem-types/article/Checkpoint'
import './checkpoint/checkpoint.css'

type Phase = 'brief' | 'quiz' | 'results'

// A cumulative, hard-gated, answer-once recall quiz. The spec is resolved here
// (so a bad id renders a friendly message without ever mounting the quiz hooks),
// then a keyed CheckpointRunner owns the attempt — bumping the key on Retry
// remounts it and re-samples a fresh item set.
export function CheckpointPage() {
  const params = useParams()
  const checkpointId = params.checkpointId ?? ''
  const spec = getCheckpoint(checkpointId)
  const [attempt, setAttempt] = useState(0)

  if (!spec) {
    return (
      <main className="checkpoint-arena">
        <p role="alert">We couldn’t find that checkpoint.</p>
        <Link to="/?view=map" className="btn-machine">
          Back to course
        </Link>
      </main>
    )
  }

  return (
    <CheckpointRunner key={attempt} spec={spec} onRetry={() => setAttempt((n) => n + 1)} />
  )
}

function CheckpointRunner({ spec, onRetry }: { spec: CheckpointSpec; onRetry: () => void }) {
  // Sampled ONCE per mount; remounting on Retry re-samples a fresh set.
  const [items] = useState(() => buildCheckpointItems(spec))
  const [phase, setPhase] = useState<Phase>('brief')
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<CheckpointAnswer[]>([])
  const [answeredCurrent, setAnsweredCurrent] = useState(false)
  const [result, setResult] = useState<CheckpointResult | null>(null)

  const total = items.length
  const item = items[index]
  const isLast = index + 1 >= total

  // gradeOnce fires onResult exactly once per item, so each question is recorded
  // a single time. The "Next" button only enables once that has happened.
  function recordAnswer(correct: boolean) {
    setAnswers((prev) => [...prev, { concept: item.concept, correct }])
    setAnsweredCurrent(true)
  }

  function next() {
    if (isLast) {
      // The just-answered final item is already in `answers` for this render.
      setResult(scoreCheckpoint(spec, answers))
      setPhase('results')
      return
    }
    setIndex((i) => i + 1)
    setAnsweredCurrent(false)
  }

  return (
    <main
      className="checkpoint-arena"
      data-phase={phase}
      data-passed={result?.passed ? 'true' : undefined}
    >
      <header className="checkpoint-header">
        <span className="checkpoint-header-id">Mastery Checkpoint</span>
        {phase === 'quiz' && (
          <p className="checkpoint-stage-count">
            Question {index + 1} of {total}
          </p>
        )}
      </header>

      {phase === 'brief' && (
        <section className="checkpoint-card">
          <h1 className="checkpoint-card-title">{spec.title}</h1>
          <p className="checkpoint-blurb">{spec.blurb}</p>
          <p className="checkpoint-card-note">
            Answer-once: choose carefully — each question is graded on your first answer.
          </p>
          <div className="checkpoint-actions">
            <button type="button" className="btn-machine" onClick={() => setPhase('quiz')}>
              Start checkpoint
            </button>
            <Link to="/?view=map" className="btn-ghost">
              Back to course
            </Link>
          </div>
        </section>
      )}

      {phase === 'quiz' && item && (
        <section className="checkpoint-card">
          <Checkpoint
            key={index}
            gradeOnce
            block={{
              kind: 'checkpoint',
              prompt: item.question.prompt,
              choices: item.question.choices,
              answerIndex: item.question.answerIndex,
              feedback: item.question.feedback,
            }}
            onResult={recordAnswer}
          />
          <div className="checkpoint-stage-nav">
            <button
              type="button"
              className="btn-machine"
              onClick={next}
              disabled={!answeredCurrent}
              title={answeredCurrent ? undefined : 'Answer to continue'}
            >
              {isLast ? 'See results' : 'Next question'}
            </button>
          </div>
        </section>
      )}

      {phase === 'results' && result && (
        <section className="checkpoint-card">
          <div className="checkpoint-scoreboard">
            <span className="checkpoint-score-pct">{Math.round(result.overall * 100)}%</span>
            <span className={`checkpoint-verdict ${result.passed ? 'is-pass' : 'is-fail'}`}>
              {result.passed ? 'Passed' : 'Keep practicing'}
            </span>
          </div>
          <div className="checkpoint-actions">
            <Link to="/?view=map" className="btn-machine">
              Back to course
            </Link>
            {!result.passed && (
              <button type="button" className="btn-ghost" onClick={onRetry}>
                Retry checkpoint
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  )
}
