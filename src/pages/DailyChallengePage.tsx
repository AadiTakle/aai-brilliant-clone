import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../firebase/config'
import { useAuth } from '../auth/useAuth'
import { isoDay } from '../lib/progress/streak'
import type { MasteryConcept, MasteryRecallQuestion } from '../content/mastery'
import { recallItemsForConcept, sampleN, shuffle } from '../lib/checkpoints/itemBank'
import { AFK_MS, FAST_MS, learnedConcepts, selectDailyConcepts } from '../lib/daily/schedule'
import { loadConcepts, loadTodayChallenge } from '../lib/daily/store'
import type { DailyChallengeRecord } from '../lib/daily/store'
import { commitDailyChallenge } from '../lib/daily/commit'
import type { DailyResultInput } from '../lib/daily/commit'
import { Checkpoint } from '../problem-types/article/Checkpoint'
import { CURRENCY_GLYPH } from '../components/Currency'
import './daily/daily.css'

// A short spaced-repetition set: the most-due concepts, one recall item each.
const DAILY_COUNT = 5

interface DailyItem {
  concept: MasteryConcept
  question: MasteryRecallQuestion
}

type Status = 'loading' | 'already-done' | 'running' | 'complete' | 'empty'

interface DailySummary {
  sparksDelta: number
  strengthened: string[]
}

function conceptLabel(concept: string): string {
  return concept.charAt(0).toUpperCase() + concept.slice(1)
}

function DailyHeader() {
  return (
    <header className="daily-header">
      <p className="daily-eyebrow">Daily Challenge</p>
      <h1>Today’s practice</h1>
    </header>
  )
}

