import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '../../auth/useAuth'
import { useReducedMotion } from '../../lib/ui/motion'
import { commitMasteryCompletion } from '../../lib/mastery/commit'
import { CURRENCY_GLYPH } from '../../components/Currency'

const SHOWER_COUNT = 20

function GoldShower() {
  return (
    <div className="mastery-gold-shower" aria-hidden="true">
      {Array.from({ length: SHOWER_COUNT }).map((_, i) => (
        <motion.span
          key={i}
          className="mastery-gold-bit"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: [0, 1, 1, 0], y: [-30, 140, 260, 380] }}
          transition={{ duration: 2 + (i % 5) * 0.25, delay: (i % 8) * 0.1, ease: 'easeIn' }}
          style={{ left: `${(i / SHOWER_COUNT) * 100}%` }}
        >
          {CURRENCY_GLYPH}
        </motion.span>
      ))}
    </div>
  )
}

// The red→gold payoff. On mount it fires the server-authoritative completion
// (idempotent), plays the shockwave + gold shower, then lets the learner head to
// results. The profile refresh runs in the background so the "See your results"
// button never waits on it.
export function MasteryComplete({
  lessonId,
  correctCount,
  onContinue,
}: {
  lessonId: string
  correctCount: number
  onContinue: () => void
}) {
  const reduced = useReducedMotion()
  const { refreshProfile } = useAuth()
  const [sparks, setSparks] = useState<number | null>(null)
  const ranRef = useRef(false)

  useEffect(() => {
    // Fire the award exactly once. The ranRef guard makes this safe under React
    // StrictMode's double-invoke (and the callable is idempotent server-side).
    // We intentionally do NOT gate setSparks behind a cancel flag: StrictMode
    // runs the cleanup between the two invocations, which would otherwise cancel
    // the only in-flight request and leave the button disabled forever.
    if (ranRef.current) return
    ranRef.current = true
    commitMasteryCompletion({ lessonId, correctCount })
      .then((res) => {
        setSparks(res.sparksDelta)
        // Background-refresh the cached profile (new balance + mastered flag) so
        // it's current on the results screen; the button must not block on it.
        refreshProfile().catch(() => {})
      })
      .catch(() => {
        // The award is idempotent + server-owned; even on a transient error the
        // learner shouldn't be trapped, so we still let them continue.
        setSparks(0)
      })
  }, [lessonId, correctCount, refreshProfile])

  return (
    <div className="mastery-complete" role="status" aria-live="polite">
      {!reduced && <div className="mastery-shockwave" aria-hidden="true" />}
      {!reduced && <GoldShower />}
      <motion.h1
        className="mastery-complete-title"
        initial={reduced ? { opacity: 1 } : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 12 }}
      >
        Mastery Complete
      </motion.h1>
      <p className="mastery-complete-sub">
        {sparks === null
          ? 'Locking in your mastery…'
          : sparks > 0
            ? `You earned ${sparks} ${CURRENCY_GLYPH} and mastered this lesson.`
            : 'This lesson is mastered.'}
      </p>
      <button type="button" className="btn-machine" onClick={onContinue} disabled={sparks === null}>
        See your results
      </button>
    </div>
  )
}
