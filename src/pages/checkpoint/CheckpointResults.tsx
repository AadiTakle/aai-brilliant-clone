import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { listLessons } from '../../content/loader'
import { getLessonMeta } from '../../content/course'
import { getMasteryChallenge, type MasteryConcept } from '../../content/mastery'
import type { CheckpointSpec } from '../../content/checkpoints'
import type { CheckpointResult } from '../../lib/checkpoints/scoring'
import { commitCheckpoint } from '../../lib/checkpoints/commit'
import { CURRENCY_GLYPH } from '../../components/Currency'

// The earliest lesson whose mastery recall teaches `concept` — so a learner who
// missed a concept can jump straight to where it's taught to review.
function lessonForConcept(concept: MasteryConcept) {
  for (const lesson of listLessons()) {
    const challenge = getMasteryChallenge(lesson.id)
    if (challenge?.recall.some((q) => q.concept === concept)) return lesson
  }
  return null
}

// The graded outcome screen: an overall score, a per-concept breakdown, and then
// either the server-authoritative reward (on a pass) or targeted remediation +
// a retry (on a fail). The pass award is fired exactly once and is idempotent
// server-side.
export function CheckpointResults({
  spec,
  result,
  onRetry,
}: {
  spec: CheckpointSpec
  result: CheckpointResult
  onRetry: () => void
}) {
  const { refreshProfile } = useAuth()
  const ranRef = useRef(false)
  const [sparks, setSparks] = useState<number | null>(null)

  useEffect(() => {
    // Award the flat reward exactly once on a pass. The ranRef guard keeps
    // StrictMode's double-invoke safe, and the callable is idempotent server-side.
    if (!result.passed || ranRef.current) return
    ranRef.current = true
    commitCheckpoint(spec.id, true)
      .then((res) => {
        setSparks(res.sparksDelta ?? 0)
        // Background-refresh the cached profile (new balance + passed set); the
        // Continue button must not block on it.
        refreshProfile().catch(() => {})
      })
      .catch(() => {
        // The award is idempotent + server-owned; even on a transient error the
        // learner shouldn't be trapped, so still let them continue.
        setSparks(0)
      })
  }, [result.passed, spec.id, refreshProfile])

  const failedConcepts = result.concepts.filter((c) => !c.passed).map((c) => c.concept)

  return (
    <section className="checkpoint-card">
      <div className="checkpoint-scoreboard">
        <span className="checkpoint-score-pct">{Math.round(result.overall * 100)}%</span>
        <span className={`checkpoint-verdict ${result.passed ? 'is-pass' : 'is-fail'}`}>
          {result.passed ? 'Passed' : 'Keep practicing'}
        </span>
      </div>

      <table className="checkpoint-breakdown">
        <thead>
          <tr>
            <th scope="col">Concept</th>
            <th scope="col">Score</th>
            <th scope="col">Result</th>
          </tr>
        </thead>
        <tbody>
          {result.concepts.map((c) => (
            <tr key={c.concept}>
              <td>{c.concept}</td>
              <td>
                {c.correct}/{c.asked}
              </td>
              <td className={c.passed ? 'is-pass' : 'is-fail'}>
                <span aria-hidden="true">{c.passed ? '✓' : '✗'}</span>
                <span className="sr-only">{c.passed ? 'passed' : 'not yet'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {result.passed ? (
        <>
          <p className="checkpoint-card-note" role="status" aria-live="polite">
            {sparks === null
              ? 'Locking in your checkpoint…'
              : sparks > 0
                ? `You earned ${sparks} ${CURRENCY_GLYPH} and cleared the checkpoint.`
                : 'Checkpoint cleared.'}
          </p>
          <div className="checkpoint-actions">
            <Link to="/?view=map" className="btn-machine">
              Continue
            </Link>
          </div>
        </>
      ) : (
        <div className="checkpoint-remediation">
          <h2 className="checkpoint-remediation-title">Practice these first</h2>
          <ul className="checkpoint-remediation-list">
            {failedConcepts.map((concept) => {
              const lesson = lessonForConcept(concept)
              if (!lesson) return null
              const meta = getLessonMeta(lesson.id, lesson.title)
              return (
                <li key={concept}>
                  <Link to={`/lessons/${lesson.id}/step/0`}>
                    <span aria-hidden="true">{meta.icon}</span>
                    {meta.shortTitle} — review {concept}
                  </Link>
                </li>
              )
            })}
          </ul>
          <div className="checkpoint-actions">
            <button type="button" className="btn-machine" onClick={onRetry}>
              Retry checkpoint
            </button>
            <Link to="/?view=map" className="btn-ghost">
              Back to course
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