export function DailyChallengePage() {
  const { user, profile, refreshProfile } = useAuth()
  const today = useMemo(() => isoDay(), [])

  const [status, setStatus] = useState<Status>('loading')
  const [items, setItems] = useState<DailyItem[]>([])
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [results, setResults] = useState<DailyResultInput[]>([])
  const [todayRecord, setTodayRecord] = useState<DailyChallengeRecord | null>(null)
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Per-question timer; recordedRef makes the FIRST answer the one that counts.
  const startRef = useRef(0)
  const recordedRef = useRef<Record<number, boolean>>({})
  const committedRef = useRef(false)
  // The day's set is built exactly once. The guard keeps the post-finish profile
  // refresh (which lands in this effect's deps) from re-reading the now-committed
  // day and clobbering the results screen with the "already done" state.
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    let cancelled = false
    async function load() {
      if (!user) return
      // Reads are best-effort: a transient failure shouldn't block practice, and
      // the server enforces one award per day, so defaulting to "not done" is safe.
      const store = await loadConcepts(db, user.uid).catch(() => ({}))
      const record = await loadTodayChallenge(db, user.uid, today).catch(() => null)
      if (cancelled) return
      if (record) {
        setTodayRecord(record)
        setStatus('already-done')
        initializedRef.current = true
        return
      }
      // Only quiz concepts the learner has actually been taught: the union of
      // mastery recall concepts across the lessons they've completed or mastered.
      const learned = learnedConcepts([
        ...(profile?.completedLessons ?? []),
        ...(profile?.masteredLessons ?? []),
      ])
      if (learned.length === 0) {
        // Nothing learned yet — a friendly nudge beats an empty/invalid challenge.
        setStatus('empty')
        return
      }
      const concepts = selectDailyConcepts(store, learned, today, DAILY_COUNT)
      const drawn: DailyItem[] = []
      for (const concept of concepts) {
        for (const question of sampleN(recallItemsForConcept(concept), 1)) {
          drawn.push({ concept, question })
        }
      }
      // Shuffle so the concepts interleave rather than arriving in concept order.
      const built = shuffle(drawn)
      if (built.length === 0) {
        setStatus('empty')
        return
      }
      setItems(built)
      startRef.current = performance.now()
      setStatus('running')
      initializedRef.current = true
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user, today, profile])

  const current = items[index]
  const isLast = index + 1 >= items.length

  function handleResult(correct: boolean) {
    // Only the first answer per question counts (assessment, not retry-to-pass).
    if (recordedRef.current[index]) return
    recordedRef.current[index] = true
    const ms = performance.now() - startRef.current
    // Fast is a fluency signal only; it never affects Sparks (accuracy does).
    const fast = correct && ms <= FAST_MS && ms <= AFK_MS
    if (current) {
      setResults((prev) => [...prev, { concept: current.concept, correct, fast }])
    }
    setAnswered(true)
  }

  function finish(finalResults: DailyResultInput[]) {
    if (committedRef.current) return
    committedRef.current = true
    const strengthened = [...new Set(finalResults.filter((r) => r.correct).map((r) => r.concept))]
    setSubmitting(true)
    commitDailyChallenge(today, finalResults)
      .then((res) => {
        setSummary({ sparksDelta: res.sparksDelta, strengthened })
        // Refresh the cached balance in the background; never block the summary.
        refreshProfile().catch(() => {})
      })
      .catch(() => {
        // The award is idempotent + server-owned; don't trap the learner on error.
        setSummary({ sparksDelta: 0, strengthened })
      })
      .finally(() => {
        setSubmitting(false)
        setStatus('complete')
      })
  }

  function advance() {
    if (isLast) {
      finish(results)
      return
    }
    setIndex((i) => i + 1)
    setAnswered(false)
    startRef.current = performance.now()
  }

  if (status === 'loading') {
    return (
      <main className="daily-arena">
        <p role="status" aria-live="polite">
          Preparing today’s challenge…
        </p>
      </main>
    )
  }

  if (status === 'already-done') {
    return (
      <main className="daily-arena" data-status="done">
        <DailyHeader />
        <section className="daily-card">
          <h2>You’re done for today</h2>
          <p className="daily-note">Come back tomorrow for a fresh set.</p>
          {todayRecord && (
            <p className="daily-note">
              You got {todayRecord.correctCount} right and earned {todayRecord.sparks}{' '}
              {CURRENCY_GLYPH}.
            </p>
          )}
          <Link to="/?view=map" className="btn-machine">
            Back to course
          </Link>
        </section>
      </main>
    )
  }

  if (status === 'empty') {
    return (
      <main className="daily-arena">
        <DailyHeader />
        <section className="daily-card">
          <h2>Nothing to review yet</h2>
          <p className="daily-note">
            Complete a lesson first to unlock daily practice — then come back to review
            what you’ve learned.
          </p>
          <Link to="/?view=map" className="btn-machine">
            Back to course
          </Link>
        </section>
      </main>
    )
  }

  if (status === 'complete') {
    return (
      <main className="daily-arena" data-status="complete">
        <DailyHeader />
        <section className="daily-card" role="status" aria-live="polite">
          <h2>Daily Challenge complete</h2>
          <p className="daily-note">
            {summary && summary.sparksDelta > 0
              ? `You earned ${summary.sparksDelta} ${CURRENCY_GLYPH}.`
              : 'Your progress is saved.'}
          </p>
          {summary && summary.strengthened.length > 0 && (
            <div className="daily-strengthened">
              <p className="daily-note">Concepts you strengthened:</p>
              <ul>
                {summary.strengthened.map((c) => (
                  <li key={c}>{conceptLabel(c)}</li>
                ))}
              </ul>
            </div>
          )}
          <Link to="/?view=map" className="btn-machine">
            Back to course
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="daily-arena" data-status="running">
      <DailyHeader />
      <p className="daily-progress">
        Question {index + 1} of {items.length}
      </p>
      {current && (
        <Checkpoint
          key={index}
          block={{
            kind: 'checkpoint',
            prompt: current.question.prompt,
            choices: current.question.choices,
            answerIndex: current.question.answerIndex,
            feedback: current.question.feedback,
          }}
          onResult={handleResult}
        />
      )}
      <div className="daily-nav">
        <button
          type="button"
          className="btn-machine"
          onClick={advance}
          disabled={!answered || submitting}
          title={answered ? undefined : 'Answer to continue'}
        >
          {isLast ? (submitting ? 'Saving…' : 'Finish') : 'Next question'}
        </button>
      </div>
    </main>
  )
}
