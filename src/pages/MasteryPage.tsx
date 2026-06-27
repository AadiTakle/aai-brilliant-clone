import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../firebase/config'
import { useAuth } from '../auth/useAuth'
import { getLesson, listLessons } from '../content/loader'
import { getLessonMeta } from '../content/course'
import { getMasteryChallenge, type MasteryConcept } from '../content/mastery'
import { motionAttr, useReducedMotion } from '../lib/ui/motion'
import { loadLessonProgress, saveMasteryAttempt } from '../lib/progress/store'
import type { LessonProgress } from '../lib/progress/model'
import {
  emptyMasteryAttempt,
  masteryCorrectCount,
  type MasteryAttempt,
} from '../lib/mastery/attempt'
import { generateApply } from '../lib/mastery/generateApply'
import { MasteryIntro } from './mastery/MasteryIntro'
import { MasteryBriefingCard } from './mastery/MasteryBriefingCard'
import { MasteryProgress } from './mastery/MasteryProgress'
import { MasteryRecall } from './mastery/MasteryRecall'
import { MasteryApply } from './mastery/MasteryApply'
import { MasteryComplete } from './mastery/MasteryComplete'
import './mastery/mastery.css'

export function MasteryPage() {
  const params = useParams()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const lessonId = params.lessonId ?? ''
  const lesson = getLesson(lessonId)
  const spec = getMasteryChallenge(lessonId)
  const { user, profile } = useAuth()

  const [attempt, setAttempt] = useState<MasteryAttempt>(() => emptyMasteryAttempt())
  const [progress, setProgress] = useState<LessonProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const genStartedRef = useRef(false)

  const meta = lesson ? getLessonMeta(lesson.id, lesson.title) : null
  const lessonNumber = lesson ? listLessons().findIndex((l) => l.id === lesson.id) + 1 : 0
  const alreadyMastered = Boolean(profile?.masteredLessons?.includes(lessonId))

  // Gate entry on completing EVERY step of the lesson — including a final
  // non-graded step (e.g. L4's exact-text article) that graded-only completion
  // would skip. The server-authoritative completedLessons (a lesson finished on
  // another device, or before a content/version bump orphaned the local doc) and
  // an existing mastery also allow entry. For the L9 finale (whose only step is a
  // non-graded briefing), "every step complete" simply means that briefing is done.
  const allStepsComplete = Boolean(
    progress &&
      lesson &&
      lesson.steps.length > 0 &&
      lesson.steps.every((s) => progress.steps?.[s.id]?.status === 'completed'),
  )
  const canEnterMastery =
    allStepsComplete || Boolean(profile?.completedLessons?.includes(lessonId)) || alreadyMastered
  const resumeIndex = progress?.currentStepIndex ?? 0

  // Persist + advance helper: every phase/answer change is saved so a reload
  // resumes mid-challenge (and never re-runs AI generation).
  const commitAttempt = (next: MasteryAttempt) => {
    setAttempt(next)
    if (user && lessonId) {
      saveMasteryAttempt(db, user.uid, lessonId, next).catch((err) =>
        console.warn('Failed to save mastery attempt', err),
      )
    }
  }

  // Load any in-progress attempt.
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user || !lesson) {
        setLoading(false)
        return
      }
      try {
        const stored = await loadLessonProgress(db, user.uid, lesson.id)
        if (cancelled) return
        setProgress(stored ?? null)
        setAttempt(stored?.mastery ?? emptyMasteryAttempt())
      } catch (err) {
        console.warn('Failed to load mastery attempt', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user, lesson])

  // Generate (or restore) the Apply questions when we reach the apply phase.
  useEffect(() => {
    if (loading || !spec || !canEnterMastery) return
    if (attempt.phase !== 'apply' || attempt.apply || genStartedRef.current) return
    genStartedRef.current = true
    setGenerating(true)
    let cancelled = false
    generateApply(spec, attempt.missedConcepts)
      .then((set) => {
        if (cancelled) return
        commitAttempt({ ...attempt, apply: set })
      })
      .catch(() => {
        if (cancelled) return
        commitAttempt({ ...attempt, apply: { source: 'static', questions: spec.applyFallback } })
      })
      .finally(() => {
        if (!cancelled) setGenerating(false)
      })
    return () => {
      cancelled = true
    }
    // commitAttempt is intentionally omitted: the genStartedRef guard prevents
    // re-entry, and including the recreated callback would cancel in-flight gen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, spec, attempt])

  if (!lesson || !spec) {
    return (
      <main className="mastery-arena">
        <p role="alert">This lesson has no mastery challenge.</p>
        <Link to="/?view=map">Back to course</Link>
      </main>
    )
  }

  // Already mastered (e.g. revisiting): skip straight to the gold results.
  if (alreadyMastered && attempt.phase !== 'complete') {
    return (
      <main className="mastery-arena" data-phase="complete">
        <p role="status">You’ve already mastered this lesson.</p>
        <Link to={`/lessons/${lessonId}/results?mastered=1`} className="btn-machine">
          See your results
        </Link>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="mastery-arena">
        <p role="status" aria-live="polite">
          Preparing the challenge…
        </p>
      </main>
    )
  }

  // The Mastery Challenge is a lesson's finale: it can only be started once the
  // lesson itself is complete. Reaching this route early (e.g. a stale link or a
  // hand-typed URL) lands here instead of silently starting the challenge.
  if (!canEnterMastery) {
    return (
      <main className="mastery-arena" data-phase="locked">
        <section className="problem mastery-card">
          <h2>Finish the lesson first</h2>
          <p className="mastery-card-note">
            The Mastery Challenge unlocks once you’ve completed every step of this lesson.
          </p>
          <Link to={`/lessons/${lessonId}/step/${resumeIndex}`} className="btn-machine">
            Back to the lesson
          </Link>
        </section>
      </main>
    )
  }

  const phase = attempt.phase

  return (
    <main className="mastery-arena" data-phase={phase} data-motion={motionAttr(reduced)}>
      {phase === 'intro' ? (
        <MasteryIntro onDone={() => commitAttempt({ ...attempt, phase: 'briefing' })} />
      ) : (
        <>
          <header className="mastery-header">
            <span className="mastery-header-id">
              <span aria-hidden="true">{meta?.icon}</span> Lesson {lessonNumber} · Mastery
            </span>
            <MasteryProgress phase={phase} />
          </header>

          {phase === 'briefing' && (
            <MasteryBriefingCard
              spec={spec}
              onStart={() => commitAttempt({ ...attempt, phase: 'recall' })}
            />
          )}

          {phase === 'recall' && (
            <MasteryRecall
              spec={spec}
              onComplete={(missed: MasteryConcept[]) =>
                commitAttempt({ ...attempt, phase: 'apply', missedConcepts: missed })
              }
            />
          )}

          {phase === 'apply' &&
            (attempt.apply && !generating ? (
              <MasteryApply
                questions={attempt.apply.questions}
                onPass={(i) => {
                  if (attempt.applyResults[i]) return
                  commitAttempt({
                    ...attempt,
                    applyResults: { ...attempt.applyResults, [i]: true },
                  })
                }}
                onComplete={() => commitAttempt({ ...attempt, phase: 'complete' })}
              />
            ) : (
              <section className="problem mastery-card" aria-busy="true">
                <h2>Building your challenge…</h2>
                <p className="mastery-card-note">
                  Tailoring coding questions to what you just practiced. This takes a few seconds.
                </p>
              </section>
            ))}

          {phase === 'complete' && (
            <MasteryComplete
              lessonId={lessonId}
              correctCount={masteryCorrectCount(spec, attempt)}
              onContinue={() => navigate(`/lessons/${lessonId}/results?mastered=1`)}
            />
          )}
        </>
      )}
    </main>
  )
}
