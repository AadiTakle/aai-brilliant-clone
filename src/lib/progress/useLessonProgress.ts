import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '../../firebase/config'
import { useAuth } from '../../auth/useAuth'
import type { Lesson, Step } from '../../content/schemas'
import {
  applyResult,
  advanceTo,
  emptyProgress,
  isLessonComplete,
  type LessonProgress,
} from './model'
import { commitStepRewards, loadLessonProgress, saveLessonProgress } from './store'
import { isoDay } from './streak'

export interface UseLessonProgress {
  progress: LessonProgress
  loading: boolean
  recordStep: (step: Step, correct: boolean, submission?: unknown) => Promise<void>
  setCurrentStep: (index: number) => void
}

/**
 * Loads a learner's progress for one lesson and persists step outcomes,
 * lifetime points, and streak as they play. All scoring is delegated to the
 * pure reducers in `model.ts`.
 */
export function useLessonProgress(lesson: Lesson | null): UseLessonProgress {
  const { user, refreshProfile } = useAuth()
  const [progress, setProgress] = useState<LessonProgress>(() =>
    emptyProgress(lesson?.version ?? 1),
  )
  const [loading, setLoading] = useState(true)
  // Keep a ref so async persistence always sees the latest state. It is only
  // written from effects/handlers (never during render).
  const progressRef = useRef(progress)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user || !lesson) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const stored = await loadLessonProgress(db, user.uid, lesson.id)
        if (cancelled) return
        const loaded = stored ?? emptyProgress(lesson.version)
        progressRef.current = loaded
        setProgress(loaded)
      } catch (err) {
        console.warn('Failed to load lesson progress', err)
        if (!cancelled) {
          const fresh = emptyProgress(lesson.version)
          progressRef.current = fresh
          setProgress(fresh)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user, lesson])

  const recordStep = useCallback(
    async (step: Step, correct: boolean, submission?: unknown) => {
      if (!user || !lesson) return
      const { progress: next, pointsDelta, justCompleted } = applyResult(progressRef.current, {
        stepId: step.id,
        graded: step.graded,
        correct,
        basePoints: step.points,
        minPoints: step.minPoints,
        submission,
        now: new Date().toISOString(),
      })
      progressRef.current = next
      setProgress(next)
      try {
        await saveLessonProgress(db, user.uid, lesson.id, next)
        if (justCompleted) {
          await commitStepRewards(db, user.uid, {
            pointsDelta,
            today: isoDay(),
            lessonId: lesson.id,
            lessonComplete: isLessonComplete(next, lesson),
          })
          await refreshProfile()
        }
      } catch (err) {
        console.warn('Failed to persist lesson progress', err)
      }
    },
    [user, lesson, refreshProfile],
  )

  const setCurrentStep = useCallback(
    (index: number) => {
      if (!user || !lesson) return
      const next = advanceTo(progressRef.current, index)
      if (next === progressRef.current) return
      progressRef.current = next
      setProgress(next)
      saveLessonProgress(db, user.uid, lesson.id, next).catch((err) =>
        console.warn('Failed to persist step index', err),
      )
    },
    [user, lesson],
  )

  return { progress, loading, recordStep, setCurrentStep }
}
